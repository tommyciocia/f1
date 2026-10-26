'use strict';
/* Gestione dei click sui pulsanti dei pannelli */
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;initAudio();
 if(b.dataset.tyre){choosePitCompound(b.dataset.tyre);return;}
 if(b.dataset.circuit){previewCircuit(b.dataset.circuit);return;}
 const g=b.dataset.go,a=b.dataset.act;
 if(g){show(g);if(g==='circuits')renderCircuits();if(g==='cars')renderCars();if(g==='paddock')renderPaddock();if(g==='records')renderRecords();if(g==='controls')renderControlSettings();}
 if(a==='play')begin();else if(a==='restart'){if(mode==='quali')restartQualiSession();else startRace();}else if(a==='grid'){if(quali&&quali.finished)startRace();}else if(a==='nextq')nextQualiSession();else if(a==='retryq')startQuali();else if(a==='endq')endQuali();else if(a==='resume')resume();else if(a==='menu')toMenu();else if(a==='confirmtyres')confirmPitTyres();
 else if(a==='selectcircuit')selectCircuit(previewCircuitId);
 else if(a==='resetmy'){S.myStats=[1,1,1,1];save();renderMyStats();}
 else if(a==='resetteam'){const t=clamp(+$('padTeam').value||0,0,TEAMS.length-2);S.teamStats[t]=TSTAT[t].slice();save();renderPaddock();}});
