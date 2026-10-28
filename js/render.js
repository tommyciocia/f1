'use strict';
/* Disegno della scena: camera, pista, auto, particelle */
const cv=$('c'),ctx=cv.getContext('2d'),mctx=$('mini').getContext('2d');
let renderBounds=null;
function render(dt=1/60){
 const dpr=devicePixelRatio||1,W=innerWidth,H=innerHeight;
 if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=state==='menu'?'#0e1114':'#2f6b2f';ctx.fillRect(0,0,W,H);
 if(state==='menu')return;
 const unit=clamp(Math.min(W,H)/900,.55,1.4),qualifyingView=mode==='quali'&&state==='quali';let tx,ty,z;
 const followed=mode==='quali'?qualiCameraCar():pl,v=Math.hypot(followed.vx,followed.vy),lookAhead=qualifyingView&&W<=1000?.15:.5;tx=followed.x+followed.vx*lookAhead;ty=followed.y+followed.vy*lookAhead;z=(.62-.2*clamp(v/1000,0,1))*unit/camMul;
 const cameraStep=clamp(dt,0,.05)*60,pan=1-Math.pow(.85,cameraStep),zoom=1-Math.pow(.95,cameraStep);
 camX+=(tx-camX)*pan;camY+=(ty-camY)*pan;camZ+=(z-camZ)*zoom;
 // La tabella estesa lascia la vettura nella parte libera della visuale.
 const screenX=qualifyingView&&W>1000?W*.75:W/2,screenY=qualifyingView&&W<=1000?H*.68:H/2;
 renderBounds={left:camX-screenX/camZ,right:camX+(W-screenX)/camZ,top:camY-screenY/camZ,bottom:camY+(H-screenY)/camZ};
 ctx.save();ctx.translate(screenX,screenY);ctx.scale(camZ,camZ);ctx.translate(-camX,-camY);
 ctx.lineJoin='round';ctx.lineCap='butt';
 ctx.strokeStyle='#d8dce0';ctx.lineWidth=TW+2*BAR+16;ctx.stroke(path);
 ctx.strokeStyle='#d24141';ctx.setLineDash([80,80]);ctx.stroke(path);ctx.setLineDash([]);
 ctx.strokeStyle='#2f6b2f';ctx.lineWidth=TW+2*BAR-4;ctx.stroke(path);
 // Cordoli soltanto nei tratti curvi; rettilinei con le normali linee bianche.
 ctx.strokeStyle='#fff';ctx.lineWidth=TW+6;ctx.stroke(path);
 ctx.strokeStyle='#fff';ctx.lineWidth=TW+28;ctx.stroke(activeCircuit.kerbPath);
 ctx.strokeStyle='#e10600';ctx.setLineDash([35,35]);ctx.stroke(activeCircuit.kerbPath);ctx.setLineDash([]);
 ctx.strokeStyle='#30343a';ctx.lineWidth=TW;ctx.stroke(path);
 ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=6;ctx.setLineDash([60,90]);ctx.stroke(path);ctx.setLineDash([]);
 if(activeCircuit.tunnel){ctx.strokeStyle='#14212e';ctx.lineWidth=TW-5;ctx.stroke(activeCircuit.tunnel.path);ctx.strokeStyle='#bad8ec';ctx.lineWidth=3;
  for(const p of T)if(p.s>=activeCircuit.tunnel.start&&p.s<=activeCircuit.tunnel.end&&p.s%180<55){ctx.beginPath();ctx.moveTo(p.x+p.nx*(TW/2-7),p.y+p.ny*(TW/2-7));ctx.lineTo(p.x+p.nx*(TW/2-7)+Math.cos(p.ang)*35,p.y+p.ny*(TW/2-7)+Math.sin(p.ang)*35);ctx.stroke();}
  for(const s of [activeCircuit.tunnel.start,activeCircuit.tunnel.end]){const p=pointAtDistance(s);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.ang);ctx.fillStyle='#9aa7b4';ctx.fillRect(-10,-TW/2-18,20,24);ctx.fillRect(-10,TW/2-6,20,24);ctx.fillStyle='#d6e5ed';ctx.font='bold 19px Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText('TUNNEL',0,-TW/2-35);ctx.restore();}}
 // linea di partenza + tribuna
 const q=T[0];ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.ang);
 for(let i=0;i<10;i++)for(let j=0;j<2;j++){ctx.fillStyle=(i+j)%2?'#fff':'#111';ctx.fillRect(j*14-14,-TW/2+i*(TW/10),14,TW/10);}
 ctx.fillStyle='#4a505a';ctx.fillRect(-400,TW/2+BAR+40,900,90);ctx.fillStyle='#e10600';for(let i=0;i<30;i++){ctx.fillStyle=`hsl(${i*37%360},60%,55%)`;ctx.fillRect(-390+i*30,TW/2+BAR+60,16,50);}
 ctx.restore();
 // Le caselle usano le stesse coordinate delle 23 posizioni di partenza.
 ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=2;
 for(let k=0;k<NCARS;k++){const slot=gridSlot(k);ctx.save();ctx.translate(slot.x,slot.y);ctx.rotate(slot.ang);ctx.strokeRect(-32,-17,64,34);ctx.restore();}
 drawPits();drawSectorLines();
 for(const p of particles){ctx.globalAlpha=clamp(p.life,0,p.t===2?.42:.6);
  if(p.t===2){const sp=Math.hypot(p.vx,p.vy)||1;ctx.strokeStyle='#bdeeff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx/sp*p.sz,p.y-p.vy/sp*p.sz);ctx.stroke();}
  else{ctx.fillStyle=p.t?'#8a6a3a':'#eee';ctx.beginPath();ctx.arc(p.x,p.y,(.7-p.life)*30+6,0,7);ctx.fill();}}
 ctx.globalAlpha=1;
 drawVehicleLayer(c=>carTrackHeight(c)<=30);
 if(activeCircuit.bridge){
  // Il ponte copre le vetture sotto; quelle sopra vengono disegnate per ultime.
  const deck=activeCircuit.bridge.path;ctx.save();ctx.translate(10,15);ctx.strokeStyle='#0009';ctx.lineWidth=TW+35;ctx.stroke(deck);ctx.restore();
  ctx.strokeStyle='#c0c9d3';ctx.lineWidth=TW+20;ctx.stroke(deck);ctx.strokeStyle='#30343a';ctx.lineWidth=TW;ctx.stroke(deck);
  drawVehicleLayer(c=>carTrackHeight(c)>30);
 }
 ctx.restore();
 if(state!=='menu')drawMini();
}
function drawVehicleLayer(include){
 // Il margine comprende ombra, rotazione e nome, anche al bordo dello schermo.
 const layer=cars.filter(c=>(!renderBounds||c.x>=renderBounds.left-160&&c.x<=renderBounds.right+160&&c.y>=renderBounds.top-80&&c.y<=renderBounds.bottom+80)&&include(c));
 if(S.qual==='high')for(const c of layer)drawCar(c,true);for(const c of layer)drawCar(c,false);
 ctx.font='bold 17px Segoe UI,sans-serif';ctx.textAlign='center';
 for(const c of layer){ctx.fillStyle=mode==='quali'&&(!c.qActive||c.qOutcome==='eliminato')?'#ff5864':c.isP?'#ffd400':'#fff';ctx.strokeStyle='#000';ctx.lineWidth=3;const t=c.code+' '+c.num;ctx.strokeText(t,c.x,c.y-38);ctx.fillText(t,c.x,c.y-38);}
}
function drawSectorLines(){for(const [i,q] of SECTOR_LINES.entries()){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.ang);ctx.strokeStyle='#00c8ff';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(0,-TW/2-20);ctx.lineTo(0,TW/2+20);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#00c8ff';ctx.font='bold 22px Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText('S'+(i+1),0,-TW/2-34);ctx.restore();}}
