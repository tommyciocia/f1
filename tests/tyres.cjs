'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./helpers/game.cjs');
const {placePlayer}=require('./helpers/game.cjs');

test('mescole: prestazioni, degrado indipendente e scelta iniziale',()=>{
 const g=game({startCompound:'HARD'});g.run('startRace();state="racing";cars.forEach(c=>c.go=true);');
 assert.equal(g.run('pl.tyres.compound'),'HARD');
 const result=g.run(`(()=>{
  const soft=cars[0],medium=cars[1],hard=cars[2];
  fitTyres(soft,'SOFT');fitTyres(medium,'MEDIUM');fitTyres(hard,'HARD');
  const freshSpeed=[tyreSpeed(soft),tyreSpeed(medium),tyreSpeed(hard)],freshGrip=[tyreGrip(soft),tyreGrip(medium),tyreGrip(hard)];
  soft.go=medium.go=hard.go=true;soft.vx=medium.vx=hard.vx=500;
  for(let i=0;i<300;i++){updateTyres(soft,1/30);updateTyres(medium,1/30);updateTyres(hard,1/30);}
  return{wear:[soft.tyres.condition,medium.tyres.condition,hard.tyres.condition],speed:freshSpeed,grip:freshGrip};
 })()`);
 assert.ok(result.wear[0]<result.wear[1]&&result.wear[1]<result.wear[2],JSON.stringify(result));
 assert.ok(result.speed[0]>result.speed[1]&&result.speed[1]>result.speed[2],JSON.stringify(result));
 assert.ok(result.grip[0]>result.grip[1]&&result.grip[1]>result.grip[2],JSON.stringify(result));
});
test('fuori pista: consumo triplo per tutte le mescole, indipendente e normale al rientro',()=>{
 const g=game();g.run('startRace();state="racing";cars.forEach(c=>c.go=true);');
 for(const compound of ['SOFT','MEDIUM','HARD']){
  const data=g.run(`(()=>{
   const road=pl,off=cars.find(c=>!c.isP),untouched=cars.find(c=>c!==road&&c!==off);fitTyres(road,'${compound}');fitTyres(off,'${compound}');
   road.vx=off.vx=400;road.vy=off.vy=0;road.off=false;off.off=true;const previous=untouched.tyres.condition;
   updateTyres(road,3);updateTyres(off,3);const roadWear=1-road.tyres.condition,offWear=1-off.tyres.condition;
   off.off=false;const beforeReturn=off.tyres.condition;updateTyres(off,3);const returnWear=beforeReturn-off.tyres.condition;
   off.off=true;off.vx=0;const beforeStop=off.tyres.condition;updateTyres(off,3);
   return{roadWear,offWear,returnWear,stopped:off.tyres.condition===beforeStop,independent:untouched.tyres.condition===previous};
  })()`);
  assert.ok(Math.abs(data.offWear-3*data.roadWear)<1e-12,JSON.stringify(data));
  assert.ok(Math.abs(data.returnWear-data.roadWear)<1e-12,JSON.stringify(data));assert.ok(data.stopped&&data.independent);
 }
});

test('qualifica blocca SOFT al 100%; il transito non abilita il cambio gomme',()=>{
 const g=game();g.run('startQuali();cars.forEach(c=>{c.tyres.compound="HARD";c.tyres.condition=.1;c.off=true;updateTyres(c,.1);});');
 assert.equal(g.run('cars.every(c=>c.tyres.compound==="SOFT"&&c.tyres.condition===1&&!c.tyres.degradation)'),true);
 g.run('startRace();state="racing";pl.go=true;pl.pit.phase="waiting";pl.pit.selectedCompound="MEDIUM";pl.tyres.condition=.12;');
 assert.equal(g.run('confirmPitTyres()'),false);g.run('updatePitService(pl,3);');
 assert.equal(g.run('pl.tyres.compound'),'SOFT');assert.equal(g.run('pl.tyres.condition'),.12);assert.equal(g.run('pl.pitStops'),0);
});

test('il transito assistito conserva mescola e condizione senza soste',()=>{
 const g=game({laps:6});g.run('startRace();state="racing";pl.go=true;pl.lap=0;pl.tyres.condition=.52;');
 placePlayer(g,g.run('PIT.entryStart')-100,0,200);assert.equal(g.run('requestPitEntry()'),true);
 const before=g.run('JSON.stringify(pl.tyres)');g.run('for(let i=0;i<2200&&pitActive(pl);i++)update(.05);');
 assert.equal(g.run('pl.pit.phase'),'track');assert.equal(g.run('pl.pitStops'),0);assert.equal(g.run('JSON.stringify(pl.tyres)'),before);
});

test('né IA né giocatore entrano automaticamente con gomme usurate',()=>{
 const g=game({laps:6});g.run(`startRace();state='racing';cars.forEach(c=>c.go=true);
  globalThis.bot=cars.find(c=>!c.isP);const q=botPointAt(PIT.entryStart);bot.x=q.x+q.nx*-70;bot.y=q.y+q.ny*-70;bot.a=q.ang;bot.idx=q.i;bot.trackS=q.trackS;bot.d=bot.lane=-70;bot.vx=Math.cos(q.ang)*180;bot.vy=Math.sin(q.ang)*180;bot.tyres.condition=.1;`);
 g.run('aiInput(bot,1/60);');assert.equal(g.run('pitActive(bot)'),false);
 assert.equal(g.run('pitActive(pl)'),false);
});

test('durata e consumo si adattano ai giri; la stessa frazione di una gara lunga produce la stessa usura',()=>{
 for(const compound of ['SOFT','MEDIUM','HARD']){
  const states=[10,15,25,30,50].map(laps=>{
   const g=game({laps});g.run(`startRace();state='racing';pl.go=true;fitTyres(pl,'${compound}');pl.vx=L;pl.vy=0;updateTyres(pl,S.laps*.2);`);
   return g.run('({condition:pl.tyres.condition,age:pl.tyres.ageLaps,life:pl.tyres.estimatedLife,wear:pl.tyres.wearPerLap})');
  });
  for(let i=0;i<states.length;i++){
   assert.ok(Math.abs(states[i].condition-states[0].condition)<1e-12);
   if(i)assert.ok(states[i].life>states[i-1].life&&states[i].wear<states[i-1].wear);
  }
 }
 const g=game({laps:50});g.run('startRace();');
 assert.ok(g.run('tyreLife("SOFT")===16.5&&tyreLife("MEDIUM")>27&&tyreLife("HARD")===39'));
});

test('gare brevi: un set SOFT completa due giri senza consumo eccessivo; età individuale e limite non rigido',()=>{
 const g=game({laps:2});g.run('startRace();state="racing";pl.go=true;pl.vx=L;updateTyres(pl,2);');
 assert.ok(g.run('pl.tyres.condition>=.59&&pl.tyres.ageLaps===2'));
 assert.ok(g.run('cars.filter(c=>!c.isP).every(c=>c.tyres.ageLaps===0&&c.tyres.condition===1)'));
 g.run('updateTyres(pl,1);');assert.ok(g.run('pl.tyres.condition>.39&&tyreSpeed(pl)>0&&tyreGrip(pl)>0'));
});

test('usura e mescola modificano realmente accelerazione e frenata nella fisica',()=>{
 const g=game();g.run('startRace();state="racing";');
 const motion=(compound,condition,braking)=>{
  placePlayer(g,8000,0,braking?500:100);
  return g.run(`fitTyres(pl,'${compound}');pl.tyres.condition=${condition};pl.inp={st:0,thr:${braking?0:1},brk:${braking?1:0},hb:false};stepCar(pl,.01);Math.hypot(pl.vx,pl.vy);`);
 };
 assert.ok(motion('SOFT',1,false)>motion('HARD',1,false));
 assert.ok(motion('MEDIUM',1,false)>motion('MEDIUM',.1,false));
 assert.ok(motion('MEDIUM',1,true)<motion('MEDIUM',.1,true));
});

test('la conferma di un servizio disabilitato non azzera età e degrado',()=>{
 const g=game();g.run('startRace();state="racing";pl.go=true;pl.pit.phase="waiting";pl.tyres.ageLaps=2;pl.tyres.distance=L*2;pl.tyres.condition=.2;');
 const before=g.run('JSON.stringify(pl.tyres)');assert.equal(g.run('startPitService(pl,"HARD")'),false);g.run('updatePitService(pl,20);');
 assert.equal(g.run('JSON.stringify(pl.tyres)'),before);assert.equal(g.run('pl.pitStops'),0);assert.equal(g.run('pitObligationSatisfied(pl)'),true);
});

test('la torre esistente segue identità e mescola dopo riordino e cambio gomme',()=>{
 const g=game();g.run('startRace();state="racing";globalThis.bot=cars.find(c=>!c.isP);fitTyres(bot,"HARD");bot.lap=1;hudUpdate(1);');
 assert.match(g.elements.get('tower').innerHTML,/data-driver-id="driver:0"[^>]*>.*?tyre-h/);
 g.run('fitTyres(bot,"MEDIUM");pl.lap=2;hudUpdate(.01);');
 const row=g.elements.get('tower').innerHTML.match(/<div[^>]*data-driver-id="driver:0"[^>]*>.*?<\/div>/)[0];
 assert.match(row,/tyre-m/);assert.doesNotMatch(row,/tyre-h/);assert.doesNotMatch(row,/0\/1/);
 assert.equal((g.elements.get('tower').innerHTML.match(/data-driver-id=/g)||[]).length,23);
});
