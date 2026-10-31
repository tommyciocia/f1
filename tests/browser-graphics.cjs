'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.F1_BROWSER_CHANNEL||'msedge',headless:true});
 const output=path.resolve(__dirname,'../docs/review/graphics'),errors=[],circuits=[];fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{window.nativeFrame=requestAnimationFrame.bind(window);requestAnimationFrame=()=>0;localStorage.setItem('f1sim.set',JSON.stringify({vol:0,laps:3,my:{name:'Apex Racing',driver:'Alex',code:'ALX',num:27,c1:'#ffd400',c2:'#111111'}}));});
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  const ids=await page.evaluate(()=>CIRCUIT_DATA.map(c=>c.id));
  for(const id of ids){
   const data=await page.evaluate(id=>{
    toMenu();selectCircuit(id);startRace();updateCountdown(6);pl.ai=true;for(let i=0;i<240;i++)update(.05);
    camX=pl.x+pl.vx*.38;camY=pl.y+pl.vy*.38;camZ=.62;clearTimeout(banner.t);$('banner').textContent='';hudUpdate(0);
    const fingerprint=()=>JSON.stringify([raceTime,cars.map(c=>[c.x,c.y,c.vx,c.vy,c.a,c.lap,c.tyres.condition,c.wheelPhase])]);
    const before=fingerprint(),random=Math.random;
    try{Math.random=()=>{throw Error('Il disegno non deve consumare il caso del gameplay');};render(0);render(0);}finally{Math.random=random;}
    const builds=sceneryCache.builds;render(0);
    const high={reuse:sceneryCache.builds===builds,pixels:sceneryCache.canvas.width*sceneryCache.canvas.height};
    const objects=sceneryArt.objects.length,stands=sceneryArt.objects.filter(o=>o.kind==='stand').length,theme=sceneryArt.theme.kind;
    S.qual='low';render(0);const lowBuild=sceneryCache.builds;render(0);const lowReuse=sceneryCache.builds===lowBuild;
    S.qual='high';render(0);
    return{id,theme,objects,stands,high,lowReuse,unchanged:fingerprint()===before,cars:cars.length,sprites:carArtCache.size};
   },id);
   assert.ok(data.unchanged&&data.high.reuse&&data.lowReuse,JSON.stringify(data));assert.equal(data.cars,23);assert.ok(data.high.pixels<=12000000&&data.sprites<=48);assert.ok(data.objects>0);circuits.push(data);
   if(['barcelona','monaco','bahrain','suzuka'].includes(id))await page.screenshot({path:path.join(output,id+'.png'),animations:'disabled'});
  }
  const sprites=await page.evaluate(()=>{
   for(let i=0;i<100;i++)carBodyArt({...pl,col:'#'+(i*13013%0xffffff).toString(16).padStart(6,'0')});
   return{count:carArtCache.size,width:carArtCache.values().next().value.width,height:carArtCache.values().next().value.height};
  });
  assert.equal(sprites.count,48);assert.equal(sprites.width,336);assert.equal(sprites.height,216);
  await page.evaluate(()=>{toMenu();selectCircuit('barcelona');startRace();updateCountdown(6);pl.ai=true;for(let i=0;i<1800;i++)update(1/60);camX=pl.x+pl.vx*.38;camY=pl.y+pl.vy*.38;camZ=.55;clearTimeout(banner.t);$('banner').textContent='';hudUpdate(0);render(0);});
  for(const size of [{width:1280,height:720},{width:320,height:568},{width:640,height:360}]){
   await page.setViewportSize(size);await page.evaluate(()=>render(0));
   const layout=await page.evaluate(()=>{const rect=id=>{const r=$(id).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};return{caption:rect('miniCaption'),captionDisplay:getComputedStyle($('miniCaption')).display,mini:rect('mini'),venue:getComputedStyle($('venueBadge')).display};});
   if(size.width<=700)assert.equal(layout.captionDisplay,'none');
   else{assert.ok(layout.caption.x>=0&&layout.caption.y>=0&&layout.caption.x+layout.caption.w<=size.width+1);assert.ok(layout.caption.y+layout.caption.h<=layout.mini.y);}
   if(size.width<=1000)assert.equal(layout.venue,'none');
   await page.screenshot({path:path.join(output,'race-'+size.width+'.png'),animations:'disabled'});
  }
  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>{toMenu();show('cars');renderCars();});await page.screenshot({path:path.join(output,'car-detail.png'),animations:'disabled'});
  await page.evaluate(()=>{toMenu();startRace();updateCountdown(6);pl.ai=true;last=null;});
  const live=await page.evaluate(()=>new Promise(resolve=>{
   let start=null,count=0;const tick=t=>{if(start===null)start=t;count++;if(t-start<4000)requestAnimationFrame(tick);else{requestAnimationFrame=()=>0;resolve({frames:count,fps:count*1000/(t-start),state,raceTime});}};
   requestAnimationFrame=window.nativeFrame;requestAnimationFrame(frame);requestAnimationFrame(tick);
  }));
  assert.equal(live.state,'racing');assert.ok(live.frames>80,JSON.stringify(live));assert.deepEqual(errors,[]);
  // Confronto con il tracciato intero: il ritaglio non deve lasciare buchi o
  // interrompere le giunzioni, anche sul sovrappasso e ai bordi della visuale.
  const coverage=[];
  for(const id of ['barcelona','monaco','suzuka'])for(const fraction of [.05,.35,.65]){
   const result=await page.evaluate(({id,fraction})=>{
    toMenu();selectCircuit(id);startRace();const q=pointAtDistance(L*fraction);camX=q.x;camY=q.y;camZ=.55;render(0);
    const clipped=ctx.getImageData(0,0,cv.width,cv.height).data,original=sceneryPaths;
    let full;
    try{sceneryPaths=()=>({road:path,runoff:sceneryArt.runoffPath});sceneryCache.circuit=null;render(0);full=ctx.getImageData(0,0,cv.width,cv.height).data;}
    finally{sceneryPaths=original;sceneryCache.circuit=null;}
    let changed=0;for(let i=0;i<clipped.length;i+=4)if(Math.abs(clipped[i]-full[i])+Math.abs(clipped[i+1]-full[i+1])+Math.abs(clipped[i+2]-full[i+2])>16)changed++;
    return{id,fraction,changed,pixels:cv.width*cv.height};
   },{id,fraction});
   assert.ok(result.changed/result.pixels<.002,JSON.stringify(result));coverage.push(result);
  }
  const report={date:'2026-10-30',browser:browser.version(),circuits,sprites,live,coverage,errors,screenshots:'docs/review/graphics'};
  fs.writeFileSync(path.resolve(__dirname,'../docs/validation-graphics.json'),JSON.stringify(report,null,2)+'\n');
  console.log('24 circuiti: grafica alta/bassa, cache, caso e fisica invariati, limite sprite e layout verificati.',JSON.stringify({live,output}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
