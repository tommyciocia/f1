'use strict';
/* Conteggio giri, progresso in gara e classifica in tempo reale */
function progress(c,a,b,from=T[a].s,to=T[b].s){
 if(state==='quali'){qualiLapProgress(c,a,b,from,to);return;}
 const distance=signedTrackDistance(from,to);
 if(Math.abs(distance)>L*.08){c.raceLapValid=false;c.raceLapSectors=0;c.raceLapDistance=0;return;}
 c.raceLapDistance=Math.max(0,c.raceLapDistance+distance);
 if(crossedMark(a,b,0,from,to)){
  const complete=c.raceStarted&&c.raceLapValid&&c.raceLapSectors===3&&c.raceLapDistance>=L*.95;
  if(complete){c.lap++;const lt=raceTime-c.lapStart;if(lt>0&&lt<c.best)c.best=lt;}
  // Il primo passaggio dalla griglia apre il giro, senza accreditare un giro completato.
  c.raceStarted=true;c.raceLapValid=true;c.raceLapSectors=0;c.raceLapDistance=0;
  c.lapStart=raceTime;if(c.lap>=S.laps&&!c.fin){c.fin=raceTime+c.pen;c.disqualified=missedMandatoryPit(c);c.ai=true;if(c.isP){banner(c.disqualified?'SQUALIFICATO · SOSTA OBBLIGATORIA NON EFFETTUATA':'BANDIERA A SCACCHI!',3000);finT=raceTime;}}}
 else if(crossedMark(b,a,0,to,from)){
  c.raceStarted=false;c.raceLapValid=false;c.raceLapSectors=0;c.raceLapDistance=0;
  c.secs=[null,null,null];c.secDelta=[null,null,null];c.secState=['wait','wait','wait'];c.secStart=raceTime;c.activeSec=0;
 }
}
// Prima della linea la distanza è negativa; dopo è continua, senza giri negativi.
const prog=c=>(c.lap-(mode==='race'&&c.raceStarted===false?1:0))*L+wrapDistance(Number.isFinite(c.trackS)?c.trackS:T[c.idx].s);
const pitObligationSatisfied=c=>!c.pitRequired||c.pitStops>0;
const missedMandatoryPit=c=>mode==='race'&&!!c.fin&&!pitObligationSatisfied(c);
const order=()=>cars.slice().sort((a,b)=>Number(missedMandatoryPit(a))-Number(missedMandatoryPit(b))||(a.fin&&b.fin?a.fin-b.fin:a.fin?-1:b.fin?1:prog(b)-prog(a)));
// Il giro veloce cambia durante la gara: nessun pilota viene evidenziato finché
// non ha completato almeno un giro cronometrato.
const fastestLapDriver=()=>{
 let fastest=null;
 for(const c of cars)if(c.best<(fastest?fastest.best:1e9))fastest=c;
 return fastest;
};
