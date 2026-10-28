'use strict';
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const https=require('node:https');
const {ROOT,HEADERS,patchedRuntime,createLimiter,createAudit}=require('./security.cjs');

function publicFiles(){
 const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 const files=['index.html','style.css','assets/menu-duel.png',...Array.from(html.matchAll(/<script src="(js\/[a-zA-Z0-9]+\.js)"/g),m=>m[1])];
 const content=new Map();
 for(const name of files){
  // Rifiuta anche symlink/junction nella catena: nessun accesso dinamico al filesystem per richiesta.
  let current=ROOT;for(const part of name.split('/')){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())throw Error('Public symlinks are forbidden');}
  const body=fs.readFileSync(current),type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'}[path.extname(name)];
  content.set('/'+name,{body,type});
 }
 content.set('/',content.get('/index.html'));return content;
}
function createGameServer({production=false,origin,tls,log,limiterOptions,globalLimiterOptions}={}){
 if(production&&!patchedRuntime())throw Error('Production requires a patched supported Node.js runtime; see docs/SECURITY.md');
 let publicOrigin;
 if(origin){
  const u=new URL(origin);
  if(u.origin!==origin||u.username||u.password||!['http:','https:'].includes(u.protocol))throw Error('PUBLIC_ORIGIN must be an exact origin without path or credentials');
  publicOrigin=u;
 }
 if(production&&(!tls||publicOrigin?.protocol!=='https:'))throw Error('Production requires TLS and an HTTPS PUBLIC_ORIGIN');
 if(publicOrigin&&(publicOrigin.protocol==='https:')!==!!tls)throw Error('Origin and TLS configuration disagree');
 const content=publicFiles(),audit=createAudit(log),limiter=createLimiter(limiterOptions);
 const globalLimiter=createLimiter({burst:2000,perSecond:200,maxClients:1,...globalLimiterOptions});
 const options={maxHeaderSize:8192,headersTimeout:5000,requestTimeout:10000,connectionsCheckingInterval:1000,
  keepAliveTimeout:3000,joinDuplicateHeaders:false};
 const handler=(req,res)=>{
  const peer=req.socket.remoteAddress||'unknown';
  for(const [key,value] of Object.entries(HEADERS))res.setHeader(key,value);
  if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
  const fail=(status,event,extra={})=>{
   audit(event,peer);res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Connection':'close',...extra});
   res.end(req.method==='HEAD'?undefined:http.STATUS_CODES[status]+'\n');
  };
  if(!globalLimiter.allow('all'))return fail(503,'server_rate_limit',{'Retry-After':'1'});
  if(!limiter.allow(peer))return fail(429,'client_rate_limit',{'Retry-After':'1'});
  if(req.rawHeaders.length>128)return fail(431,'too_many_headers');
  if(req.headers.expect)return fail(417,'expectation_denied');
  const host=req.headers.host,port=server.address()?.port;
  const allowed=publicOrigin?[publicOrigin.host]:['127.0.0.1:'+port,'localhost:'+port];
  const rawHosts=req.rawHeaders.filter((_,i)=>i%2===0&&req.rawHeaders[i].toLowerCase()==='host');
  if(rawHosts.length!==1||!allowed.includes(host))return fail(421,'invalid_host');
  const requestOrigin=publicOrigin?.origin||'http://'+host;
  if(req.headers.origin&&req.headers.origin!==requestOrigin||req.headers['sec-fetch-site']==='cross-site')return fail(403,'cross_origin');
  if(req.method!=='GET'&&req.method!=='HEAD')return fail(405,'method_denied',{'Allow':'GET, HEAD'});
  if(req.headers['transfer-encoding']||req.headers['content-length']&&req.headers['content-length']!=='0')return fail(413,'body_denied');
  if(req.url.length>2048)return fail(414,'url_too_long');
  // Nessuna normalizzazione ambigua, percent-encoding, query o path assoluto.
  if(!/^\/[a-zA-Z0-9/._-]*$/.test(req.url)||req.url.includes('..')||req.url.includes('//'))return fail(400,'invalid_path');
  if(req.url==='/favicon.ico'){res.writeHead(204);return res.end();}
  const asset=content.get(req.url);if(!asset)return fail(404,'resource_denied');
  res.writeHead(200,{'Content-Type':asset.type,'Content-Length':asset.body.length,
   'Cache-Control':asset.type.startsWith('text/html')?'no-cache':'public, max-age=60'});
  res.end(req.method==='HEAD'?undefined:asset.body);
 };
 const server=tls?https.createServer({...options,...tls,minVersion:'TLSv1.2',handshakeTimeout:5000},handler):http.createServer(options,handler);
 server.maxHeadersCount=64;server.maxRequestsPerSocket=100;server.maxConnections=256;
 server.setTimeout(10000,socket=>socket.destroy());
 server.on('clientError',(err,socket)=>{audit('malformed_http',socket.remoteAddress);socket.destroy();});
 server.on('upgrade',(req,socket)=>{audit('upgrade_denied',socket.remoteAddress);socket.destroy();});
 server.on('connect',(req,socket)=>{audit('tunnel_denied',socket.remoteAddress);socket.destroy();});
 server.on('checkContinue',handler);server.on('checkExpectation',handler);
 server.on('tlsClientError',(err,socket)=>{audit('tls_handshake_denied',socket.remoteAddress);socket.destroy();});
 server.on('drop',()=>audit('connection_limit'));
 return server;
}
function start(){
 const production=process.env.NODE_ENV==='production';
 const tls=process.env.TLS_CERT_FILE&&process.env.TLS_KEY_FILE?{
  cert:fs.readFileSync(process.env.TLS_CERT_FILE),key:fs.readFileSync(process.env.TLS_KEY_FILE)
 }:undefined;
 if(!!process.env.TLS_CERT_FILE!==!!process.env.TLS_KEY_FILE)throw Error('Both TLS certificate paths are required');
 const server=createGameServer({production,origin:process.env.PUBLIC_ORIGIN,tls});
 const port=Number(process.env.PORT||(production?8443:8080));
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
 // HTTP di sviluppo resta accessibile esclusivamente sul loopback.
 const host=production?(process.env.BIND_HOST||'127.0.0.1'):'127.0.0.1';
 server.on('error',()=>{console.error('Server failed to start. Check port, certificate and permissions.');process.exitCode=1;});
 server.listen(port,host,()=>console.log('F1 static server: '+(process.env.PUBLIC_ORIGIN||'http://127.0.0.1:'+port)));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close();setTimeout(()=>process.exit(0),10000).unref();});
}
if(require.main===module){try{start();}catch(error){console.error(error.code?'Server configuration could not be loaded. Check docs/SECURITY.md.':error.message);process.exitCode=1;}}
module.exports={createGameServer};
