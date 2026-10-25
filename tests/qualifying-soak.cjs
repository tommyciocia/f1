'use strict';
// Esegue tutti i 45 minuti di gara simulata con la fisica reale, senza accorciare i timer.
// Il solo giocatore viene affidato all'AI per rendere il controllo ripetibile.
const assert=require('node:assert/strict');
const {game,checkSeats}=require('./helpers/game.cjs');
const g=game();g.run('startQuali();');
for(let phase=0;phase<3;phase++){
 g.run('if(pl.qActive)pl.ai=true;');
 const data=g.run(`(()=>{
  let maxStuck=0,locked=true;
  const frames=Math.ceil((qualiStage().duration+qualiFinishGrace+90)/.05);
  for(let n=0;n<frames&&state==='quali';n++){
   update(.05);
   for(const c of cars){
    if(![c.x,c.y,c.vx,c.vy,c.a].every(Number.isFinite))throw Error('Valori non finiti '+c.id);
    maxStuck=Math.max(maxStuck,c.stuck);locked=locked&&c.tyres.condition===1&&!c.tyres.degradation;
   }
  }
  const rows=quali.results[quali.stage]?.rows;
  return{phase:qualiStage().name,time:raceTime,state,participants:qualiParticipants().length,maxStuck,locked,
   minLaps:rows?Math.min(...rows.map(r=>r.laps)):0,timed:rows?rows.filter(r=>r.time!==null).length:0,
   eliminated:quali.results[quali.stage]?.eliminated.length};
 })()`);
 console.log(JSON.stringify(data));assert.equal(data.state,phase===2?'qdone':'qbetween');
 assert.equal(data.participants,[23,17,10][phase]);assert.equal(data.eliminated,[6,7,0][phase]);
 assert.equal(data.timed,data.participants);assert.ok(data.minLaps>2);assert.ok(data.locked);assert.ok(data.maxStuck<1);
 if(phase<2)g.click('nextq');
}
checkSeats(g);assert.equal(g.run('lastGrid.length'),23);assert.equal(g.run('quali.results.length'),3);
console.log('Sequenza completa 18/15/12 minuti verificata.');
