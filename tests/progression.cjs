'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {game,checkSeats}=require('./helpers/game.cjs');

test('gara: zero giri per tutti e ordine reale della griglia su tutti i 24 circuiti',()=>{
 const g=game();
 const rows=g.run(`(()=>{const out=[];for(const circuit of CIRCUIT_DATA){
  toMenu();selectCircuit(circuit.id);
  for(const position of [0,11,22]){
   const entries=defOrder(),player=entries.splice(entries.findIndex(e=>e.isP),1)[0];entries.splice(position,0,player);startRace(entries);
   const ids=cars.map(c=>c.id),grid=cars.every((c,k)=>{const q=gridSlot(k);return Math.hypot(c.x-q.x,c.y-q.y)<1e-7&&Math.abs(angDiff(c.a,q.ang))<1e-7;});
   const zero=cars.every(c=>c.lap===0&&c.fin===0&&c.pen===0&&c.best===1e9);
   update(.01);out.push({id:circuit.id,position,grid,zero,ordered:ids.join()===order().map(c=>c.id).join(),rank:order().indexOf(pl)});
  }
 }return out;})()`);
 for(const row of rows){assert.ok(row.grid&&row.zero&&row.ordered,JSON.stringify(row));assert.equal(row.rank,row.position,JSON.stringify(row));}
 checkSeats(g);
});

test('S1 e S2 vengono rilevati nella posizione esatta anche all’interno dello stesso segmento',()=>{
 const g=game();
 const result=g.run(`(()=>{startRace();state='racing';pl.raceStarted=true;pl.raceLapValid=true;pl.lap=0;
  const mark=T[Math.floor(N*.3)].s+T[Math.floor(N*.3)].len*.5;SECTOR_MARKS=[mark,L*.7];
  const i=pointAtDistance(mark).i;raceTime=20;sectorProgress(pl,i,i,mark-1,mark+1);
  return {sector:pl.activeSec,s1:pl.secs[0]};})()`);
 assert.equal(result.sector,1);assert.equal(result.s1,20);
});

test('confini precisi: niente anticipi sul traguardo o rilevamenti persi vicino al settore',()=>{
 const g=game();
 assert.equal(g.run('crossedMark(N-1,N-1,0,L-5,L-1e-8)'),false);
 assert.equal(g.run('crossedMark(N-1,0,0,L-1e-8,1)'),true);
 assert.equal(g.run('crossedMark(0,0,0,0,1)'),false);
 assert.equal(g.run('crossedMark(0,0,SECTOR_MARKS[0],SECTOR_MARKS[0]-1e-8,SECTOR_MARKS[0]+1)'),true);
});

test('attraversamenti ripetuti del traguardo non assegnano giri, tempi veloci o posizioni inventate',()=>{
 const g=game();
 const result=g.run(`(()=>{startRace();state='racing';raceTime=1;
  pl.trackS=5;progress(pl,N-1,0,L-5,5);
  const initial=pl.lap;raceTime=2;pl.trackS=L-5;progress(pl,0,N-1,5,L-5);
  const backwards=pl.lap;raceTime=3;pl.trackS=5;progress(pl,N-1,0,L-5,5);
  return{initial,backwards,again:pl.lap,best:pl.best,progress:prog(pl)};})()`);
 assert.equal(result.initial,0);assert.equal(result.backwards,0);assert.equal(result.again,0);assert.equal(result.best,1e9);assert.ok(result.progress<10);
});

test('un salto di coordinate non completa settori o giri senza percorrere il tracciato',()=>{
 const g=game();
 const result=g.run(`(()=>{startRace();state='racing';pl.raceStarted=true;pl.lap=0;raceTime=30;
  sectorProgress(pl,Math.floor(N*.8),Math.floor(N*.1));progress(pl,Math.floor(N*.8),Math.floor(N*.1));
  return{lap:pl.lap,best:pl.best,sector:pl.activeSec};})()`);
 assert.equal(result.lap,0);assert.equal(result.best,1e9);assert.equal(result.sector,0);
});

test('Q1/Q2/Q3 trasferiscono P1, P12 e P23 alla vettura e alla casella corrette',()=>{
 const g=game();
 for(const position of [0,11,22]){
  const data=g.run(`(()=>{toMenu();startQuali();const ids=defOrder().map(e=>e.isP?'player':'driver:'+e.di);
   ids.splice(ids.indexOf('player'),1);ids.splice(${position},0,'player');
   for(let phase=0;phase<3;phase++){
    raceTime=100;for(const c of qualiParticipants()){c.best=60+ids.indexOf(c.id);c.qLaps=1;c.qBestSetAt=ids.indexOf(c.id);}
    endQuali();if(phase<2)nextQualiSession();
   }
   const grid=quali.finalGrid.map(r=>r.id);startRace();
   return{grid,ids:cars.map(c=>c.id),rank:order().indexOf(pl),zero:cars.every(c=>c.lap===0&&c.fin===0&&c.best===1e9&&c.raceLapDistance===0),x:pl.x,y:pl.y,slot:gridSlot(${position})};})()`);
  assert.deepEqual(Array.from(data.ids),Array.from(data.grid));assert.equal(data.rank,position);assert.ok(data.zero);
  assert.ok(Math.hypot(data.x-data.slot.x,data.y-data.slot.y)<1e-7);checkSeats(g);
 }
});

test('24 circuiti: S1→S2→S3→S1, due giri, tempi indipendenti e nessun doppio rilevamento per giocatore e IA',()=>{
 const g=game({laps:3});
 const rows=g.run(`(()=>{const out=[];
  function cross(c,s){const from=c.trackS,a=c.idx,q=pointAtDistance(s);c.trackS=q.s;c.x=q.x;c.y=q.y;c.a=q.ang;
   sectorProgress(c,a,q.i,from,q.s);progress(c,a,q.i,from,q.s);c.idx=q.i;}
  for(const circuit of CIRCUIT_DATA){toMenu();selectCircuit(circuit.id);startRace();state='racing';
   for(const c of [pl,cars.find(c=>!c.isP)]){
    raceTime=1;cross(c,L-1);raceTime=2;cross(c,0);const started=c.lap===0&&c.activeSec===0;
    const laps=[];
    for(let lap=0;lap<2;lap++){
     const start=c.lapStart,transitions=[c.activeSec];let duplicate=false;
     for(let i=1;i<=N;i++){
      raceTime+=.05;const before=c.activeSec;cross(c,T[i%N].s);if(c.activeSec!==before)transitions.push(c.activeSec);
      const saved=JSON.stringify([c.activeSec,c.secs,c.bestSecs,c.lap]);cross(c,c.trackS);
      if(saved!==JSON.stringify([c.activeSec,c.secs,c.bestSecs,c.lap]))duplicate=true;
     }
     const times=c.lastSecs.slice(),total=raceTime-start;
     laps.push({transitions,times,total,lap:c.lap,active:c.activeSec,duplicate,finite:c.bestSecs.every(Number.isFinite)});
    }
    sectorHud(c);out.push({id:circuit.id,driver:c.id,ai:c.ai,started,laps,visibleS3:$('sectorTime2').textContent===c.lastSecs[2].toFixed(3)});
   }
  }return out;})()`);
 assert.equal(rows.length,48);
 for(const row of rows){
  assert.ok(row.started&&row.visibleS3,JSON.stringify(row));
  for(const [index,lap] of row.laps.entries()){
   assert.deepEqual(Array.from(lap.transitions),[0,1,2,0],JSON.stringify(row));assert.equal(lap.lap,index+1);
   assert.ok(!lap.duplicate&&lap.finite&&lap.times.every(t=>t>0),JSON.stringify(row));
   assert.ok(Math.abs(lap.times.reduce((a,b)=>a+b,0)-lap.total)<1e-7,JSON.stringify(row));
  }
 }
});

test('classifica continua al primo traguardo e corretta per sorpassi e giri diversi',()=>{
 const g=game();
 const result=g.run(`(()=>{const entries=defOrder();entries.unshift(entries.splice(entries.findIndex(e=>e.isP),1)[0]);startRace(entries);state='racing';
  const other=cars[1];pl.trackS=L-1;pl.idx=N-1;other.trackS=L-20;other.idx=pointAtDistance(other.trackS).i;
  const before=prog(pl);pl.trackS=1;progress(pl,N-1,0,L-1,1);const after=prog(pl),rank=order().indexOf(pl);
  other.trackS=5;progress(other,N-1,0,L-20,5);const passed=order().indexOf(other)<order().indexOf(pl);
  pl.lap=1;pl.trackS=1;other.trackS=L-1;const lapped=order().indexOf(pl)<order().indexOf(other);
  return{before,after,rank,passed,lapped};})()`);
 assert.ok(Math.abs(result.after-result.before-2)<1e-7);assert.equal(result.rank,0);assert.ok(result.passed&&result.lapped);
});
