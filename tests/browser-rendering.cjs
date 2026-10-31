'use strict';
// Regressioni browser: ultimo giro manuale, nodi HUD stabili e rendering a piena qualità.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.F1_BROWSER_CHANNEL||'msedge',headless:true});
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'f1-rendering-')),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:2});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{window.testRAF=requestAnimationFrame.bind(window);requestAnimationFrame=()=>0;localStorage.setItem('f1sim.set',JSON.stringify({vol:0,qualiMinutes:[1,1,1]}));});
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  for(const circuit of ['barcelona','monaco','suzuka'])for(const attempt of ['valid','invalidBefore','invalidAfter','outlap']){
   const result=await page.evaluate(({circuit,attempt})=>{
    toMenu();selectCircuit(circuit);startQuali();
    function pose(s,d=0){const p=botPointAt(s);Object.assign(pl,{x:p.x+p.nx*d,y:p.y+p.ny*d,a:p.ang,idx:p.i,trackS:p.trackS,d,lane:d,vx:Math.cos(p.ang)*200,vy:Math.sin(p.ang)*200,go:true});pl.pit.phase='track';pl.pit.auto=pl.pit.onLane=false;}
    pose(L*.4);raceTime=59.99;pl.lap=0;pl.lapStart=30;
    pl.qLapActive=pl.qLapValid=attempt!=='outlap';pl.qLapSectors=1;pl.qLapDistance=L*.4;
    if(attempt==='invalidBefore')invalidateQualiLap(pl);
    keys.KeyW=true;update(.02);
    if(attempt==='invalidAfter'){repos();update(.01);}
    const manual=qEnd&&!pl.ai&&!pl.qd&&pl.inp.thr===1;
    if(attempt==='valid'){pl.qLapSectors=3;pl.qLapDistance=L;}
    pose(L-1);update(.02);keys.KeyW=false;
    return{manual,finished:pl.qd&&pl.ai&&!pl.qLapActive,state,laps:pl.qLaps,time:quali.results[0]?.rows.find(r=>r.id==='player').time};
   },{circuit,attempt});
   assert.ok(result.manual,JSON.stringify({circuit,attempt,...result}));assert.ok(result.finished);
   assert.equal(result.state,'qbetween');assert.equal(result.laps,attempt==='valid'?1:0);
   assert.ok(attempt==='valid'?result.time>0:result.time===null,JSON.stringify(result));
  }
  for(const circuit of ['barcelona','monaco','suzuka']){
   const phases=await page.evaluate(async circuit=>{
    toMenu();selectCircuit(circuit);startQuali();const out=[];
    for(let phase=0;phase<3;phase++){
     resetQualiRelease();cars.forEach(c=>{parkInGarage(c);c.qd=true;});const rival=cars.find(c=>c.qActive&&!c.isP);
     for(const [c,s] of [[pl,L-1],[rival,L*.55]]){
      const p=pointAtDistance(s),sector=s>=SECTOR_MARKS[1]?2:s>=SECTOR_MARKS[0]?1:0;
      Object.assign(c,{x:p.x,y:p.y,a:p.ang,idx:p.i,trackS:p.s,d:0,lane:0,base:0,vx:Math.cos(p.ang)*200,vy:Math.sin(p.ang)*200,
       go:true,qd:false,lap:0,lapStart:1,qLapActive:true,qLapValid:true,qLapDistance:s,qLapSectors:sector===2?3:sector,
       activeSec:sector,secStart:1+sector*20,secs:[sector>0?20:null,sector>1?20:null,null]});
      c.pit.phase='track';c.pit.auto=c.pit.onLane=false;
     }
     // Il passaggio deve avvenire dopo lo zero: a 59.995 un nuovo giro è ancora valido.
     raceTime=60;update(.02);const playerTime=pl.best;let frames=0;
     while(state==='quali'&&frames++<600)await new Promise(resolve=>testRAF(()=>{update(1/60);render(1/60);resolve();}));
     const result=quali.results[phase],row=$('qList').querySelector('[data-driver-id="'+rival.id+'"]');
     out.push({state,frames,playerUnchanged:pl.best===playerTime&&pl.qLaps===1,rivalTime:result?.rows.find(r=>r.id===rival.id).time,
      rivalLaps:rival.qLaps,visible:!!row&&row.textContent.includes(fmt(rival.best)),rows:result?.rows.length});
     if(phase<2)nextQualiSession();
    }return out;
   },circuit);
   for(const [phase,result] of phases.entries()){
    assert.equal(result.state,phase===2?'qdone':'qbetween',JSON.stringify({circuit,phase,...result}));
    assert.ok(result.frames<600&&result.playerUnchanged&&result.visible);assert.ok(result.rivalTime>0&&result.rivalTime<1e8);
    assert.equal(result.rivalLaps,1);assert.equal(result.rows,[23,17,10][phase]);
   }
  }
  const hud=await page.evaluate(()=>{
   startRace();state='racing';hudUpdate(0);
   const row=$('tower').firstElementChild,sector=$('sector0'),time=$('sectorTime0');
   const observer=new MutationObserver(()=>{});observer.observe($('tower'),{childList:true});
   for(let i=0;i<120;i++){raceTime+=1/60;hudUpdate(1/60);}
   const rebuilds=observer.takeRecords().length;observer.disconnect();
   const stable=row===$('tower').firstElementChild&&sector===$('sector0')&&time===$('sectorTime0');
   pl.tyres.compound='HARD';pl.pitStops=1;pl.best=60;pl.lap=2;hudUpdate(0);
   const playerRow=$('tower').querySelector('[data-driver-id="player"]');
   return{rebuilds,stable,compound:playerRow.querySelector('.tyre-compound').textContent,pit:playerRow.querySelector('.pit-stop-status').textContent,fastest:playerRow.classList.contains('fastest-lap'),leader:$('tower').firstElementChild.dataset.driverId,liveTime:time.textContent};
  });
  assert.equal(hud.rebuilds,0);assert.ok(hud.stable);assert.equal(hud.compound,'H');assert.equal(hud.pit,'1/1');
  assert.ok(hud.fastest);assert.equal(hud.leader,'player');assert.notEqual(hud.liveTime,'0.000');
  for(const circuit of ['barcelona','suzuka']){
   const rendering=await page.evaluate(circuit=>{
    toMenu();selectCircuit(circuit);startRace();state='racing';pl.ai=true;cars.forEach(c=>c.go=true);
    for(let i=0;i<1500;i++)update(.05);camX=pl.x;camY=pl.y;render();
    const drawn=[],originalCar=drawCar;drawCar=(c,shadow)=>{if(!shadow)drawn.push(c.id);originalCar(c,shadow);};
    let cached;try{render(0);cached=cv.toDataURL();}finally{drawCar=originalCar;}
    const layer=drawVehicleLayer;drawVehicleLayer=include=>{const bounds=renderBounds;renderBounds=null;try{layer(include);}finally{renderBounds=bounds;}};
    let samePixels;try{render(0);samePixels=cached===cv.toDataURL();}finally{drawVehicleLayer=layer;}
    const high=[$('mini').width,$('mini').height,mm.width,mm.height];S.qual='low';render(0);
    const low=[$('mini').width,$('mini').height,mm.width,mm.height];S.qual='high';render(0);
    const reset=()=>{camX=pl.x-100;camY=pl.y-100;camZ=.6;};
    reset();render(1/60);render(1/60);const split=[camX,camY,camZ];reset();render(1/30);
    return{samePixels,drawn:drawn.length,total:cars.length,player:drawn.includes('player'),high,low,cameraConsistent:split.every((v,i)=>Math.abs(v-[camX,camY,camZ][i])<1e-8)};
   },circuit);
   assert.ok(rendering.samePixels,circuit);assert.ok(rendering.player);assert.ok(rendering.drawn<rendering.total,JSON.stringify(rendering));
   assert.deepEqual(rendering.high,[400,300,400,300]);assert.deepEqual(rendering.low,[200,150,200,150]);assert.ok(rendering.cameraConsistent);
  }
  await page.screenshot({path:path.join(folder,'race-hidpi.png')});
  await page.setViewportSize({width:360,height:800});await page.evaluate(()=>render(0));
  await page.screenshot({path:path.join(folder,'race-mobile-hidpi.png')});
  assert.deepEqual(errors,[]);console.log('Simulazione avversari dopo il giocatore in Q1/Q2/Q3, ultimo giro manuale, HUD stabile e rendering verificati. Screenshot:',folder);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
