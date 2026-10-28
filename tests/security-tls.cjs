'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),https=require('node:https'),tls=require('node:tls'),net=require('node:net');
const {createGameServer}=require('../server/server.cjs'),{patchedRuntime}=require('../server/security.cjs'),{temporaryTLS}=require('./helpers/tls.cjs');
test('HTTPS reale, HSTS in produzione e rifiuto di TLS obsoleto',async t=>{
 const fixture=temporaryTLS();t.after(fixture.dispose);
 const production=patchedRuntime();
 const server=createGameServer({production,origin:'https://localhost',tls:fixture.tls,log:()=>{}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const port=server.address().port;
 const result=await new Promise((resolve,reject)=>{
  const req=https.get({hostname:'127.0.0.1',port,servername:'localhost',ca:fixture.tls.cert,headers:{Host:'localhost'}},res=>{
   const version=res.socket.getProtocol();res.resume();res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,version}));
  });req.on('error',reject);
 });
 assert.equal(result.status,200);assert.match(result.version,/TLSv1\.[23]/);
 if(production)assert.equal(result.headers['strict-transport-security'],'max-age=31536000');
 else t.diagnostic('Production HSTS requires the patched runtime; TLS transport was tested in development mode.');
 await new Promise((resolve,reject)=>{
  const socket=tls.connect({host:'127.0.0.1',port,maxVersion:'TLSv1.1',minVersion:'TLSv1',ciphers:'DEFAULT:@SECLEVEL=0',rejectUnauthorized:false});
  socket.setTimeout(3000,()=>{socket.destroy();reject(Error('legacy TLS did not close'));});
  socket.on('secureConnect',()=>{socket.destroy();reject(Error('legacy TLS accepted'));});socket.on('error',error=>{
   socket.destroy();try{assert.match(error.message,/alert protocol version/i);resolve();}catch(e){reject(e);}
  });
 });
 await new Promise((resolve,reject)=>{
  // TCP aperto senza ClientHello: l'origine chiude per handshake timeout.
  const socket=net.connect(port,'127.0.0.1');socket.setTimeout(8000,()=>{socket.destroy();reject(Error('TLS handshake timeout was not enforced'));});
  socket.on('error',error=>{if(error.code!=='ECONNRESET')reject(error);});socket.on('close',resolve);
 });
 if(production){
  assert.throws(()=>createGameServer({production:true,origin:'https://localhost'}),/TLS/);
  assert.throws(()=>createGameServer({production:true,origin:'http://localhost',tls:fixture.tls}),/HTTPS/);
 }
});
