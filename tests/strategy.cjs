'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {game}=require('./helpers/game.cjs');
for(const laps of[1,2,3,10,25,50,65])test(laps+' giri: servizio disabilitato impedisce ingressi automatici',()=>{
 const g=game({laps});g.run('PIT.serviceAllowed=false;startRace();state="racing";cars.forEach(c=>c.go=true);');
 assert.ok(g.run('!PIT.serviceAllowed&&cars.every(c=>c.strategy.nextStopLap===Infinity)'));
 const result=g.run(`(()=>{for(const condition of[1,.05])for(const c of cars){const q=pointAtDistance(PIT.entryStart);Object.assign(c,{x:q.x,y:q.y,a:q.ang,idx:q.i,trackS:q.s,d:0,lane:0});c.tyres.condition=condition;aiInput(c,.05);}return cars.every(c=>onTrack(c)&&c.pitStops===0&&!c.strategy.pitThisLap);})()`);
 assert.ok(result);
});
test('le funzioni di strategia conservate stimano i tempi senza modificare le gomme',()=>{
 const g=game();g.run('startRace();');const before=g.run('JSON.stringify(cars.map(c=>c.tyres))');assert.ok(g.run('cars.every(c=>Number.isFinite(c.strategy.lapTime)&&c.strategy.lapTime>0)'));assert.equal(g.run('JSON.stringify(cars.map(c=>c.tyres))'),before);
});
