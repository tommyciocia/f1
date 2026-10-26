'use strict';
/* Gomme individuali: distanza del set, durata proporzionata alla gara e prestazioni. */
const TYRE_COMPOUNDS={
 SOFT:{code:'S',name:'SOFT',color:'#ff3344',lifeFraction:.33,minLife:3,speed:1.012,grip:1.025},
 MEDIUM:{code:'M',name:'MEDIUM',color:'#ffd400',lifeFraction:.55,minLife:4,speed:1,grip:1},
 HARD:{code:'H',name:'HARD',color:'#ffffff',lifeFraction:.78,minLife:5,speed:.988,grip:.995}
};
const TYRE_OFF_TRACK_WEAR_MULTIPLIER=3;
// La durata competitiva corrisponde al 40% residuo, non alla distruzione del set.
// I minimi evitano gomme esaurite dopo un solo giro nelle gare brevi.
function tyreLife(compound,laps=S.laps){const spec=TYRE_COMPOUNDS[compound]||TYRE_COMPOUNDS.SOFT;return Math.max(spec.minLife,laps*spec.lifeFraction);}
function tyreWearPerLap(compound){return .6/tyreLife(compound);}
function tyreCompound(c){
 // In qualifica la mescola è regolamentare, quindi la torre resta SOFT anche
 // nel frame precedente al normale aggiornamento di updateTyres().
 const compound=mode==='quali'?'SOFT':c?.tyres?.compound;
 return TYRE_COMPOUNDS[compound]||TYRE_COMPOUNDS.SOFT;
}
function tyreBadge(c){
 const tyre=tyreCompound(c);
 return '<span class="tyre-compound tyre-'+tyre.code.toLowerCase()+'" style="--tyre-compound-color:'+tyre.color+'" aria-label="Pneumatico '+tyre.name+'" title="'+tyre.name+'">'+tyre.code+'</span>';
}
function initialTyreCompound(c){return mode==='quali'?'SOFT':c.isP?S.startCompound:['SOFT','MEDIUM','HARD'][c.aiId%3];}
function fitTyres(c,compound){
 const tyre=TYRE_COMPOUNDS[mode==='quali'?'SOFT':compound]||TYRE_COMPOUNDS.SOFT;
 c.tyres={compound:tyre.name,color:tyre.color,condition:1,ageLaps:0,distance:0,estimatedLife:tyreLife(tyre.name),wearPerLap:tyreWearPerLap(tyre.name),degradation:mode!=='quali'};
}
function resetTyres(c){fitTyres(c,initialTyreCompound(c));}
function updateTyres(c,dt){
 if(mode==='quali'){c.tyres.compound='SOFT';c.tyres.color='#ff3344';c.tyres.condition=1;c.tyres.ageLaps=c.tyres.distance=0;c.tyres.degradation=false;return;}
 c.tyres.degradation=true;
 if(state==='racing'&&c.go&&!c.fin&&!pitActive(c)){
  const surfaceWear=c.off?TYRE_OFF_TRACK_WEAR_MULTIPLIER:1;
  const distance=Math.hypot(c.vx,c.vy)*Math.max(0,dt);
  c.tyres.distance+=distance;c.tyres.ageLaps=c.tyres.distance/L;
  c.tyres.condition=clamp(c.tyres.condition-distance/L*c.tyres.wearPerLap*surfaceWear,0,1);
 }
}
function tyreConditionPenalty(value){const condition=clamp(value,0,1);return condition>=.8?(1-condition)*.08:condition>=.5?.016+(.8-condition)*.24:condition>=.2?.088+(.5-condition)*.42:.214+(.2-condition)*.7;}
function tyreWearPenalty(c){return tyreConditionPenalty(c.tyres.condition);}
function tyreGrip(c){return mode==='quali'?1:tyreCompound(c).grip*(1-tyreWearPenalty(c));}
function tyreSpeed(c){return mode==='quali'?1:tyreCompound(c).speed*(1-tyreWearPenalty(c)*.42);}
function tyreHud(){
 const tyre=tyreCompound(pl),percent=mode==='quali'?100:Math.floor(pl.tyres.condition*100+1e-7),ring=$('tyreIndicator');
 const wearColor=percent>=80?'#2ecc40':percent>=20?'#ffd400':'#ff3344';
 ring.style.setProperty('--tyre-condition',percent+'%');ring.style.setProperty('--tyre-color',tyre.color);ring.style.setProperty('--tyre-wear-color',wearColor);
 ring.setAttribute('aria-label',tyre.name+' — '+percent+'%');$('tyreText').textContent=tyre.name+' — '+percent+'%';
}
