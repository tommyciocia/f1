'use strict';
/* Tempi di settore (S1/S2/S3) */
function movedForward(a,b){const n=(b-a+N)%N;return n>0&&n<N/2;}
function crossedMark(a,b,mark,from=T[a].s,to=T[b].s){
 from=wrapDistance(from);to=wrapDistance(to);const distance=signedTrackDistance(from,to);
 if(!(distance>0&&distance<=L*.08))return false;
 return to>=from?from<mark&&to>=mark:mark>from||mark<=to;
}
function finishSector(c,n,record=true){
 const time=Math.max(0,raceTime-c.secStart),old=c.bestSecs[n],global=sessionBestSecs[n];
 c.secs[n]=time;c.secDelta[n]=record&&old<1e8?time-old:null;
 c.secState[n]=!record?'neutral':time<global?'fastest':old<1e8&&time<old?'better':old<1e8?'worse':'neutral';
 if(record&&time<global)sessionBestSecs[n]=time;
 if(n===2&&c.secs.every(t=>Number.isFinite(t)&&t>0)){
  c.lastSecs=c.secs.slice();c.lastDelta=c.secDelta.slice();c.lastState=c.secState.slice();
 }
 if(record&&time<old)c.bestSecs[n]=time;c.secStart=raceTime;c.activeSec=(n+1)%3;
}
function sectorProgress(c,a,b,from=T[a].s,to=T[b].s){
 const qualifying=state==='quali';
 if(qualifying&&(!c.qActive||c.qd))return;
 const distance=signedTrackDistance(from,to);if(!(distance>0&&distance<=L*.08))return;
 // Il traguardo chiude S3; poi ricomincia una nuova terna per il giro seguente.
 if(crossedMark(a,b,0,from,to)){
  const complete=qualifying?c.qLapActive&&c.qLapValid&&c.qLapSectors===3:c.raceStarted&&c.raceLapValid&&c.raceLapSectors===3&&c.raceLapDistance+distance>=L*.95;
  if(c.lap>=0&&complete)finishSector(c,2);
  c.secs=[null,null,null];c.secDelta=[null,null,null];c.secState=['wait','wait','wait'];c.secStart=raceTime;c.activeSec=0;
 }
 if(!qualifying&&!c.raceStarted)return;
 if(c.activeSec===0&&crossedMark(a,b,SECTOR_MARKS[0],from,to)){
  const record=qualifying?c.qLapActive&&c.qLapValid&&c.qLapSectors===0:c.raceLapValid&&c.raceLapSectors===0;
  if(qualifying&&record)c.qLapSectors=1;
  if(!qualifying&&record)c.raceLapSectors=1;
  finishSector(c,0,record);
 }
 if(c.activeSec===1&&crossedMark(a,b,SECTOR_MARKS[1],from,to)){
  const record=qualifying?c.qLapActive&&c.qLapValid&&c.qLapSectors===1:c.raceLapValid&&c.raceLapSectors===1;
  if(qualifying&&record)c.qLapSectors=3;
  if(!qualifying&&record)c.raceLapSectors=3;
  finishSector(c,1,record);
 }
}
