'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./helpers/game.cjs');

for(const compound of ['SOFT','MEDIUM','HARD'])test('pre-gara: '+compound+' montate solo alla conferma, con degrado della mescola scelta',()=>{
 const g=game({qualiEnabled:false,laps:12});g.click('play');
 assert.equal(g.run('state'),'prerace');
 const before=g.run('JSON.stringify({raceTime,cd,cars:cars.map(c=>[c.x,c.y,c.go,c.tyres])})');
 g.advance(30);
 assert.equal(g.run('JSON.stringify({raceTime,cd,cars:cars.map(c=>[c.x,c.y,c.go,c.tyres])})'),before);
 assert.equal(g.run(`chooseRaceCompound('${compound}')`),true);
 assert.equal(g.run('pl.tyres.compound'),'SOFT');
 assert.match(g.elements.get('raceTyreSummary').textContent,new RegExp(compound));
 g.click('startrace');
 assert.equal(g.run('state'),'countdown');
 assert.equal(g.run('pl.tyres.compound'),compound);
 assert.ok(g.run('pl.tyres.condition===1&&pl.tyres.distance===0&&pl.tyres.ageLaps===0&&pl.tyres.degradation&&!pl.go'));
 assert.equal(g.elements.get('tyreText').textContent,compound+' — 100%');
 g.run('updateCountdown(6);pl.vx=L;pl.vy=0;pl.off=false;updateTyres(pl,1);');
 assert.equal(g.run('state'),'racing');
 assert.equal(g.run('pl.tyres.compound'),compound);
 assert.ok(g.run(`Math.abs(pl.tyres.condition-(1-.6/tyreLife('${compound}')))<1e-12&&pl.tyres.ageLaps===1`));
});

test('dopo Q3 la scelta conserva risultati e griglia, con SOFT regolamentari fino alla conferma',()=>{
 const g=game();g.click('play');
 for(let phase=0;phase<3;phase++){g.run('endQuali();');if(phase<2)g.click('nextq');}
 const results=g.run('JSON.stringify(quali.results)'),grid=Array.from(g.run('quali.finalGrid.map(c=>c.id)'));
 g.click('grid');assert.equal(g.run('state'),'prerace');
 assert.equal(g.run('chooseRaceCompound("HARD")'),true);
 g.advance(20);
 assert.ok(g.run('cars.every(c=>c.tyres.compound==="SOFT"&&c.tyres.condition===1&&!c.tyres.degradation)'));
 g.click('startrace');
 assert.deepEqual(Array.from(g.run('cars.map(c=>c.id)')),grid);
 assert.equal(g.run('JSON.stringify(quali.results)'),results);
 assert.equal(g.run('pl.tyres.compound'),'HARD');
 assert.ok(g.run('!pl.ai&&cars.every(c=>c.tyres.degradation&&c.tyres.condition===1)'));
});

test('ricominciare da pausa o risultato ripropone le gomme e monta un set nuovo',()=>{
 const g=game({qualiEnabled:false});g.click('play');g.click('startrace');
 g.run('pl.tyres.condition=.1;togglePause();');g.click('restart');
 assert.equal(g.run('state'),'prerace');
 g.run('chooseRaceCompound("MEDIUM");');g.click('startrace');
 assert.ok(g.run('pl.tyres.compound==="MEDIUM"&&pl.tyres.condition===1&&pl.tyres.distance===0'));
 g.run('cars.forEach((c,i)=>c.fin=100+i);endRace();');g.click('restart');
 assert.equal(g.run('state'),'prerace');
 g.run('chooseRaceCompound("HARD");');g.click('startrace');
 assert.ok(g.run('pl.tyres.compound==="HARD"&&pl.tyres.condition===1&&!pl.fin'));
});

test('annullamento e riapertura conservano la scelta senza avviare la gara',()=>{
 const g=game({qualiEnabled:false});g.click('play');g.run('chooseRaceCompound("MEDIUM");');g.click('menu');
 g.click('startrace');assert.equal(g.run('state'),'menu');
 assert.equal(g.run('chooseRaceCompound("HARD")'),false);
 g.click('play');assert.equal(g.run('S.startCompound'),'MEDIUM');assert.equal(g.run('state'),'prerace');
 assert.equal(g.run('JSON.parse(localStorage.getItem("f1sim.set")).startCompound'),'MEDIUM');
 for(const value of ['INTERMEDIATE','toString','__proto__'])assert.equal(g.run(`chooseRaceCompound('${value}')`),false);
 assert.equal(g.run('S.startCompound'),'MEDIUM');
 g.click('startrace');g.run('cd=2;pl.tyres.condition=.8;');g.click('startrace');
 assert.equal(g.run('cd'),2);assert.equal(g.run('pl.tyres.condition'),.8);
 assert.equal(g.run('chooseRaceCompound("HARD")'),false);
});
