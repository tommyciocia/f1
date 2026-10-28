'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {game,placePlayer,checkSeats}=require('./helpers/game.cjs');

test('servizio box abilitato e obbligo effettivo da tre giri per tutte le vetture',()=>{
 const g=game({laps:3});g.run('startRace();');
 assert.equal(g.run('PIT.serviceAllowed'),true);assert.ok(g.run('cars.every(c=>c.pitRequired&&!pitObligationSatisfied(c))'));
 assert.match(g.elements.get('pitRuleStatus').textContent,/BOX OBBLIGATORIO/);
 for(const laps of [1,2]){g.run(`S.laps=${laps};startRace();`);assert.ok(g.run('cars.every(c=>!c.pitRequired)'));}
});

test('sosta mancante: squalifica nei risultati e nei salvataggi; un transito non conta',()=>{
 const g=game({laps:3});g.run('startRace();state="racing";cars.forEach((c,i)=>{c.fin=100+i;c.pitStops=1;});pl.fin=50;pl.pitStops=0;endRace();');
 assert.equal(g.run('pl.disqualified'),true);assert.equal(g.run('order().indexOf(pl)'),22);
 assert.equal(g.run('readRecords()[0].disqualified'),true);assert.match(g.elements.get('resList').innerHTML,/DSQ/);
});

test('24 circuiti: X, fermata reale, conferma, cambio gomme, sosta contabilizzata e uscita a 80',()=>{
 const g=game({laps:3});const rows=[];
 for(const id of Array.from(g.run('CIRCUIT_DATA.map(c=>c.id)'))){
  g.run(`toMenu();selectCircuit('${id}');startRace();state='racing';cars.forEach(c=>{c.go=false;c.pit.phase='garage';});pl.go=true;pl.pit.phase='track';pl.tyres.condition=.2;`);
  placePlayer(g,g.run('PIT.entryStart')-100,0,200);
  assert.equal(g.run('requestPitEntry()'),true,id);
  const row=g.run(`(()=>{let maxSpeed=0;for(let i=0;i<2000&&pl.pit.phase!=='waiting';i++){
   update(.05);if(pitLimited(pl))maxSpeed=Math.max(maxSpeed,Math.hypot(pl.vx,pl.vy)*.32);
  }
  const waiting=pl.pit.phase,stopped=Math.hypot(pl.vx,pl.vy)===0,before=pl.pitStops,position=Math.hypot(pl.x-pitPoint(pl.pit.stallS,PIT.stallD).x,pl.y-pitPoint(pl.pit.stallS,PIT.stallD).y);
  const blockedWaiting=!requestPitEntry();choosePitCompound('MEDIUM');const confirmed=confirmPitTyres(),blockedService=!requestPitEntry()&&!confirmPitTyres();update(1);const incomplete=pl.pitStops===0;
  togglePause();const paused=pl.pit.serviceLeft;update(5);const frozen=pl.pit.serviceLeft===paused;resume();
  for(let i=0;i<2000&&pitActive(pl);i++){update(.05);if(pitLimited(pl))maxSpeed=Math.max(maxSpeed,Math.hypot(pl.vx,pl.vy)*.32);}
  return{waiting,stopped,position,before,confirmed,blockedWaiting,blockedService,incomplete,frozen,phase:pl.pit.phase,stops:pl.pitStops,compound:pl.tyres.compound,condition:pl.tyres.condition,maxSpeed,met:pitObligationSatisfied(pl),rule:$('pitRuleStatus').textContent};})()`);
  assert.equal(row.waiting,'waiting',id);assert.ok(row.stopped&&row.position<1,id+JSON.stringify(row));assert.equal(row.before,0,id);
  assert.ok(row.confirmed&&row.blockedWaiting&&row.blockedService&&row.incomplete&&row.frozen,id);assert.equal(row.phase,'track',id);assert.equal(row.stops,1,id);
  assert.equal(row.compound,'MEDIUM',id);assert.equal(row.condition,1,id);assert.ok(row.maxSpeed<=80.001&&row.met,id);assert.match(row.rule,/COMPLETATA/);
  checkSeats(g);rows.push(row);
 }
 assert.equal(rows.length,24);
});

test('gara da tre giri: tutte le 23 vetture completano la sosta e arrivano senza squalifiche',()=>{
 const g=game({laps:3,diff:4,myStats:[.8,.8,.8,.8]});g.run('startRace();pl.ai=true;');
 const result=g.run(`(()=>{let requested=0;for(let i=0;i<26000&&state!=='done';i++){
  update(.05);if(pl.lap>=1&&pl.pitStops===0&&onTrack(pl)&&requestPitEntry())requested++;
  if(pl.pit.phase==='waiting'){choosePitCompound('MEDIUM');confirmPitTyres();}
 }return{state,requested,cars:cars.map(c=>({id:c.id,lap:c.lap,fin:c.fin,stops:c.pitStops,dsq:c.disqualified,phase:c.pit.phase}))};})()`);
 assert.equal(result.state,'done',JSON.stringify(result));assert.equal(result.requested,1);
 assert.ok(result.cars.every(c=>c.fin&&c.stops>=1&&!c.dsq),JSON.stringify(result));checkSeats(g);
});

test('sosta richiesta troppo tardi: il traguardo non lascia la vettura bloccata in attesa',()=>{
 const g=game({laps:3});g.run('startRace();state="racing";cars.forEach(c=>{c.go=false;c.pit.phase="garage";});');
 placePlayer(g,g.run('PIT.entryStart')-100,0,200);
 g.run('pl.lap=2;pl.raceStarted=pl.raceLapValid=true;pl.raceLapSectors=3;pl.raceLapDistance=wrapDistance(pl.trackS);requestPitEntry();');
 const result=g.run(`(()=>{let waiting=false;for(let i=0;i<2000&&pitActive(pl);i++){raceTime+=.05;pl.inp=aiInput(pl,.05);stepCar(pl,.05);if(pl.pit.phase==='waiting')waiting=true;}
  return{phase:pl.pit.phase,fin:pl.fin,stops:pl.pitStops,missed:missedMandatoryPit(pl),waiting};})()`);
 assert.ok(result.fin&&result.missed);assert.equal(result.stops,0);assert.equal(result.waiting,false);assert.equal(result.phase,'track');
});
