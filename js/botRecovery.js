'use strict';
/* Recupero IA: nessuna sosta casuale; aiuto forte solo dopo uno stallo configurabile */
const BOT_SLOW_SPEED=105,BOT_STALL_RECOVERY_AT=.4,BOT_STALL_ASSIST_AT=3.5;
function recoverInvalidBot(c){
 if(state==='quali')invalidateQualiLap(c);
 // Questo ramo è esclusivamente per valori NaN/Infinity: non viene usato per il traffico.
 c.idx=Number.isFinite(c.idx)?c.idx:0;const q=T[c.idx%N],lane=clamp(c.base,-TW/2+32,TW/2-32);
 c.x=q.x+q.nx*lane;c.y=q.y+q.ny*lane;c.a=q.ang;c.yaw=0;c.steer=0;c.lane=lane;c.d=lane;
 c.vx=0;c.vy=0;c.passTarget=null;c.passSide=0;c.recoveryLane=lane;c.recoveryT=2;
}
function chooseRecoveryLane(c){
 const candidates=[-aiLaneLimit()+10,aiLaneLimit()-10];let best=candidates[0],bestScore=-1e9;
 for(const lane of candidates){let score=0;
  for(const o of cars){if(o===c||!onTrack(o))continue;const d=trackDelta(c,o);if(d<-120||d>220)continue;
   const gap=Math.abs(lane-plannedLane(o));score+=gap>=AI_SIDE_GAP?16:-(AI_SIDE_GAP-gap)*4;}
  // A parità di spazio la scelta stabile dipende dall'identità della vettura.
  score+=lane===((c.aiId||0)%2?candidates[1]:candidates[0]) ? .1 : 0;
  if(score>bestScore){bestScore=score;best=lane;}
 }
 return best;
}
function updateBotRecovery(dt){
 for(const c of cars){
  if(!c.ai||!c.go||pitActive(c)){c.stuck=0;c.stallT=0;c.stallP=undefined;continue;}
  const bad=![c.x,c.y,c.vx,c.vy,c.a,c.lane,c.d].every(Number.isFinite);
  if(bad){recoverInvalidBot(c);continue;}
  const v=Math.hypot(c.vx,c.vy),stillLaunching=c.launchT>0;
  // Le curve del circuito sono percorse sopra questa soglia; una velocità minore
  // indica quindi una sosta reale, anche se il frame precedente aveva frenato.
  if(!stillLaunching&&v<BOT_SLOW_SPEED)c.stuck+=dt;else c.stuck=Math.max(0,c.stuck-dt*2);
  if(c.stuck>BOT_STALL_RECOVERY_AT){
   c.recoveryLane=chooseRecoveryLane(c);c.passTarget=null;c.passSide=0;c.passLane=c.recoveryLane;
   c.recoveryT=Math.max(c.recoveryT||0,1.35);
  }

  // Intervento soltanto dopo uno stallo prolungato: spinta progressiva, senza
  // riposizionare l'auto né impostare una velocità istantanea.
  if(c.stuck>BOT_STALL_ASSIST_AT){
   const q=T[c.idx],push=Math.min(95,Math.max(0,185-v)*dt*.9);
   c.vx+=Math.cos(q.ang)*push;c.vy+=Math.sin(q.ang)*push;c.recoveryT=1.35;
   c.stuck=BOT_STALL_ASSIST_AT-.3;
  }
 }
}
