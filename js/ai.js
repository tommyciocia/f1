'use strict';
/* IA vetture: linee alternative, sorpassi con decisione persistente e velocità sicura */
// 48 unità è il diametro di contatto fra vetture: due unità aggiungono margine.
// Il vecchio margine 58 impediva di superare un'auto centrale anche su 15 metri.
const aiLaneLimit=()=>Math.max(20,TW/2-28),AI_SIDE_GAP=50;

// Distanza longitudinale firmata sul circuito: positiva significa che b è davanti ad a.
function trackDelta(a,b){
 let d=(prog(b)-prog(a))%L;
 if(d>L/2)d-=L;else if(d<-L/2)d+=L;
 return d;
}
function plannedLane(c){return clamp(c.passTarget&&c.passHold>0?c.passLane:c.lane,-aiLaneLimit(),aiLaneLimit());}
function idealLane(c){
 const here=T[c.idx],ahead=T[(c.idx+7)%N];
 const turn=angDiff(ahead.ang,here.ang);
 // Linee leggermente diverse anche in curva: interno con curva a sinistra, esterno con curva a destra.
 return clamp(c.base+Math.sign(turn)*Math.min(20,Math.abs(turn)*34),-aiLaneLimit(),aiLaneLimit());
}
function nearestTrafficAhead(c){
 let car=null,distance=1e9;
 for(const o of cars){
  if(o===c||!trackTraffic(o))continue;
  const d=trackDelta(c,o);
  if(d>8&&d<450&&Math.abs(o.d-c.d)<118&&d<distance){car=o;distance=d;}
 }
 return{car,distance};
}
// Valuta una corsia usando auto davanti, affiancate e la corsia già annunciata dagli altri bot.
function passingLaneOption(c,ahead,side){
 const lane=clamp(ahead.d+side*82,-aiLaneLimit(),aiLaneLimit());
 let score=Math.abs(lane-ahead.d)>=AI_SIDE_GAP?170:-900;
 for(const o of cars){
  if(o===c||!trackTraffic(o))continue;
  const d=trackDelta(c,o);
  if(d<-105||d>350)continue;
  const separation=Math.abs(lane-plannedLane(o));
  const required=AI_SIDE_GAP+(d>-65&&d<150?14:0);
  if(separation<required)score-=(required-separation)*(d>-30&&d<230?5:2);
  else score+=Math.min(separation,110)*.14;
 }
 // Una corsia che tocca il bordo lascia poco margine per un sorpasso pulito.
 score-=Math.max(0,Math.abs(lane)-(aiLaneLimit()-8))*3;
 return{side,lane,score};
}
function choosePassingLane(c,ahead){
 const left=passingLaneOption(c,ahead,-1),right=passingLaneOption(c,ahead,1);
 if(Math.abs(left.score-right.score)<8)return(c.aiId||0)%2?left:right;
 return left.score>right.score?left:right;
}
function trafficTargetSpeed(c,ahead,distance,want,tv){
 if(!ahead)return tv;
 const aheadSpeed=Math.hypot(ahead.vx,ahead.vy),sameLine=Math.abs(plannedLane(ahead)-want)<AI_SIDE_GAP;
 const closing=Math.hypot(c.vx,c.vy)-aheadSpeed;
 const safety=92+Math.max(0,closing)*.38;
 // Solo chi sta raggiungendo un ostacolo davanti nella stessa corsia rallenta: la
 // vettura superata continua invece con il proprio ritmo.
 if(sameLine&&distance<safety)return Math.min(tv,Math.max(135,aheadSpeed+(distance-safety)*1.45));
 return tv;
}
function speedInput(v,target,st,throttleAt=1){
 return{st,thr:v<target*throttleAt?clamp((target-v)/95,0,1):0,brk:v>target*1.035?clamp((v-target)/115,0,1):0,hb:false};
}
function aiInput(c,dt){
 updateAiPitStrategy(c);
 if(pitActive(c))return pitInput(c);
 const v=Math.hypot(c.vx,c.vy),i=c.idx;
 c.passHold=Math.max(0,(c.passHold||0)-dt);c.recoveryT=Math.max(0,(c.recoveryT||0)-dt);c.launchT=Math.max(0,(c.launchT||0)-dt);
 const recovering=!!c.off||c.recoveryT>0;
 const launching=c.launchT>0,traffic=launching?{car:null,distance:1e9}:nearestTrafficAhead(c),ahead=traffic.car,distance=traffic.distance;
 // Al via ogni auto conserva per poco la sua corsia. Evita che le vetture interne
 // scambino la fila di partenza per traffico e restino ferme prima di accelerare.
 const safeRecoveryLane=Number.isFinite(c.recoveryLane)?c.recoveryLane:idealLane(c);
 let want=recovering?clamp(safeRecoveryLane,-aiLaneLimit(),aiLaneLimit()):launching?clamp(c.launchLane,-aiLaneLimit(),aiLaneLimit()):idealLane(c),passing=false;
 const relative=ahead?v-Math.hypot(ahead.vx,ahead.vy):0;
 const targetStillRelevant=c.passTarget&&c.passTarget.go&&trackTraffic(c.passTarget)&&trackDelta(c,c.passTarget)>-95&&trackDelta(c,c.passTarget)<280;

 if(!recovering&&targetStillRelevant){
  // Una volta impegnato, il bot non cambia lato a ogni fotogramma. Cambia solo se la
  // corsia scelta diventa realmente occupata.
  const keep=passingLaneOption(c,c.passTarget,c.passSide);
  if(keep.score>-80){want=c.passLane;passing=true;c.passHold=Math.max(c.passHold,.35);}
  else{c.passTarget=null;c.passSide=0;}
 }
 if(!recovering&&!passing&&ahead&&relative>7&&distance<clamp(205+relative*1.15,220,390)){
  const option=choosePassingLane(c,ahead);
  if(option.score>25){
   c.passTarget=ahead;c.passSide=option.side;c.passLane=option.lane;c.passHold=1.15;
   want=option.lane;passing=true;
  }
 }
 if(!passing){c.passTarget=null;c.passSide=0;c.passLane=want;}
 c.lane+=(want-c.lane)*Math.min(1,dt*(passing?2.45:1.8));

 // Punto bersaglio lontano abbastanza da rendere graduale il cambio corsia.
 let j=i,acc=0;const la=recovering?clamp(75+v*.10,90,175):clamp(100+v*.20,145,325);while(acc<la){acc+=T[j%N].len;j++;}
 const tp=T[j%N],targetLane=c.lane,tx=tp.x+tp.nx*targetLane,ty=tp.y+tp.ny*targetLane;
 const st=clamp(angDiff(Math.atan2(ty-c.y,tx-c.x),c.a)*(recovering?4.0:3.15),-1,1);

 // Frenata prevista dalla curvatura; non dipende dalle auto che sono dietro o affiancate.
 let tv=c.top*tyreSpeed(c)*(.995+.045*(c.tow||0)),dist=0;
 for(let k=0;k<40;k++){const s=T[(i+k)%N],grip=tyreGrip(c),vc=s.vc*c.cs*Math.sqrt(grip),allowed=Math.sqrt(vc*vc+2*c.brk*grip*.34*dist);if(allowed<tv)tv=allowed;dist+=s.len;if(dist>1800)break;}
 tv=trafficTargetSpeed(c,ahead,distance,want,tv);
 // Se è quasi ferma, la vettura recupera marcia nella corsia libera senza restare
 // bloccata da un vecchio obiettivo di frenata.
 if(recovering)tv=Math.max(tv,185);
 const throttleAt=passing?.995:1;
 const inp=speedInput(v,tv,st,throttleAt);
 if(recovering&&v<150){inp.thr=Math.max(inp.thr,.55);inp.brk=0;}
 return inp;
}
