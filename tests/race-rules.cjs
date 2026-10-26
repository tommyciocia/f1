'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {game}=require('./helpers/game.cjs');
test('nessun obbligo di sosta: il risultato usa gli arrivi e conserva il circuito nei record',()=>{
 const g=game();g.run('startRace();state="racing";cars.forEach((c,i)=>{c.fin=100+i;c.lap=S.laps;});pl.fin=50;endRace();');
 assert.equal(g.run('order().indexOf(pl)'),0);assert.equal(g.run('pl.disqualified'),false);
 assert.equal(g.run('JSON.parse(localStorage.getItem("f1sim.rec"))[0].circuitId'),'barcelona');assert.doesNotMatch(g.elements.get('resList').innerHTML,/DSQ/);
});
test('prima del traguardo classifica basata sul progresso reale lungo il circuito',()=>{
 const g=game();g.run('startRace();state="racing";pl.lap=1;pl.trackS=L-100;pl.idx=pointAtDistance(pl.trackS).i;');assert.equal(g.run('order().indexOf(pl)'),0);
});
test('i cinque semafori spariscono al via e tornano al riavvio',()=>{
 const g=game();g.run('startRace();updateCountdown(6);');assert.equal(g.run('state'),'racing');assert.ok(g.elements.get('lights').classList.contains('hidden'));g.run('startRace();');assert.ok(!g.elements.get('lights').classList.contains('hidden'));
});
for(const laps of[1,2,3,10,25,50,65])test(laps+' giri: nessuna squalifica o sosta obbligatoria per giocatore e IA',()=>{
 const g=game({laps});g.run('startRace();');assert.ok(g.run('cars.every(c=>!c.pitRequired&&pitObligationSatisfied(c))'));g.run('cars.forEach((c,i)=>c.fin=100+i);endRace();');assert.ok(g.run('cars.every(c=>!c.disqualified)'));
});
test('riavvio e passaggio dalle qualifiche azzerano i dati della sessione',()=>{
 const g=game();g.run('startRace();cars.forEach(c=>{c.pitStops=3;c.tyres.condition=.1;c.fin=100;c.disqualified=true;});startQuali();endQuali();nextQualiSession();endQuali();nextQualiSession();endQuali();startRace();');
 assert.ok(g.run('cars.length===23&&cars.every(c=>c.pitStops===0&&c.tyres.condition===1&&!c.fin&&!c.disqualified&&!c.pitRequired)'));
});
