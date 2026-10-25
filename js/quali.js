'use strict';
/* Qualifiche: partenza, partenza scaglionata, tempo massimo e griglia finale */
let qualiReleaseQueue=[],qualiNextReleaseAt=0,qualiFinishGrace=75;
function resetQualiRelease(){
 qualiReleaseQueue=[];qualiNextReleaseAt=0;
}
function releaseQualiCar(c){
 if(state!=='quali'||c.go||!canReleaseFromGarage(c))return false;
 c.go=true;c.releasedAt=raceTime;c.pit.phase='release';
 return true;
}
function startQuali(){const order=defOrder();
 order.unshift(order.splice(order.findIndex(e=>e.isP),1)[0]); // il giocatore parte davanti
 mkCars(order);mode='quali';
 raceTime=0;qEnd=false;qualiFinishGrace=75;sessionBestSecs=[1e9,1e9,1e9];camMul=1;particles=[];state='quali';
 resetQualiRelease();cars.forEach(parkInGarage);
 // Dalla piazzola più vicina all'uscita a quella più lontana: nessun incrocio in apron.
 // Il tempo della simulazione si ferma in pausa e non produce partenze simultanee al rientro.
 qualiReleaseQueue=cars.slice().sort((a,b)=>b.pit.stallS-a.pit.stallS);
 qualiReleaseQueue.forEach((c,k)=>{c.relT=k*PIT.releaseInterval;c.releasedAt=null;});
 releaseQualiCars();camX=pl.x;camY=pl.y;
 hideAll();$('hud').classList.remove('hidden');$('lights').classList.add('hidden');banner('QUALIFICHE',1500);}
function endQuali(){state='qdone';resetQualiRelease();
 const all=cars.map((c,i)=>({c,i,time:c.best<1e8?c.best:null}));
 all.sort((a,b)=>(a.time==null)-(b.time==null)||(a.time==null?a.i-b.i:a.time-b.time));lastGrid=all.map(r=>r.c.e);
 const pole=all[0].time;
 $('qList').innerHTML=all.map((r,i)=>`<div class="${r.c.isP?'me':''}"><b>${i+1}</b><span style="flex:1">${esc(r.c.name)} · ${esc(r.c.tname)}</span><span>${r.time==null?'nessun tempo':i?'+'+(r.time-pole).toFixed(3):fmt(r.time)}</span></div>`).join('');
 if(engG)engG.gain.value=0;show('qres');}
function releaseQualiCars(){
 if(state!=='quali'||!qualiReleaseQueue.length||raceTime+1e-7<qualiNextReleaseAt)return;
 if(releaseQualiCar(qualiReleaseQueue[0])){qualiReleaseQueue.shift();qualiNextReleaseAt=raceTime+PIT.releaseInterval;}
}
function checkQualiTime(){if(state==='quali'){
 if(!qEnd&&raceTime>=S.qmin*60){
  qEnd=true;qEndT=raceTime;
  // Anche nelle sessioni brevi l'ultimo uscito può finire out-lap e primo giro lanciato.
  // Il timeout resta finito se il giocatore si ferma; tiene conto di difficoltà e statistiche.
  qualiFinishGrace=Math.max(75,...cars.map(c=>2*T.reduce((time,q)=>time+q.len/Math.max(100,Math.min(c.top,q.vc*c.cs)*.85),0)));
  banner('TEMPO SCADUTO: finisci il giro',2500);beep(660,.3);
 }
 if(qEnd&&(cars.every(c=>c.qd)||raceTime-qEndT>qualiFinishGrace))endQuali();
}}
