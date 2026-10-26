'use strict';
/* Le impostazioni dei joystick non standard sono salvate, senza librerie o driver simulati. */
function renderControlSettings(){
 const p=getPad(),map=p?padBindings(p):S.padMap;
 document.querySelectorAll('[data-pad-bind]').forEach(el=>el.value=map[el.dataset.padBind]);
 $('padMode').value=S.padTriggers;
}
document.querySelectorAll('[data-pad-bind]').forEach(el=>el.addEventListener('input',()=>{
 const key=el.dataset.padBind;S.padMap[key]=clamp(Math.trunc(+el.value)||0,0,key.endsWith('Axis')?15:31);
 if(key==='pit')S.padPitCustom=true;trgMap={};padPrev={};save();
}));
$('padMode').addEventListener('change',()=>{S.padTriggers=$('padMode').value;trgMap={};padPrev={};save();});
$('resetPadControls').addEventListener('click',()=>{S.padMap={...PAD_DEFAULT};S.padPitCustom=false;S.padTriggers='auto';trgMap={};padPrev={};save();renderControlSettings();});
renderControlSettings();
