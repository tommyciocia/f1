'use strict';
const {createHmac,randomBytes}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const META_CSP=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
const HEADERS=Object.freeze({
 'Content-Security-Policy':META_CSP+"; frame-ancestors 'none'",
 'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
 'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()',
 'Cache-Control':'no-store'
});
function patchedRuntime(version=process.versions.node){
 const [major,minor,patch]=version.split('.').map(Number),minimum={22:[23,4],24:[22,1],26:[12,1]}[major];
 return !!minimum&&(minor>minimum[0]||minor===minimum[0]&&patch>=minimum[1]);
}
// Token bucket per IP con memoria limitata; nessuna fiducia in X-Forwarded-For.
function createLimiter({burst=180,perSecond=6,maxClients=4096,now=()=>performance.now()}={}){
 if(!Number.isFinite(burst)||burst<1||!Number.isFinite(perSecond)||perSecond<=0||!Number.isInteger(maxClients)||maxClients<1)throw Error('Invalid limiter configuration');
 const clients=new Map();let lastSweep=now();
 return {get size(){return clients.size;},allow(key){
  const time=now(),ttl=Math.max(60000,burst/perSecond*1000);
  if(time-lastSweep>=ttl){for(const [id,b] of clients)if(time-b.at>=ttl)clients.delete(id);lastSweep=time;}
  let b=clients.get(key);
  if(!b){if(clients.size>=maxClients)return false;b={tokens:burst,at:time};clients.set(key,b);}
  b.tokens=Math.min(burst,b.tokens+Math.max(0,time-b.at)/1000*perSecond);b.at=time;
  if(b.tokens<1)return false;b.tokens--;return true;
 }};
}
// Mai registrare URL, query, header, payload, credenziali o indirizzi IP in chiaro.
// Prima occorrenza e riepiloghi a potenze di due: volume limitato anche sotto abuso.
function createAudit(write=line=>process.stderr.write(line+'\n'),now=()=>Date.now()){
 const key=randomBytes(32),counts=new Map();let window=now();
 return (event,peer='unknown')=>{
  const time=now();if(time-window>=60000){counts.clear();window=time;}
  const count=(counts.get(event)||0)+1;counts.set(event,count);
  if(count!==1&&!Number.isInteger(Math.log2(count)))return;
  const row={time:new Date(time).toISOString(),event,severity:count>=64?'critical':'warning',count,
   peer:createHmac('sha256',key).update(peer).digest('hex').slice(0,16)};
  try{write(JSON.stringify(row));}catch{/* Il logging non deve interrompere il servizio. */}
 };
}
module.exports={ROOT,HEADERS,patchedRuntime,createLimiter,createAudit};
