'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.F1_BROWSER_CHANNEL||'msedge',headless:true});
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'f1-circuits-')),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;navigator.getGamepads=()=>[];
   for(const type of ['gamepadconnected','gamepaddisconnected'])addEventListener(type,e=>e.stopImmediatePropagation(),true);
  });
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await page.evaluate(()=>{S.vol=0;S.qualiEnabled=false;save();});
  await page.locator('#menu [data-go="circuits"]').click();
  assert.equal(await page.locator('.circuit-card').count(),24);
  await page.screenshot({animations:"disabled",path:path.join(folder,'circuits-desktop.png')});
  const ids=await page.evaluate(()=>CIRCUIT_DATA.map(c=>c.id));
  for(const id of ids){
   const current=await page.evaluate(()=>activeCircuit.id);await page.locator('[data-circuit="'+id+'"]').click();
   assert.equal(await page.evaluate(()=>activeCircuit.id),current);
   assert.equal(await page.locator('#circuitPreview svg').count(),1);
   assert.ok(await page.locator('#circuitPreview').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),'Dettagli fuori dalla vista: '+id);
   assert.equal(await page.locator('[data-select-circuit="'+id+'"]').count(),1);
   assert.equal(await page.locator('[data-circuit-card="'+id+'"] svg > path').first().getAttribute('d'),await page.locator('#circuitPreview svg > path').first().getAttribute('d'));
   if(id==='madring')assert.match(await page.locator('#circuitAccuracy').textContent(),/preliminare.*non verificate/);
   if(id!==current)await page.locator('[data-select-circuit="'+id+'"]').click();
   assert.equal(await page.evaluate(()=>activeCircuit.id),id);
   assert.equal(await page.locator('.circuit-card.selected').count(),1);
   assert.equal(await page.locator('.circuit-card.selected').getAttribute('data-circuit-card'),id);
   assert.ok(await page.locator('#selectCircuitBtn').isDisabled());
   await page.locator('#circuits [data-go="menu"]').click();
   assert.equal(await page.locator('#homeCircuit').textContent(),'CIRCUITO SELEZIONATO · '+await page.evaluate(()=>activeCircuit.name));
   await page.locator('#menu [data-act="play"]').click();
   await page.locator('#startRaceBtn').click();
   assert.equal(await page.evaluate(()=>state),'countdown');assert.equal(await page.evaluate(()=>activeCircuit.id),id);
   assert.ok(await page.evaluate(()=>cars.length===23&&cars.every((c,k)=>{const q=gridSlot(k);return c.x===q.x&&c.y===q.y;})&&T===activeCircuit.samples));
   await page.evaluate(()=>{for(let i=0;i<150;i++)update(.05);render();toMenu();startQuali();for(let i=0;i<100;i++)update(.05);render();toMenu();});
   await page.reload();assert.equal(await page.evaluate(()=>activeCircuit.id),id);
   await page.locator('#menu [data-go="circuits"]').click();
  }
  await page.reload();assert.equal(await page.evaluate(()=>activeCircuit.id),ids.at(-1));
  await page.locator('#menu [data-go="circuits"]').click();
  await page.locator('[data-circuit="suzuka"]').click();
  await page.screenshot({animations:"disabled",path:path.join(folder,'circuits-preview.png')});
  await page.setViewportSize({width:360,height:800});
  await page.evaluate(()=>{$('circuits').scrollTop=0;});
  await page.screenshot({animations:"disabled",path:path.join(folder,'circuits-mobile.png')});
  assert.ok(await page.evaluate(()=>{const panel=$('circuits');return panel.scrollWidth<=panel.clientWidth+1;}));
  assert.ok(await page.locator('#circuitPreview').evaluate(el=>el.getBoundingClientRect().height>=200));
  for(const id of ids){const card=page.locator('[data-circuit="'+id+'"]');await card.click();assert.equal(await page.evaluate(()=>previewCircuitId),id);const select=page.locator('[data-select-circuit="'+id+'"]');assert.ok(await select.isVisible());}
  await page.locator('[data-circuit="monaco"]').click();await page.locator('#selectCircuitBtn').click();
  await page.locator('#circuits [data-go="menu"]').click();
  await page.screenshot({animations:"disabled",path:path.join(folder,'home-mobile.png')});
  await page.setViewportSize({width:1280,height:800});
  await page.locator('#menu [data-act="play"]').click();
  await page.locator('#startRaceBtn').click();
  await page.evaluate(()=>{pl.ai=true;for(let i=0;i<500;i++)update(.05);camX=pl.x;camY=pl.y;$('banner').textContent='';render();});
  await page.screenshot({animations:"disabled",path:path.join(folder,'monaco-race.png')});
  await page.evaluate(()=>{toMenu();S.qualiEnabled=true;});
  await page.locator('#menu [data-act="play"]').click();
  await page.evaluate(()=>{pl.ai=true;for(let i=0;i<1000;i++)update(.05);camX=pl.x;camY=pl.y;$('banner').textContent='';render();});
  await page.screenshot({animations:"disabled",path:path.join(folder,'monaco-quali.png')});
  for(const id of ['suzuka','monaco','spa']){
   await page.evaluate(id=>{
    toMenu();selectCircuit(id);startRace();updateCountdown(6);
    const s=activeCircuit.bridge?activeCircuit.bridge.over:activeCircuit.tunnel?(activeCircuit.tunnel.start+activeCircuit.tunnel.end)/2:activeCircuit.features[0].s,q=botPointAt(s);
    Object.assign(pl,{x:q.x,y:q.y,a:q.ang,idx:q.i,trackS:q.trackS,d:0,lane:0});camX=q.x;camY=q.y;camZ=.5;$('banner').textContent='';hudUpdate(.01);render();
   },id);
   await page.screenshot({animations:"disabled",path:path.join(folder,id+'-feature.png')});
  }
  const frameCost=await page.evaluate(()=>{pl.ai=true;const t=performance.now();for(let i=0;i<120;i++){update(1/60);render();}return(performance.now()-t)/120;});
  console.log('Costo medio update + render, 23 vetture: '+frameCost.toFixed(2)+' ms per frame (browser headless).');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('24 circuiti selezionabili, anteprime, persistenza, griglia gara e layout mobile verificati. Screenshot: '+folder);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
