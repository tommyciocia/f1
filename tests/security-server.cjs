'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),net=require('node:net');
const {createGameServer}=require('../server/server.cjs');
const {createLimiter,createAudit,patchedRuntime}=require('../server/security.cjs');
async function fixture(t,options={}){
 const logs=[],server=createGameServer({log:line=>logs.push(JSON.parse(line)),...options});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const port=server.address().port;
 const request=(url='/',opts={})=>new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path:url,agent:false,...opts},res=>{
   const body=[];res.on('data',b=>body.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(body).toString()}));
  });req.on('error',reject);req.end(opts.body);
 });return{server,port,request,logs};
}
test('solo file pubblici espliciti, contenuti corretti e security headers su successi ed errori',async t=>{
 const {request}=await fixture(t);
 const index=await request();assert.equal(index.status,200);assert.match(index.body,/F1 Racing Simulator/);
 const scripts=Array.from(index.body.matchAll(/<script src="([^"]+)"/g),m=>m[1]);
 for(const file of ['style.css','assets/menu-duel.png',...scripts])assert.equal((await request('/'+file)).status,200,file);
 for(const url of ['/.git/config','/.env','/server/server.cjs','/README.md','/tests/security-server.cjs','/assets/circuits/source/manifest.json','/api/admin','/api/results']){
  const r=await request(url);assert.equal(r.status,404,url);assert.doesNotMatch(r.body,/C:|password|stack|node_modules/);
  assert.equal(r.headers['x-content-type-options'],'nosniff');assert.equal(r.headers['x-frame-options'],'DENY');
 }
 assert.match(index.headers['content-security-policy'],/script-src 'self'/);assert.match(index.headers['content-security-policy'],/connect-src 'none'/);
 assert.match(index.headers['content-security-policy'],/frame-ancestors 'none'/);assert.doesNotMatch(index.headers['content-security-policy'],/unsafe-eval/);
 assert.equal(index.headers['access-control-allow-origin'],undefined);assert.equal(index.headers['set-cookie'],undefined);
 const head=await request('/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.body,'');assert.equal(head.headers['content-length'],index.headers['content-length']);
});
test('blocca traversal, codifiche ambigue, query, URL assoluti e richieste oversized',async t=>{
 const {request}=await fixture(t);
 for(const url of ['/../.git/config','/%2e%2e/.env','/%252e%252e/.env','/js%2futils.js','//server/server.cjs','/js\\utils.js','/?token=secret','http://evil.invalid/']){
  assert.equal((await request(url)).status,400,url);
 }
 assert.equal((await request('/'+'a'.repeat(2050))).status,414);
 assert.equal((await request('/',{headers:{'Content-Length':'1'},body:'x'})).status,413);
 assert.equal((await request('/',{headers:{'Transfer-Encoding':'chunked'},body:'x'})).status,413);
 const headers=Object.fromEntries(Array.from({length:65},(_,i)=>['X-Test-'+i,'x']));
 // Alcune release del parser chiudono la connessione prima dell'handler applicativo.
 try{assert.equal((await request('/',{headers})).status,431);}catch(error){if(error.code!=='ECONNRESET')throw error;}
});
test('verifica Host e origine, rifiuta tutti i metodi di mutazione e preflight',async t=>{
 const {request,port}=await fixture(t);
 assert.equal((await request('/',{headers:{Host:'evil.invalid'}})).status,421);
 assert.equal((await request('/',{headers:{Origin:'https://evil.invalid'}})).status,403);
 assert.equal((await request('/',{headers:{Origin:'null'}})).status,403);
 assert.equal((await request('/',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
 assert.equal((await request('/',{headers:{Origin:'http://127.0.0.1:'+port}})).status,200);
 for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS','TRACE']){
  const r=await request('/',{method});assert.equal(r.status,405,method);assert.equal(r.headers.allow,'GET, HEAD');
 }
 assert.equal((await request('/',{headers:{Expect:'100-continue','Content-Length':'1'},body:'x'})).status,417);
});
test('rate limit non aggirabile cambiando X-Forwarded-For; log senza dati riservati',async t=>{
 const {request,logs}=await fixture(t,{limiterOptions:{burst:2,perSecond:.001}});
 assert.equal((await request('/.env?password=secret',{headers:{Authorization:'Bearer sensitive','X-Forwarded-For':'1.2.3.4'}})).status,400);
 assert.equal((await request()).status,200);
 const limited=await request('/',{headers:{'X-Forwarded-For':'5.6.7.8'}});assert.equal(limited.status,429);assert.equal(limited.headers['retry-after'],'1');
 assert.doesNotMatch(JSON.stringify(logs),/secret|password|sensitive|Bearer|127\.0\.0\.1|1\.2\.3\.4/);
 assert.ok(logs.some(row=>row.event==='client_rate_limit'));
});
test('limite globale attivo indipendentemente dal limite per IP',async t=>{
 const {request}=await fixture(t,{globalLimiterOptions:{burst:1,perSecond:.001}});
 assert.equal((await request()).status,200);assert.equal((await request()).status,503);
});
test('bucket limitati in memoria, recupero temporale e aggregazione eventi critici',()=>{
 let time=0;const limiter=createLimiter({burst:2,perSecond:1,maxClients:2,now:()=>time});
 assert.equal(limiter.allow('a'),true);assert.equal(limiter.allow('a'),true);assert.equal(limiter.allow('a'),false);
 time=1000;assert.equal(limiter.allow('a'),true);assert.equal(limiter.allow('b'),true);assert.equal(limiter.allow('c'),false);assert.equal(limiter.size,2);
 time=61001;assert.equal(limiter.allow('c'),true);assert.equal(limiter.size,1);
 const logs=[],audit=createAudit(line=>logs.push(JSON.parse(line)),()=>time);
 for(let i=0;i<1024;i++)audit('client_rate_limit','127.0.0.1');
 assert.equal(logs.length,11);assert.equal(logs.at(-1).severity,'critical');assert.equal(logs.at(-1).count,1024);
 time+=60001;audit('client_rate_limit','127.0.0.1');assert.equal(logs.at(-1).count,1);
});
test('configurazione produzione fallisce senza runtime aggiornato, TLS e origine sicura',()=>{
 for(const v of ['20.99.0','22.23.3','24.14.1','24.22.0','26.12.0'])assert.equal(patchedRuntime(v),false,v);
 for(const v of ['22.23.4','24.22.1','26.12.1','24.23.0'])assert.equal(patchedRuntime(v),true,v);
 assert.throws(()=>createGameServer({production:true}),/Production requires/);
 for(const origin of ['https://game.example/','https://user:password@game.example','http://game.example/path','file://local'])assert.throws(()=>createGameServer({origin}));
 assert.throws(()=>createGameServer({origin:'https://game.example'}),/TLS/);
});
test('timeout, limiti connessioni e parser: upgrade e header incompleti vengono chiusi',async t=>{
 const {server,port}=await fixture(t);
 assert.equal(server.headersTimeout,5000);assert.equal(server.requestTimeout,10000);assert.equal(server.maxConnections,256);assert.equal(server.maxRequestsPerSocket,100);
 const raw=(payload,timeout=3000)=>new Promise((resolve,reject)=>{
  const socket=net.connect(port,'127.0.0.1',()=>socket.write(payload));socket.setTimeout(timeout,()=>{socket.destroy();reject(Error('socket not closed'));});
  socket.on('data',()=>{});socket.on('error',e=>{if(e.code!=='ECONNRESET')reject(e);});socket.on('close',resolve);
 });
 await raw('GET / HTTP/1.1\r\nHost: 127.0.0.1:'+port+'\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');
 await raw('GET / HTTP/1.1\r\nHost: a\r\nHost: b\r\n\r\n');
 await raw('GET / HTTP/1.1\r\nHost: 127.0.0.1:'+port+'\r\nX-Padding: '+'x'.repeat(9000)+'\r\n\r\n');
 await raw('GET / HTTP/1.1\r\nHost:',9000);
});
