'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {game,checkSeats}=require('./helpers/game.cjs');
const expected=[['albert-park',5.278,14],['shanghai',5.451,16],['suzuka',5.807,18],['bahrain',5.412,15],['jeddah',6.174,27],['miami',5.412,19],['montreal',4.361,14],['monaco',3.337,19],['barcelona',4.657,14],['red-bull-ring',4.326,10],['silverstone',5.891,18],['spa',7.004,19],['hungaroring',4.381,14],['zandvoort',4.259,14],['monza',5.793,11],['madring',5.414,22],['baku',6.003,20],['singapore',4.927,19],['cota',5.513,20],['mexico',4.304,17],['interlagos',4.309,15],['las-vegas',6.201,17],['lusail',5.419,16],['yas-marina',5.281,16]];
function intersections(points,closed=true){
 let count=0;const n=points.length,limit=closed?n:n-1;
 for(let i=0;i<limit;i++)for(let j=i+2;j<limit;j++){
  if(closed&&i===0&&j===n-1)continue;
  const a=points[i],b=points[(i+1)%n],c=points[j],d=points[(j+1)%n];
  if(Math.max(a.x,b.x)<Math.min(c.x,d.x)||Math.max(c.x,d.x)<Math.min(a.x,b.x)||Math.max(a.y,b.y)<Math.min(c.y,d.y)||Math.max(c.y,d.y)<Math.min(a.y,b.y))continue;
  const den=(b.x-a.x)*(d.y-c.y)-(b.y-a.y)*(d.x-c.x);if(Math.abs(den)<1e-8)continue;
  const u=((c.x-a.x)*(d.y-c.y)-(c.y-a.y)*(d.x-c.x))/den,v=((c.x-a.x)*(b.y-a.y)-(c.y-a.y)*(b.x-a.x))/den;
  if(u>1e-7&&u<1-1e-7&&v>1e-7&&v<1-1e-7)count++;
 }
 return count;
}

test('registro: esattamente i 24 circuiti richiesti, dati verificati e geometrie indipendenti',()=>{
 const g=game(),data=g.run('CIRCUIT_DATA.map(c=>({id:c.id,km:c.lengthKm,turns:c.turns,country:c.country,source:c.geometrySource,points:JSON.stringify(c.points),accuracy:c.accuracy}))');
 assert.deepEqual(Array.from(data,x=>x.id),expected.map(x=>x[0]));assert.equal(new Set(data.map(c=>c.points)).size,24);
 data.forEach((c,i)=>{assert.ok(Math.abs(c.km-expected[i][1])<1e-9);assert.equal(c.turns,expected[i][2]);assert.ok(c.country&&c.source.includes('8094e957')&&c.accuracy.includes('approssimata'));});
 assert.equal(g.run("CIRCUIT_DATA.find(c=>c.id==='singapore').reverse"),true);
});

test('selezione persistente, anteprima senza mutazioni, cambio schermata e griglia precedente invalidata',()=>{
 const g=game();g.run("renderCircuits();previewCircuit('monza');");assert.equal(g.run('activeCircuit.id'),'barcelona');
 assert.ok(g.run("selectCircuit('monza')"));assert.equal(g.run("JSON.parse(localStorage.getItem('f1sim.set')).circuitId"),'monza');
 assert.equal(game({circuitId:'monza'}).run('activeCircuit.id'),'monza');
 g.run("quali={finished:true};lastGrid=defOrder();selectCircuit('suzuka');");assert.equal(g.run('lastGrid'),null);assert.equal(g.run('quali'),null);
 g.run('startRace();');assert.equal(g.run("selectCircuit('spa')"),false);assert.equal(g.run('activeCircuit.id'),'suzuka');
 g.run('toMenu();');assert.equal(g.run('activeCircuit.id'),'suzuka');assert.equal(game({circuitId:'aurelia'}).run('activeCircuit.id'),'barcelona');
});

test('sovrappasso Suzuka: collisioni separate per quota e nessun aggancio al ramo sbagliato',()=>{
 const g=game({circuitId:'suzuka'});g.run('startRace();state="racing";cars.forEach(c=>{c.go=false;c.pit.phase="garage";});');
 const result=g.run(`(()=>{
  const b=activeCircuit.bridge,a=cars[0],c=cars[1];for(const o of[a,c]){o.go=true;o.pit.phase='track';o.x=b.x;o.y=b.y;o.vx=100;o.vy=0;}
  a.trackS=b.over;c.trackS=b.under;collide();const separate=a.x===c.x&&a.y===c.y;
  c.trackS=b.over;c.y+=10;collide();const sameLevelGap=Math.hypot(a.x-c.x,a.y-c.y);
  const branches=[];for(const s of[b.over,b.under]){const q=pointAtDistance(s);Object.assign(pl,{x:b.x,y:b.y,idx:q.i,trackS:s,ai:false,go:true});const i=nearest(pl,true);branches.push(Math.abs(signedTrackDistance(s,T[i].s)));}
  return{separate,sameLevelGap,branches,height:trackHeight(b.over)-trackHeight(b.under)};
 })()`);
 assert.ok(result.separate);assert.ok(result.sameLevelGap>=48-1e-7);assert.ok(result.branches.every(d=>d<120));assert.ok(result.height>60);
});

test('minimappa: coordinate finite per partenza, settori, box e vetture su ogni circuito',()=>{
 const g=game();assert.ok(g.run(`(()=>{let calls=0;const check=(x,y)=>{if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Coordinate minimappa non finite');calls++;};mctx.moveTo=check;mctx.lineTo=check;mctx.arc=check;for(const c of CIRCUIT_DATA){selectCircuit(c.id);drawMini();}return calls>100;})()`));
});

test('sorpassi: spazio sui rettilinei larghi, rientro in traiettoria e prudenza a Monaco',()=>{
 const g=game({circuitId:'cota',laps:3});
 const data=g.run(`(()=>{
  startRace();state='racing';cars.forEach(c=>{c.go=false;c.pit.phase='garage';});const a=pl,b=cars.find(c=>!c.isP);
  for(const [c,s,v] of[[a,L-2100,700],[b,L-1920,400]]){const q=botPointAt(s);Object.assign(c,{ai:true,go:true,x:q.x,y:q.y,a:q.ang,idx:q.i,trackS:q.trackS,d:0,lane:0,base:0,vx:Math.cos(q.ang)*v,vy:Math.sin(q.ang)*v,lap:0,launchT:0});c.pit.phase='track';}
  b.top=440;aiInput(a,.05);const planned=!!a.passTarget;let minGap=Infinity,passed=false;
  for(let i=0;i<400;i++){update(.05);minGap=Math.min(minGap,Math.hypot(a.x-b.x,a.y-b.y));if(trackDelta(a,b)<-100)passed=true;}
  const result={planned,passed,minGap,laneError:Math.abs(a.lane-idealLane(a)),bounded:Math.abs(a.d)<=TW/2-25};
  toMenu();selectCircuit('monaco');startRace();state='racing';cars.forEach(c=>{c.go=false;c.pit.phase='garage';});const leader=cars[0];pl.go=leader.go=true;pl.pit.phase=leader.pit.phase='track';leader.d=leader.lane=0;pl.trackS=0;leader.trackS=180;pl.idx=0;leader.idx=pointAtDistance(180).i;
  result.narrow=choosePassingLane(pl,leader).score<=25;return result;
 })()`);
 assert.ok(data.planned&&data.passed&&data.bounded&&data.narrow,JSON.stringify(data));assert.ok(data.minGap>=48-1e-6,JSON.stringify(data));assert.ok(data.laneError<25,JSON.stringify(data));
});

for(const [id] of expected){
 test(id+': geometria, direzione, 23 caselle, 12 box, settori e mappa',()=>{
  const g=game({circuitId:id});checkSeats(g);
  const info=g.run(`(()=>{render();let area=0;T.forEach((p,i)=>{const q=T[(i+1)%N];area+=p.x*q.y-q.x*p.y;});return{samples:T.map(p=>({x:p.x,y:p.y})),pit:activeCircuit.pitData.samples.map(p=>({x:p.x,y:p.y})),area,positions:new Set(cars.map(c=>c.x+':'+c.y)).size,grid:cars.every((c,k)=>{const q=gridSlot(k);return c.x===q.x&&c.y===q.y&&c.a===q.ang&&Math.abs(c.d)+20<TW/2;}),minGridGap:Math.min(...cars.flatMap((c,i)=>cars.slice(i+1).map(o=>Math.hypot(c.x-o.x,c.y-o.y)))),
   finite:T.every(p=>[p.x,p.y,p.len,p.vc].every(Number.isFinite)&&p.len>0),sectors:SECTOR_MARKS.length===2&&SECTOR_MARKS[0]>0&&SECTOR_MARKS[0]<SECTOR_MARKS[1]&&SECTOR_MARKS[1]<L,
   join:Math.hypot(pitPoint(PIT.exitEnd).x-pointAtDistance(PIT.exitEnd,activeCircuit,true).x,pitPoint(PIT.exitEnd).y-pointAtDistance(PIT.exitEnd,activeCircuit,true).y),roads:cars.every(c=>c.pit.route.length>0),map:circuitMap(activeCircuit,true).includes('<svg')};})()`);
  assert.ok(info.grid&&info.finite&&info.sectors&&info.roads&&info.map,JSON.stringify({...info,samples:undefined,pit:undefined}));assert.equal(info.positions,23);assert.ok(info.minGridGap>75);assert.ok(info.join<1e-7);
  assert.equal(intersections(info.samples),id==='suzuka'?1:0,'Incroci del centro pista');assert.equal(intersections(info.pit,false),0,'La corsia box si incrocia');
  if(id!=='suzuka')assert.equal(info.area>0,!['jeddah','miami','baku','singapore','cota','interlagos','las-vegas','yas-marina'].includes(id),'Senso di marcia');
 });

 test(id+': collisioni tra vetture, barriere e rilevamento manuale di giri e settori',()=>{
  const g=game({circuitId:id});
  const result=g.run(`(()=>{
   startRace();state='racing';cars.forEach(c=>{c.go=false;c.pit.phase='garage';});const a=cars[0],b=cars[1],q=pointAtDistance(L*.5);
   for(const c of[a,b])Object.assign(c,{go:true,x:q.x,y:q.y,trackS:L*.5,vx:0,vy:0,pit:{...c.pit,phase:'track'}});b.y+=10;collide();const gap=Math.hypot(a.x-b.x,a.y-b.y);
   Object.assign(pl,{go:true,ai:false,idx:q.i,trackS:q.s,x:q.x+q.nx*(TW/2+BAR+55),y:q.y+q.ny*(TW/2+BAR+55),a:q.ang,vx:q.nx*300,vy:q.ny*300,d:TW/2+BAR+55,inp:{st:0,thr:0,brk:0,rev:0}});pl.pit.phase='track';stepCar(pl,.01);const wallDistance=Math.abs((pl.x-q.x)*q.nx+(pl.y-q.y)*q.ny),limit=TW/2+BAR;
   startQuali();pl.go=true;pl.ai=false;pl.pit.phase='track';pl.pit.auto=false;pl.idx=0;pl.trackS=0;
   for(let k=1;k<=N*2;k++){const p=T[k%N];Object.assign(pl,{x:p.x,y:p.y,a:p.ang,vx:0,vy:0,inp:{st:0,thr:0,brk:0,rev:0}});raceTime+=.05;stepCar(pl,.01);}
   return{gap,wallDistance,limit,manualLaps:pl.qLaps,best:pl.best,expected:N*.05,sectors:pl.bestSecs.slice()};
  })()`);
  assert.ok(result.gap>=48-1e-7);assert.ok(result.wallDistance<=result.limit+3,JSON.stringify(result));assert.equal(result.manualLaps,1);assert.ok(Math.abs(result.best-result.expected)<1e-6);assert.ok(result.sectors.every(t=>t>0&&t<1e8));assert.ok(Math.abs(result.sectors.reduce((a,b)=>a+b,0)-result.best)<1e-6);
 });

 test(id+': Q1/Q2/Q3 reali, SOFT bloccate, rilascio regolare e griglia finale',()=>{
  const g=game({circuitId:id,qualiMinutes:[4,4,4]});g.run('startQuali();');const stages=[];
  for(let phase=0;phase<3;phase++){
   g.run('if(pl.qActive)pl.ai=true;');
   const data=g.run(`(()=>{let pitSpeed=0,finite=true,inside=true,tyres=true;for(let n=0;n<16000&&state==='quali';n++){
    update(.05);for(const c of cars){finite=finite&&[c.x,c.y,c.vx,c.vy,c.trackS].every(Number.isFinite);if(pitLimited(c))pitSpeed=Math.max(pitSpeed,Math.hypot(c.vx,c.vy)*.32);if(onTrack(c)&&c.ai)inside=inside&&Math.abs(c.d)<=TW/2-25;tyres=tyres&&c.tyres.condition===1&&c.tyres.compound==='SOFT'&&!c.tyres.degradation;}
   }const r=quali.results[quali.stage];return{state,participants:qualiParticipants().length,timed:r?.rows.filter(c=>c.time>0&&c.laps>0).length,eliminated:r?.eliminated.length,pitSpeed,finite,inside,tyres,time:raceTime,releases:qualiParticipants().slice().sort((a,b)=>a.relT-b.relT).map(c=>c.releasedAt)};})()`);
   assert.equal(data.state,phase===2?'qdone':'qbetween',JSON.stringify(data));assert.equal(data.participants,[23,17,10][phase]);assert.equal(data.timed,data.participants,JSON.stringify(data));assert.equal(data.eliminated,[6,7,0][phase]);assert.ok(data.pitSpeed<=80.001&&data.finite&&data.inside&&data.tyres,JSON.stringify(data));
   assert.ok(data.releases.every((s,i)=>i===0||s-data.releases[i-1]>=.5-1e-7));stages.push({participants:data.participants,timed:data.timed,time:data.time});if(phase<2)g.click('nextq');
  }
  const grid=Array.from(g.run('quali.finalGrid.map(c=>c.id)'));g.click('grid');assert.equal(g.run('state'),'prerace');g.click('startrace');assert.deepEqual(Array.from(g.run('cars.map(c=>c.id)')),grid);checkSeats(g);assert.equal(g.run('activeCircuit.id'),id);console.log(id+' qualifiche',JSON.stringify(stages));
 });

 test(id+': gara completa, pit stop richiesto a 80, cambio confermato e traguardo ai box',()=>{
  const g=game({circuitId:id,laps:2,diff:4,myStats:[.8,.8,.8,.8],startCompound:'MEDIUM'});g.run('startRace();pl.ai=true;');
  const data=g.run(`(()=>{let entered=false,initialLap=-1,pitCrossings=0,maxPitSpeed=0,maxPitStep=0,finite=true,inside=true,autoStops=0;const phases=new Set();
   for(let n=0;n<26000&&state!=='done';n++){
    const wasPit=pitAutopilot(pl),before={x:pl.x,y:pl.y,s:pl.trackS};update(.05);
    if(pl.lap>=0&&!entered&&requestPitEntry()){entered=true;initialLap=pl.lap;}
    if(pl.pit.phase==='waiting'){phases.add('waiting');choosePitCompound('MEDIUM');confirmPitTyres();}
    if(pitAutopilot(pl)&&pl.pit.phase!=='approach'){maxPitSpeed=Math.max(maxPitSpeed,Math.hypot(pl.vx,pl.vy)*.32);if(wasPit)maxPitStep=Math.max(maxPitStep,Math.hypot(pl.x-before.x,pl.y-before.y));}
    if(wasPit&&before.s<0&&pl.trackS>=0)pitCrossings++;phases.add(pl.pit.phase);
    for(const c of cars){finite=finite&&[c.x,c.y,c.vx,c.vy].every(Number.isFinite);if(c!==pl&&pitActive(c))autoStops++;if(onTrack(c)&&c.ai)inside=inside&&Math.abs(c.d)<=TW/2-25;}
   }render();const result={state,entered,initialLap,pitCrossings,maxPitSpeed,maxPitStep,finite,inside,autoStops,phases:[...phases],lap:pl.lap,finished:cars.filter(c=>c.fin).length,stops:pl.pitStops,compound:pl.tyres.compound,condition:pl.tyres.condition,dsq:pl.disqualified,best:pl.best,pending:cars.filter(c=>!c.fin).map(c=>({id:c.id,lap:c.lap,phase:c.pit.phase}))};toMenu();result.persisted=activeCircuit.id;return result;})()`);
  assert.equal(data.state,'done',JSON.stringify(data));assert.ok(data.entered&&data.finite&&data.inside);assert.equal(data.pitCrossings,1,JSON.stringify(data));assert.equal(data.lap,2);assert.equal(data.finished,23,JSON.stringify(data));assert.ok(data.maxPitSpeed<=80.001);assert.ok(data.maxPitStep<=13.5,JSON.stringify(data));assert.equal(data.autoStops,0);assert.equal(data.stops,1);assert.equal(data.compound,'MEDIUM');assert.ok(data.condition<1&&data.condition>0);assert.equal(data.dsq,false);assert.equal(data.persisted,id);assert.ok(data.best>0&&data.best<1e8);assert.ok(data.phases.includes('waiting')&&data.phases.includes('service'));
  console.log(id+' gara',JSON.stringify(data));
 });
}
