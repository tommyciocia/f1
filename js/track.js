'use strict';
/* Circuito: spline, settori, curvatura e velocità in curva ideale, minimappa pre-disegnata */
const SC=3,TW=230,BAR=170; // scala, larghezza pista, distanza barriere dal bordo pista centro
const CP=[[0,0],[600,-40],[1200,0],[1700,150],[1900,500],[1700,800],[1300,850],[1100,1100],[1300,1400],[900,1550],[400,1450],[200,1100],[500,850],[300,550],[-100,350]].map(p=>[p[0]*SC,p[1]*SC]);
const T=[];
(function(){const n=CP.length;for(let i=0;i<n;i++){const p0=CP[(i+n-1)%n],p1=CP[i],p2=CP[(i+1)%n],p3=CP[(i+2)%n];
 for(let k=0;k<16;k++){const t=k/16,t2=t*t,t3=t2*t;
  const f=(a,b,c,d)=>.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
  T.push({x:f(p0[0],p1[0],p2[0],p3[0]),y:f(p0[1],p1[1],p2[1],p3[1])});}}})();
const N=T.length;let L=0;
T.forEach((a,i)=>{const b=T[(i+1)%N];a.s=L;a.ang=Math.atan2(b.y-a.y,b.x-a.x);a.len=Math.hypot(b.x-a.x,b.y-a.y);L+=a.len;a.nx=-Math.sin(a.ang);a.ny=Math.cos(a.ang);});
const SECTOR_MARKS=[L/3,L*2/3];
function pointAtDistance(s){let i=0;while(i<N-1&&T[i+1].s<=s)i++;const a=T[i],b=T[(i+1)%N],r=clamp((s-a.s)/a.len,0,1);return{x:a.x+(b.x-a.x)*r,y:a.y+(b.y-a.y)*r,ang:a.ang,nx:-Math.sin(a.ang),ny:Math.cos(a.ang)};}
const SECTOR_LINES=SECTOR_MARKS.map(pointAtDistance);
T.forEach((a,i)=>{a.curv=Math.abs(angDiff(T[(i+1)%N].ang,a.ang))/a.len;});
// velocità massima in curva (linea ideale usata dall'IA): media della curvatura su 9 campioni
T.forEach((a,i)=>{let c=0;for(let k=-4;k<=4;k++)c+=T[(i+k+N)%N].curv;c/=9;a.vc=clamp(Math.sqrt(420/Math.max(c,1e-6)),220,1100);});
const path=new Path2D();T.forEach((p,i)=>i?path.lineTo(p.x,p.y):path.moveTo(p.x,p.y));path.closePath();
let bx0=1e9,by0=1e9,bx1=-1e9,by1=-1e9;T.forEach(p=>{bx0=Math.min(bx0,p.x);bx1=Math.max(bx1,p.x);by0=Math.min(by0,p.y);by1=Math.max(by1,p.y);});
// minimappa pre-renderizzata
const mm=document.createElement('canvas');mm.width=200;mm.height=150;
const mS=Math.min(180/(bx1-bx0),130/(by1-by0)),mX=p=>10+(p.x-bx0)*mS,mY=p=>10+(p.y-by0)*mS;
(function(){const m=mm.getContext('2d');m.strokeStyle='#8a929c';m.lineWidth=5;m.lineJoin='round';m.beginPath();T.forEach((p,i)=>i?m.lineTo(mX(p),mY(p)):m.moveTo(mX(p),mY(p)));m.closePath();m.stroke();})();
