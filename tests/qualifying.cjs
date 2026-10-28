'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {game,placePlayer,checkSeats}=require('./helpers/game.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));
function endWithTimes(g,code='c.best=60+i;c.qBestSetAt=10+i;c.qLaps=1;'){
 // Dati di test per isolare ordinamento ed eliminazioni; i test di simulazione sotto
 // verificano separatamente che il gioco generi i suoi tempi soltanto con giri reali.
 g.run('qualiParticipants().forEach((c,i)=>{'+code+'});endQuali();');
}
test('durate 18/15/12, 23 partecipanti, migrazione impostazioni e possibilità di saltare',()=>{
 const g=game();g.click('play');checkSeats(g);
 assert.deepEqual(plain(g.run('quali.stages.map(s=>s.duration)')),[1080,900,720]);
 assert.equal(g.run('qualiParticipants().length'),23);assert.equal(g.run('qualiTimeLeft()'),1080);
 assert.ok(g.run('cars.every(c=>c.best===1e9&&c.qualiTimes.every(t=>t===null))'));
 g.run('qHud(1);');assert.equal(g.elements.get('timeTxt').textContent,'18:00');assert.match(g.elements.get('lapTxt').textContent,/Q1/);
 const skip=game({qmin:0});skip.click('play');assert.equal(skip.run('pendingRaceStart'),'play');skip.click('startrace');assert.equal(skip.run('state'),'countdown');assert.equal(skip.run('quali'),null);
 const enabled=game({qmin:0,qualiEnabled:true,qualiMinutes:[10,8,6]});enabled.click('play');assert.equal(enabled.run('qualiStage().duration'),600);
});
test('6 eliminati in Q1, 7 in Q2, 10 in Q3; i tempi di accesso non cambiano le classifiche successive',()=>{
 const g=game();g.run('startQuali();');endWithTimes(g);
 assert.equal(g.run('state'),'qbetween');assert.equal(g.run('lastGrid'),null);
 assert.equal(g.run('quali.results[0].qualified.length'),17);assert.equal(g.run('quali.results[0].eliminated.length'),6);
 const q1=g.run('JSON.stringify(quali.results[0])');g.click('grid');assert.equal(g.run('state'),'qbetween');
 assert.ok(!g.elements.get('nextQBtn').classList.contains('hidden'));assert.ok(g.elements.get('gridBtn').classList.contains('hidden'));
 g.click('nextq');assert.equal(g.run('quali.stage'),1);assert.equal(g.run('qualiParticipants().length'),17);
 assert.ok(g.run('qualiParticipants().every(c=>c.best===1e9&&c.qLaps===0&&c.qualiTimes[0]!==null&&c.bestSecs.every(t=>t===1e9))'));
 assert.equal(g.run('raceTime'),0);assert.ok(g.run('sessionBestSecs.every(t=>t===1e9)'));
 const parked=g.run('JSON.stringify(cars.filter(c=>!c.qActive).map(c=>[c.id,c.x,c.y,c.go]))');g.advance(3);
 assert.equal(g.run('JSON.stringify(cars.filter(c=>!c.qActive).map(c=>[c.id,c.x,c.y,c.go]))'),parked);
 endWithTimes(g,'c.best=50+(16-i);c.qBestSetAt=i;c.qLaps=1;');
 assert.equal(g.run('quali.results[1].qualified.length'),10);assert.equal(g.run('quali.results[1].eliminated.length'),7);
 assert.notEqual(g.run('quali.results[0].rows[0].id'),g.run('quali.results[1].rows[0].id'));
 const q2=g.run('JSON.stringify(quali.results[1])');g.click('nextq');assert.equal(g.run('qualiParticipants().length'),10);
 assert.ok(g.run('qualiParticipants().every(c=>c.best===1e9&&c.qLaps===0&&c.qualiTimes[1]!==null)'));
 endWithTimes(g,'c.best=40+(9-i);c.qBestSetAt=i;c.qLaps=2;');
 assert.equal(g.run('state'),'qdone');assert.equal(g.run('quali.results[2].rows.length'),10);
 assert.equal(g.run('JSON.stringify(quali.results[0])'),q1);assert.equal(g.run('JSON.stringify(quali.results[1])'),q2);
 assert.equal(g.run('quali.finalGrid.length'),23);assert.equal(g.run('new Set(quali.finalGrid.map(r=>r.id)).size'),23);
 assert.ok(g.run('quali.finalGrid.slice(0,10).every((r,i)=>r.id===quali.results[2].rows[i].id&&r.source==="Q3")'));
 assert.ok(g.run('quali.finalGrid.slice(10,17).every((r,i)=>r.id===quali.results[1].rows[i+10].id&&r.source==="Q2")'));
 assert.ok(g.run('quali.finalGrid.slice(17).every((r,i)=>r.id===quali.results[0].rows[i+17].id&&r.source==="Q1")'));
 assert.ok(g.elements.get('nextQBtn').classList.contains('hidden'));assert.ok(!g.elements.get('gridBtn').classList.contains('hidden'));
 const ids=plain(g.run('quali.finalGrid.map(r=>r.id)'));g.click('grid');
 assert.equal(g.run('state'),'qdone');assert.equal(g.run('pendingRaceStart'),'grid');g.click('startrace');
 assert.equal(g.run('state'),'countdown');assert.deepEqual(plain(g.run('cars.map(c=>c.id)')),ids);checkSeats(g);
 assert.ok(g.run('cars.every(c=>c.tyres.degradation&&c.tyres.condition===1)&&quali.finished&&quali.results.length===3'));
 assert.ok(g.run('cars.every(c=>JSON.stringify(c.qualiTimes)===JSON.stringify(quali.finalGrid.find(r=>r.id===c.id).times))'));
});
test('nessun tempo inventato, ordine stabile senza tempi e identità indipendente dalle sigle duplicate',()=>{
 const g=game();g.run('S.roster.forEach(d=>d[0]="AAA");startQuali();endQuali();nextQualiSession();endQuali();nextQualiSession();endQuali();');
 assert.ok(g.run('quali.results.every(s=>s.rows.every(r=>r.time===null&&r.laps===0))'));
 assert.equal(g.run('new Set(quali.finalGrid.map(r=>r.id)).size'),23);
 assert.ok(g.run('quali.finalGrid.every(r=>r.times.every(t=>t===null))'));
 assert.doesNotMatch(g.elements.get('qSummary').textContent,/^Pole:/);
});
test('pareggi: prevale chi ha registrato prima il tempo; chi non ha tempo segue chi lo ha',()=>{
 const g=game();g.run('startQuali();cars[0].best=60;cars[0].qBestSetAt=80;cars[1].best=60;cars[1].qBestSetAt=70;endQuali();');
 assert.equal(g.run('quali.results[0].rows[0].id'),'driver:0');
 assert.equal(g.run('quali.results[0].rows[1].id'),'player');
 assert.ok(g.run('quali.results[0].rows.slice(2).every(r=>r.time===null)'));
});
for(const eliminatedIn of [0,1])test('giocatore eliminato in Q'+(eliminatedIn+1)+': resta ai box e può seguire la fase successiva',()=>{
 const g=game();g.run('startQuali();');
 for(let phase=0;phase<=eliminatedIn;phase++){
  endWithTimes(g,phase===eliminatedIn?'c.best=c.isP?1000:60+i;c.qBestSetAt=i;c.qLaps=1;':'c.best=c.isP?40:60+i;c.qBestSetAt=i;c.qLaps=1;');
  g.click('nextq');
 }
 assert.ok(g.run('!pl.qActive&&!pl.go&&!pl.ai&&pl.pit.phase==="garage"'));
 const p=g.run('JSON.stringify([pl.x,pl.y])');g.run('keys.KeyW=true;');g.advance(4);
 assert.equal(g.run('JSON.stringify([pl.x,pl.y])'),p);assert.ok(g.run('qualiCameraCar()!==pl'));
 assert.match(g.elements.get('gapTxt').textContent,/ELIMINATO/);assert.equal(g.run('requestPitEntry()'),false);
});
test('il giocatore qualificato riprende sempre il controllo manuale nella fase successiva',()=>{
 const g=game();g.run('startQuali();');endWithTimes(g,'c.best=c.isP?40:60+i;c.qBestSetAt=i;c.qLaps=1;');
 assert.ok(g.run('pl.ai'));g.click('nextq');assert.ok(g.run('pl.qActive&&!pl.ai'));
 g.advance(15);assert.ok(g.run('onTrack(pl)&&!pl.ai'));g.run('keys.KeyW=true;update(.01);');assert.equal(g.run('pl.inp.thr'),1);
});
test('allo zero si completa soltanto il giro lanciato già in corso, poi nessun altro giro',()=>{
 const g=game({qualiMinutes:[1,1,1]});g.run('startQuali();');
 placePlayer(g,0,-55,200);
 g.run('raceTime=59;qualiLapProgress(pl,N-1,0);pl.qLapSectors=3;pl.qLapDistance=L;raceTime=60;expireQualiSession();');
 assert.ok(g.run('qEnd&&!pl.qd&&pl.qLapActive'));
 assert.ok(g.run('cars.filter(c=>!c.isP).every(c=>c.qd&&!c.qLapActive)'));assert.equal(g.run('qualiReleaseQueue.length'),0);
 g.run('raceTime=61;qualiLapProgress(pl,N-1,0);');assert.equal(g.run('pl.best'),2);assert.equal(g.run('pl.qLaps'),1);
 assert.ok(g.run('pl.qd&&!pl.qLapActive'));g.run('raceTime=62;qualiLapProgress(pl,N-1,0);checkQualiTime();');assert.equal(g.run('pl.qLaps'),1);
 assert.equal(g.run('state'),'qbetween');assert.equal(g.run('quali.results[0].rows[0].time'),2);
});

for(const invalidatedAfterExpiry of [false,true])test('ultimo giro annullato: il controllo resta manuale fino al traguardo, annullamento '+(invalidatedAfterExpiry?'dopo':'prima')+' dello zero',()=>{
 const g=game({qualiMinutes:[1,1,1]});g.run('startQuali();');placePlayer(g,g.run('L*.4'),0,200);
 g.run('raceTime=59;pl.qLapActive=pl.qLapValid=true;pl.lapStart=20;pl.qLapSectors=1;pl.qLapDistance=L*.4;');
 if(!invalidatedAfterExpiry)g.run('invalidateQualiLap(pl);');
 g.run('raceTime=60;expireQualiSession();');
 if(invalidatedAfterExpiry)g.run('invalidateQualiLap(pl);');
 assert.ok(g.run('qEnd&&!pl.ai&&!pl.qd'));
 g.run('keys.KeyW=true;update(.01);');assert.equal(g.run('pl.inp.thr'),1);assert.equal(g.run('state'),'quali');
 // Anche un ultimo giro lento resta manuale se la vettura sta ancora viaggiando.
 g.run('raceTime=qEndT+qualiFinishGrace+1;checkQualiTime();');assert.ok(g.run('!pl.ai&&!pl.qd'));
 g.run('qualiLapProgress(pl,N-1,0,L-1,0);checkQualiTime();');
 assert.ok(g.run('pl.ai&&pl.qd'));assert.equal(g.run('state'),'qbetween');assert.equal(g.run('pl.qLaps'),0);
 assert.equal(g.run('quali.results[0].rows.find(r=>r.id==="player").time'),null);
});

test('allo zero il giro di uscita resta manuale fino al traguardo e non assegna tempi',()=>{
 const g=game({qualiMinutes:[1,1,1]});g.run('startQuali();');placePlayer(g,g.run('L*.3'),0,200);
 g.run('raceTime=60;expireQualiSession();');assert.ok(g.run('!pl.qLapActive&&!pl.qd&&!pl.ai'));
 g.run('raceTime=70;qualiLapProgress(pl,N-1,0,L-1,0);checkQualiTime();');
 assert.ok(g.run('pl.ai&&pl.qd&&!pl.qLapActive'));assert.equal(g.run('pl.qLaps'),0);assert.equal(g.run('pl.best'),1e9);
});

test('un pilota fermo dopo lo zero conserva il limite di sicurezza della fase',()=>{
 const g=game({qualiMinutes:[1,1,1]});g.run('startQuali();');placePlayer(g,g.run('L*.3'),0,0);
 g.run('raceTime=60;expireQualiSession();');assert.ok(g.run('!pl.qd&&!pl.ai'));
 g.run('raceTime=qEndT+qualiFinishGrace+1;checkQualiTime();');assert.ok(g.run('pl.qd&&pl.ai'));assert.equal(g.run('state'),'qbetween');
});
test('saltare Q1, Q2 e Q3 dalla pausa è immediato anche con giri lanciati in corso',()=>{
 const g=game();g.run('startQuali();');
 for(let phase=0;phase<3;phase++){
  g.run('raceTime=100;qualiParticipants().forEach((c,i)=>{c.best=60+i;c.qLaps=1;c.qBestSetAt=80+i;c.qLapActive=c.qLapValid=true;});togglePause();');
  g.click('endq');
  assert.equal(g.run('state'),phase===2?'qdone':'qbetween');assert.equal(g.run('raceTime'),100);
  assert.ok(g.run('qualiParticipants().every(c=>c.qd&&!c.qLapActive&&c.qLaps===1)'));
  assert.equal(g.run('quali.results[quali.stage].rows[0].time'),60);
  assert.equal(g.run('qualiReleaseQueue.length'),0);
  if(phase<2){g.click('nextq');assert.equal(g.run('quali.stage'),phase+1);}
 }
 assert.equal(g.run('quali.finalGrid.length'),23);
});
test('un out-lap che termina allo zero non avvia un giro cronometrato',()=>{
 const g=game({qualiMinutes:[1,1,1]});g.run('startQuali();');placePlayer(g,0,-55,200);
 g.run('raceTime=60;qualiLapProgress(pl,N-1,0);');assert.ok(g.run('pl.qd&&!pl.qLapActive&&pl.best===1e9'));
 g.run('checkQualiTime();');assert.ok(g.run('qEnd'));assert.equal(g.run('releaseQualiCar(cars[1])'),false);
});
test('giri incompleti, settori mancanti, riposizionamento e ingresso box non producono tempi',()=>{
 const g=game();g.run('startQuali();');placePlayer(g,0,-55,200);
 g.run('raceTime=1;qualiLapProgress(pl,N-1,0);pl.qLapDistance=L;raceTime=35;qualiLapProgress(pl,N-1,0);');assert.equal(g.run('pl.best'),1e9);
 g.run('pl.qLapSectors=3;pl.qLapDistance=L*.5;raceTime=70;qualiLapProgress(pl,N-1,0);');assert.equal(g.run('pl.best'),1e9);
 g.run('repos();');assert.ok(g.run('!pl.qLapActive&&pl.best===1e9'));
 placePlayer(g,g.run("PIT.entryStart")-100,-70,200);g.run('pl.rep=0;pl.qLapActive=true;pl.qLapValid=true;requestPitEntry();tryPitEntry(pl);');assert.ok(g.run('!pl.qLapActive&&pl.best===1e9'));
});
test('qualifica manuale: i settori avanzano nel giro di uscita e il giro completo viene cronometrato',()=>{
 const g=game();g.run(`startQuali();pl.go=true;pl.ai=false;pl.pit.phase='track';pl.pit.auto=false;pl.idx=0;
  globalThis.crossSample=i=>{const q=T[i];pl.x=q.x;pl.y=q.y;pl.a=q.ang;pl.vx=pl.vy=0;pl.inp={st:0,thr:0,brk:0,rev:0};raceTime++;stepCar(pl,.01);};
  globalThis.firstSplit=T.findIndex(q=>q.s>=SECTOR_MARKS[0]);globalThis.secondSplit=T.findIndex(q=>q.s>=SECTOR_MARKS[1]);
  for(let i=1;i<=firstSplit;i++)crossSample(i);`);
 assert.equal(g.run('pl.activeSec'),1);const s1=g.run('pl.secs[0]');assert.ok(s1>0);assert.equal(g.run('pl.bestSecs[0]'),1e9);
 g.run('for(let i=firstSplit+1;i<=secondSplit;i++)crossSample(i);');
 assert.equal(g.run('pl.activeSec'),2);assert.equal(g.run('pl.secs[0]'),s1);assert.ok(g.run('pl.secs[1]>0'));assert.equal(g.run('pl.qLaps'),0);
 g.run('for(let i=secondSplit+1;i<=N;i++)crossSample(i%N);');
 assert.ok(g.run('pl.qLapActive&&pl.qLapValid'));assert.equal(g.run('pl.qLaps'),0);
 g.run('for(let i=1;i<=N;i++)crossSample(i%N);');
 assert.equal(g.run('pl.qLaps'),1);assert.equal(g.run('pl.best'),g.run('N'));assert.ok(g.run('pl.bestSecs.every(t=>t>0&&t<1e8)'));
});
test('qualifica: il passaggio reale del traguardo apre il giro anche prima del cambio di segmento',()=>{
 const g=game();g.run(`startQuali();pl.go=true;pl.pit.phase='track';pl.pit.auto=false;
  raceTime=1;sectorProgress(pl,N-1,N-1,L-1,0);progress(pl,N-1,N-1,L-1,0);`);
 assert.ok(g.run('pl.qLapActive&&pl.qLapValid'));assert.equal(g.run('pl.lapStart'),1);
 assert.equal(g.run('pl.qLaps'),0);assert.equal(g.run('pl.activeSec'),0);
});

test('qualifica: settori colorati e tempo salvato al passaggio reale su tutti i 24 circuiti',()=>{
 const g=game();
 const rows=g.run(`(()=>{const out=[];
  function cross(c,from,to,a=pointAtDistance(from).i,b=pointAtDistance(to).i){
   c.trackS=wrapDistance(to);sectorProgress(c,a,b,from,to);progress(c,a,b,from,to);c.idx=b;
  }
  for(const circuit of CIRCUIT_DATA){toMenu();selectCircuit(circuit.id);startQuali();pl.go=true;pl.pit.phase='track';pl.pit.auto=false;
   raceTime=1;cross(pl,L-1,0);const start=pl.lapStart;let from=0;const states=[];
   // Include i rilevamenti esatti: non tutti coincidono con l'inizio di un segmento.
   const positions=[...T.slice(1).map(q=>q.s),...SECTOR_MARKS,L].sort((a,b)=>a-b).filter((s,i,a)=>!i||s!==a[i-1]);
   for(const to of positions){raceTime+=.05;const active=pl.activeSec;
    // All'arrivo l'indice può essere ancora quello del segmento che termina sulla linea.
    cross(pl,from,to,pointAtDistance(from).i,to===L?N-1:pointAtDistance(to).i);
    if(pl.activeSec!==active&&to<L)states.push(pl.secState[active]);from=to;
   }
   sectorHud(pl);qHud(1);const best=pl.best;endQuali();
   out.push({id:circuit.id,states,laps:pl.qLaps,best,total:raceTime-start,sectors:pl.lastSecs.slice(),
    stored:quali.results[0].rows.find(r=>r.id==='player').time});
  }return out;})()`);
 assert.equal(rows.length,24);
 for(const row of rows){
  assert.deepEqual(Array.from(row.states),['fastest','fastest'],JSON.stringify(row));assert.equal(row.laps,1,JSON.stringify(row));
  assert.ok(row.best>0&&row.best<1e8,JSON.stringify(row));assert.equal(row.stored,row.best);
  assert.ok(row.sectors.every(t=>t>0),JSON.stringify(row));
  assert.ok(Math.abs(row.sectors.reduce((a,b)=>a+b,0)-row.best)<1e-7,JSON.stringify(row));
 }
});

test('qualifica manuale senza track limit: un giro con lunghe uscite registra subito il tempo su tutti i circuiti',()=>{
 const g=game();
 const rows=g.run(`(()=>{const out=[];
  for(const circuit of CIRCUIT_DATA){toMenu();selectCircuit(circuit.id);startQuali();
   pl.go=true;pl.ai=false;pl.pit.phase='track';pl.pit.auto=false;pl.idx=N-1;pl.trackS=L-1;
   function sample(i,d=0){const q=T[i];pl.x=q.x+q.nx*d;pl.y=q.y+q.ny*d;pl.a=q.ang;
    pl.vx=pl.vy=0;pl.inp={st:0,thr:0,brk:0,rev:0};raceTime+=.05;stepCar(pl,.01);}
   sample(0);const start=pl.lapStart;let outside=false;
   for(let i=1;i<=N;i++){sample(i%N,i>N*.3&&i<N*.5||i===Math.floor(N*.55)?TW/2+30:0);outside=outside||pl.off;}
   qHud(1);const row={id:circuit.id,outside,laps:pl.qLaps,best:pl.best,total:raceTime-start,
    saved:pl.qualiTimes[quali.stage],visible:$('tower').innerHTML.includes(fmt(raceTime-start)),sectors:pl.lastSecs.slice()};
   endQuali();row.result=quali.results[0].rows.find(r=>r.id==='player').time;out.push(row);
  }return out;})()`);
 assert.equal(rows.length,24);
 for(const row of rows){
  assert.ok(row.outside,JSON.stringify(row));assert.equal(row.laps,1,JSON.stringify(row));assert.equal(row.best,row.total,JSON.stringify(row));
  assert.equal(row.saved,row.best,JSON.stringify(row));assert.equal(row.result,row.best,JSON.stringify(row));assert.ok(row.visible,JSON.stringify(row));
  assert.ok(row.sectors.every(t=>t>0),JSON.stringify(row));
 }
});

test('una lunga percorrenza fuori pista salva il tempo; i giri successivi conservano il migliore',()=>{
 const g=game();g.run(`startQuali();pl.go=true;pl.pit.phase='track';pl.pit.auto=false;pl.idx=N-1;pl.trackS=L-1;
  globalThis.sampleQuali=(i,dt=.05,outside=false)=>{const q=T[i],d=outside?TW/2+30:0;
   pl.x=q.x+q.nx*d;pl.y=q.y+q.ny*d;pl.a=q.ang;pl.vx=pl.vy=0;pl.inp={st:0,thr:0,brk:0,rev:0};raceTime+=dt;stepCar(pl,.01);};
  sampleQuali(0);for(let i=1;i<=N;i++)sampleQuali(i%N,.05,i>N*.3&&i<N*.5);`);
 assert.ok(g.run('pl.qLaps===1&&validQualiTime(pl.best)&&pl.qualiTimes[0]===pl.best'));
 g.run('for(let i=1;i<=N;i++)sampleQuali(i%N);');
 assert.ok(g.run('pl.qLaps===2&&validQualiTime(pl.best)&&pl.qualiTimes[0]===pl.best'));
 const first=g.run('pl.best');g.run('for(let i=1;i<=N;i++)sampleQuali(i%N,.06);');
 assert.equal(g.run('pl.best'),first);assert.equal(g.run('pl.qualiTimes[0]'),first);
 g.run('for(let i=1;i<=N;i++)sampleQuali(i%N,.04);');
 assert.ok(g.run('pl.best<qualiStage().duration&&pl.best<'+first+'&&pl.qualiTimes[0]===pl.best'));
 const best=g.run('pl.best');g.run('endQuali();nextQualiSession();');
 assert.equal(g.run('pl.qualiTimes[0]'),best);assert.equal(g.run('pl.qualiTimes[1]'),null);
});

test('i settori visibili avanzano anche dopo un giro annullato, senza assegnare tempi validi',()=>{
 const g=game();g.run(`startQuali();pl.go=true;pl.pit.phase='track';pl.lap=0;pl.qLapActive=pl.qLapValid=true;invalidateQualiLap(pl);
  const first=T.findIndex(q=>q.s>=SECTOR_MARKS[0]),second=T.findIndex(q=>q.s>=SECTOR_MARKS[1]);
  raceTime=20;sectorProgress(pl,first-1,first);raceTime=40;sectorProgress(pl,second-1,second);`);
 assert.equal(g.run('pl.activeSec'),2);assert.ok(g.run('pl.secs[0]===20&&pl.secs[1]===20'));
 assert.ok(g.run('!pl.qLapActive&&pl.best===1e9&&pl.bestSecs.every(t=>t===1e9)'));
});
test('riavvio della Q2 conserva la Q1; pausa e timer non avanzano; doppio click non salta fasi',()=>{
 const g=game();g.run('startQuali();');endWithTimes(g);g.click('nextq');const q1=g.run('JSON.stringify(quali.results[0])');
 g.advance(3);const time=g.run('raceTime');g.run('togglePause();');g.advance(40);assert.equal(g.run('raceTime'),time);
 g.click('restart');assert.equal(g.run('quali.stage'),1);assert.equal(g.run('raceTime'),0);
 assert.equal(g.run('JSON.stringify(quali.results[0])'),q1);assert.equal(g.run('qualiParticipants().length'),17);
 g.click('nextq');assert.equal(g.run('quali.stage'),1);
});
test('SOFT al 100% anche per eliminate e auto ai box, fattori costanti; in gara usura effettiva',()=>{
 const g=game();g.run('startQuali();');
 for(let phase=0;phase<3;phase++){
  g.run('cars.forEach(c=>{c.tyres.condition=.1;c.tyres.compound="HARD";});update(.01);');
  assert.ok(g.run('cars.every(c=>c.tyres.compound==="SOFT"&&c.tyres.condition===1&&!c.tyres.degradation&&tyreGrip(c)===1&&tyreSpeed(c)===1)'));
  assert.equal(g.elements.get('tyreText').textContent,'SOFT — 100%');endWithTimes(g);
  if(phase<2)g.click('nextq');
 }
 g.click('grid');g.click('startrace');g.advance(2);assert.ok(g.run('cars.every(c=>c.tyres.condition===1&&c.tyres.degradation)'));
 g.run('pl.ai=true;');g.advance(15);assert.ok(g.run('cars.every(c=>c.tyres.condition<1&&c.tyres.condition>0)'));
 g.run('pl.tyres.condition=.1;');assert.ok(g.run('tyreGrip(pl)<1&&tyreSpeed(pl)<1'));
});
test('weekend fisico completo: 23 -> 17 -> 10, più tentativi reali, griglia automatica e gomme',()=>{
 const g=game({qualiMinutes:[4,4,4],laps:1});g.run('startQuali();');const counts=[23,17,10];
 for(let phase=0;phase<3;phase++){
  assert.equal(g.run('qualiParticipants().length'),counts[phase]);g.run('if(pl.qActive)pl.ai=true;');
  const data=g.run(`(()=>{
   let maxPitSpeed=0,maxStuck=0,tyresLocked=true;
   for(let n=0;n<10000&&state==='quali';n++){
    update(.05);
    for(const c of cars){
     if(![c.x,c.y,c.vx,c.vy,c.trackS].every(Number.isFinite))throw Error(c.id);
     maxStuck=Math.max(maxStuck,c.stuck);if(pitActive(c))maxPitSpeed=Math.max(maxPitSpeed,Math.hypot(c.vx,c.vy)*.32);
     tyresLocked=tyresLocked&&c.tyres.condition===1&&!c.tyres.degradation;
    }
   }
   return{state,maxPitSpeed,maxStuck,tyresLocked,rows:quali.results[quali.stage]?.rows,release:qualiParticipants().map(c=>({id:c.id,time:c.releasedAt,order:c.relT})).sort((a,b)=>a.order-b.order)};
  })()`);
  assert.equal(data.state,phase===2?'qdone':'qbetween',JSON.stringify(data));assert.equal(data.rows.length,counts[phase]);
  assert.ok(data.rows.every(r=>r.time>20&&r.time<180&&r.laps>=1),JSON.stringify(data));assert.ok(data.rows.some(r=>r.laps>1));
  assert.ok(data.tyresLocked);assert.ok(data.maxPitSpeed<=80+1e-6);assert.ok(data.maxStuck<1);
  data.release.forEach((r,i)=>assert.ok(Math.abs(r.time-i*.5)<.051,JSON.stringify(data.release)));
  if(phase<2)g.click('nextq');
 }
 const ids=plain(g.run('lastGrid.map(e=>e.isP?"player":"driver:"+e.di)'));assert.equal(ids.length,23);
 g.click('grid');g.click('startrace');assert.deepEqual(plain(g.run('cars.map(c=>c.id)')),ids);assert.ok(g.run('cars.every(c=>c.tyres.degradation)'));
});
