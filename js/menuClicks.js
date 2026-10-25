'use strict';
/* Gestione dei click sui pulsanti dei pannelli */
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;initAudio();
 const g=b.dataset.go,a=b.dataset.act;
 if(g){show(g);if(g==='cars')renderCars();if(g==='paddock')renderPaddock();if(g==='records')renderRecords();}
 if(a==='play')begin();else if(a==='restart'){if(mode==='quali')startQuali();else startRace();}else if(a==='grid')startRace(lastGrid);else if(a==='retryq')startQuali();else if(a==='endq')endQuali();else if(a==='resume')resume();else if(a==='menu')toMenu();
 else if(a==='resetmy'){S.myStats=[1,1,1,1];save();renderMyStats();}
 else if(a==='resetteam'){const t=clamp(+$('padTeam').value||0,0,TEAMS.length-2);S.teamStats[t]=TSTAT[t].slice();save();renderPaddock();}});
