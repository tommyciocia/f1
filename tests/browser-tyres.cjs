'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.F1_BROWSER_CHANNEL||'msedge',headless:true}),errors=[];
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'f1-real-tyres-'));
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('f1sim.set',JSON.stringify({vol:0,laps:10}));});
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await page.evaluate(()=>{startQuali();update(.01);render();$('banner').textContent='';});
  assert.equal(await page.locator('#tower .tyre-s').count(),23);assert.equal(await page.locator('#tyreText').textContent(),'SOFT — 100%');assert.ok(await page.locator('#pitRuleStatus').isHidden());
  await page.evaluate(()=>{S.startCompound='HARD';startRace();updateCountdown(6);hudUpdate(.01);render();$('banner').textContent='';});
  const rows=page.locator('#tower [data-driver-id]');assert.equal(await rows.count(),23);assert.equal(await page.locator('#tower .pit-due').count(),0);
  assert.equal(await page.locator('#tower [data-driver-id="player"] .tyre-compound').textContent(),'H');assert.match(await page.locator('#pitRuleStatus').textContent(),/TRANSITO/);
  for(const [code,color] of[['s','rgb(255, 51, 68)'],['m','rgb(255, 212, 0)'],['h','rgb(255, 255, 255)']])assert.equal(await page.locator('#tower .tyre-'+code).first().evaluate(el=>getComputedStyle(el).color),color);
  await page.evaluate(()=>{pl.ai=true;for(let i=0;i<600;i++)update(.05);camX=pl.x;camY=pl.y;render();});
  assert.ok(await page.evaluate(()=>pl.tyres.condition<1&&cars.every(c=>c.pitStops===0&&onTrack(c))));await page.screenshot({path:path.join(folder,'race-desktop.png')});
  const tyre=await page.evaluate(()=>{
   pl.ai=false;const q=pointAtDistance(PIT.entryStart-100,activeCircuit,true);Object.assign(pl,{x:q.x,y:q.y,a:q.ang,idx:q.i,trackS:q.s,d:0,lane:0,vx:Math.cos(q.ang)*200,vy:Math.sin(q.ang)*200});
   const before=JSON.stringify(pl.tyres);if(!requestPitEntry())throw Error('Ingresso X non disponibile');for(let i=0;i<2000&&pitActive(pl);i++)update(.05);hudUpdate(.05);return{before,after:JSON.stringify(pl.tyres),phase:pl.pit.phase,stops:pl.pitStops};
  });
  assert.equal(tyre.phase,'track');assert.equal(tyre.before,tyre.after);assert.equal(tyre.stops,0);assert.ok(await page.locator('#pitService').isHidden());
  await page.evaluate(()=>{const bot=cars.find(c=>!c.isP);fitTyres(bot,'MEDIUM');bot.lap=2;hudUpdate(.01);});
  assert.equal(await page.locator('#tower [data-driver-id="driver:0"] .tyre-compound').textContent(),'M');
  await page.setViewportSize({width:360,height:800});await page.evaluate(()=>{render();$('banner').textContent='';});await page.screenshot({path:path.join(folder,'race-mobile.png')});
  const layout=await rows.evaluateAll(list=>list.map(row=>{const b=row.querySelector('.tyre-compound').getBoundingClientRect();return{x:b.x,right:b.right,top:b.top,bottom:b.bottom};}));assert.ok(layout.every(b=>b.x>=0&&b.right<=360&&b.top>=0&&b.bottom<=800));
  await page.evaluate(()=>{cars.forEach((c,i)=>{c.fin=100+i;c.pitStops=0;});pl.fin=50;endRace();renderRecords();});
  assert.doesNotMatch(await page.locator('#resList .me').textContent(),/DSQ/);assert.match(await page.locator('#recList').textContent(),/Barcelona/);assert.equal(errors.length,0,errors.join('\n'));
  console.log('Mescole, colori, degrado, transito senza cambio gomme, classifica e mobile verificati. Screenshot: '+folder);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
