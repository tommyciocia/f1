'use strict';
/* Movimento bot: avanzamento longitudinale persistente e rientro laterale morbido */
function botPointAt(s,route=null){
 const points=route?route.points:T,count=points.length,length=route?route.length:L;
 s=route?clamp(s,0,length):((s%length)+length)%length;let i=0;
 while(i<count-1&&points[i+1].s<=s)i++;
 const a=points[i],b=points[route?Math.min(i+1,count-1):(i+1)%count],span=a.len||1,r=clamp((s-a.s)/span,0,1);
 const ang=a.ang+angDiff(b.ang,a.ang)*r;
 return{i,x:a.x+(b.x-a.x)*r,y:a.y+(b.y-a.y)*r,ang,nx:-Math.sin(ang),ny:Math.cos(ang),
  trackS:route?a.trackS+(b.trackS-a.trackS)*r:s,trackD:route?a.trackD+(b.trackD-a.trackD)*r:0};
}
// Il bot conserva una coordinata lungo il circuito: collisioni leggere non possono
// fargli perdere il segmento e tenerlo fermo con una velocità ancora visibile.
function followTrackAsBot(c,ni,h){
 const route=pitActive(c)?c.pit.route:null;
 const fallback=T[ni].s,start=route?c.pit.progress:Number.isFinite(c.trackS)?c.trackS:fallback;
 const before=botPointAt(start,route),cs=Math.cos(before.ang),sn=Math.sin(before.ang);
 const forward=Math.max(0,c.vx*cs+c.vy*sn);
 const point=botPointAt(start+forward*h,route),botLane=route?0:clamp(c.lane,-TW/2+30,TW/2-30);
 const d0=route?0:Number.isFinite(c.d)?c.d:0,nd=d0+(botLane-d0)*Math.min(1,h*7);
 c.trackS=point.trackS;c.x=point.x+point.nx*nd;c.y=point.y+point.ny*nd;
 c.vx=Math.cos(point.ang)*forward;c.vy=Math.sin(point.ang)*forward;
 c.yaw=(c.yaw||0)+(clamp(Math.atan2((nd-d0)/Math.max(h,1e-4),Math.max(forward,90)),-.3,.3)-(c.yaw||0))*Math.min(1,h*6);
 c.a=point.ang+c.yaw;c.d=route?point.trackD:nd;c.off=false;c.trackGuard=false;
 if(route){c.pit.progress=Math.min(route.length,start+forward*h);c.lane=c.d;updatePitPhase(c);}
 return{d:c.d,idx:route?botPointAt(point.trackS).i:point.i};
}
