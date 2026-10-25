'use strict';
/* Movimento bot: avanzamento longitudinale persistente e rientro laterale morbido */
function botPointAt(s){
 s=((s%L)+L)%L;let i=0;
 while(i<N-1&&T[i+1].s<=s)i++;
 const a=T[i],b=T[(i+1)%N],span=a.len||1,r=clamp((s-a.s)/span,0,1);
 const ang=a.ang+angDiff(b.ang,a.ang)*r;
 return{i,x:a.x+(b.x-a.x)*r,y:a.y+(b.y-a.y)*r,ang,nx:-Math.sin(ang),ny:Math.cos(ang)};
}
// Il bot conserva una coordinata lungo il circuito: collisioni leggere non possono
// fargli perdere il segmento e tenerlo fermo con una velocità ancora visibile.
function followTrackAsBot(c,ni,h){
 const fallback=T[ni].s,start=Number.isFinite(c.trackS)?c.trackS:fallback;
 const before=botPointAt(start),cs=Math.cos(before.ang),sn=Math.sin(before.ang);
 const forward=Math.max(0,c.vx*cs+c.vy*sn);
 const point=botPointAt(start+forward*h),botLane=clamp(c.lane,-TW/2+30,TW/2-30);
 const d0=Number.isFinite(c.d)?c.d:0,nd=d0+(botLane-d0)*Math.min(1,h*7);
 c.trackS=((start+forward*h)%L+L)%L;c.x=point.x+point.nx*nd;c.y=point.y+point.ny*nd;
 c.vx=Math.cos(point.ang)*forward;c.vy=Math.sin(point.ang)*forward;
 c.yaw=(c.yaw||0)+(clamp(Math.atan2((nd-d0)/Math.max(h,1e-4),Math.max(forward,90)),-.3,.3)-(c.yaw||0))*Math.min(1,h*6);
 c.a=point.ang+c.yaw;c.d=nd;c.off=false;c.trackGuard=false;
 return{d:nd,idx:point.i};
}
