'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
test('nessuna dipendenza runtime e nessun codice o servizio remoto richiesto dal gioco',()=>{
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 assert.equal(Object.keys(pkg.dependencies||{}).length,0);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.doesNotMatch(html,/<script\b[^>]*>\s*[^\s<]/i);
 assert.doesNotMatch(html,/\son\w+\s*=/i);
 for(const [,src] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  assert.match(src,/^(js\/[a-zA-Z0-9]+\.js|style\.css)$/);
 }
 const csp=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
 assert.match(csp,/default-src 'none'/);assert.match(csp,/script-src 'self';/);assert.doesNotMatch(csp,/unsafe-eval/);
 assert.match(csp,/connect-src 'none'/);assert.match(csp,/form-action 'none'/);
});
test('scansione locale dei file sorgente per formati comuni di segreti, senza mostrarne il contenuto',()=>{
 const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\bAKIA[0-9A-Z]{16}\b/,/\bgh[pousr]_[A-Za-z0-9]{30,}\b/,/\bsk-proj-[A-Za-z0-9_-]{40,}\b/];
 const findings=[];
 function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(['.git','node_modules'].includes(entry.name)||entry.isSymbolicLink())continue;
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())scan(file);
  else if(/\.(?:js|cjs|json|html|css|md|ya?ml|toml)$/.test(entry.name)){
   const text=fs.readFileSync(file,'utf8');if(patterns.some(p=>p.test(text)))findings.push(path.relative(root,file));
  }
 }}scan(root);
 assert.deepEqual(findings,[],'Possible secrets in these source files (manual review required)');
});
