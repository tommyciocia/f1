'use strict';
/* Qualifiche: partenza, partenza scaglionata, tempo massimo e griglia finale */
let qualiReleaseTimers=[],qualiReleaseEpoch=0,qualiReleaseStartedAt=0;
function clearQualiReleaseTimers(){
 for(const timer of qualiReleaseTimers)clearTimeout(timer);
 qualiReleaseTimers=[];qualiReleaseEpoch++;qualiReleaseStartedAt=0;
}
function releaseQualiCar(c,epoch=qualiReleaseEpoch){
 if(epoch!==qualiReleaseEpoch||state!=='quali'||c.go)return false;
 c.go=true;c.releasedAt=performance.now();c.releaseLane=clamp(c.base,-TW/2+32,TW/2-32);
 placeStart(c,c.releaseLane);c.lane=c.releaseLane;c.d=c.releaseLane;c.launchLane=c.releaseLane;c.launchT=1.5;
 return true;
}
function scheduleQualiRelease(c,index,epoch){
 c.relT=index*2;c.go=false;c.releasedAt=0;
 if(index===0){releaseQualiCar(c,epoch);return;}
 const dueAt=qualiReleaseStartedAt+c.relT*1000;
 const timer=setTimeout(()=>releaseQualiCar(c,epoch),Math.max(0,dueAt-performance.now()));
 qualiReleaseTimers.push(timer);
}
function startQuali(){const order=defOrder();
 order.unshift(order.splice(order.findIndex(e=>e.isP),1)[0]); // il giocatore parte davanti
 mkCars(order);mode='quali';
 raceTime=0;qEnd=false;sessionBestSecs=[1e9,1e9,1e9];camMul=1;camX=pl.x;camY=pl.y;particles=[];state='quali';
 // Il rilascio usa timer a tempo reale: ogni vettura ha un unico appuntamento a 2 s.
 clearQualiReleaseTimers();const epoch=qualiReleaseEpoch;qualiReleaseStartedAt=performance.now();
 cars.forEach((c,k)=>scheduleQualiRelease(c,k,epoch));
 hideAll();$('hud').classList.remove('hidden');$('lights').classList.add('hidden');banner('QUALIFICHE',1500);}
function endQuali(){state='qdone';clearQualiReleaseTimers();
 const all=cars.map((c,i)=>({c,i,time:c.best<1e8?c.best:null}));
 all.sort((a,b)=>(a.time==null)-(b.time==null)||(a.time==null?a.i-b.i:a.time-b.time));lastGrid=all.map(r=>r.c.e);
 const pole=all[0].time;
 $('qList').innerHTML=all.map((r,i)=>`<div class="${r.c.isP?'me':''}"><b>${i+1}</b><span style="flex:1">${esc(r.c.name)} · ${esc(r.c.tname)}</span><span>${r.time==null?'nessun tempo':i?'+'+(r.time-pole).toFixed(3):fmt(r.time)}</span></div>`).join('');
 if(engG)engG.gain.value=0;show('qres');}
function releaseQualiCars(){
 // Salvaguardia per browser che sospendono i timer in background. I timeout sono il
 // normale meccanismo di rilascio e mantengono l'intervallo esatto.
 if(!qualiReleaseStartedAt)return;
 const elapsed=(performance.now()-qualiReleaseStartedAt)/1000;
 for(const c of cars)if(!c.go&&elapsed>=c.relT+.25)releaseQualiCar(c);
}
function checkQualiTime(){if(state==='quali'){if(!qEnd&&raceTime>=S.qmin*60){qEnd=true;qEndT=raceTime;banner('TEMPO SCADUTO: finisci il giro',2500);beep(660,.3);}if(qEnd&&(cars.every(c=>c.qd)||raceTime-qEndT>75))endQuali();}}
