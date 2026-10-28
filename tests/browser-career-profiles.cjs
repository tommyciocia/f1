'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.F1_BROWSER_CHANNEL||'msedge',headless:true}),folder=fs.mkdtempSync(path.join(os.tmpdir(),'f1-career-profiles-'));
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;if(!localStorage.getItem('f1sim.set'))localStorage.setItem('f1sim.set',JSON.stringify({vol:0,laps:7,diff:1,qualiEnabled:false,circuitId:'monza'}));});
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  const original=await page.evaluate(()=>localStorage.getItem('f1sim.set'));
  async function hub(){await page.evaluate(()=>openCareerHub());assert.ok(await page.locator('#careerHub').isVisible());}
  async function choose(kind){await hub();await page.locator('[data-career-slot="'+kind+'"]').click();}
  async function option(key,value){const el=page.locator('[data-career-set="'+key+'"]');if(typeof value==='boolean')await el.setChecked(value);else if(await el.evaluate(e=>e.tagName==='SELECT'))await el.selectOption(String(value));else{await el.fill(String(value));await el.dispatchEvent('change');}}
  await page.locator('#menu [data-act="career"]').click();assert.equal(await page.locator('.career-slot').count(),2);
  assert.equal(await page.evaluate(()=>localStorage.getItem('f1sim.career.v1')),null);await page.screenshot({path:path.join(folder,'career-hub.png')});
  await page.setViewportSize({width:360,height:800});assert.ok(await page.locator('#careerHub').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.screenshot({path:path.join(folder,'career-hub-mobile.png')});
  await page.locator('[data-career-slot="team"]').click();await page.locator('#careerTeamName').fill('Aurora Racing');await page.locator('#careerDriverName').fill('Luca');await page.locator('#careerDriverCode').fill('LUC');await page.locator('#careerDriverNumber').fill('28');
  await page.locator('#careerPrimaryColor').fill('#aa2288');await page.locator('#careerAccentColor').fill('#22aabb');
  await page.screenshot({path:path.join(folder,'create-team-mobile.png')});await page.locator('#careerCreateForm [type="submit"]').click();
  assert.ok(await page.locator('#career').isVisible());assert.equal(await page.locator('[data-career-driver]').count(),23);assert.equal(await page.locator('[data-career-team]').count(),12);
  await page.locator('#careerTabsettings').click();await option('laps',5);await option('diff',4);await option('qualiEnabled',false);await option('qual','low');
  assert.ok(await page.locator('#career').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.screenshot({path:path.join(folder,'career-settings-mobile.png')});
  const teamSaved=await page.evaluate(()=>localStorage.getItem('f1sim.career.v1'));
  await choose('driver');await page.locator('#careerReplaceDriver').selectOption('3');
  assert.match(await page.locator('#careerSeatPreview').textContent(),/Lewis Hamilton/);assert.match(await page.locator('#careerSeatPreview').textContent(),/Charles Leclerc/);assert.match(await page.locator('#careerSeatPreview').textContent(),/Ferrari/);
  assert.ok(await page.locator('#careerTeamNameField').isHidden());await page.locator('#careerDriverName').fill('Giulia');await page.locator('#careerDriverCode').fill('GIU');await page.locator('#careerDriverNumber').fill('29');
  await page.screenshot({path:path.join(folder,'replace-driver-mobile.png')});await page.locator('#careerCreateForm [type="submit"]').click();
  assert.equal(await page.locator('[data-career-driver]').count(),22);assert.equal(await page.locator('[data-career-team]').count(),11);
  assert.equal(await page.locator('[data-career-driver="driver:3"]').count(),0);assert.match(await page.locator('[data-career-driver="player"]').textContent(),/Giulia/);
  await page.locator('#careerTabsettings').click();await option('laps',3);await option('diff',4);await option('qualiEnabled',true);
  for(let phase=0;phase<3;phase++){const el=page.locator('[data-career-qminutes="'+phase+'"]');await el.fill('4');await el.dispatchEvent('change');}
  await page.locator('[data-act="careersave"]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('f1sim.career.v1')),teamSaved);
  await page.reload();await choose('driver');assert.equal(await page.evaluate(()=>career.settings.laps),3);assert.equal(await page.evaluate(()=>career.settings.diff),4);
  await page.setViewportSize({width:1440,height:1000});await page.locator('#careerStartBtn').click();
  const seat=await page.evaluate(()=>({count:cars.length,team:pl.team,color:pl.col,top:pl.top,expected:1000*S.teamStats[1][0],mate:cars.find(c=>c.team===pl.team&&!c.isP).id}));
  assert.deepEqual(seat,{count:22,team:1,color:'#e10600',top:seat.expected,expected:seat.expected,mate:'driver:2'});
  for(let phase=0;phase<3;phase++){
   if(phase===0){const q=await page.evaluate(()=>{pl.ai=true;let steps=0;while(state==='quali'&&steps++<16000)update(.05);return{state,timed:quali.results[0]?.rows.filter(r=>r.time!==null).length};});assert.equal(q.state,'qbetween');assert.equal(q.timed,22);}
   else{await page.evaluate(()=>togglePause());await page.locator('#endqBtn').click();}
   if(phase<2)await page.locator('#nextQBtn').click();
  }
  assert.match(await page.locator('#qTitle').textContent(),/22 vetture/);await page.locator('#gridBtn').click();await page.locator('[data-start-compound="HARD"]').check();await page.locator('#raceSetup [data-act="startrace"]').click();
  const result=await page.evaluate(()=>{updateCountdown(6);pl.ai=true;let steps=0;while(state==='racing'&&steps++<30000){update(.05);if(pl.lap>=1&&pl.pitStops===0&&onTrack(pl))requestPitEntry();if(pl.pit.phase==='waiting'){choosePitCompound('MEDIUM');confirmPitTyres();}}return{state,round:career.currentRound,rows:career.results[0]?.rows.length,player:career.results[0]?.rows.find(r=>r.id==='player'),points:career.driverStandings.reduce((n,d)=>n+d.points,0),teamPoints:career.constructorStandings.reduce((n,d)=>n+d.points,0)};});
  assert.equal(result.state,'done',JSON.stringify(result));assert.equal(result.round,1);assert.equal(result.rows,22);assert.ok(result.player.finished&&!result.player.disqualified);assert.equal(result.points,result.teamPoints);
  assert.equal(await page.evaluate(()=>localStorage.getItem('f1sim.set')),original);await page.locator('#careerContinueBtn').click();assert.equal(await page.evaluate(()=>S.laps),7);assert.equal(await page.evaluate(()=>S.diff),1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('f1sim.career.v1')),teamSaved);
  await choose('team');assert.equal(await page.evaluate(()=>career.currentRound),0);assert.equal(await page.evaluate(()=>career.settings.laps),5);assert.equal(await page.evaluate(()=>career.settings.diff),4);
  await page.locator('#careerStartBtn').click();assert.ok(await page.locator('#raceSetup').isVisible());assert.equal(await page.evaluate(()=>S.laps),5);await page.locator('[data-start-compound="MEDIUM"]').check();await page.locator('#raceSetup [data-act="menu"]').click();
  await page.locator('#menu [data-act="play"]').click();assert.ok(await page.locator('#raceSetup').isVisible());assert.equal(await page.evaluate(()=>S.laps),7);assert.equal(await page.evaluate(()=>S.startCompound),'SOFT');assert.equal(await page.evaluate(()=>cars.length),23);
  await hub();await page.screenshot({path:path.join(folder,'career-two-saves.png')});await page.reload();await choose('driver');assert.equal(await page.evaluate(()=>career.currentRound),1);assert.equal(await page.evaluate(()=>career.settings.startCompound),'HARD');
  assert.deepEqual(errors,[]);console.log('Due carriere: creazione, 22 sedili, impostazioni isolate, salvataggi, riapertura e GP reale verificati. Screenshot:',folder);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
