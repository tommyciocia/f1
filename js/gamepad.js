'use strict';
/* Input da controller (Gamepad API) */
let padPrev={},trgMap={},activePadKey=null,padError='';
const padKey=p=>p.index+':'+p.id;
const padButton=(p,i)=>{const b=p.buttons?.[i];return clamp(typeof b==='number'?b:Math.max(Number(b?.value)||0,b?.pressed?1:0),0,1);};
const padAxis=(p,i)=>clamp(Number(p.axes?.[i])||0,-1,1);
const isPlayStationPad=p=>/054c|sony|playstation|dualshock|dualsense|\bps[45]\b/i.test(p?.id||'')||/^wireless controller(?:\s*\(|$)/i.test(p?.id||'');
function padBindings(p){
 const map={...S.padMap};
 if(isPlayStationPad(p)){
  const raw=p.mapping!=='standard';
  if(!S.padPitCustom&&map.pit===PAD_DEFAULT.pit)map.pit=raw?1:0;
  if(raw&&map.reverse===PAD_DEFAULT.reverse)map.reverse=2;
 }
 return map;
}
addEventListener('gamepadconnected',e=>{trgMap[padKey(e.gamepad)]=[];toast('Controller collegato: '+e.gamepad.id.slice(0,40));});
addEventListener('gamepaddisconnected',e=>{delete trgMap[padKey(e.gamepad)];if(activePadKey===padKey(e.gamepad)){activePadKey=null;padPrev={};}toast('Controller scollegato: uso la tastiera');});
function getPad(){
 let pads=[];padError='';
 try{if(!navigator.getGamepads){padError='API Gamepad non disponibile in questo browser.';return null;}pads=Array.from(navigator.getGamepads()||[]).filter(p=>p&&p.connected);}catch(e){padError='Accesso al controller non disponibile: '+e.name;return null;}
 const active=p=>Array.from(p.buttons||[]).some((_,i)=>padButton(p,i)>.15)||Math.abs(padAxis(p,S.padMap.steerAxis))>.2;
 let selected=pads.find(p=>padKey(p)===activePadKey);
 if(!selected||!active(selected))selected=pads.find(active)||selected||pads[0];
 activePadKey=selected?padKey(selected):null;return selected||null;
}
// legge sterzo/grilletti gestendo mappature standard e non standard
function readPad(p){
 const B=i=>padButton(p,i),map=padBindings(p);
 let ax=padAxis(p,map.steerAxis);const dz=.12;let st=Math.abs(ax)<dz?0:Math.sign(ax)*(Math.abs(ax)-dz)/(1-dz);
 st=clamp(st*S.sens*(S.inv?-1:1),-1,1);
 let thr=B(map.throttle),brk=B(map.brake);
 if(S.padTriggers==='auto'&&p.mapping!=='standard'){
  const key=padKey(p),candidates=trgMap[key]||(trgMap[key]=[]);
  Array.from(p.axes||[]).forEach((value,i)=>{if(i>=2&&i!==map.steerAxis&&value<-.9&&!candidates.includes(i))candidates.push(i);});
  candidates.sort((a,b)=>a-b);
  if(candidates.length>=2){brk=clamp((padAxis(p,candidates[0])+1)/2,0,1);thr=clamp((padAxis(p,candidates[1])+1)/2,0,1);}
 }else if(!['auto','buttons'].includes(S.padTriggers)){
  const value=i=>{const a=padAxis(p,i);return S.padTriggers==='axes'?(a+1)/2:S.padTriggers==='invertedAxes'?(1-a)/2:S.padTriggers==='negativeAxes'?-a:a;};
  thr=clamp(value(map.throttleAxis),0,1);brk=clamp(value(map.brakeAxis),0,1);
 }
 const alternateThrottle=isPlayStationPad(p)&&p.mapping!=='standard'?1:0;
 if(alternateThrottle!==map.pit)thr=Math.max(thr,B(alternateThrottle));
 thr=thr<.05?0:thr;brk=brk<.05?0:brk;
 return{st,thr,brk,rev:B(map.reverse),start:B(map.pause)>.5,y:B(map.camera)>.5,x:B(map.pit)>.5};}
function pollPad(){const p=getPad();if(!p){padPrev={};return;}const r=readPad(p);
 if(padPrev.key!==padKey(p))padPrev={};
 if(S.ctrl!=='kb'){if(r.start&&!padPrev.start)togglePause();if(r.y&&!padPrev.y)camMul=camMul===1?1.45:1;if(r.x&&!padPrev.x)requestPitEntry();}
 padPrev={...r,key:padKey(p)};}
