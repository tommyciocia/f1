'use strict';
/* Impostazioni del gioco salvate nel browser (localStorage) */
const DEF={diff:2,dv:2,laps:3,sens:1,vol:.6,ctrl:'auto',qual:'high',inv:false,qmin:2,my:{name:'Tommy Racing',driver:'Tommy',code:'TOM',num:99,c1:'#ffd400',c2:'#111111'}};
let S=Object.assign({},DEF);
try{Object.assign(S,JSON.parse(localStorage.getItem('f1sim.set')||'{}'))}catch(e){}
S.my=Object.assign({},DEF.my,S.my);
if(S.dv!==2){S.diff=[1,2,3][clamp(S.diff|0,0,2)];S.dv=2;} // migrazione dalle vecchie 3 difficoltà alle 5 attuali
S.diff=clamp(S.diff|0,0,4);
const save=()=>{try{localStorage.setItem('f1sim.set',JSON.stringify(S))}catch(e){}};
