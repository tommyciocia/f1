'use strict';
/* Confine di fiducia: localStorage è modificabile, non prova l'autenticità dei risultati. */
const isRecord=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const own=(o,k)=>isRecord(o)&&Object.hasOwn(o,k)?o[k]:undefined;
const boundedNumber=(v,min,max,fallback,integer=false)=>{
 if(typeof v!=='number'&&(typeof v!=='string'||!v.trim()||v.length>32))return fallback;
 const n=Number(v);return Number.isFinite(n)?clamp(integer?Math.round(n):n,min,max):fallback;
};
const boundedText=(v,max,fallback='')=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max):fallback;
const safeColor=(v,fallback)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:fallback;
function readStoredJSON(key,fallback,maxChars=65536){
 try{const raw=localStorage.getItem(key);return typeof raw==='string'&&raw.length<=maxChars?JSON.parse(raw):fallback;}catch{return fallback;}
}
function cleanPlayer(raw,defaults){
 return {name:boundedText(own(raw,'name'),22,defaults.name),driver:boundedText(own(raw,'driver'),22,defaults.driver),
  code:boundedText(own(raw,'code'),32,defaults.code).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3),
  num:own(raw,'num')===''?'':boundedNumber(own(raw,'num'),2,99,defaults.num,true),
  c1:safeColor(own(raw,'c1'),defaults.c1),c2:safeColor(own(raw,'c2'),defaults.c2)};
}
function readRecords(){
 const rows=readStoredJSON('f1sim.rec',[],16384);if(!Array.isArray(rows))return [];
 return rows.slice(0,10).filter(x=>isRecord(x)&&Number.isInteger(x.pos)&&x.pos>=1&&x.pos<=23&&
  typeof x.tot==='number'&&Number.isFinite(x.tot)&&x.tot>=0&&x.tot<=86400&&
  typeof x.best==='number'&&Number.isFinite(x.best)&&x.best>=0&&x.best<=86400).map(x=>({
   d:boundedText(x.d,32),circuitId:boundedText(x.circuitId,48).replace(/[^a-z0-9-]/g,''),
   circuitName:boundedText(x.circuitName,120),pos:x.pos,tot:x.tot,best:x.best,
   laps:boundedNumber(x.laps,1,65,3,true),diff:boundedNumber(x.diff,0,4,2,true),
   disqualified:x.disqualified===true,pitStops:boundedNumber(x.pitStops,0,1000,0,true)
  }));
}
