'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.F1_BROWSER_CHANNEL||'msedge',headless:true}),errors=[];
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'f1-real-tyres-'));
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;if(!localStorage.getItem('f1sim.set'))localStorage.setItem('f1sim.set',JSON.stringify({vol:0,laps:10}));});
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  assert.equal(await page.locator('#settings [data-set="startCompound"]').count(),0);
  await page.evaluate(()=>{S.qualiEnabled=false;save();});
  for(const [compound,color,width] of [['SOFT','rgb(255, 51, 68)',1280],['MEDIUM','rgb(255, 212, 0)',360],['HARD','rgb(255, 255, 255)',320]]){
   await page.setViewportSize({width,height:800});
   await page.locator('#menu [data-act="play"]').click();
   assert.ok(await page.locator('#raceSetup').isVisible());assert.ok(await page.locator('#hud').isHidden());
   assert.equal(await page.locator('#raceSetup input[type="radio"]').count(),3);
   const radio=page.locator('[data-start-compound="'+compound+'"]');
   if(compound==='HARD'){
    await page.locator('[data-start-compound="SOFT"]').focus();
    await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
   }else await radio.check();
   assert.ok(await radio.isChecked());
   assert.equal(await radio.locator('..').locator('.starting-tyre-wheel').evaluate(el=>getComputedStyle(el).borderTopColor),color);
   assert.match(await page.locator('#raceTyreSummary').textContent(),new RegExp(compound));
   assert.ok(await page.locator('#raceSetup').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   const frozen=await page.evaluate(()=>JSON.stringify({raceTime,cd,cars:cars.map(c=>[c.x,c.y,c.go,c.tyres])}));
   await page.evaluate(()=>{for(let i=0;i<200;i++)update(.05);render();});
   assert.equal(await page.evaluate(()=>state),'prerace');
   assert.equal(await page.evaluate(()=>JSON.stringify({raceTime,cd,cars:cars.map(c=>[c.x,c.y,c.go,c.tyres])})),frozen);
   await page.screenshot({path:path.join(folder,'starting-'+compound.toLowerCase()+'.png')});
   await page.locator('#raceSetup [data-act="startrace"]').click();
   assert.equal(await page.evaluate(()=>state),'countdown');assert.equal(await page.evaluate(()=>pl.tyres.compound),compound);
   assert.ok(await page.evaluate(()=>pl.tyres.condition===1&&pl.tyres.distance===0&&pl.tyres.degradation&&!pl.go));
   assert.equal(await page.locator('#tyreText').textContent(),compound+' — 100%');
   await page.evaluate(()=>{updateCountdown(6);pl.ai=true;for(let i=0;i<300;i++)update(.05);});
   assert.equal(await page.evaluate(()=>pl.tyres.compound),compound);assert.ok(await page.evaluate(()=>pl.tyres.condition<1));
   await page.evaluate(()=>toMenu());
  }
  await page.reload();assert.equal(await page.evaluate(()=>S.startCompound),'HARD');
  await page.locator('#menu [data-act="play"]').click();assert.ok(await page.locator('[data-start-compound="HARD"]').isChecked());
  await page.locator('[data-start-compound="MEDIUM"]').check();await page.locator('#raceSetup [data-act="menu"]').click();
  assert.ok(await page.locator('#menu').isVisible());
  await page.locator('#menu [data-act="play"]').click();assert.ok(await page.locator('[data-start-compound="MEDIUM"]').isChecked());
  await page.locator('#raceSetup [data-act="startrace"]').click();await page.keyboard.press('Escape');
  await page.locator('#pause [data-act="restart"]').click();assert.ok(await page.locator('#raceSetup').isVisible());
  await page.locator('[data-start-compound="SOFT"]').check();await page.locator('#raceSetup [data-act="startrace"]').click();
  assert.ok(await page.evaluate(()=>pl.tyres.compound==='SOFT'&&pl.tyres.condition===1));
  await page.evaluate(()=>{cars.forEach((c,i)=>c.fin=100+i);endRace();});
  await page.locator('#result [data-act="restart"]').click();assert.ok(await page.locator('#raceSetup').isVisible());
  await page.locator('#raceSetup [data-act="menu"]').click();await page.setViewportSize({width:1280,height:800});
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
  console.log('Scelta pre-gara SOFT/MEDIUM/HARD, tastiera, persistenza, riavvio, colori, degrado, transito, classifica e mobile verificati. Screenshot: '+folder);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
