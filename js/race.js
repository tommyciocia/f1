'use strict';
/* Gara: semafori di partenza, countdown, traguardo e classifica finale */
function startRace(g){if(g!==undefined)lastGrid=g;mkCars(lastGrid);mode='race';$('lights').classList.remove('hidden');raceTime=0;sessionBestSecs=[1e9,1e9,1e9];cd=0;lit=0;hold=.6+Math.random()*.9;finT=0;particles=[];camMul=1;
 camX=pl.x;camY=pl.y;state='countdown';hideAll();$('hud').classList.remove('hidden');setLights(0);$('banner').textContent='';}
function setLights(n){[...$('lights').children].forEach((s,i)=>s.classList.toggle('on',i<n));}
function updateCountdown(dt){
 if(state!=='countdown')return;
 cd+=dt;const n=Math.min(5,Math.floor(cd/.8));
  if(n!==lit){lit=n;setLights(n);if(n>0)beep(440,.12);}
  if(cd>=4+hold){setLights(0);state='racing';cars.forEach(c=>{c.go=true;c.launchLane=c.d;c.launchT=1.5;});beep(880,.35);banner('VIA!',900);}
}
function checkRaceFinish(){if(state==='racing'&&pl.fin&&(cars.every(c=>c.fin)||raceTime-finT>10))endRace();}
function endRace(){state='done';const o=order();let rec=[];
 try{rec=JSON.parse(localStorage.getItem('f1sim.rec')||'[]');}catch(e){}
 rec.unshift({d:new Date().toLocaleDateString('it-IT'),pos:o.indexOf(pl)+1,tot:pl.fin,best:pl.best<1e8?pl.best:0,laps:S.laps,diff:S.diff});
 try{localStorage.setItem('f1sim.rec',JSON.stringify(rec.slice(0,10)));}catch(e){}
 $('resList').innerHTML=o.map((c,i)=>`<div class="${c.isP?'me':''}"><b>${i+1}</b><span style="flex:1">${esc(c.name)} · ${esc(c.tname)}</span><span>${c.fin?fmt(c.fin):'+'+Math.max(1,S.laps-c.lap)+' giro/i'}</span></div>`).join('');
 show('result');}
