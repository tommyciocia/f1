'use strict';
/* Disegno della scena: camera, pista, auto, particelle */
const cv=$('c'),ctx=cv.getContext('2d'),mctx=$('mini').getContext('2d');
let renderBounds=null,menuCanvasReady=false;
const sceneryCache={canvas:document.createElement('canvas'),builds:0,circuit:null,pits:null,bounds:null};
// Nitidezza automatica; il limite evita superfici smisurate su schermi ad alta densità.
const scenePixelRatio=()=>Math.min(S.qual==='high'?Math.max(1.5,devicePixelRatio||1):1,Math.max(1,Math.sqrt(6000000/(innerWidth*innerHeight))));
function render(dt=1/60){
 const dpr=scenePixelRatio(),W=innerWidth,H=innerHeight;
 if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);menuCanvasReady=false;}
 if((state==='menu'||state==='prerace')&&menuCanvasReady)return;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=state==='menu'||state==='prerace'?'#0e1114':'#2f6b2f';ctx.fillRect(0,0,W,H);
 if(state==='menu'||state==='prerace'){menuCanvasReady=true;return;}menuCanvasReady=false;
 const unit=clamp(Math.min(W,H)/900,.55,1.4),qualifyingView=mode==='quali'&&state==='quali';let tx,ty,z;
 const followed=mode==='quali'?qualiCameraCar():pl,v=Math.hypot(followed.vx,followed.vy),lookAhead=qualifyingView&&W<=1000?.15:.5;tx=followed.x+followed.vx*lookAhead;ty=followed.y+followed.vy*lookAhead;z=(.62-.2*clamp(v/1000,0,1))*unit/camMul;
 const cameraStep=clamp(dt,0,.05)*60,pan=1-Math.pow(.85,cameraStep),zoom=1-Math.pow(.95,cameraStep);
 camX+=(tx-camX)*pan;camY+=(ty-camY)*pan;camZ+=(z-camZ)*zoom;
 // La tabella estesa lascia la vettura nella parte libera della visuale.
 const screenX=qualifyingView&&W>1000?W*.75:W/2,screenY=qualifyingView&&W<=1000?H*.68:H/2;
 renderBounds={left:camX-screenX/camZ,right:camX+(W-screenX)/camZ,top:camY-screenY/camZ,bottom:camY+(H-screenY)/camZ};
 ctx.save();ctx.translate(screenX,screenY);ctx.scale(camZ,camZ);ctx.translate(-camX,-camY);
 ctx.lineJoin='round';ctx.lineCap='butt';
 drawCachedScenery(dpr);
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
function drawSectorLines(g=ctx){for(const [i,q] of SECTOR_LINES.entries()){g.save();g.translate(q.x,q.y);g.rotate(q.ang);g.strokeStyle='#00c8ff';g.lineWidth=12;g.beginPath();g.moveTo(0,-TW/2-20);g.lineTo(0,TW/2+20);g.stroke();g.strokeStyle='#fff';g.lineWidth=3;g.stroke();g.fillStyle='#00c8ff';g.font='bold 22px Segoe UI,sans-serif';g.textAlign='center';g.fillText('S'+(i+1),0,-TW/2-34);g.restore();}}

function drawTrackScenery(g){
 g.lineJoin='round';g.lineCap='butt';
 g.strokeStyle='#d8dce0';g.lineWidth=TW+2*BAR+16;g.stroke(path);
 g.strokeStyle='#d24141';g.setLineDash([80,80]);g.stroke(path);g.setLineDash([]);
 g.strokeStyle='#2f6b2f';g.lineWidth=TW+2*BAR-4;g.stroke(path);
 // Cordoli soltanto nei tratti curvi; rettilinei con le normali linee bianche.
 g.strokeStyle='#fff';g.lineWidth=TW+6;g.stroke(path);
 g.strokeStyle='#fff';g.lineWidth=TW+28;g.stroke(activeCircuit.kerbPath);
 g.strokeStyle='#e10600';g.setLineDash([35,35]);g.stroke(activeCircuit.kerbPath);g.setLineDash([]);
 g.strokeStyle='#30343a';g.lineWidth=TW;g.stroke(path);
 g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=6;g.setLineDash([60,90]);g.stroke(path);g.setLineDash([]);
 if(activeCircuit.tunnel){g.strokeStyle='#14212e';g.lineWidth=TW-5;g.stroke(activeCircuit.tunnel.path);g.strokeStyle='#bad8ec';g.lineWidth=3;
  for(const p of T)if(p.s>=activeCircuit.tunnel.start&&p.s<=activeCircuit.tunnel.end&&p.s%180<55){g.beginPath();g.moveTo(p.x+p.nx*(TW/2-7),p.y+p.ny*(TW/2-7));g.lineTo(p.x+p.nx*(TW/2-7)+Math.cos(p.ang)*35,p.y+p.ny*(TW/2-7)+Math.sin(p.ang)*35);g.stroke();}
  for(const s of [activeCircuit.tunnel.start,activeCircuit.tunnel.end]){const p=pointAtDistance(s);g.save();g.translate(p.x,p.y);g.rotate(p.ang);g.fillStyle='#9aa7b4';g.fillRect(-10,-TW/2-18,20,24);g.fillRect(-10,TW/2-6,20,24);g.fillStyle='#d6e5ed';g.font='bold 19px Segoe UI,sans-serif';g.textAlign='center';g.fillText('TUNNEL',0,-TW/2-35);g.restore();}}
 // linea di partenza + tribuna
 const q=T[0];g.save();g.translate(q.x,q.y);g.rotate(q.ang);
 for(let i=0;i<10;i++)for(let j=0;j<2;j++){g.fillStyle=(i+j)%2?'#fff':'#111';g.fillRect(j*14-14,-TW/2+i*(TW/10),14,TW/10);}
 g.fillStyle='#4a505a';g.fillRect(-400,TW/2+BAR+40,900,90);g.fillStyle='#e10600';for(let i=0;i<30;i++){g.fillStyle=`hsl(${i*37%360},60%,55%)`;g.fillRect(-390+i*30,TW/2+BAR+60,16,50);}
 g.restore();
 // Le caselle usano le stesse coordinate delle vetture in griglia.
 g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=2;
 for(let k=0;k<cars.length;k++){const slot=gridSlot(k);g.save();g.translate(slot.x,slot.y);g.rotate(slot.ang);g.strokeRect(-32,-17,64,34);g.restore();}
 drawPits(g);drawSectorLines(g);
}
function drawCachedScenery(dpr){
 const cache=sceneryCache,b=renderBounds,appearance=[cars.length,careerRun?.kind||'',S.my.name,S.my.c1,S.teamNames.join('|')].join(';');
 const valid=cache.circuit===activeCircuit&&cache.pits===PIT_GARAGES[0]&&cache.appearance===appearance&&cache.dpr===dpr&&
  cache.viewportW===innerWidth&&cache.viewportH===innerHeight&&camZ<=cache.zoom*1.15&&camZ>=cache.zoom*.7&&cache.bounds&&
  b.left>=cache.bounds.left&&b.right<=cache.bounds.right&&b.top>=cache.bounds.top&&b.bottom<=cache.bounds.bottom;
 if(!valid){
  const padding=Math.min(240,Math.min(innerWidth,innerHeight)*.3)/camZ;
  const left=b.left-padding,top=b.top-padding,width=b.right-b.left+padding*2,height=b.bottom-b.top+padding*2;
  // Una sola superficie, al massimo circa 48 MB: nessun accumulo fra i 24 circuiti.
  const scale=Math.min(camZ*dpr*1.25,Math.sqrt(12000000/(width*height)));
  const pixelW=Math.max(1,Math.floor(width*scale)),pixelH=Math.max(1,Math.floor(height*scale));
  if(cache.canvas.width!==pixelW)cache.canvas.width=pixelW;if(cache.canvas.height!==pixelH)cache.canvas.height=pixelH;
  const g=cache.canvas.getContext('2d');g.setTransform(scale,0,0,scale,-left*scale,-top*scale);
  g.fillStyle='#2f6b2f';g.fillRect(left,top,cache.canvas.width/scale,cache.canvas.height/scale);drawTrackScenery(g);
  Object.assign(cache,{circuit:activeCircuit,pits:PIT_GARAGES[0],appearance,dpr,viewportW:innerWidth,viewportH:innerHeight,scale,zoom:camZ,
   bounds:{left,top,right:left+cache.canvas.width/scale,bottom:top+cache.canvas.height/scale},builds:cache.builds+1});
 }
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(cache.canvas,cache.bounds.left,cache.bounds.top,cache.canvas.width/cache.scale,cache.canvas.height/cache.scale);
}
