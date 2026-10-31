'use strict';
// node --test tests/simulation.cjs — usa i moduli reali del gioco, senza dipendenze.
const test=require('node:test');
const assert=require('node:assert/strict');
const {game,placePlayer,checkSeats}=require('./helpers/game.cjs');
test('23 auto, 12 team e piazzole stabili dopo qualifiche, griglia e scambi',()=>{
 const g=game();checkSeats(g);
 g.run('globalThis.stalls=Object.fromEntries(cars.map(c=>[c.code,c.pit.stallId]));startQuali();endQuali();nextQualiSession();endQuali();nextQualiSession();endQuali();startRace();');
 checkSeats(g);assert.ok(g.run('cars.every(c=>stalls[c.code]===c.pit.stallId)'));
 g.run('[S.roster[0][3],S.roster[2][3]]=[S.roster[2][3],S.roster[0][3]];mkCars();');checkSeats(g);
 assert.ok(g.run('cars.every(c=>c.pit.team===c.team)'));
 const damaged=Array.from({length:22},(_,i)=>['A'+i,'Pilota '+i,i+1,0]);checkSeats(game({roster:damaged}));
});
test('23 uscite ogni secondo, parcheggio reale, limite 80 km/h, continuità e giri validi',()=>{
 // Con uscite su 22 secondi, tre minuti consentono anche all'ultima vettura
 // di iniziare il giro lanciato prima della scadenza, senza inventare tempi.
 const g=game({qualiMinutes:[3,3,3]});g.run('startQuali();pl.ai=true;globalThis.initial=cars.map(c=>({x:c.x,y:c.y}));');
 assert.equal(g.run('cars.filter(c=>c.go).length'),1);
 assert.ok(g.run('cars.every(c=>c.lap===-1&&c.best===1e9&&Math.abs(c.d+470)<.001)'));
 // Raccoglie le misure ad ogni frame mentre percorrono davvero pit lane e circuito.
 const metrics=g.run(`(()=>{
  let maxPitSpeed=0,maxPitStep=0,minPitGap=Infinity,maxTrackStuck=0,maxPitSample=null;
  for(let n=0;n<12000&&state==='quali';n++){
   const before=cars.map(c=>({x:c.x,y:c.y,pit:pitActive(c)}));update(1/30);
   for(let i=0;i<cars.length;i++){
    const c=cars[i],p=before[i];
    if(![c.x,c.y,c.vx,c.vy,c.trackS,c.d].every(Number.isFinite))throw Error('Vettura non finita: '+c.code);
    if(p.pit&&pitActive(c)){
     if(Math.hypot(c.vx,c.vy)*.32>maxPitSpeed){maxPitSpeed=Math.hypot(c.vx,c.vy)*.32;maxPitSample={code:c.code,s:c.trackS,phase:c.pit.phase,time:raceTime,near:cars.filter(o=>o!==c&&Math.hypot(o.x-c.x,o.y-c.y)<120).map(o=>({code:o.code,phase:o.pit.phase,s:o.trackS,d:o.d,v:Math.hypot(o.vx,o.vy)*.32}))};}
     maxPitStep=Math.max(maxPitStep,Math.hypot(c.x-p.x,c.y-p.y));
     for(let j=i+1;j<cars.length;j++)if(pitActive(cars[j]))minPitGap=Math.min(minPitGap,Math.hypot(c.x-cars[j].x,c.y-cars[j].y));
    }
    if(onTrack(c))maxTrackStuck=Math.max(maxTrackStuck,c.stuck);
    if(!c.go&&Math.hypot(c.x-initial[i].x,c.y-initial[i].y)>.001)throw Error('Auto parcheggiata spostata');
   }
  }
  return{maxPitSpeed,maxPitSample,maxPitStep,minPitGap,maxTrackStuck,time:raceTime,state,released:cars.filter(c=>c.go).length,onTrack:cars.filter(onTrack).length,timed:cars.filter(c=>c.best<1e8).length,
   releases:cars.slice().sort((a,b)=>a.relT-b.relT).map(c=>c.releasedAt),pending:cars.filter(pitActive).map(c=>({code:c.code,s:c.trackS,phase:c.pit.phase}))};
 })()`);
 assert.equal(metrics.released,23,JSON.stringify(metrics));assert.equal(metrics.onTrack,23,JSON.stringify(metrics));
 assert.equal(metrics.timed,23,JSON.stringify(metrics));assert.equal(metrics.state,'qbetween');
 assert.ok(metrics.maxPitSpeed<=80+1e-6,JSON.stringify(metrics));
 assert.ok(metrics.maxPitStep<=250/30+.1,JSON.stringify(metrics));
 assert.ok(metrics.minPitGap>=76,JSON.stringify(metrics));
 assert.ok(metrics.maxTrackStuck<1,JSON.stringify(metrics));
 metrics.releases.forEach((t,i)=>{assert.ok(Math.abs(t-i)<1e-6,JSON.stringify(metrics.releases));});
 assert.equal(g.run('quali.results[0].rows.length'),23);
 console.log('Qualifiche:',JSON.stringify(metrics));
});
test('pausa, frame lenti, riavvio e passaggio diretto in gara non raggruppano le partenze',()=>{
 const g=game();g.run('startQuali();');g.advance(.2,.01);
 const snapshot=g.run('JSON.stringify(cars.map(c=>[c.x,c.y,c.go]))');
 g.run('togglePause();');g.advance(60);
 assert.equal(g.run('JSON.stringify(cars.map(c=>[c.x,c.y,c.go]))'),snapshot);
 g.run('releaseQualiCars();resume();');g.advance(.8,.01);
 assert.equal(g.run('cars.filter(c=>c.go).length'),2);
 g.advance(.4,.01);
 g.run('raceTime+=20;releaseQualiCars();');assert.equal(g.run('cars.filter(c=>c.go).length'),3);
 g.run('releaseQualiCars();');assert.equal(g.run('cars.filter(c=>c.go).length'),3);
 g.run('startQuali();');assert.equal(g.run('cars.filter(c=>c.go).length'),1);
 g.run('startRace();');assert.equal(g.run('qualiReleaseQueue.length'),0);assert.ok(g.run('cars.every(onTrack)'));
});
test('23 auto gareggiano e terminano senza entrare ai box; classifiche e minimappa complete',()=>{
 const g=game({laps:2,diff:4,myStats:[.8,.8,.8,.8]});g.run('startRace();pl.ai=true;');
 const result=g.run(`(()=>{
  let pitVisits=0,maxStuck=0;for(let n=0;n<9000&&state!=='done';n++){
   update(1/30);pitVisits+=cars.filter(pitActive).length;
   for(const c of cars){maxStuck=Math.max(maxStuck,c.stuck);if(![c.x,c.y,c.vx,c.vy].every(Number.isFinite))throw Error(c.code);}
  }
  render();return{state,pitVisits,maxStuck,finished:cars.filter(c=>c.fin).length,ranked:order().length};
 })()`);
 assert.equal(result.state,'done',JSON.stringify(result));assert.equal(result.pitVisits,0);assert.equal(result.finished,23,JSON.stringify(result));
 assert.equal(result.ranked,23);assert.ok(result.maxStuck<1,JSON.stringify(result));checkSeats(g);
 assert.equal((g.elements.get('resList').innerHTML.match(/<div /g)||[]).length,23);
 console.log('Gara:',JSON.stringify(result));
});
test('i comandi del giocatore tornano manuali all’uscita; R non teletrasporta dai box',()=>{
 const g=game();g.run('startQuali();');const before=g.run('pl.x');g.run('repos();');assert.equal(g.run('pl.x'),before);
 g.advance(30);assert.ok(g.run('onTrack(pl)&&!pl.ai'));
 assert.ok(g.run('pl.inp.thr===0&&pl.inp.brk===0'));
});
for(const [label,settings,dt] of [
 ['standard',{qualiMinutes:[1,1,1]},1/30],
 ['lenta',{qualiMinutes:[1,1,1],diff:0,teamStats:Array.from({length:12},()=>[.8,.8,.8,.8]),myStats:[.8,.8,.8,.8]},.05],
 ['veloce',{qualiMinutes:[1,1,1],diff:4,teamStats:Array.from({length:12},()=>[1.2,1.2,1.2,1.2]),myStats:[1.2,1.2,1.2,1.2]},1/60]
])test('qualifica breve '+label+': 23 uscite senza assegnare giri iniziati dopo lo zero',()=>{
 const g=game(settings);g.run('startQuali();pl.ai=true;');
 const result=g.run(`(()=>{
  let maxSpeed=0,minGap=Infinity;for(let n=0;n<${Math.ceil(240/dt)}&&state==='quali';n++){
   update(${dt});for(let i=0;i<cars.length;i++)if(pitActive(cars[i])){
    maxSpeed=Math.max(maxSpeed,Math.hypot(cars[i].vx,cars[i].vy)*.32);
    for(let j=i+1;j<cars.length;j++)if(pitActive(cars[j]))minGap=Math.min(minGap,Math.hypot(cars[i].x-cars[j].x,cars[i].y-cars[j].y));
   }
  }
  return{state,time:raceTime,timed:cars.filter(c=>c.best<1e8).length,onTrack:cars.filter(onTrack).length,maxSpeed,minGap};
 })()`);
 assert.equal(result.state,'qbetween',JSON.stringify(result));assert.equal(result.onTrack,23,JSON.stringify(result));
 assert.ok(g.run('quali.results[0].rows.every(r=>r.time===null||r.laps>0)'));
 assert.ok(result.maxSpeed<=80+1e-6,JSON.stringify(result));assert.ok(result.minGap>=76,JSON.stringify(result));
});
test('X si attiva soltanto all’ingresso e in marcia avanti, senza prenotazioni',()=>{
 const g=game();g.run('startRace();');assert.equal(g.run('requestPitEntry()'),false);
 g.run('state="racing";pl.go=true;');assert.equal(g.run('requestPitEntry()'),false);
 for(const [s,d,v] of [[2000,-70,200],[g.run("PIT.entryStart")-100,200,200],[g.run("PIT.entryStart")-100,-70,-100]]){
  placePlayer(g,s,d,v);const before=g.run('JSON.stringify([pl.x,pl.y,pl.vx,pl.vy,pl.lap])');
  assert.equal(g.run('tryPitEntry(pl)'),false);assert.equal(g.run('JSON.stringify([pl.x,pl.y,pl.vx,pl.vy,pl.lap])'),before);
 }
 assert.equal(g.run('pl.pit.requested'),false);
 placePlayer(g,g.run("PIT.entryStart")-100,-70,200);assert.equal(g.run('requestPitEntry()'),true);
 assert.equal(g.run('pl.pit.phase'),'entry');assert.equal(g.run('pl.ai'),false);
 assert.equal(g.run('requestPitEntry(cars.find(c=>!c.isP))'),false);
});
test('transito ai box continuo: un passaggio al traguardo e penalità conservate',()=>{
 const g=game({laps:5});g.run('startRace();state="racing";cars.forEach(c=>c.go=true);pl.lap=0;pl.pen=3;pl.best=60;raceTime=80;');
 placePlayer(g,g.run("PIT.entryStart")-100,-70,200);g.run('requestPitEntry();');
 g.run('pl.raceStarted=true;pl.raceLapSectors=3;pl.raceLapDistance=wrapDistance(pl.trackS);');
 const result=g.run(`(()=>{
  const start={x:pl.x,y:pl.y};tryPitEntry(pl);
  const jump=Math.hypot(pl.x-start.x,pl.y-start.y),phases=new Set([pl.pit.phase]);let maxSpeed=0,maxStep=0,minSpeed=Infinity;
  for(let n=0;n<1800&&pitActive(pl);n++){
   const p={x:pl.x,y:pl.y};update(1/30);phases.add(pl.pit.phase);
   if(pl.pit.phase==='waiting'){confirmPitTyres();phases.add(pl.pit.phase);}
   if(pitActive(pl)){const speed=Math.hypot(pl.vx,pl.vy);maxSpeed=Math.max(maxSpeed,speed*.32);minSpeed=Math.min(minSpeed,speed);maxStep=Math.max(maxStep,Math.hypot(pl.x-p.x,pl.y-p.y));}
  }
  render();return{jump,phases:[...phases],maxSpeed,minSpeed,maxStep,onTrack:onTrack(pl),ai:pl.ai,lap:pl.lap,pen:pl.pen,best:pl.best,others:cars.filter(c=>!c.isP&&pitActive(c)).length};
 })()`);
 assert.equal(result.jump,0);assert.ok(result.onTrack,JSON.stringify(result));assert.ok(!result.ai);
 assert.deepEqual(Array.from(result.phases),['entry','lane','waiting','service','release','exit','track']);assert.ok(result.maxSpeed<=80+1e-6,JSON.stringify(result));
 assert.ok(result.maxStep<=250/30+.1,JSON.stringify(result));assert.equal(result.minSpeed,0,JSON.stringify(result));
 assert.equal(result.lap,1);assert.equal(result.pen,3);assert.equal(result.best,60);assert.equal(result.others,0);checkSeats(g);
 g.run('keys.KeyW=true;update(.01);');assert.equal(g.run('pl.inp.thr'),1);
 // Un secondo transito usa ancora la stessa piazzola e non riutilizza il vecchio percorso.
 placePlayer(g,g.run("PIT.entryStart")-80,-50,190);assert.ok(g.run('requestPitEntry()'));
 assert.ok(g.run('Math.abs(pl.pit.route.points[0].x-pl.x)<1e-9&&pl.pit.progress===0'));
});
test('rientro in qualifica: giro annullato, migliori tempi conservati e nuovo giro lanciato valido',()=>{
 const g=game({qmin:3});g.run('startQuali();');g.advance(20);
 placePlayer(g,g.run("PIT.entryStart")-100,-70,200);g.run('pl.lap=0;pl.best=75;pl.bestSecs=[20,25,30];requestPitEntry();');
 assert.ok(g.run('pitAutopilot(pl)'));assert.equal(g.run('pl.lap'),-1);assert.equal(g.run('pl.best'),75);
 assert.ok(g.run('pl.secs.every(t=>t===null)&&pl.bestSecs[0]===20'));
 g.run('pl.ai=true;');g.advance(250);
 assert.ok(g.run('cars.every(onTrack)&&cars.every(c=>c.go)&&pl.lap>=1&&pl.qLaps>=1&&pl.best<=75'));
 assert.ok(g.run('cars.every(c=>[c.x,c.y,c.vx,c.vy,c.trackS].every(Number.isFinite))'));checkSeats(g);
});
test('X tastiera e X/Quadrato avviano una sola guida assistita per pressione',()=>{
 const g=game();g.run('startRace();state="racing";pl.go=true;');
 placePlayer(g,g.run("PIT.entryStart")-100,-70,200);
 const pressX=repeat=>g.events.get('keydown').forEach(handler=>handler({code:'KeyX',repeat,preventDefault(){}}));
 pressX(false);assert.ok(g.run('pitAutopilot(pl)'));g.advance(.5);const progress=g.run('pl.pit.progress');
 pressX(true);pressX(false);assert.equal(g.run('pl.pit.progress'),progress);
 g.run('globalThis.fakePad={index:0,id:"Test",connected:true,mapping:"standard",axes:[0,0],buttons:Array.from({length:16},()=>({value:0,pressed:false}))};navigator.getGamepads=()=>[fakePad];fakePad.buttons[2]={value:1,pressed:true};pollPad();');
 assert.equal(g.run('pl.pit.progress'),progress);g.run('pollPad();');assert.equal(g.run('pl.pit.progress'),progress);
 g.run('fakePad.buttons[2]={value:0,pressed:false};pollPad();fakePad.buttons[2]={value:1,pressed:true};pollPad();');assert.equal(g.run('pl.pit.progress'),progress);
});
