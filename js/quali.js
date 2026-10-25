'use strict';
/* Q1 -> Q2 -> Q3. I tempi nascono solo dai passaggi reali del sistema di giri/settori. */
const QUALI_STAGES=[{name:'Q1',advance:17},{name:'Q2',advance:10},{name:'Q3',advance:0}];
let qualiReleaseQueue=[],qualiNextReleaseAt=0,qualiFinishGrace=75;
const validQualiTime=time=>Number.isFinite(time)&&time>0&&time<1e8;
const qualiStage=()=>quali?quali.stages[quali.stage]:null;
const qualiParticipants=()=>cars.filter(c=>c.qActive);
const qualiTimeLeft=()=>quali?Math.max(0,qualiStage().duration-raceTime):0;
function resetQualiRelease(){qualiReleaseQueue=[];qualiNextReleaseAt=0;}
function releaseQualiCar(c){
 if(state!=='quali'||qEnd||!c.qActive||c.go||raceTime>=qualiStage().duration||!canReleaseFromGarage(c))return false;
 c.go=true;c.releasedAt=raceTime;c.pit.phase='release';return true;
}
function startQuali(){
 const entries=defOrder();entries.unshift(entries.splice(entries.findIndex(e=>e.isP),1)[0]);
 mode='quali';lastGrid=null;mkCars(entries);
 quali={stage:0,stages:QUALI_STAGES.map((phase,i)=>({...phase,duration:S.qualiMinutes[i]*60})),results:[],finalGrid:null,finished:false};
 for(const [i,c] of cars.entries()){c.qualiTimes=[null,null,null];c.qSeed=i;c.qEliminatedAt=null;}
 startQualiSession(cars.map(c=>c.id));
}
function resetQualiLap(c){c.qLapActive=false;c.qLapValid=false;c.qLapSectors=0;c.qLapDistance=0;}
function invalidateQualiLap(c){
 resetQualiLap(c);
 if(state==='quali'&&qEnd&&c.qActive)completeQualiRun(c);
}
function startQualiSession(ids){
 const eligible=new Set(ids);resetQualiRelease();raceTime=0;qEnd=false;qEndT=0;qualiFinishGrace=75;
 sessionBestSecs=[1e9,1e9,1e9];tickT=0;particles=[];camMul=1;state='quali';
 for(const c of cars){
  c.qActive=eligible.has(c.id);c.qd=!c.qActive;c.ai=!c.isP;c.best=1e9;c.qBestSetAt=Infinity;c.qLaps=0;c.qOutcome=c.qActive?null:'eliminato';
  c.lap=-1;c.lapStart=0;c.secs=[null,null,null];c.bestSecs=[1e9,1e9,1e9];c.secDelta=[null,null,null];c.secState=['wait','wait','wait'];c.secStart=0;c.activeSec=0;
  c.inp={st:0,thr:0,brk:0,hb:false};c.passTarget=null;c.passSide=0;c.passHold=0;c.recoveryT=0;c.launchT=0;c.stuck=0;resetQualiLap(c);resetTyres(c);
  // Un transito richiesto con P nella fase precedente non sostituisce la piazzola assegnata.
  c.pit.route=makePitRoute(c.pit.stallS);c.pit.requested=false;c.pit.fromTrack=false;c.pit.yielding=false;parkInGarage(c);
 }
 qualiReleaseQueue=qualiParticipants().sort((a,b)=>b.pit.stallS-a.pit.stallS);
 qualiReleaseQueue.forEach((c,k)=>{c.relT=k*PIT.releaseInterval;c.releasedAt=null;});
 releaseQualiCars();const camera=qualiCameraCar();camX=camera.x;camY=camera.y;
 $('tower').classList.add('quali-tower');hideAll();$('hud').classList.remove('hidden');$('lights').classList.add('hidden');banner(qualiStage().name,1500);
}
function restartQualiSession(){
 if(!quali||quali.finished){startQuali();return;}
 quali.results.length=quali.stage;lastGrid=null;
 for(const c of qualiParticipants()){c.qualiTimes[quali.stage]=null;if(c.qEliminatedAt>=quali.stage)c.qEliminatedAt=null;}
 startQualiSession(qualiParticipants().map(c=>c.id));
}
function nextQualiSession(){
 if(state!=='qbetween'||!quali||quali.finished)return false;
 const previous=quali.results[quali.stage];quali.stage++;
 previous.qualified.forEach((id,i)=>{cars.find(c=>c.id===id).qSeed=i;});
 startQualiSession(previous.qualified);return true;
}
function releaseQualiCars(){
 if(state!=='quali'||qEnd||!qualiReleaseQueue.length||raceTime+1e-7<qualiNextReleaseAt)return;
 if(releaseQualiCar(qualiReleaseQueue[0])){qualiReleaseQueue.shift();qualiNextReleaseAt=raceTime+PIT.releaseInterval;}
}
function qualiOrder(){return qualiParticipants().sort((a,b)=>a.best-b.best||a.qBestSetAt-b.qBestSetAt||a.qSeed-b.qSeed);}
function completeQualiRun(c){
 c.qd=true;resetQualiLap(c);c.pit.requested=false;
 if(c.isP&&c.go)c.ai=true; // giro di rallentamento; guida manuale ripristinata nella prossima fase
}
function expireQualiSession(){
 if(qEnd||!quali)return;
 qEnd=true;qEndT=raceTime;resetQualiRelease();
 const active=qualiParticipants();
 // Limite di sicurezza finito per un giocatore fermo sul suo ultimo giro.
 qualiFinishGrace=Math.max(75,...active.map(c=>T.reduce((time,q)=>time+q.len/Math.max(100,Math.min(c.top,q.vc*c.cs)*.7),0)));
 for(const c of active)if(!c.qLapActive||!c.qLapValid||!onTrack(c))completeQualiRun(c);
 banner(qualiStage().name+' · TEMPO SCADUTO: completa il giro già iniziato',2500);beep(660,.3);
}
// Anche il pulsante di fine anticipata applica la bandiera a scacchi, senza inventare tempi.
function endQuali(){
 if(!quali||quali.finished||(state!=='quali'&&state!=='paused'))return;
 if(state==='paused'){state='quali';hideAll();}
 expireQualiSession();checkQualiTime();
}
function checkQualiTime(){
 if(state!=='quali'||!quali)return;
 if(!qEnd&&raceTime>=qualiStage().duration)expireQualiSession();
 if(qEnd){
  if(raceTime-qEndT>qualiFinishGrace)for(const c of qualiParticipants())if(!c.qd)completeQualiRun(c);
  if(qualiParticipants().every(c=>c.qd))finishQualiSession();
 }
}
function finishQualiSession(){
 if(state!=='quali'||!qEnd||!qualiParticipants().every(c=>c.qd)||quali.results[quali.stage])return;
 const phase=qualiStage(),ranked=qualiOrder(),cut=phase.advance;
 const rows=ranked.map((c,i)=>{
  const time=validQualiTime(c.best)?c.best:null;c.qualiTimes[quali.stage]=time;
  c.qOutcome=cut&&i>=cut?'eliminato':'qualificato';
  if(c.qOutcome==='eliminato')c.qEliminatedAt=quali.stage;
  return{id:c.id,name:c.name,team:c.tname,position:i+1,time,bestAt:validQualiTime(time)?c.qBestSetAt:null,laps:c.qLaps,status:c.qOutcome};
 });
 quali.results[quali.stage]={name:phase.name,duration:phase.duration,rows,qualified:cut?rows.slice(0,cut).map(r=>r.id):[],eliminated:cut?rows.slice(cut).map(r=>r.id):[]};
 resetQualiRelease();
 if(quali.stage===2){
  const grid=[...rows,...quali.results[1].rows.slice(10),...quali.results[0].rows.slice(17)];
  quali.finalGrid=grid.map((row,i)=>({...row,position:i+1,times:cars.find(c=>c.id===row.id).qualiTimes.slice(),source:i<10?'Q3':i<17?'Q2':'Q1'}));
  lastGrid=quali.finalGrid.map(row=>{const c=cars.find(c=>c.id===row.id);return{...c.e,qualiTimes:c.qualiTimes.slice()};});
  quali.finished=true;state='qdone';
 }else state='qbetween';
 showQualiResults();if(engG)engG.gain.value=0;
}
function qualiLapProgress(c,a,b){
 if(!c.qActive||c.qd)return;
 if(c.qLapActive&&movedForward(a,b)){
  const distance=(T[b].s-T[a].s+L)%L;c.qLapDistance+=distance;
  if(distance>L*.08)c.qLapValid=false; // un salto di segmento non crea un giro valido
 }
 if(a>N*.75&&b<N*.25){
  c.lap++;
  if(c.qLapActive&&c.qLapValid&&c.qLapSectors===3&&c.qLapDistance>=L*.95){
   const time=raceTime-c.lapStart;
   if(validQualiTime(time)){c.qLaps++;if(time<c.best){c.best=time;c.qBestSetAt=raceTime;if(c.isP)banner(qualiStage().name+' · '+fmt(time),1500);}}
  }
  resetQualiLap(c);
  if(qEnd||raceTime>=qualiStage().duration){completeQualiRun(c);return;}
  c.lapStart=raceTime;c.qLapActive=true;c.qLapValid=true;
 }else if(a<N*.25&&b>N*.75){c.lap--;invalidateQualiLap(c);}
}
function qualiCameraCar(){
 if(!quali||pl.qActive)return pl;
 const ranked=qualiOrder();return ranked.find(c=>c.go&&!c.qd)||ranked[0]||pl;
}
function qualiTable(final=false){
 const current=qualiOrder(),old=[];
 for(let phase=quali.stage-1;phase>=0;phase--)for(const row of quali.results[phase].rows.filter(r=>r.status==='eliminato'))old.push(cars.find(c=>c.id===row.id));
 const list=final?quali.finalGrid.map(row=>cars.find(c=>c.id===row.id)):[...current,...old],leader=current.find(c=>validQualiTime(c.best)),cut=qualiStage().advance;
 const header=final?'<th>Q1</th><th>Q2</th><th>Q3</th><th>Griglia</th>':'<th>Migliore</th><th>Distacco</th><th>Stato</th>';
 return '<table class="quali-table"><thead><tr><th>Pos.</th><th>Pilota</th><th>Team</th>'+header+'</tr></thead><tbody>'+list.map((c,i)=>{
  const prior=!c.qActive,eliminated=prior||c.qOutcome==='eliminato';
  const status=eliminated?'Eliminato '+QUALI_STAGES[c.qEliminatedAt].name:c.qOutcome==='qualificato'?'Qualificato':pitActive(c)?'Ai box':c.qd?'Giro concluso':'In pista';
  const time=prior?c.qualiTimes[c.qEliminatedAt]:c.best;
  const delta=!prior&&leader&&validQualiTime(time)?i===0?'LEADER':'+'+(time-leader.best).toFixed(3):'—';
  const cells=final?c.qualiTimes.map(t=>'<td>'+fmt(t)+'</td>').join('')+'<td>'+(i===0&&validQualiTime(quali.finalGrid[0].time)?'POLE':quali.finalGrid[i].source)+'</td>':'<td>'+fmt(time)+'</td><td>'+delta+'</td><td>'+status+'</td>';
  return '<tr class="'+[c.isP?'me':'',eliminated?'q-eliminated':'',!final&&cut&&i===cut?'q-cut':'',!final&&cut&&i>=cut&&i<current.length?'q-danger':'',quali.stage===2&&i===0?'q-pole':''].filter(Boolean).join(' ')+'"><td>'+(i+1)+'</td><td style="border-left:3px solid '+c.col+'">'+esc(c.name)+'</td><td>'+esc(c.tname)+'</td>'+cells+'</tr>';
 }).join('')+'</tbody></table>';
}
function showQualiResults(){
 const final=quali.finished,phase=qualiStage(),result=quali.results[quali.stage];
 $('qTitle').textContent=final?'Griglia di partenza · 23 vetture':phase.name+' · Risultati definitivi';
 $('qSummary').textContent=final?validQualiTime(result.rows[0].time)?'Pole: '+result.rows[0].name+' · '+fmt(result.rows[0].time):'Nessun tempo valido in Q3: ordine di accesso alla fase conservato.':result.qualified.length+' qualificati a '+QUALI_STAGES[quali.stage+1].name+' · '+result.eliminated.length+' eliminati'+(pl.qOutcome==='eliminato'?' · Sei eliminato: puoi seguire le prossime fasi.':'');
 $('qSummary').textContent+=' · Tabella scorrevole: tutte le 23 posizioni.';
 $('qList').innerHTML=qualiTable(final);$('nextQBtn').classList.toggle('hidden',final);$('gridBtn').classList.toggle('hidden',!final);
 if(!final)$('nextQBtn').textContent='CONTINUA IN '+QUALI_STAGES[quali.stage+1].name;
 clearTimeout(banner.t);$('banner').textContent='';$('hud').classList.add('hidden');show('qres');
}
