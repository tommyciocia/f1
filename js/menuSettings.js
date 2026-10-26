'use strict';
/* Menu "Impostazioni" */
document.querySelectorAll('[data-set]').forEach(el=>{const k=el.dataset.set;
 if(el.type==='checkbox')el.checked=S[k];else el.value=S[k];
 el.addEventListener('input',()=>{S[k]=el.type==='checkbox'?el.checked:(el.type==='range'||el.type==='number'||k==='diff')?+el.value:el.value;
  if(k==='laps')S.laps=clamp((S.laps|0)||3,1,65);if(k==='qmin')S.qmin=clamp(Math.round(S.qmin)||0,0,10);
  if(k==='vol'){initAudio();applyVol();beep(660,.12,'square',.2);}save();});});
document.querySelectorAll('[data-qminutes]').forEach(el=>{
 const phase=+el.dataset.qminutes;el.value=S.qualiMinutes[phase];
 el.addEventListener('input',()=>{S.qualiMinutes[phase]=clamp(Math.round(+el.value)||[18,15,12][phase],1,60);save();});
});
