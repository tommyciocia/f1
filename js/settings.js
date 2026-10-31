'use strict';
/* Impostazioni del gioco salvate nel browser (localStorage) */
const DEF={diff:2,dv:2,laps:3,sens:1,vol:.6,muted:false,ctrl:'auto',qual:'high',inv:false,qmin:2,startCompound:'SOFT',my:{name:'Tommy Racing',driver:'Tommy',code:'TOM',num:99,c1:'#ffd400',c2:'#111111'}};
let S={...DEF,my:{...DEF.my}};
const storedSettings=readStoredJSON('f1sim.set',{});
// Lista esplicita: mai fondere oggetti arbitrari o chiavi __proto__/constructor.
for(const key of ['diff','dv','laps','sens','vol','muted','ctrl','qual','inv','qmin','startCompound','qualiEnabled','qualiMinutes','padMap','padTriggers','padPitCustom','myIdentityReady','myTeamNameReady','circuitId','teamNames','roster','teamStats','myStats']){
 if(own(storedSettings,key)!==undefined)S[key]=own(storedSettings,key);
}
S.my=cleanPlayer(own(storedSettings,'my'),DEF.my);
S.diff=boundedNumber(S.diff,0,4,DEF.diff,true);
if(S.dv!==2)S.diff=[1,2,3][clamp(S.diff,0,2)]; // migrazione dalle vecchie 3 difficoltà
S.dv=2;S.laps=boundedNumber(S.laps,1,65,DEF.laps,true);
S.sens=boundedNumber(S.sens,.5,1.5,DEF.sens);S.vol=boundedNumber(S.vol,0,1,DEF.vol);
S.ctrl=['auto','kb','pad'].includes(S.ctrl)?S.ctrl:DEF.ctrl;
S.qual=['high','low'].includes(S.qual)?S.qual:DEF.qual;
S.startCompound=['SOFT','MEDIUM','HARD'].includes(S.startCompound)?S.startCompound:DEF.startCompound;
for(const key of ['inv','muted','padPitCustom','myIdentityReady','myTeamNameReady'])S[key]=S[key]===true;
S.circuitId=boundedText(S.circuitId,48).replace(/[^a-z0-9-]/g,'');
S.qmin=boundedNumber(S.qmin,0,10,DEF.qmin,true);
// Il vecchio qmin conserva solo la scelta di saltare le qualifiche.
S.qualiEnabled=typeof S.qualiEnabled==='boolean'?S.qualiEnabled:Number(S.qmin)!==0;
S.qualiMinutes=[18,15,12].map((value,i)=>boundedNumber(Array.isArray(S.qualiMinutes)?S.qualiMinutes[i]:value,1,60,value,true));
const PAD_DEFAULT={steerAxis:0,throttle:7,brake:6,pit:2,reverse:1,pause:9,camera:3,throttleAxis:5,brakeAxis:2};
S.padMap=Object.fromEntries(Object.entries(PAD_DEFAULT).map(([key,value])=>[key,boundedNumber(own(S.padMap,key),0,key.endsWith('Axis')?15:31,value,true)]));
S.padTriggers=['auto','buttons','axes','invertedAxes','positiveAxes','negativeAxes'].includes(S.padTriggers)?S.padTriggers:'auto';
let settingsSaveHook=null;
const save=()=>{if(settingsSaveHook){settingsSaveHook();return;}try{localStorage.setItem('f1sim.set',JSON.stringify(S))}catch(e){}};
