'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {game}=require('./helpers/game.cjs');

test('cronometro indipendente da display 30, 60 e 144 Hz; pausa senza recupero del tempo',()=>{
 for(const hz of [30,60,144]){
  const g=game();g.run(`startRace();state='racing';frame(0);for(let i=1;i<=${hz*2};i++)frame(i*1000/${hz});`);
  assert.ok(Math.abs(g.run('raceTime')-2)<1e-8);
  const before=g.run('raceTime');g.run('togglePause();frame(50000);frame(60000);resume();frame(60016.6666667);');
  assert.ok(g.run('raceTime')-before<.018);
 }
});

test('controller Start riprende la pausa dal ciclo reale dei frame',()=>{
 const g=game();g.run(`startRace();state='racing';globalThis.pressed=false;
 navigator.getGamepads=()=>[{connected:true,index:0,id:'Test',mapping:'standard',axes:[0,0],buttons:Array.from({length:16},(_,i)=>({value:i===9&&pressed?1:0,pressed:i===9&&pressed}))}];
 frame(0);pressed=true;frame(17);`);
 assert.equal(g.run('state'),'paused');g.run('pressed=false;frame(34);pressed=true;frame(51);');assert.equal(g.run('state'),'racing');
});

test('il passaggio al traguardo interpola il tempo nella sottoparte fisica',()=>{
 const g=game();g.run(`startRace();state='racing';raceTime=10;physicsStepDuration=.01;`);
 assert.ok(Math.abs(g.run('timingAtMark(L-3,7,0)')-9.993)<1e-9);
 g.run(`pl.raceStarted=true;pl.raceLapValid=true;pl.raceLapSectors=3;pl.raceLapDistance=L;pl.lapStart=1;
 progress(pl,N-1,0,L-3,7);physicsStepDuration=0;`);
 assert.ok(Math.abs(g.run('pl.best')-8.993)<1e-9);
});

test('qualifica: il passaggio prima dello zero apre un ultimo giro, dopo lo zero conclude',()=>{
 for(const before of [true,false]){
  const g=game({qualiMinutes:[1,1,1]});g.run(`startQuali();resetQualiRelease();cars.forEach(parkInGarage);
  {const p=botPointAt(L-1);Object.assign(pl,{x:p.x,y:p.y,a:p.ang,idx:p.i,trackS:L-1,d:0,lane:0,vx:Math.cos(p.ang)*200,vy:Math.sin(p.ang)*200,go:true,lap:0,lapStart:1,qLapActive:true,qLapValid:true,qLapSectors:3,qLapDistance:L});pl.pit.phase='track';pl.pit.auto=false;}
  raceTime=${before?59.99:60};update(.02);`);
  assert.equal(g.run('pl.qLaps'),1);assert.equal(g.run('pl.qd'),!before);assert.equal(g.run('state'),before?'quali':'qbetween');
 }
});

test('distacchi da rilevamenti reali, penalità, doppiaggi e memoria limitata',()=>{
 const g=game();g.run(`startRace();state='racing';globalThis.a=cars[0];globalThis.b=cars[1];
 a.raceStarted=b.raceStarted=true;a.trackS=500;b.trackS=400;
 a.timingSamples=new Map([[0,10],[1,12]]);b.timingSamples=new Map([[0,11.2],[1,14.5]]);`);
 assert.equal(g.run('raceInterval(a,b)'),'+2.5s');g.run('b.pen=3;');assert.equal(g.run('raceInterval(a,b)'),'+5.5s');
 g.run('a.lap=1;');assert.match(g.run('raceInterval(a,b)'),/GIRO/);
 g.run(`a.timingSamples.clear();a.lap=0;for(let i=0;i<400;i++){const from=(i%100)*L/100;recordRaceTiming(a,from,wrapDistance(from+L/100));if(i%100===99)a.lap++;}`);
 assert.ok(g.run('a.timingSamples.size<=128'));
});

test('un arrivo non accredita ulteriori giri e il risultato non viene registrato due volte',()=>{
 const g=game({laps:1});g.run(`startRace();state='racing';pl.fin=100;pl.lap=1;pl.best=50;
 pl.raceStarted=true;pl.raceLapValid=true;pl.raceLapSectors=3;pl.raceLapDistance=L;raceTime=160;
 progress(pl,N-1,0,L-1,1);endRace();endRace();`);
 assert.equal(g.run('pl.lap'),1);assert.equal(g.run('pl.best'),50);assert.equal(g.run('readRecords().length'),1);
});

test('auto coincidenti si separano senza valori non finiti',()=>{
 const g=game();g.run(`startRace();globalThis.a=cars[0];globalThis.b=cars[1];a.x=b.x=100;a.y=b.y=100;collide();`);
 assert.ok(g.run('Math.hypot(a.x-b.x,a.y-b.y)>=47.999'));
 assert.ok(g.run('cars.every(c=>[c.x,c.y,c.vx,c.vy].every(Number.isFinite))'));
});

test('mute persiste senza perdere il volume scelto',()=>{
 const g=game({vol:.45});g.click('mute');assert.equal(g.run('S.muted'),true);assert.equal(g.run('volGain()'),0);
 assert.equal(JSON.parse(g.storage.get('f1sim.set')).muted,true);g.click('mute');assert.equal(g.run('S.vol'),.45);assert.ok(g.run('volGain()')>0);
});

test('un errore interrompe il ciclo una sola volta e permette il ritorno al menu',()=>{
 const g=game();g.run(`globalThis.failures=0;globalThis.console={...console,error:()=>failures++};
 globalThis.originalUpdate=update;update=()=>{throw Error('fixture controllata');};frame(0);frame(20);frame(40);`);
 assert.equal(g.run('state'),'error');assert.equal(g.run('failures'),1);
 g.run('update=originalUpdate;toMenu();frame(60);');assert.equal(g.run('state'),'menu');assert.equal(g.run('runtimeFault'),null);
});

test('campionato da 10 GP: punti, salvataggio, titolo e nuova stagione nello stesso formato',()=>{
 const g=game();g.run(`createCareerProfile('team',{name:'Apex',driver:'Alex',code:'ALX',num:27,c1:'#ee3344',c2:'#ffffff',calendarLength:10});`);
 for(let round=0;round<10;round++){
  g.run(`beginCareerGP();startRace();updateCountdown(6);cars.forEach((c,i)=>{c.fin=100+i;c.lap=S.laps;c.pitStops=1;});endRace();`);
  assert.equal(g.run('career.currentRound'),round+1);g.run('toMenu();');
  const reloaded=game({},Object.fromEntries(g.storage));assert.equal(reloaded.run('career.calendar.length'),10);assert.equal(reloaded.run('career.currentRound'),round+1);
 }
 assert.equal(g.run('career.status'),'complete');assert.equal(g.run('career.driverStandings.reduce((n,d)=>n+d.points,0)'),1010);
 assert.equal(g.run('beginCareerGP()'),false);g.run('newCareerSeason();');assert.equal(g.run('career.calendar.length'),10);assert.equal(g.run('career.number'),2);
});

test('dopo il proprio arrivo le 23 auto completano la gara con la fisica reale',()=>{
 const g=game({laps:2,diff:4});g.run(`startRace();pl.ai=true;for(let i=0;i<20000&&state!=='done';i++)update(.05);`);
 assert.equal(g.run('state'),'done');assert.equal(g.run('cars.filter(c=>c.fin&&c.lap===S.laps).length'),23);
 assert.equal(g.run('new Set(cars.map(c=>c.id)).size'),23);
});
