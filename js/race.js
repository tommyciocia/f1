'use strict';
/* Gara: semafori di partenza, countdown, traguardo e classifica finale */
function renderRaceTyres(){
 document.querySelectorAll('[data-start-compound]').forEach(input=>{
  const tyre=TYRE_COMPOUNDS[input.value];input.checked=input.value===S.startCompound;
  input.closest('.starting-tyre').style.setProperty('--tyre-compound-color',tyre.color);
 });
 $('raceTyreSummary').textContent='Gomme di partenza: '+S.startCompound+' · Set nuovo al 100%';
}
function showRaceSetup(){
 resetQualiRelease();state='prerace';$('hud').classList.add('hidden');renderRaceTyres();show('raceSetup');
 if(engG)engG.gain.value=0;
 document.querySelectorAll('[data-start-compound]').forEach(input=>{if(input.checked)input.focus();});
}
function chooseRaceCompound(compound){
 if(state!=='prerace'||!Object.hasOwn(TYRE_COMPOUNDS,compound))return false;
 S.startCompound=compound;save();renderRaceTyres();return true;
}
function confirmRaceStart(){if(state!=='prerace')return false;startRace();return true;}
function startRace(g){resetQualiRelease();if(g!==undefined)lastGrid=g;mode='race';mkCars(lastGrid);$('tower').classList.remove('quali-tower');$('lights').classList.remove('hidden');raceTime=0;sessionBestSecs=[1e9,1e9,1e9];cd=0;lit=0;hold=.6+Math.random()*.9;finT=0;particles=[];camMul=1;tickT=0;
 camX=pl.x;camY=pl.y;state='countdown';prepareCareerRace();hideAll();$('hud').classList.remove('hidden');setLights(0);$('banner').textContent='';hudUpdate(0);}
function setLights(n){[...$('lights').children].forEach((s,i)=>s.classList.toggle('on',i<n));}
function updateCountdown(dt){
 if(state!=='countdown')return;
 cd+=dt;const n=Math.min(5,Math.floor(cd/.8));
  if(n!==lit){lit=n;setLights(n);if(n>0)beep(440,.12);}
  if(cd>=4+hold){setLights(0);$('lights').classList.add('hidden');state='racing';cars.forEach(c=>{c.go=true;c.launchLane=c.d;c.launchT=1.5;});markCareerRaceStarted();beep(880,.35);banner('VIA!',900);}
}
function checkRaceFinish(){
 if(state!=='racing')return;
 if(careerRun&&pl.retired){if(cars.every(c=>c.fin||c.retired))endRace();}
 else if(pl.fin&&(cars.every(c=>c.fin)||raceTime-finT>10))endRace();
}
function endRace(){state='done';cars.forEach(c=>c.disqualified=missedMandatoryPit(c));const o=order(),rec=readRecords();
 if(!pl.retired){rec.unshift({d:new Date().toLocaleDateString('it-IT'),circuitId:activeCircuit.id,circuitName:activeCircuit.name,pos:o.indexOf(pl)+1,tot:pl.fin,best:pl.best<1e8?pl.best:0,laps:S.laps,diff:S.diff,disqualified:pl.disqualified,pitStops:pl.pitStops});
  try{localStorage.setItem('f1sim.rec',JSON.stringify(rec.slice(0,10)));}catch(e){}}
 $('resList').innerHTML=o.map((c,i)=>`<div class="${c.isP?'me':''}"><b>${i+1}</b><span style="flex:1">${esc(c.name)} ${tyreBadge(c)} · ${esc(c.tname)}<small class="result-pits">${PIT.serviceAllowed?c.pitStops+' soste completate':esc(activeCircuit.name)}${c.disqualified?' · Sosta obbligatoria mancante':''}</small></span><span class="${c.disqualified?'pit-dsq':''}">${c.disqualified?'DSQ':c.retired?'RITIRATO':c.fin?fmt(c.fin):'+'+Math.max(1,S.laps-c.lap)+' giro/i'}</span></div>`).join('');
 completeCareerGP(o);careerResultActions();show('result');if(careerRun?.completed&&career.status==='complete')openCareer();}
