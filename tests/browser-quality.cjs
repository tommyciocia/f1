'use strict';
// Accettazione attraverso l'hosting reale, senza accedere ai profili personali.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright'),{createGameServer}=require('../server/server.cjs');
(async()=>{
 const server=createGameServer({limiterOptions:{burst:1000,perSecond:200}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:process.env.F1_BROWSER_CHANNEL||'msedge',headless:true});
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'f1-quality-')),errors=[],races=[],layouts=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{window.__nativeRAF=requestAnimationFrame.bind(window);requestAnimationFrame=()=>0;if(!localStorage.getItem('f1sim.set'))localStorage.setItem('f1sim.set',JSON.stringify({vol:.4,laps:3,qualiMinutes:[4,4,4],qualiEnabled:false}));});
  await page.goto('http://127.0.0.1:'+server.address().port);
  assert.ok(await page.locator('#menu').isVisible());
  for(const panel of ['cars','paddock','settings','controls','records','circuits']){
   await page.locator('#menu [data-go="'+panel+'"]').click();assert.ok(await page.locator('#'+panel).isVisible());
   if(panel==='cars'){
    await page.locator('[data-my="driver"]').fill('Alex');await page.locator('[data-my="code"]').fill('ALX');await page.locator('[data-my="name"]').fill('Apex Racing');await page.locator('[data-my="num"]').fill('27');
    await page.locator('[data-act="resetmy"]').click();
   }
   if(panel==='paddock'){
    await page.locator('#padTeamName').fill('Squadra Test');await page.locator('#padDriver1').selectOption('2');await page.locator('[data-act="resetteam"]').click();
   }
   if(panel==='controls'){await page.locator('.controller-config summary').click();await page.locator('#resetPadControls').click();}
   if(panel==='circuits'){
    await page.locator('[data-circuit="monza"]').click();await page.locator('#selectCircuitBtn').click();
    assert.equal(await page.evaluate(()=>activeCircuit.id),'monza');
   }
   await page.locator('#'+panel+' [data-go="menu"]').click();
  }
  await page.locator('#menuMuteButton').click();assert.equal(await page.evaluate(()=>S.muted),true);
  await page.reload();assert.equal(await page.evaluate(()=>S.muted),true);await page.locator('#menuMuteButton').click();
  await page.locator('#menu [data-act="play"]').click();assert.ok(await page.locator('#raceSetup').isVisible());
  for(const compound of ['SOFT','MEDIUM','HARD'])await page.locator('[data-start-compound="'+compound+'"]').check();
  await page.locator('[data-act="startrace"]').click();await page.evaluate(()=>{updateCountdown(6);pl.ai=true;update(.05);render(0);});
  await page.locator('#hudActions [data-act="pause"]').click();assert.equal(await page.evaluate(()=>state),'paused');
  await page.locator('#pause [data-act="resume"]').click();assert.equal(await page.evaluate(()=>state),'racing');
  // WebAudio originale: motore, frenata, mute, segnale finale e silenzio in pausa.
  const audio=await page.evaluate(async()=>{
   initAudio();engineSound({...pl,vx:700,vy:0,inp:{thr:1,brk:1}},true);await new Promise(r=>setTimeout(r,160));
   const out={state:AC?.state,engine:engG?.gain.value,braking:brakeG?.gain.value};
   finishSound();togglePause();await new Promise(r=>setTimeout(r,160));out.pausedEngine=engG?.gain.value;out.pausedBrake=brakeG?.gain.value;return out;
  });
  assert.equal(audio.state,'running');assert.ok(audio.engine>.05&&audio.braking>.01);assert.ok(audio.pausedEngine<.005&&audio.pausedBrake<.005);
  await page.locator('#pause [data-act="restart"]').click();assert.equal(await page.evaluate(()=>state),'prerace');
  await page.locator('#raceSetup [data-act="menu"]').click();
  await page.locator('#menu [data-act="career"]').click();await page.locator('[data-career-slot="team"]').click();
  assert.equal(await page.locator('#careerSeasonLength').inputValue(),'10');
  await page.locator('#careerTeamName').fill('Apex Racing');await page.locator('#careerDriverName').fill('Alex');await page.locator('#careerDriverCode').fill('ALX');await page.locator('#careerDriverNumber').fill('27');
  await page.locator('#careerCreateForm [type="submit"]').click();assert.equal(await page.evaluate(()=>career.calendar.length),10);
  await page.locator('#careerTabsettings').click();await page.locator('[data-career-set="qualiEnabled"]').check();
  await page.locator('#careerTabcalendar').click();assert.equal(await page.locator('#careerCalendar li').count(),10);
  await page.locator('#careerTabhistory').click();assert.ok(await page.locator('.career-empty').isVisible());await page.locator('#careerTabstandings').click();
  for(let round=0;round<10;round++){
   await page.locator('#careerStartBtn').click();
   for(let phase=0;phase<3;phase++){
    if(round===0){
     const q=await page.evaluate(()=>{if(pl.qActive)pl.ai=true;for(let i=0;i<16000&&state==='quali';i++)update(.05);return{state,count:qualiParticipants().length,timed:quali.results[quali.stage]?.rows.filter(r=>r.time).length};});
     assert.equal(q.state,phase===2?'qdone':'qbetween');assert.equal(q.count,[23,17,10][phase]);assert.equal(q.timed,q.count);
    }else{await page.evaluate(()=>togglePause());await page.locator('#endqBtn').click();}
    if(phase<2)await page.locator('#nextQBtn').click();
   }
   await page.locator('#gridBtn').click();await page.locator('[data-start-compound="'+['SOFT','MEDIUM','HARD'][round%3]+'"]').check();await page.locator('[data-act="startrace"]').click();
   if(round===0){
    await page.evaluate(()=>{updateCountdown(6);pl.ai=true;for(let i=0;i<600;i++)update(.05);camX=pl.x;camY=pl.y;clearTimeout(banner.t);$('banner').textContent='';render(0);});
    for(const size of [{width:1920,height:1080},{width:1280,height:720},{width:640,height:360},{width:320,height:568}]){
     await page.setViewportSize(size);await page.evaluate(()=>render(0));
     const layout=await page.evaluate(()=>{
      const ids=['top','tower','bottom','tyreIndicator','mini','hudActions'];
      const rects=Object.fromEntries(ids.map(id=>{const r=$(id).getBoundingClientRect();return[id,{x:r.x,y:r.y,w:r.width,h:r.height}];}));
      return{w:innerWidth,h:innerHeight,rects};
     });
     for(const [id,r] of Object.entries(layout.rects))assert.ok(r.x>=-1&&r.y>=-1&&r.x+r.w<=size.width+1&&r.y+r.h<=size.height+1,id+JSON.stringify(layout));
     const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
     assert.ok(!overlaps(layout.rects.tyreIndicator,layout.rects.mini));assert.ok(!overlaps(layout.rects.tower,layout.rects.top));
     layouts.push(layout);await page.screenshot({animations:'disabled',path:path.join(folder,'race-'+size.width+'.png')});
    }
    await page.setViewportSize({width:1440,height:900});
   }
   const race=await page.evaluate(()=>{
    updateCountdown(6);pl.ai=true;let steps=0;
    while(state==='racing'&&steps++<26000){update(.05);if(state!=='racing')break;if(pl.lap>=1&&!pl.pitStops&&onTrack(pl))requestPitEntry();if(pl.pit.phase==='waiting'){choosePitCompound('MEDIUM');confirmPitTyres();}}
    return{state,round:career.currentRound,circuit:career.results.at(-1)?.circuitId,finished:career.results.at(-1)?.rows.filter(r=>r.finished).length,player:career.results.at(-1)?.rows.find(r=>r.id==='player'),points:career.driverStandings.reduce((n,d)=>n+d.points,0)};
   });
   assert.equal(race.round,round+1,JSON.stringify(race));assert.equal(race.finished,23,JSON.stringify(race));assert.ok(race.player.finished&&!race.player.disqualified);assert.equal(race.points,(round+1)*101);races.push(race);
   if(round===0){assert.ok(await page.locator('#hud').isHidden());await page.evaluate(()=>render(0));await page.screenshot({animations:'disabled',path:path.join(folder,'podium.png')});}
   if(round<9){await page.locator('#careerContinueBtn').click();await page.reload();await page.locator('#menu [data-act="career"]').click();await page.locator('[data-career-slot="team"]').click();}
  }
  assert.ok(await page.locator('#careerChampions').isVisible());assert.equal(await page.evaluate(()=>career.status),'complete');await page.screenshot({animations:'disabled',path:path.join(folder,'champions.png')});
  await page.locator('[data-act="careernew"]').click();assert.equal(await page.evaluate(()=>career.calendar.length),10);assert.equal(await page.evaluate(()=>career.number),2);
  await page.locator('#career [data-act="career"]').click();await page.locator('#careerHub [data-act="menu"]').click();
  for(const size of [{width:320,height:568},{width:640,height:360},{width:1440,height:900}]){
   await page.setViewportSize(size);assert.ok(await page.locator('#menu').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.screenshot({animations:'disabled',path:path.join(folder,'menu-'+size.width+'.png')});
  }
  // Ciclo vero dei frame per tre secondi, misurato separatamente dalla simulazione rapida.
  await page.evaluate(()=>{startRace();updateCountdown(6);pl.ai=true;last=null;});
  const live=await page.evaluate(()=>new Promise(resolve=>{
   let start=null,count=0;const tick=t=>{if(start===null)start=t;count++;if(t-start<3000)window.requestAnimationFrame(tick);else{window.requestAnimationFrame=()=>0;resolve({frames:count,fps:count*1000/(t-start),state,raceTime});}};
   window.requestAnimationFrame=window.__nativeRAF;window.requestAnimationFrame(frame);window.requestAnimationFrame(tick);
  }));
  assert.ok(live.frames>30&&live.state==='racing',JSON.stringify(live));
  await page.evaluate(()=>{const original=console.error;try{console.error=()=>{};failGame(Error('Errore controllato per il test UI'));}finally{console.error=original;}});
  assert.ok(await page.locator('#runtimeError').isVisible());await page.locator('#runtimeError [data-act="menu"]').click();
  assert.ok(await page.locator('#menu').isVisible());assert.equal(await page.evaluate(()=>career.number),2);
  assert.deepEqual(errors,[]);
  const report={date:'2026-10-30',browser:browser.version(),audio,races,layouts,live,errors,screenshots:folder};
  fs.writeFileSync(path.join(__dirname,'../docs/validation-quality-browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log('Tutte le schermate, audio, layout, Q1/Q2/Q3 e 10 GP reali con 23 arrivi verificati.',JSON.stringify({live,screenshots:folder}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
