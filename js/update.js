'use strict';
/* Ciclo di aggiornamento: richiama in ordine tutte le parti del gioco */
function update(dt){
 pollPad();
 updateCountdown(dt);
 if(state==='racing'||state==='countdown'||state==='quali'){
  if(!(dt>1e-4))dt=1e-4;
  if(state==='racing'||state==='quali')raceTime+=dt;
  if(state==='quali')releaseQualiCars();
  tryPitEntry(pl);
  updateSlipstream();
  for(const c of cars){c.inp=c.ai||pitActive(c)?aiInput(c,dt):getInput(dt);if(c.rep>0)c.rep-=dt;}
  stepAllCars(dt);
  updateBotRecovery(dt);
  emitParticles();
  checkQualiTime();
  checkRaceFinish();
 }
 updateParticles(dt);
 engineSound(pl||{vx:0,vy:0,top:1,inp:{thr:0}},state==='racing'||state==='countdown'||state==='quali');
 if(state==='quali')qHud(dt);else if(state!=='menu'&&state!=='done'&&state!=='qdone')hudUpdate(dt);
 if(!$('controls').classList.contains('hidden'))testUpdate();
}
