'use strict';
/* Conteggio giri, progresso in gara e classifica in tempo reale */
function progress(c,a,b){
 if(state==='quali'){if(a>N*.75&&b<N*.25){c.lap++;if(c.lap>=1&&!c.qd){const lt=raceTime-c.lapStart;if(lt<c.best){c.best=lt;if(c.isP)banner(fmt(lt),1500);}}c.lapStart=raceTime;if(qEnd&&!c.qd){c.qd=true;if(c.isP)c.ai=true;}}else if(a<N*.25&&b>N*.75)c.lap--;return;}
 if(a>N*.75&&b<N*.25){c.lap++;
  if(c.lap>=1){const lt=raceTime-c.lapStart;if(lt<c.best)c.best=lt;}
  c.lapStart=raceTime;if(c.lap>=S.laps&&!c.fin){c.fin=raceTime+c.pen;c.ai=true;if(c.isP){banner('BANDIERA A SCACCHI!',3000);finT=raceTime;}}}
 else if(a<N*.25&&b>N*.75)c.lap--;}
const prog=c=>c.lap*L+T[c.idx].s;
const order=()=>cars.slice().sort((a,b)=>a.fin&&b.fin?a.fin-b.fin:a.fin?-1:b.fin?1:prog(b)-prog(a));
// Il giro veloce cambia durante la gara: nessun pilota viene evidenziato finché
// non ha completato almeno un giro cronometrato.
const fastestLapDriver=()=>{
 let fastest=null;
 for(const c of cars)if(c.best<(fastest?fastest.best:1e9))fastest=c;
 return fastest;
};
