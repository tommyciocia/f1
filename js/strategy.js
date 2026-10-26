'use strict';
/* Strategia IA: una prima sosta individuale e confronto fra degrado e tempo ai box.
   Tutte le decisioni avvengono all'ingresso reale; nessuna sosta simulata a distanza. */
function remainingRaceLaps(c){return Math.max(0,S.laps-Math.max(0,c.lap)-clamp(c.trackS/L,0,1));}
function planAiPitStop(c){
 if(!PIT.serviceAllowed){c.strategy={profile:0,lapTime:T.reduce((t,q)=>t+q.len/Math.max(100,Math.min(c.top,q.vc*c.cs)),0),nextStopLap:Infinity,decisionLap:null};return;}
 const profile=(c.aiId*7%11)/10;
 const lapTime=c.strategy?.lapTime||T.reduce((time,q)=>time+q.len/Math.max(100,Math.min(c.top,q.vc*c.cs)),0);
 const stint=c.tyres.estimatedLife*(.78+profile*.22);
 // La prima sosta lascia margine anche alle HARD. In tre giri ci si ferma dopo
 // il primo o il secondo; mai al via e mai dopo aver preso la bandiera.
 const firstFraction={SOFT:.32,MEDIUM:.52,HARD:.67}[c.tyres.compound]+(profile-.5)*.14;
 const target=c.pitStops?Math.max(0,c.lap)+stint:Math.min(stint,S.laps*firstFraction);
 c.strategy={profile,lapTime,nextStopLap:mode==='race'&&S.laps>2?clamp(Math.round(target),1,S.laps-1):Infinity,decisionLap:null,expectedPitLoss:0,expectedGain:0};
}
function estimatedPitLoss(c){
 const distance=PIT.exitEnd-PIT.entryStart;
 return Math.max(PIT.tyreServiceTime,(distance+2*Math.abs(PIT.stallD-PIT.laneD))/PIT.speedLimit+PIT.tyreServiceTime+1.5-distance/L*c.strategy.lapTime);
}
function estimatedStintTime(c,compound,condition,laps){
 const tyre=TYRE_COMPOUNDS[compound],wear=tyreWearPerLap(compound);
 let time=0;
 for(let distance=0;distance<laps;distance++){
  const part=Math.min(1,laps-distance),penalty=tyreConditionPenalty(condition-wear*part/2);
  time+=part*c.strategy.lapTime/(tyre.speed*(1-penalty*.42)*Math.sqrt(tyre.grip*(1-penalty)));
  condition=Math.max(0,condition-wear*part);
 }
 return time;
}
function bestAiTyrePlan(c,remaining){
 return freshAiTyrePlans(c,remaining).at(-1);
}
function freshAiTyrePlans(c,remaining){
 const count=Math.max(1,Math.ceil(remaining)),fraction=remaining-count+1,plans=[],loss=estimatedPitLoss(c);
 const stintTimes={};
 for(const compound of Object.keys(TYRE_COMPOUNDS)){
  const times=[0],wear=tyreWearPerLap(compound);
  for(let lap=0;lap<count;lap++)times.push(times[lap]+estimatedStintTime(c,compound,Math.max(0,1-lap*wear),1));
  stintTimes[compound]=times;
 }
 // Programmazione dinamica sui passaggi futuri all'ingresso: entrambe le opzioni
 // possono fare ulteriori soste, senza un limite artificiale a uno o due cambi.
 // In questo modo restare fuori oggi viene confrontato con la stessa gara futura.
 for(let n=0;n<count;n++){
  const laps=n+fraction;let best=null;
  for(const compound of Object.keys(TYRE_COMPOUNDS)){
   let time=estimatedStintTime(c,compound,1,laps),stintLaps=laps;
   for(let stint=1;stint<=n;stint++){
    const candidate=stintTimes[compound][stint]+loss+plans[n-stint].time;
    if(candidate<time){time=candidate;stintLaps=stint;}
   }
   const preference=(c.strategy.profile-.5)*(compound==='SOFT'?-.6:compound==='HARD'?.6:0);
   if(!best||time+preference<best.time)best={compound,time:time+preference,stintLaps};
  }
  plans.push(best);
 }
 return plans;
}
function estimatedRunTime(c,compound,condition,remaining,plans=freshAiTyrePlans(c,remaining)){
 let time=estimatedStintTime(c,compound,condition,remaining),stintTime=0;
 const wear=tyreWearPerLap(compound),loss=estimatedPitLoss(c);
 for(let stint=1;stint<plans.length;stint++){
  stintTime+=estimatedStintTime(c,compound,Math.max(0,condition-(stint-1)*wear),1);
  time=Math.min(time,stintTime+loss+plans[plans.length-1-stint].time);
 }
 return time;
}
function updateAiPitStrategy(c){
 if(!PIT.serviceAllowed||mode!=='race'||state!=='racing'||c.isP||!c.go||c.fin||pitActive(c))return;
 // Una decisione per passaggio nella zona d'ingresso; riprova l'accesso se il
 // traffico o l'orientamento impediscono temporaneamente di impegnare il raccordo.
 if(c.trackS<PIT.entryZoneStart||c.trackS>PIT.entryCaptureEnd)return;
 if(c.strategy.decisionLap!==c.lap){
  const remaining=remainingRaceLaps(c),plans=freshAiTyrePlans(c,remaining),plan=plans.at(-1),loss=estimatedPitLoss(c);
  const oldTime=estimatedRunTime(c,c.tyres.compound,c.tyres.condition,remaining,plans);
  c.strategy.expectedPitLoss=loss;c.strategy.expectedGain=oldTime-plan.time-loss;c.strategy.decisionLap=c.lap;
  const mandatory=c.pitRequired&&!pitObligationSatisfied(c);
  const scheduled=c.lap>=c.strategy.nextStopLap;
  const paysOff=c.strategy.expectedGain>1+(1-c.strategy.profile)*2;
  const exhausted=c.tyres.condition<.15&&remaining>1;
  c.strategy.pitThisLap=remaining>0&&(mandatory&&(scheduled||c.lap>=S.laps-1)||remaining>1&&(paysOff||exhausted));
 }
 if(c.strategy.pitThisLap)tryPitEntry(c);
}
