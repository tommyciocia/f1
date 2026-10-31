'use strict';
/* Conteggio giri, progresso in gara e classifica in tempo reale */
function progress(c,a,b,from=T[a].s,to=T[b].s){
 if(c.fin)return;
 if(state==='quali'){qualiLapProgress(c,a,b,from,to);return;}
 const distance=signedTrackDistance(from,to);
 if(Math.abs(distance)>L*.08){c.raceLapValid=false;c.raceLapSectors=0;c.raceLapDistance=0;return;}
 c.raceLapDistance=Math.max(0,c.raceLapDistance+distance);
 if(crossedMark(a,b,0,from,to)){
  const at=timingAtMark(from,to,0);
  const complete=c.raceStarted&&c.raceLapValid&&c.raceLapSectors===3&&c.raceLapDistance>=L*.95;
  if(complete){c.lap++;const lt=at-c.lapStart;if(lt>0&&lt<c.best)c.best=lt;}
  // Il primo passaggio dalla griglia apre il giro, senza accreditare un giro completato.
  c.raceStarted=true;c.raceLapValid=true;c.raceLapSectors=0;c.raceLapDistance=0;
  c.lapStart=at;if(c.lap>=S.laps&&!c.fin){c.fin=at+c.pen;c.disqualified=missedMandatoryPit(c);c.ai=true;if(c.isP){banner(c.disqualified?'SQUALIFICATO · SOSTA OBBLIGATORIA NON EFFETTUATA':'BANDIERA A SCACCHI!',3000);finishSound();finT=at;}}}
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
// Distacchi misurati sugli stessi 100 rilevamenti per giro, con memoria limitata.
function recordRaceTiming(c,from,to){
 if(mode!=='race'||state!=='racing'||c.fin)return;
 const distance=signedTrackDistance(from,to);if(!(distance>0&&distance<L*.08))return;
 const start=(c.lap-(c.raceStarted?0:1))*L+wrapDistance(from),end=start+distance,spacing=L/100;
 const samples=c.timingSamples||(c.timingSamples=new Map());
 for(let i=Math.floor(start/spacing)+1;i<=Math.floor(end/spacing);i++){
  samples.set(i,raceTime-physicsStepDuration*(1-(i*spacing-start)/distance));
 }
 while(samples.size>128)samples.delete(samples.keys().next().value);
}
function raceInterval(ahead,behind){
 if(!ahead||!behind)return '—';
 if(ahead.fin&&behind.fin)return '+'+Math.max(0,behind.fin-ahead.fin).toFixed(3)+'s';
 const distance=prog(ahead)-prog(behind);
 if(distance>=L)return '+'+Math.floor(distance/L)+' GIRO/I';
 if(!ahead.timingSamples||!behind.timingSamples)return '—';
 const samples=Array.from(behind.timingSamples.keys());
 for(let i=samples.length-1;i>=0;i--){const key=samples[i];if(ahead.timingSamples.has(key))return '+'+Math.max(0,behind.timingSamples.get(key)-ahead.timingSamples.get(key)+behind.pen-ahead.pen).toFixed(1)+'s';}
 return '—';
}
// Il giro veloce cambia durante la gara: nessun pilota viene evidenziato finché
// non ha completato almeno un giro cronometrato.
const fastestLapDriver=()=>{
 let fastest=null;
 for(const c of cars)if(c.best<(fastest?fastest.best:1e9))fastest=c;
 return fastest;
};
