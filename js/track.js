'use strict';
/* Geometria comune: centro pista, settori, bordi, box e livelli del sovrappasso. */
const WORLD_UNITS_PER_KM=3600/.32,WORLD_UNITS_PER_METRE=WORLD_UNITS_PER_KM/1000;
let TW=160,BAR=80,activeCircuit,CP,T,N,L,path,SECTOR_MARKS,SECTOR_LINES,bx0,by0,bx1,by1,mS;
const wrapDistance=(s,length=L)=>((s%length)+length)%length;
const signedTrackDistance=(a,b,length=L)=>wrapDistance(b-a+length/2,length)-length/2;
const smoothStep=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function makePath(points,closed=false){const p=new Path2D();points.forEach((q,i)=>i?p.lineTo(q.x,q.y):p.moveTo(q.x,q.y));if(closed)p.closePath();return p;}
// Catmull–Rom centripeta: conserva i tornanti senza i cappi della spline uniforme.
function curvePoints(points,closed=true){
 const out=[],n=points.length;
 const get=i=>points[closed?(i+n)%n:clamp(i,0,n-1)];
 for(let i=0;i<(closed?n:n-1);i++){
  const p1=get(i),p2=get(i+1),before=get(i-1),after=get(i+2);
  const p0=!closed&&i===0?{x:2*p1.x-p2.x,y:2*p1.y-p2.y}:before;
  const p3=!closed&&i===n-2?{x:2*p2.x-p1.x,y:2*p2.y-p1.y}:after;
  const dt=(a,b)=>Math.max(.001,Math.sqrt(Math.hypot(b.x-a.x,b.y-a.y))),t0=0,t1=dt(p0,p1),t2=t1+dt(p1,p2),t3=t2+dt(p2,p3);
  const mix=(a,b,ta,tb,t)=>({x:((tb-t)*a.x+(t-ta)*b.x)/(tb-ta),y:((tb-t)*a.y+(t-ta)*b.y)/(tb-ta)});
  const steps=Math.max(4,Math.ceil(Math.hypot(p2.x-p1.x,p2.y-p1.y)/25));
  for(let k=0;k<steps;k++){
   const f=k/steps,t=t1+(t2-t1)*f,a=mix(p0,p1,t0,t1,t),b=mix(p1,p2,t1,t2,t),c=mix(p2,p3,t2,t3,t);
   const q=mix(mix(a,b,t0,t2,t),mix(b,c,t1,t3,t),t1,t2,t);
   if(p1.trackS!==undefined)q.trackS=p1.trackS+(p2.trackS-p1.trackS)*f;
   out.push(q);
  }
 }
 if(!closed)out.push({...points.at(-1)});return out;
}
function measureSamples(samples,closed=true){
 let length=0;
 samples.forEach((a,i)=>{const b=samples[closed?(i+1)%samples.length:Math.min(i+1,samples.length-1)];a.s=length;a.len=Math.hypot(b.x-a.x,b.y-a.y);a.ang=a.len?Math.atan2(b.y-a.y,b.x-a.x):(samples[i-1]?.ang||0);a.nx=-Math.sin(a.ang);a.ny=Math.cos(a.ang);length+=a.len;});
 return length;
}
function resampleTrack(dense){
 const length=measureSamples(dense),count=Math.ceil(length/55),out=[];let j=0;
 for(let k=0;k<count;k++){
  const s=length*k/count;while(j<dense.length-1&&dense[j+1].s<=s)j++;
  const a=dense[j],b=dense[(j+1)%dense.length],t=clamp((s-a.s)/(a.len||1),0,1);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 }
 return out;
}
function sampleAt(s,circuit,smoothAngle=false){
 s=wrapDistance(s,circuit.length);const pts=circuit.samples;let low=0,high=pts.length-1;
 while(low<high){const mid=Math.ceil((low+high)/2);if(pts[mid].s<=s)low=mid;else high=mid-1;}
 const a=pts[low],b=pts[(low+1)%pts.length],t=clamp((s-a.s)/(a.len||1),0,1),ang=smoothAngle?a.ang+angDiff(b.ang,a.ang)*t:a.ang;
 return{i:low,s,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,ang,nx:-Math.sin(ang),ny:Math.cos(ang)};
}
function pointAtDistance(s,circuit=activeCircuit,smoothAngle=false){return sampleAt(s,circuit,smoothAngle);}
function closestAnchor(c,point){let best=Infinity,s=0;for(const q of c.samples){const d=(q.x-point.x)**2+(q.y-point.y)**2;if(d<best){best=d;s=q.s;}}return s;}
function findBridge(c){
 const pts=c.samples,n=pts.length;
 for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){
  if(Math.abs(signedTrackDistance(pts[i].s,pts[j].s,c.length))<1200)continue;
  const a=pts[i],b=pts[(i+1)%n],p=pts[j],q=pts[(j+1)%n],dx=b.x-a.x,dy=b.y-a.y,ex=q.x-p.x,ey=q.y-p.y,den=dx*ey-dy*ex;
  if(Math.abs(den)<1e-8)continue;
  const u=((p.x-a.x)*ey-(p.y-a.y)*ex)/den,v=((p.x-a.x)*dy-(p.y-a.y)*dx)/den;
  if(u>=0&&u<1&&v>=0&&v<1){const over=p.s+p.len*v,under=a.s+a.len*u,deck=[];for(let s=over-760;s<=over+760;s+=35)deck.push(sampleAt(s,c,true));return{x:a.x+dx*u,y:a.y+dy*u,over,under,halfLength:1900,height:7*WORLD_UNITS_PER_METRE,path:makePath(deck)};}
 }
 throw Error('Sovrappasso di Suzuka non individuato nella geometria');
}
function buildPitData(c){
 const p=c.pit,W=WORLD_UNITS_PER_METRE;
 const pit={entryStart:p.entryM*W,entryEnd:p.joinM*W,laneStart:p.joinM*W,laneEnd:p.laneEndM*W,exitEnd:p.exitM*W,side:p.side,offset:p.offsetM*W,width:88};
 const stations=[pit.entryStart,pit.entryEnd,Math.min(-60*W,pit.entryEnd*.3),0,Math.max(60*W,pit.laneEnd*.5),pit.laneEnd,pit.exitEnd].filter((s,i,a)=>a.indexOf(s)===i).sort((a,b)=>a-b);
 const anchors=stations.map(s=>{const q=sampleAt(s,c,true),blend=s<pit.entryEnd?smoothStep((s-pit.entryStart)/(pit.entryEnd-pit.entryStart)):1-smoothStep((s-pit.laneEnd)/(pit.exitEnd-pit.laneEnd)),d=pit.side*pit.offset*blend;return{x:q.x+q.nx*d,y:q.y+q.ny*d,trackS:s};});
 pit.samples=curvePoints(anchors,false);pit.length=measureSamples(pit.samples,false);pit.path=makePath(pit.samples);return pit;
}
function buildCircuit(def){
 let dense=curvePoints(def.points.map(p=>({x:p[0]*WORLD_UNITS_PER_METRE,y:p[1]*WORLD_UNITS_PER_METRE}))),samples=resampleTrack(dense);
 const scale=def.km*WORLD_UNITS_PER_KM/measureSamples(samples);samples.forEach(p=>{p.x*=scale;p.y*=scale;});
 const length=measureSamples(samples),count=samples.length,c={...def,samples,length,lengthKm:length/WORLD_UNITS_PER_KM,width:def.widthM*WORLD_UNITS_PER_METRE,barrier:def.barrierM*WORLD_UNITS_PER_METRE};
 const project=p=>({x:p[0]*WORLD_UNITS_PER_METRE*scale,y:p[1]*WORLD_UNITS_PER_METRE*scale});
 c.features=def.features.map(f=>({...f,s:closestAnchor(c,project(f.point))}));
 c.sectorMarks=(def.sectorMetres?def.sectorMetres.map(s=>s*WORLD_UNITS_PER_METRE):def.sectorAnchors.map(p=>closestAnchor(c,project(p)))).sort((a,b)=>a-b);
 samples.forEach((a,i)=>a.curv=Math.abs(angDiff(samples[(i+1)%count].ang,a.ang))/a.len);
 samples.forEach((a,i)=>{let curv=0;for(let k=-3;k<=3;k++)curv+=samples[(i+k+count)%count].curv;curv/=7;a.vc=clamp(Math.sqrt(340/Math.max(curv,1e-7)),125,1100);a.kerb=Math.abs(angDiff(samples[(i+3)%count].ang,samples[(i-3+count)%count].ang))>.035;
  for(const f of c.features)if(f.speedKmh){const d=Math.abs(signedTrackDistance(a.s,f.s,length));if(d<700)a.vc=Math.min(a.vc,Math.sqrt((f.speedKmh/.32)**2+2*400*d));}
 });
 c.path=makePath(samples,true);c.startFinish={...samples[0]};c.boundaries={left:samples.map(p=>({x:p.x-p.nx*c.width/2,y:p.y-p.ny*c.width/2})),right:samples.map(p=>({x:p.x+p.nx*c.width/2,y:p.y+p.ny*c.width/2}))};
 c.kerbPath=new Path2D();samples.forEach((p,i)=>{const next=samples[(i+1)%count];if(p.kerb){c.kerbPath.moveTo(p.x,p.y);c.kerbPath.lineTo(next.x,next.y);}});
 if(def.tunnelAnchors){const [a,b]=def.tunnelAnchors.map(p=>closestAnchor(c,project(p)));c.tunnel={start:a,end:b,path:makePath(samples.filter(p=>p.s>=a&&p.s<=b))};}
 c.bridge=def.bridge?findBridge(c):null;c.pitData=buildPitData(c);return c;
}
const CIRCUIT_DATA=CIRCUITS.map(buildCircuit);
function trackHeight(s,circuit=activeCircuit){const b=circuit.bridge;if(!b)return 0;const d=Math.abs(signedTrackDistance(s,b.over,circuit.length));return b.height*(1-smoothStep((d-760)/(b.halfLength-760)));}
const carTrackHeight=c=>pitActive(c)?0:trackHeight(c.trackS??T[c.idx].s);
const differentTrackLevels=(a,b)=>Math.abs(carTrackHeight(a)-carTrackHeight(b))>30;
const mm=document.createElement('canvas');mm.width=200;mm.height=150;
const mX=p=>10+(p.x-bx0)*mS,mY=p=>10+(p.y-by0)*mS;
function loadCircuit(id){
 activeCircuit=CIRCUIT_DATA.find(c=>c.id===id)||CIRCUIT_DATA.find(c=>c.id==='barcelona')||CIRCUIT_DATA[0];TW=activeCircuit.width;BAR=activeCircuit.barrier;
 CP=activeCircuit.points;T=activeCircuit.samples;N=T.length;L=activeCircuit.length;path=activeCircuit.path;
 SECTOR_MARKS=activeCircuit.sectorMarks;SECTOR_LINES=SECTOR_MARKS.map(s=>pointAtDistance(s));rebuildMiniTrack();return activeCircuit;
}
function rebuildMiniTrack(extra=[]){
 bx0=by0=Infinity;bx1=by1=-Infinity;for(const p of [...T,...extra]){bx0=Math.min(bx0,p.x);bx1=Math.max(bx1,p.x);by0=Math.min(by0,p.y);by1=Math.max(by1,p.y);}
 mS=Math.min(180/(bx1-bx0),130/(by1-by0));const m=mm.getContext('2d');m.clearRect(0,0,200,150);m.strokeStyle='#8a929c';m.lineWidth=5;m.lineJoin='round';m.beginPath();T.forEach((p,i)=>i?m.lineTo(mX(p),mY(p)):m.moveTo(mX(p),mY(p)));m.closePath();m.stroke();
}
function gridSlot(k){const q=pointAtDistance(L-(90+k*90),activeCircuit,true),lat=(k%2?1:-1)*Math.min(48,TW*.235);return{...q,lat,x:q.x+q.nx*lat,y:q.y+q.ny*lat};}
loadCircuit(S.circuitId);S.circuitId=activeCircuit.id;
