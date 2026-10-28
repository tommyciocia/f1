'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.F1_BROWSER_CHANNEL||'msedge',headless:true});
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'f1-career-')),errors=[],races=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;if(!localStorage.getItem('f1sim.set'))localStorage.setItem('f1sim.set',JSON.stringify({vol:0,laps:3,qualiMinutes:[4,4,4],qualiEnabled:false,circuitId:'monza',diff:4,myStats:[.8,.8,.8,.8]}));});
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  async function enterTeam(){
   await page.locator('#menu [data-act="career"]').click();await page.locator('[data-career-slot="team"]').click();
   if(await page.locator('#careerSetup').isVisible()){
    await page.locator('#careerTeamName').fill('Team Test');await page.locator('#careerDriverName').fill('Pilota Test');
    await page.locator('#careerDriverCode').fill('TST');await page.locator('#careerDriverNumber').fill('28');
    await page.locator('#careerCreateForm [type="submit"]').click();
   }
  }
  await enterTeam();
  assert.ok(await page.locator('#career').isVisible());assert.equal(await page.locator('[data-career-driver]').count(),23);assert.equal(await page.locator('[data-career-team]').count(),12);
  assert.match(await page.locator('#careerProgressText').textContent(),/0\/24/);assert.ok(await page.locator('#careerChampions').isHidden());
  assert.equal(await page.evaluate(()=>CIRCUIT_DATA.length),24);await page.screenshot({path:path.join(folder,'career-desktop.png')});
  await page.setViewportSize({width:360,height:800});await page.screenshot({path:path.join(folder,'career-mobile.png')});
  assert.ok(await page.locator('#career').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await page.locator('#careerTabcalendar').click();assert.equal(await page.locator('#careerCalendar li').count(),24);
  assert.ok(await page.locator('#careerCalendar').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.screenshot({path:path.join(folder,'calendar-mobile.png')});
  await page.locator('#careerTabhistory').click();assert.ok(await page.locator('.career-empty').isVisible());
  await page.locator('#career [data-act="career"]').click();await page.locator('#careerHub [data-act="menu"]').click();await page.locator('#menu [data-act="play"]').click();
  assert.ok(await page.locator('#raceSetup').isVisible());assert.equal(await page.evaluate(()=>careerRun),null);
  await page.locator('#raceSetup [data-act="menu"]').click();await enterTeam();
  await page.setViewportSize({width:1440,height:1000});await page.locator('#careerTabstandings').click();

  for(let round=0;round<24;round++){
   if(round===3){
    const before=await page.evaluate(()=>JSON.stringify(career.results));
    await page.locator('#careerStartBtn').click();await page.evaluate(()=>toMenu());await page.reload();
    assert.equal(await page.evaluate(()=>career.currentRound),3);assert.equal(await page.evaluate(()=>JSON.stringify(career.results)),before);
    await enterTeam();assert.match(await page.locator('#careerStartBtn').textContent(),/RIPRENDI/);
   }
   const expected=await page.evaluate(()=>career.calendar[career.currentRound]);await page.locator('#careerStartBtn').click();
   assert.equal(await page.evaluate(()=>activeCircuit.id),expected);assert.equal(await page.evaluate(()=>S.circuitId),'monza');assert.equal(await page.evaluate(()=>state),'quali');
   for(let phase=0;phase<3;phase++){
    if(round===0){
     const qualifying=await page.evaluate(()=>{if(pl.qActive)pl.ai=true;let steps=0;while(state==='quali'&&steps++<12000)update(.05);return{state,participants:qualiParticipants().length,timed:quali.results[quali.stage]?.rows.filter(r=>r.time!==null).length};});
     assert.equal(qualifying.state,phase===2?'qdone':'qbetween',JSON.stringify(qualifying));assert.equal(qualifying.participants,[23,17,10][phase]);assert.equal(qualifying.timed,qualifying.participants);
    }else{
     await page.evaluate(()=>togglePause());await page.locator('#endqBtn').click();
    }
    if(phase<2)await page.locator('#nextQBtn').click();
   }
   const grid=await page.evaluate(()=>quali.finalGrid.map(row=>row.id));await page.locator('#gridBtn').click();
   const compound=['SOFT','MEDIUM','HARD'][round%3];await page.locator('[data-start-compound="'+compound+'"]').check();
   await page.locator('#raceSetup [data-act="startrace"]').click();assert.deepEqual(await page.evaluate(()=>cars.map(c=>c.id)),grid);
   assert.equal(await page.evaluate(()=>pl.tyres.compound),compound);
   const race=await page.evaluate(()=>{
    updateCountdown(6);pl.ai=true;let requested=0,steps=0;
    while(state==='racing'&&steps++<26000){
     update(.05);
     if(state!=='racing')break;
     if(pl.lap>=1&&pl.pitStops===0&&onTrack(pl)&&requestPitEntry())requested++;
     if(pl.pit.phase==='waiting'){choosePitCompound('MEDIUM');confirmPitTyres();}
    }
    const result=career.results.at(-1),standings=careerStandings(career);
    return{state,steps,round:career.currentRound,circuit:result?.circuitId,rows:result?.rows.length,winner:result?.winnerId,
     points:result?.rows.reduce((n,row)=>n+row.points,0),total:standings.drivers.reduce((n,d)=>n+d.points,0),
     constructorTotal:standings.teams.reduce((n,t)=>n+t.points,0),requested,player:result?.rows.find(r=>r.id==='player'),
     actual:state==='done'?order().map(c=>c.id):null,stored:result?.rows.map(r=>r.id)};
   });
   assert.equal(race.round,round+1,JSON.stringify(race));assert.equal(race.circuit,expected);assert.equal(race.rows,23);assert.ok(race.winner);
   assert.equal(race.total,race.constructorTotal);assert.equal(race.requested,1);assert.ok(race.player.finished&&!race.player.disqualified);
   if(round<23){assert.equal(race.state,'done');assert.deepEqual(race.stored,race.actual);await page.locator('#careerContinueBtn').click();}
   else{assert.equal(race.state,'menu');assert.ok(await page.locator('#careerChampions').isVisible());}
   assert.equal(await page.evaluate(()=>activeCircuit.id),'monza');assert.equal(await page.evaluate(()=>careerRun),null);
   assert.match(await page.locator('#careerProgressText').textContent(),new RegExp((round+1)+'/24'));
   const totals=await page.evaluate(()=>career.results.reduce((n,r)=>n+r.rows.reduce((m,row)=>m+row.points,0),0));assert.equal(totals,race.total);
   races.push({round:race.round,circuit:race.circuit,winner:race.winner,points:race.points,playerPosition:race.player.position});
   if(round===0){
    await page.screenshot({path:path.join(folder,'career-after-gp.png')});await page.locator('#careerTabhistory').click();
    await page.locator('.career-history-race summary').first().click();assert.equal(await page.locator('[data-career-result-driver]').count(),23);
    await page.screenshot({path:path.join(folder,'career-results.png')});await page.locator('#careerTabstandings').click();
   }
  }
  assert.equal(await page.evaluate(()=>new Set(career.results.map(r=>r.circuitId)).size),24);
  assert.equal(await page.evaluate(()=>career.status),'complete');assert.ok(await page.locator('#careerStartBtn').isHidden());
  await page.locator('#career').evaluate(el=>el.scrollTop=0);await page.screenshot({path:path.join(folder,'world-champions.png')});
  await page.setViewportSize({width:360,height:800});await page.locator('#career').evaluate(el=>el.scrollTop=0);
  assert.ok(await page.locator('#career').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.screenshot({path:path.join(folder,'world-champions-mobile.png')});
  await page.reload();await enterTeam();assert.ok(await page.locator('#careerChampions').isVisible());
  await page.locator('[data-act="careernew"]').click();assert.equal(await page.evaluate(()=>career.number),2);assert.equal(await page.evaluate(()=>career.currentRound),0);
  assert.equal(await page.evaluate(()=>career.results.length),0);assert.ok(await page.locator('#careerChampions').isHidden());

  // Ritiro reale: nessun arrivo inventato per il giocatore, le altre vetture finiscono fisicamente.
  await page.setViewportSize({width:1280,height:800});await page.locator('#careerStartBtn').click();
  for(let phase=0;phase<3;phase++){await page.evaluate(()=>togglePause());await page.locator('#endqBtn').click();if(phase<2)await page.locator('#nextQBtn').click();}
  await page.locator('#gridBtn').click();await page.locator('#raceSetup [data-act="startrace"]').click();await page.evaluate(()=>updateCountdown(6));
  await page.keyboard.press('Escape');await page.locator('#careerRetireBtn').click();
  const retirement=await page.evaluate(()=>{let frames=0;while(state==='racing'&&frames++<3000)update(1/60);return{state,round:career.currentRound,row:career.results[0]?.rows.find(r=>r.id==='player'),others:career.results[0]?.rows.filter(r=>r.id!=='player').every(r=>r.finished)};});
  assert.equal(retirement.state,'done',JSON.stringify(retirement));assert.equal(retirement.round,1);assert.ok(retirement.others);
  assert.equal(retirement.row.status,'DNF');assert.equal(retirement.row.points,0);assert.equal(retirement.row.time,null);
  assert.deepEqual(errors,[]);console.log('Carriera: 24 GP reali, Q1/Q2/Q3 reali nel primo GP, soste, punteggi, riapertura, campioni e ritiro verificati.');
  console.log(JSON.stringify(races));console.log('Screenshot:',folder);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
