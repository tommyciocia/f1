'use strict';
/* Impostazioni del gioco salvate nel browser (localStorage) */
const DEF={diff:2,dv:2,laps:3,sens:1,vol:.6,ctrl:'auto',qual:'high',inv:false,qmin:2,startCompound:'SOFT',my:{name:'Tommy Racing',driver:'Tommy',code:'TOM',num:99,c1:'#ffd400',c2:'#111111'}};
let S=Object.assign({},DEF);
try{Object.assign(S,JSON.parse(localStorage.getItem('f1sim.set')||'{}'))}catch(e){}
S.my=Object.assign({},DEF.my,S.my);
if(S.dv!==2){S.diff=[1,2,3][clamp(S.diff|0,0,2)];S.dv=2;} // migrazione dalle vecchie 3 difficoltà alle 5 attuali
S.diff=clamp(S.diff|0,0,4);
S.laps=clamp(Math.round(Number(S.laps))||DEF.laps,1,65);
S.startCompound=['SOFT','MEDIUM','HARD'].includes(S.startCompound)?S.startCompound:'SOFT';
// Il vecchio qmin conserva solo la scelta di saltare le qualifiche.
S.qualiEnabled=typeof S.qualiEnabled==='boolean'?S.qualiEnabled:Number(S.qmin)!==0;
S.qualiMinutes=[18,15,12].map((value,i)=>clamp(Math.round(Number(Array.isArray(S.qualiMinutes)?S.qualiMinutes[i]:value))||value,1,60));
const PAD_DEFAULT={steerAxis:0,throttle:7,brake:6,pit:2,reverse:1,pause:9,camera:3,throttleAxis:5,brakeAxis:2};
S.padMap=Object.fromEntries(Object.entries(PAD_DEFAULT).map(([key,value])=>[key,clamp(Number.isFinite(+S.padMap?.[key])?Math.trunc(+S.padMap[key]):value,0,key.endsWith('Axis')?15:31)]));
S.padTriggers=['auto','buttons','axes','invertedAxes','positiveAxes','negativeAxes'].includes(S.padTriggers)?S.padTriggers:'auto';
const save=()=>{try{localStorage.setItem('f1sim.set',JSON.stringify(S))}catch(e){}};
