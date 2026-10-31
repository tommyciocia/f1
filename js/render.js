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
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=state==='menu'||state==='prerace'?'#0e1114':circuitTheme().ground;ctx.fillRect(0,0,W,H);
 if(state==='menu'||state==='prerace'){menuCanvasReady=true;return;}menuCanvasReady=false;
 const unit=clamp(Math.min(W,H)/900,.55,1.4),qualifyingView=mode==='quali'&&state==='quali';let tx,ty,z;
 const followed=mode==='quali'?qualiCameraCar():pl,v=Math.hypot(followed.vx,followed.vy),lookAhead=qualifyingView&&W<=1000?.15:.38;tx=followed.x+followed.vx*lookAhead;ty=followed.y+followed.vy*lookAhead;z=(.76-.15*clamp(v/1000,0,1))*unit/camMul;
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
  ctx.strokeStyle='#c0c9d3';ctx.lineWidth=TW+20;ctx.stroke(deck);ctx.strokeStyle=surfacePaint(ctx,'asphalt');ctx.lineWidth=TW;ctx.stroke(deck);
  ctx.strokeStyle='#ffffff12';ctx.lineWidth=TW*.1;ctx.stroke(deck);
  drawVehicleLayer(c=>carTrackHeight(c)>30);
 }
 ctx.restore();
 if(state!=='menu')drawMini();
}
function drawVehicleLayer(include){
 // Il margine comprende ombra, rotazione e nome, anche al bordo dello schermo.
 const layer=cars.filter(c=>(!renderBounds||c.x>=renderBounds.left-160&&c.x<=renderBounds.right+160&&c.y>=renderBounds.top-80&&c.y<=renderBounds.bottom+80)&&include(c));
 if(S.qual==='high')for(const c of layer)drawCar(c,true);for(const c of layer)drawCar(c,false);
 ctx.font='800 18px Segoe UI,sans-serif';ctx.textAlign='center';
 const labelBoxes=[],labels=layer.slice().sort((a,b)=>Number(b.isP)-Number(a.isP));
 for(const c of labels){
  const color=mode==='quali'&&(!c.qActive||c.qOutcome==='eliminato')?'#ff6878':c.isP?'#ffe07a':'#eaf1f6',t=c.code+' '+c.num;
  const w=(ctx.measureText(t)?.width||66)+16;
  const box={left:c.x-w/2,right:c.x+w/2,top:c.y-61,bottom:c.y-36};
  if(!c.isP&&(labelBoxes.some(b=>box.left<b.right+5&&box.right>b.left-5&&box.top<b.bottom+4&&box.bottom>b.top-4)||renderBounds&&(box.left<renderBounds.left||box.right>renderBounds.right||box.top<renderBounds.top||box.bottom>renderBounds.bottom)))continue;
  labelBoxes.push(box);
  ctx.fillStyle='#0b1625df';ctx.beginPath();ctx.roundRect(c.x-w/2,c.y-61,w,25,5);ctx.fill();
  ctx.fillStyle=c.isP?'#ffe07a':c.col;ctx.fillRect(c.x-w/2,c.y-57,3,17);
  ctx.fillStyle=color;ctx.fillText(t,c.x+2,c.y-43);
  if(c.isP){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(c.x-5,c.y-32);ctx.lineTo(c.x+5,c.y-32);ctx.lineTo(c.x,c.y-26);ctx.closePath();ctx.fill();}
 }
}
function drawSectorLines(g=ctx){for(const [i,q] of SECTOR_LINES.entries()){g.save();g.translate(q.x,q.y);g.rotate(q.ang);g.strokeStyle='#00c8ff';g.lineWidth=12;g.beginPath();g.moveTo(0,-TW/2-20);g.lineTo(0,TW/2+20);g.stroke();g.strokeStyle='#fff';g.lineWidth=3;g.stroke();g.fillStyle='#00c8ff';g.font='bold 22px Segoe UI,sans-serif';g.textAlign='center';g.fillText('S'+(i+1),0,-TW/2-34);g.restore();}}

function drawTrackScenery(g,bounds=renderBounds){
 const theme=ensureSceneryArt().theme,local=sceneryPaths(bounds),road=local.road;
 g.lineJoin='round';g.lineCap='butt';
 drawSceneryObjects(g,bounds);
 // Guardrail sovrapposti: ombra esterna, metallo e interno libero.
 g.strokeStyle='#14202b70';g.lineWidth=TW+2*BAR+22;g.stroke(road);
 g.strokeStyle='#acb7bc';g.lineWidth=TW+2*BAR+10;g.stroke(road);
 g.strokeStyle='#4d5b63';g.lineWidth=TW+2*BAR+4;g.stroke(road);
 g.strokeStyle=surfacePaint(g,'ground');g.lineWidth=TW+2*BAR-5;g.stroke(road);
 g.lineCap='round';g.strokeStyle=surfacePaint(g,'gravel');g.lineWidth=TW+Math.max(26,BAR*1.6);g.stroke(local.runoff);g.lineCap='butt';
 g.strokeStyle=theme.accent;g.lineWidth=TW+48;g.stroke(road);
 g.strokeStyle='#19302f55';g.lineWidth=TW+37;g.stroke(road);
 // Cordoli soltanto nei tratti curvi; rettilinei con le normali linee bianche.
 g.strokeStyle='#fff';g.lineWidth=TW+6;g.stroke(road);
 g.strokeStyle='#fff';g.lineWidth=TW+28;g.stroke(activeCircuit.kerbPath);
 g.strokeStyle='#dc4850';g.setLineDash([35,35]);g.stroke(activeCircuit.kerbPath);g.setLineDash([]);
 g.strokeStyle=surfacePaint(g,'asphalt');g.lineWidth=TW;g.stroke(road);
 // Deposito di gomma sull'asfalto, al posto di una linea stradale tratteggiata.
 g.strokeStyle='#15202c20';g.lineWidth=TW*.5;g.stroke(road);
 g.strokeStyle='#131b252b';g.lineWidth=TW*.28;g.stroke(road);
 g.strokeStyle='#74808b0b';g.lineWidth=TW*.08;g.stroke(road);
 if(activeCircuit.tunnel){g.strokeStyle='#14212e';g.lineWidth=TW-5;g.stroke(activeCircuit.tunnel.path);g.strokeStyle='#bad8ec';g.lineWidth=3;
  for(const p of T)if(p.s>=activeCircuit.tunnel.start&&p.s<=activeCircuit.tunnel.end&&p.s%180<55){g.beginPath();g.moveTo(p.x+p.nx*(TW/2-7),p.y+p.ny*(TW/2-7));g.lineTo(p.x+p.nx*(TW/2-7)+Math.cos(p.ang)*35,p.y+p.ny*(TW/2-7)+Math.sin(p.ang)*35);g.stroke();}
  for(const s of [activeCircuit.tunnel.start,activeCircuit.tunnel.end]){const p=pointAtDistance(s);g.save();g.translate(p.x,p.y);g.rotate(p.ang);g.fillStyle='#9aa7b4';g.fillRect(-10,-TW/2-18,20,24);g.fillRect(-10,TW/2-6,20,24);g.fillStyle='#d6e5ed';g.font='bold 19px Segoe UI,sans-serif';g.textAlign='center';g.fillText('TUNNEL',0,-TW/2-35);g.restore();}}
 // linea di partenza + tribuna
 const q=T[0];g.save();g.translate(q.x,q.y);g.rotate(q.ang);
 for(let i=0;i<10;i++)for(let j=0;j<2;j++){g.fillStyle=(i+j)%2?'#fff':'#111';g.fillRect(j*14-14,-TW/2+i*(TW/10),14,TW/10);}
 g.restore();
 // Le caselle usano le stesse coordinate delle vetture in griglia.
 g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=2;
 for(let k=0;k<cars.length;k++){const slot=gridSlot(k);g.save();g.translate(slot.x,slot.y);g.rotate(slot.ang);g.strokeRect(-32,-17,64,34);g.restore();}
 drawPits(g,bounds);drawSectorLines(g);drawBrakeBoards(g,bounds);
}
function drawCachedScenery(dpr){
 const cache=sceneryCache,b=renderBounds,appearance=[S.qual,cars.length,careerRun?.kind||'',S.my.name,S.my.c1,S.teamNames.join('|')].join(';');
 const valid=cache.circuit===activeCircuit&&cache.pits===PIT_GARAGES[0]&&cache.appearance===appearance&&cache.dpr===dpr&&
  cache.viewportW===innerWidth&&cache.viewportH===innerHeight&&camZ<=cache.zoom*1.15&&camZ>=cache.zoom*.7&&cache.bounds&&
  b.left>=cache.bounds.left&&b.right<=cache.bounds.right&&b.top>=cache.bounds.top&&b.bottom<=cache.bounds.bottom;
 if(!valid){
  const padding=Math.min(360,Math.min(innerWidth,innerHeight)*.4)/camZ;
  const left=b.left-padding,top=b.top-padding,width=b.right-b.left+padding*2,height=b.bottom-b.top+padding*2;
  // Una sola superficie, al massimo circa 48 MB: nessun accumulo fra i 24 circuiti.
  const scale=Math.min(camZ*dpr*1.25,Math.sqrt(12000000/(width*height)));
  const pixelW=Math.max(1,Math.floor(width*scale)),pixelH=Math.max(1,Math.floor(height*scale));
  if(cache.canvas.width!==pixelW)cache.canvas.width=pixelW;if(cache.canvas.height!==pixelH)cache.canvas.height=pixelH;
  const g=cache.canvas.getContext('2d');g.setTransform(scale,0,0,scale,-left*scale,-top*scale);
  const bounds={left,top,right:left+cache.canvas.width/scale,bottom:top+cache.canvas.height/scale};
  drawGround(g,bounds);drawTrackScenery(g,bounds);
  Object.assign(cache,{circuit:activeCircuit,pits:PIT_GARAGES[0],appearance,dpr,viewportW:innerWidth,viewportH:innerHeight,scale,zoom:camZ,
   bounds,builds:cache.builds+1});
 }
 // Le superfici sono già sovracampionate: il filtro bilineare evita di
 // ricampionare con un filtro costoso ogni sprite ad ogni fotogramma.
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='low';
 ctx.drawImage(cache.canvas,cache.bounds.left,cache.bounds.top,cache.canvas.width/cache.scale,cache.canvas.height/cache.scale);
}
