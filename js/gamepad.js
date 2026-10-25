'use strict';
/* Input da controller (Gamepad API) */
let padPrev={},trgMap={};
addEventListener('gamepadconnected',e=>toast('Controller collegato: '+e.gamepad.id.slice(0,40)));
addEventListener('gamepaddisconnected',()=>toast('Controller scollegato: uso la tastiera'));
function getPad(){let g=[];try{g=navigator.getGamepads?navigator.getGamepads():[];}catch(e){}for(const p of g)if(p&&p.connected)return p;return null;}
// legge sterzo/grilletti gestendo mappature standard e non standard
function readPad(p){
 const B=i=>p.buttons[i]?(typeof p.buttons[i].value==='number'&&p.buttons[i].value>0?p.buttons[i].value:(p.buttons[i].pressed?1:0)):0;
 let ax=p.axes[0]||0;const dz=.12;let st=Math.abs(ax)<dz?0:Math.sign(ax)*(Math.abs(ax)-dz)/(1-dz);
 st=clamp(st*S.sens*(S.inv?-1:1),-1,1);
 let thr=0,brk=0;
 if(p.mapping==='standard'){thr=B(7);brk=B(6);}
 else{ // mappatura sconosciuta: cerca assi-grilletto che a riposo valgono -1
  if(!trgMap[p.index]){trgMap[p.index]=[];p.axes.forEach((a,i)=>{if(i>=2&&a<-.9)trgMap[p.index].push(i);});}
  const t=trgMap[p.index];if(t.length>=2){brk=clamp((p.axes[t[0]]+1)/2,0,1);thr=clamp((p.axes[t[1]]+1)/2,0,1);}else{thr=B(7);brk=B(6);}}
 thr=Math.max(thr,B(0));brk=Math.max(brk,B(1));
 return{st,thr,brk,start:B(9)>.5,y:B(3)>.5,x:B(2)>.5};}
function pollPad(){const p=getPad();if(!p){padPrev={};return;}const r=readPad(p);
 if(r.start&&!padPrev.start)togglePause();if(r.y&&!padPrev.y)camMul=camMul===1?1.45:1;if(r.x&&!padPrev.x)requestPitEntry();padPrev=r;}
