'use strict';
/* Materiali e scenografia originali, generati una volta e disegnati nella cache.
   Il generatore locale non consuma il caso usato da fisica, gomme o avversari. */
const sceneryArt={circuit:null,theme:null,objects:[],materials:null,trees:[]};
function artRandom(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function artSeed(text){let seed=2166136261;for(const c of text)seed=Math.imul(seed^c.charCodeAt(0),16777619);return seed>>>0;}
function circuitTheme(c=activeCircuit){
 const desert=['bahrain','lusail','yas-marina'].includes(c.id);
 const city=['monaco','baku','miami','singapore','las-vegas','jeddah'].includes(c.id);
 if(desert)return{kind:'desert',ground:'#a1957b',grain:'#c4b693',runoff:'#8f9b9a',accent:'#42b7c0',tree:'#556c53'};
 if(city)return{kind:'city',ground:'#60676b',grain:'#8a9295',runoff:'#718b8b',accent:'#41c9cd',tree:'#385e4c'};
 if(['barcelona','madring','cota','mexico'].includes(c.id))return{kind:'park',ground:'#566342',grain:'#82905a',runoff:'#c0ac86',accent:'#478d88',tree:'#3f6245'};
 return{kind:'park',ground:'#3d5b43',grain:'#6e8152',runoff:'#bcae91',accent:'#467f73',tree:'#305a43'};
}
function artGradient(g,x0,y0,x1,y1,stops,fallback){
 const gradient=g.createLinearGradient(x0,y0,x1,y1);
 if(!gradient?.addColorStop)return fallback;
 for(const [at,color] of stops)gradient.addColorStop(at,color);return gradient;
}
function materialTile(theme,kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const g=canvas.getContext('2d'),rnd=artRandom(artSeed(theme.kind+kind));
 const base=kind==='asphalt'?'#343a41':kind==='gravel'?theme.runoff:theme.ground;
 g.fillStyle=base;g.fillRect(0,0,256,256);
 if(kind==='ground'&&theme.kind==='park'){
  g.fillStyle='#c8d3a006';g.fillRect(0,0,256,128);g.fillStyle='#132d2205';g.fillRect(0,128,256,128);
 }
 for(let i=0;i<(kind==='asphalt'?2400:1400);i++){
  const x=rnd()*256,y=rnd()*256,size=rnd()*(kind==='gravel'?2.5:1.2)+.4;
  g.fillStyle=i%2?(kind==='asphalt'?'#a0acb119':'#f4ecc11c'):'#0c17231b';g.fillRect(x,y,size,size);
 }
 if(kind==='ground'&&theme.kind==='city'){
  g.strokeStyle='#303a421b';g.lineWidth=1;g.beginPath();g.moveTo(0,128);g.lineTo(256,128);g.moveTo(128,0);g.lineTo(128,256);g.stroke();
 }
 if(kind==='ground'&&theme.kind==='desert'){
  g.strokeStyle='#e9d7ae12';g.lineWidth=3;
  for(let y=20;y<256;y+=38){g.beginPath();g.moveTo(0,y);g.bezierCurveTo(80,y-22,170,y+22,256,y);g.stroke();}
 }
 return canvas;
}
function treeArt(theme,variant){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=160;
 const g=canvas.getContext('2d'),rnd=artRandom(73+variant);
 g.fillStyle='#08171f2b';g.beginPath();g.ellipse(88,96,53,43,.3,0,Math.PI*2);g.fill();
 g.fillStyle='#152a22';g.beginPath();g.arc(75,75,49,0,Math.PI*2);g.fill();
 for(let i=0;i<17;i++){
  const angle=rnd()*Math.PI*2,r=Math.sqrt(rnd())*34,x=74+Math.cos(angle)*r,y=72+Math.sin(angle)*r;
  g.fillStyle=i%3===0?'#658458':i%3===1?theme.tree:'#456b4a';
  g.beginPath();g.arc(x,y,14+rnd()*10,0,Math.PI*2);g.fill();
  g.fillStyle='#c0d39410';g.beginPath();g.arc(x-3,y-5,9,0,Math.PI*2);g.fill();
 }
 return canvas;
}
function sceneryClear(x,y,radius){
 const clearance=TW/2+BAR+radius+38,limit=clearance*clearance;
 for(const q of T){
  if(Math.abs(q.x-x)>clearance+q.len||Math.abs(q.y-y)>clearance+q.len)continue;
  const dx=Math.cos(q.ang),dy=Math.sin(q.ang),t=clamp((x-q.x)*dx+(y-q.y)*dy,0,q.len);
  if((x-q.x-dx*t)**2+(y-q.y-dy*t)**2<limit)return false;
 }
 for(const q of activeCircuit.pitData.samples)if((q.x-x)**2+(q.y-y)**2<(radius+220)**2)return false;
 for(const garage of PIT_GARAGES){const q=pitPoint(garage.s,PIT.stallD);if((q.x-x)**2+(q.y-y)**2<(radius+260)**2)return false;}
 return true;
}
function ensureSceneryArt(){
 if(sceneryArt.circuit===activeCircuit)return sceneryArt;
 const theme=circuitTheme(),rnd=artRandom(artSeed(activeCircuit.id)),objects=[];
 const add=(kind,x,y,r,angle=0,variant=0)=>{if(sceneryClear(x,y,r))objects.push({kind,x,y,r,angle,variant});};
 for(let s=380;s<L;s+=560){
  const q=pointAtDistance(s,activeCircuit,true);
  for(const side of [-1,1]){
   const d=TW/2+BAR+120+rnd()*210;
   const x=q.x+q.nx*d*side,y=q.y+q.ny*d*side;
   if(theme.kind==='city'){
    if(rnd()>.24)add('building',x+q.nx*side*120,y+q.ny*side*120,100+rnd()*65,q.ang,rnd());
    if(rnd()>.5)add('tree',x,y,48+rnd()*13,0,rnd());
   }else if(theme.kind==='park'){
    for(let n=0;n<3;n++)add('tree',x+(rnd()-.5)*210,y+(rnd()-.5)*210,43+rnd()*24,0,rnd());
   }else if(rnd()>.55)add('shrub',x,y,23+rnd()*12,0,rnd());
  }
 }
 for(let s=1200;s<L;s+=3600){
  const q=pointAtDistance(s,activeCircuit,true),side=s%7200<3600?-1:1,d=TW/2+BAR+310;
  add('stand',q.x+q.nx*d*side,q.y+q.ny*d*side,205,q.ang,rnd());
 }
 const materials={};for(const kind of ['ground','asphalt','gravel'])materials[kind]=materialTile(theme,kind);
 // Una linea continua per ogni gruppo di curve: i singoli campioni della pista
 // non devono trasformare la ghiaia in rettangoli separati.
 const runoffPath=new Path2D();let connected=false;
 for(let i=0;i<N;i++){
  const q=T[i],next=T[(i+1)%N];
  if(q.kerb){if(!connected)runoffPath.moveTo(q.x,q.y);runoffPath.lineTo(next.x,next.y);connected=true;}else connected=false;
 }
 Object.assign(sceneryArt,{circuit:activeCircuit,theme,objects,materials,runoffPath,patterns:new WeakMap(),trees:[treeArt(theme,0),treeArt(theme,1),treeArt(theme,2)]});
 return sceneryArt;
}
function surfacePaint(g,kind){
 const art=ensureSceneryArt();let paints=art.patterns.get(g);
 if(!paints){paints={};art.patterns.set(g,paints);}
 if(!paints[kind])paints[kind]=g.createPattern(art.materials[kind],'repeat')||(kind==='asphalt'?'#343a41':kind==='gravel'?art.theme.runoff:art.theme.ground);
 return paints[kind];
}
function drawGround(g,bounds){
 g.fillStyle=surfacePaint(g,'ground');g.fillRect(bounds.left,bounds.top,bounds.right-bounds.left,bounds.bottom-bounds.top);
}
// Traccia solo i segmenti che possono raggiungere la superficie attiva.
// Le estremità sono fuori dall'area visibile: nessuna giunzione tagliata.
function sceneryPaths(bounds){
 if(!bounds)return{road:path,runoff:sceneryArt.runoffPath};
 const pad=TW/2+BAR+50,left=bounds.left-pad,right=bounds.right+pad,top=bounds.top-pad,bottom=bounds.bottom+pad;
 const visible=new Uint8Array(N);let outside=-1;
 for(let i=0;i<N;i++){
  const a=T[i],b=T[(i+1)%N];
  if(Math.max(a.x,b.x)>=left&&Math.min(a.x,b.x)<=right&&Math.max(a.y,b.y)>=top&&Math.min(a.y,b.y)<=bottom)visible[i]=1;else outside=i;
 }
 if(outside===-1)return{road:path,runoff:sceneryArt.runoffPath};
 const road=new Path2D(),runoff=new Path2D();let roadOpen=false,runoffOpen=false;
 for(let k=1;k<=N;k++){
  const i=(outside+k)%N,a=T[i],b=T[(i+1)%N];
  if(visible[i]){if(!roadOpen)road.moveTo(a.x,a.y);road.lineTo(b.x,b.y);roadOpen=true;}else roadOpen=false;
  if(visible[i]&&a.kerb){if(!runoffOpen)runoff.moveTo(a.x,a.y);runoff.lineTo(b.x,b.y);runoffOpen=true;}else runoffOpen=false;
 }
 return{road,runoff};
}
function drawGrandstand(g,o){
 g.save();g.translate(o.x,o.y);g.rotate(o.angle);
 g.fillStyle='#101d2740';g.fillRect(-170,-61,365,160);g.fillStyle='#35424d';g.fillRect(-180,-80,360,150);
 for(let row=0;row<5;row++){
  g.fillStyle=row%2?'#596875':'#465663';g.fillRect(-174,-73+row*25,348,22);
  for(let col=0;col<28;col++){
   const id=(col*7+row*13+Math.floor(o.variant*40))%8;
   g.fillStyle=['#e7c284','#cad7e1','#e25857','#4485a9','#263946','#e8e4db','#639887','#323944'][id];
   g.fillRect(-168+col*12,-68+row*25,5,7);
  }
 }
 g.fillStyle='#adb9c1';g.fillRect(-187,-88,374,22);g.fillStyle='#dce4e5';g.fillRect(-187,-88,374,4);
 g.fillStyle='#2a3844';g.fillRect(-187,62,374,16);g.fillStyle='#6e8290';g.fillRect(-186,62,372,3);
 g.restore();
}
function drawSceneryObjects(g,b=renderBounds){
 const art=ensureSceneryArt();
 for(const o of art.objects){
  if(b&&(o.x+o.r<b.left||o.x-o.r>b.right||o.y+o.r<b.top||o.y-o.r>b.bottom))continue;
  if(S.qual==='low'&&o.kind==='tree'&&o.variant<.45)continue;
  if(o.kind==='tree'){g.drawImage(art.trees[Math.min(2,Math.floor(o.variant*3))],o.x-o.r,o.y-o.r,o.r*2,o.r*2);continue;}
  if(o.kind==='shrub'){
   g.save();g.translate(o.x,o.y);g.rotate(o.variant*4);g.fillStyle='#26352b2b';g.beginPath();g.ellipse(4,5,o.r*.8,o.r*.5,0,0,Math.PI*2);g.fill();
   g.fillStyle='#b4a487';g.beginPath();g.moveTo(-o.r*.6,0);g.lineTo(-o.r*.3,-o.r*.5);g.lineTo(o.r*.4,-o.r*.3);g.lineTo(o.r*.7,o.r*.2);g.lineTo(0,o.r*.45);g.closePath();g.fill();
   g.fillStyle='#d6c8a755';g.beginPath();g.moveTo(-o.r*.3,-o.r*.5);g.lineTo(o.r*.4,-o.r*.3);g.lineTo(0,0);g.lineTo(-o.r*.6,0);g.closePath();g.fill();
   for(let k=0;k<5;k++){g.fillStyle=k%2?'#67785c':'#82916b';g.beginPath();g.ellipse(-o.r*.35+Math.cos(k*2)*7,Math.sin(k*2)*7,8,3,k*2,0,Math.PI*2);g.fill();}
   g.restore();continue;
  }
  if(o.kind==='stand'){drawGrandstand(g,o);continue;}
  g.save();g.translate(o.x,o.y);g.rotate(o.angle);
  const w=o.r*1.6,h=o.r*.95;
  g.fillStyle='#14212d55';g.fillRect(-w/2+22,-h/2+30,w,h);
  g.fillStyle='#26333d';g.fillRect(-w/2,-h/2,w,h);
  g.fillStyle=artGradient(g,0,-h/2,0,h/2,[[0,'#abb5bb'],[.6,'#798994'],[1,'#62717e']],'#8896a0');g.fillRect(-w/2+5,-h/2+5,w-10,h-15);
  g.strokeStyle='#cbd3d65c';g.lineWidth=2;g.strokeRect(-w/2+10,-h/2+10,w-20,h-25);
  for(let i=0;i<3;i++){
   g.fillStyle='#4a5968';g.fillRect(-w*.3+i*w*.22,-h*.15,w*.13,h*.28);g.fillStyle='#aab7c2';g.fillRect(-w*.3+i*w*.22,-h*.15,w*.13,3);
   g.fillStyle='#a8d4da';g.fillRect(-w*.4+i*w*.3,h/2-7,w*.16,3);
  }
  g.restore();
 }
}
function drawBrakeBoards(g,bounds=renderBounds){
 for(const feature of activeCircuit.features){
  if(!feature.speedKmh)continue;
  for(const metres of [150,100,50]){
   const q=pointAtDistance(feature.s-metres*WORLD_UNITS_PER_METRE,activeCircuit,true);
   const side=activeCircuit.pitData.side*-1,d=TW/2+BAR+32;
   const x=q.x+q.nx*d*side,y=q.y+q.ny*d*side;
   if(bounds&&(x+45<bounds.left||x-45>bounds.right||y+45<bounds.top||y-45>bounds.bottom))continue;
   g.save();g.translate(x,y);g.rotate(q.ang);
   g.fillStyle='#101e2c44';g.fillRect(-19,-11,45,32);g.fillStyle='#e9edf0';g.fillRect(-22,-15,44,30);
   g.fillStyle='#172533';g.font='900 19px Segoe UI,sans-serif';g.textAlign='center';g.fillText(metres,0,7);g.restore();
  }
 }
}
