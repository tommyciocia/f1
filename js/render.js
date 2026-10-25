'use strict';
/* Disegno della scena: camera, pista, auto, particelle */
const cv=$('c'),ctx=cv.getContext('2d'),mctx=$('mini').getContext('2d');
function render(){
 const dpr=devicePixelRatio||1,W=innerWidth,H=innerHeight;
 if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#2f6b2f';ctx.fillRect(0,0,W,H);
 const unit=clamp(Math.min(W,H)/900,.55,1.4),qualifyingView=mode==='quali'&&state==='quali';let tx,ty,z;
 if(state==='menu'){tx=(bx0+bx1)/2;ty=(by0+by1)/2;z=Math.min(W/(bx1-bx0),H/(by1-by0))*.9;camX=tx;camY=ty;camZ=z;}
 else{const followed=mode==='quali'?qualiCameraCar():pl,v=Math.hypot(followed.vx,followed.vy),lookAhead=qualifyingView&&W<=1000?.15:.5;tx=followed.x+followed.vx*lookAhead;ty=followed.y+followed.vy*lookAhead;z=(.62-.2*clamp(v/1000,0,1))*unit/camMul;
  camX+=(tx-camX)*.15;camY+=(ty-camY)*.15;camZ+=(z-camZ)*.05;}
 // La tabella estesa lascia la vettura nella parte libera della visuale.
 ctx.save();ctx.translate(qualifyingView&&W>1000?W*.75:W/2,qualifyingView&&W<=1000?H*.68:H/2);ctx.scale(camZ,camZ);ctx.translate(-camX,-camY);
 ctx.lineJoin='round';ctx.lineCap='butt';
 ctx.strokeStyle='#d8dce0';ctx.lineWidth=TW+2*BAR+30;ctx.stroke(path);       // barriere
 ctx.strokeStyle='#e10600';ctx.lineWidth=TW+2*BAR+30;ctx.setLineDash([80,80]);ctx.stroke(path);ctx.setLineDash([]);
 ctx.strokeStyle='#2f6b2f';ctx.lineWidth=TW+2*BAR-4;ctx.stroke(path);          // erba
 ctx.strokeStyle='#fff';ctx.lineWidth=TW+48;ctx.stroke(path);                    // cordoli
 ctx.strokeStyle='#e10600';ctx.setLineDash([50,50]);ctx.stroke(path);ctx.setLineDash([]);
 ctx.strokeStyle='#30343a';ctx.lineWidth=TW;ctx.stroke(path);                   // asfalto
 ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=6;ctx.setLineDash([60,90]);ctx.stroke(path);ctx.setLineDash([]);
 // linea di partenza + tribuna
 const q=T[0];ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.ang);
 for(let i=0;i<10;i++)for(let j=0;j<2;j++){ctx.fillStyle=(i+j)%2?'#fff':'#111';ctx.fillRect(j*14-14,-TW/2+i*(TW/10),14,TW/10);}
 ctx.fillStyle='#4a505a';ctx.fillRect(-400,TW/2+BAR+40,900,90);ctx.fillStyle='#e10600';for(let i=0;i<30;i++){ctx.fillStyle=`hsl(${i*37%360},60%,55%)`;ctx.fillRect(-390+i*30,TW/2+BAR+60,16,50);}
 ctx.restore();
 drawPits();drawSectorLines();
 for(const p of particles){ctx.globalAlpha=clamp(p.life,0,p.t===2?.42:.6);
  if(p.t===2){const sp=Math.hypot(p.vx,p.vy)||1;ctx.strokeStyle='#bdeeff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx/sp*p.sz,p.y-p.vy/sp*p.sz);ctx.stroke();}
  else{ctx.fillStyle=p.t?'#8a6a3a':'#eee';ctx.beginPath();ctx.arc(p.x,p.y,(.7-p.life)*30+6,0,7);ctx.fill();}}
 ctx.globalAlpha=1;
 for(const c of cars)drawCar(c,true);for(const c of cars)drawCar(c,false);
 ctx.font='bold 17px Segoe UI,sans-serif';ctx.textAlign='center';
 for(const c of cars){ctx.fillStyle=c.isP?'#ffd400':'#fff';ctx.strokeStyle='#000';ctx.lineWidth=3;const t=c.code+' '+c.num;ctx.strokeText(t,c.x,c.y-38);ctx.fillText(t,c.x,c.y-38);}
 ctx.restore();
 if(state!=='menu')drawMini();
}
function drawSectorLines(){for(const [i,q] of SECTOR_LINES.entries()){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.ang);ctx.strokeStyle='#00c8ff';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(0,-TW/2-20);ctx.lineTo(0,TW/2+20);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#00c8ff';ctx.font='bold 22px Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText('S'+(i+1),0,-TW/2-34);ctx.restore();}}
