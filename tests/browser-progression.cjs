'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.F1_BROWSER_CHANNEL||'msedge',headless:true}),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('f1sim.set',JSON.stringify({vol:0}));});
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  for(const position of [0,11,22]){
   const result=await page.evaluate(position=>{
    toMenu();startQuali();const ids=defOrder().map(e=>e.isP?'player':'driver:'+e.di);
    ids.splice(ids.indexOf('player'),1);ids.splice(position,0,'player');
    for(let phase=0;phase<3;phase++){
     raceTime=100;for(const c of qualiParticipants()){c.best=60+ids.indexOf(c.id);c.qLaps=1;c.qBestSetAt=ids.indexOf(c.id);}
     endQuali();if(phase<2)nextQualiSession();
    }
    startRace();render();const initial={rank:order().indexOf(pl),zero:cars.every(c=>c.lap===0&&c.fin===0),tower:[...$('tower').children].map(el=>el.dataset.driverId)};
    updateCountdown(6);keys.KeyW=true;for(let i=0;i<200;i++)update(.01);keys.KeyW=false;render();
    const progress=cars.map(prog);return{initial,lap:pl.lap,zero:cars.every(c=>c.lap===0),spread:Math.max(...progress)-Math.min(...progress)};
   },position);
   assert.equal(result.initial.rank,position);assert.equal(result.initial.tower[position],'player');assert.ok(result.initial.zero&&result.zero);
   assert.equal(result.lap,0);assert.ok(result.spread<5000,JSON.stringify(result));
  }
  for(const id of ['barcelona','suzuka','monaco']){
   const result=await page.evaluate(id=>{
    toMenu();selectCircuit(id);startRace();state='racing';pl.go=true;pl.ai=false;pl.pit.phase='track';pl.pit.auto=false;pl.trackS=L-1;pl.idx=N-1;
    function sample(i){const q=T[i];pl.x=q.x;pl.y=q.y;pl.a=q.ang;pl.vx=pl.vy=0;pl.inp={st:0,thr:0,brk:0,rev:0};raceTime+=.05;stepCar(pl,.01);sectorHud(pl);}
    sample(0);const stages=[$('sectors').querySelector('.active b').textContent];
    for(let i=1;i<=N;i++){sample(i%N);const active=$('sectors').querySelector('.active b').textContent;if(stages.at(-1)!==active)stages.push(active);}
    render();return{stages,lap:pl.lap,times:pl.lastSecs,total:pl.best,html:$('sectors').textContent};
   },id);
   assert.deepEqual(result.stages,['S1','S2','S3','S1'],id);assert.equal(result.lap,1,id);
   assert.ok(result.times.every(t=>t>0),id);assert.ok(Math.abs(result.times.reduce((a,b)=>a+b,0)-result.total)<1e-7,id);
   assert.ok(result.html.includes(result.times[2].toFixed(3)),id);
  }
  for(const id of ['barcelona','suzuka','monaco'])for(const edge of [false,true]){
   const phases=await page.evaluate(({id,edge})=>{
    toMenu();selectCircuit(id);startQuali();const out=[];
    for(let phase=0;phase<3;phase++){
     pl.go=true;pl.ai=false;pl.pit.phase='track';pl.pit.auto=false;pl.trackS=L-1;pl.idx=N-1;
     function sample(i,d=0){const q=T[i];pl.x=q.x+q.nx*d;pl.y=q.y+q.ny*d;pl.a=q.ang;pl.vx=pl.vy=0;pl.inp={st:0,thr:0,brk:0,rev:0};raceTime+=.05;stepCar(pl,.01);sectorHud(pl);}
     sample(0);const colors=[];
     for(let i=1;i<=N;i++){
      const previous=pl.activeSec;sample(i%N,edge&&i>N*.3&&i<N*.5?TW/2+30:0);
      if(pl.activeSec!==previous){const n=previous,cell=$('sectors').children[n];colors.push(getComputedStyle(cell.querySelector('span')).color);}
     }
     qHud(1);const best=pl.best,laps=pl.qLaps,states=pl.lastState.slice(),sum=pl.lastSecs.reduce((a,b)=>a+b,0);
     const visible=$('tower').querySelector('[data-driver-id="player"]').textContent.includes(fmt(best));
     const saved=pl.qualiTimes[phase];endQuali();out.push({best,laps,states,sum,colors,visible,saved,stored:quali.results[phase].rows.find(r=>r.id==='player').time});
     if(phase<2)nextQualiSession();
    }return out;
   },{id,edge});
   for(const result of phases){
    assert.equal(result.laps,1,id);assert.ok(result.best>0&&result.best<1e8,id);assert.equal(result.stored,result.best,id);assert.equal(result.saved,result.best,id);
    assert.ok(Math.abs(result.sum-result.best)<1e-7&&result.visible,id);
    assert.deepEqual(result.states,['fastest','fastest','fastest'],id);assert.deepEqual(result.colors,['rgb(198, 140, 255)','rgb(198, 140, 255)','rgb(198, 140, 255)'],id);
   }
  }
  assert.deepEqual(errors,[]);console.log('Browser: griglia e gara verificate; in Q1/Q2/Q3 settori colorati e tempo registrato su Barcelona, Suzuka e Monaco.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
