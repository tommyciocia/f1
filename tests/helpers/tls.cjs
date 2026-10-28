'use strict';
// Certificato effimero per localhost: nessuna chiave privata salvata nel repository.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
function temporaryTLS(){
 const tempRoot=fs.realpathSync(os.tmpdir()),folder=fs.mkdtempSync(path.join(tempRoot,'f1-test-tls-'));
 const dispose=()=>{
  const target=path.resolve(folder);
  if(path.dirname(target)!==tempRoot||!path.basename(target).startsWith('f1-test-tls-'))throw Error('Unsafe TLS cleanup path');
  fs.rmSync(target,{recursive:true,force:true});
 };
 const openssl=process.env.F1_OPENSSL||(process.platform==='win32'?'C:\\Program Files\\Git\\usr\\bin\\openssl.exe':'openssl');
 try{
  execFileSync(openssl,['req','-x509','-newkey','rsa:2048','-sha256','-nodes','-keyout',path.join(folder,'key.pem'),
   '-out',path.join(folder,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],
  {stdio:'ignore',windowsHide:true,env:{...process.env,MSYS_NO_PATHCONV:'1'}});
  return{tls:{key:fs.readFileSync(path.join(folder,'key.pem')),cert:fs.readFileSync(path.join(folder,'cert.pem'))},
   dispose};
 }catch(error){dispose();throw Error('TLS tests require OpenSSL. Set F1_OPENSSL to its executable.',{cause:error});}
}
module.exports={temporaryTLS};
