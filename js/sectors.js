'use strict';
/* Tempi di settore (S1/S2/S3) */
function movedForward(a,b){const n=(b-a+N)%N;return n>0&&n<N/2;}
function crossedMark(a,b,mark){
 if(!movedForward(a,b))return false;const from=T[a].s,to=T[b].s;
 return to>=from?from<mark&&to>=mark:mark>from||mark<=to;
}
function finishSector(c,n,record=true){
 const time=Math.max(0,raceTime-c.secStart),old=c.bestSecs[n],global=sessionBestSecs[n];
 c.secs[n]=time;c.secDelta[n]=record&&old<1e8?time-old:null;
 c.secState[n]=!record?'neutral':time<global?'fastest':old<1e8&&time<old?'better':old<1e8?'worse':'neutral';
 if(record&&time<global)sessionBestSecs[n]=time;
 if(record&&time<old)c.bestSecs[n]=time;c.secStart=raceTime;c.activeSec=(n+1)%3;
}
function sectorProgress(c,a,b){
 const qualifying=state==='quali';
 if(qualifying&&(!c.qActive||c.qd))return;
 if(!movedForward(a,b))return;
 // Il traguardo chiude S3; poi ricomincia una nuova terna per il giro seguente.
 if(crossedMark(a,b,0)){
  if(c.lap>=0&&(!qualifying||c.qLapActive&&c.qLapValid&&c.qLapSectors===3))finishSector(c,2);
  c.secs=[null,null,null];c.secDelta=[null,null,null];c.secState=['wait','wait','wait'];c.secStart=raceTime;c.activeSec=0;
 }
 if(c.lap<0&&!qualifying)return;
 if(c.activeSec===0&&crossedMark(a,b,SECTOR_MARKS[0])){
  const record=!qualifying||c.qLapActive&&c.qLapValid&&c.qLapSectors===0;
  if(qualifying&&record)c.qLapSectors=1;
  finishSector(c,0,record);
 }
 if(c.activeSec===1&&crossedMark(a,b,SECTOR_MARKS[1])){
  const record=!qualifying||c.qLapActive&&c.qLapValid&&c.qLapSectors===1;
  if(qualifying&&record)c.qLapSectors=3;
  finishSector(c,1,record);
 }
}
