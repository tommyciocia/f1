'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.F1_BROWSER_CHANNEL||'msedge',headless:true}),folder=fs.mkdtempSync(path.join(os.tmpdir(),'f1-performance-'));
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:2}),errors=[],timings=[];
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('f1sim.set',JSON.stringify({vol:0}));});
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  for(const circuit of ['barcelona','monaco','suzuka']){
   const result=await page.evaluate(circuit=>{
    toMenu();selectCircuit(circuit);startRace();state='racing';camX=pl.x;camY=pl.y;camZ=.55;
    const first=sceneryCache.builds;render(0);const built=sceneryCache.builds;
    const sample=()=>{for(let i=0;i<8;i++)render(0);ctx.getImageData(0,0,1,1);const start=performance.now();for(let i=0;i<60;i++)render(0);ctx.getImageData(0,0,1,1);return(performance.now()-start)/60;};
    const cachedMs=sample(),hits=sceneryCache.builds===built,original=drawCachedScenery;let uncachedMs;
    try{drawCachedScenery=()=>{drawGround(ctx,renderBounds);drawTrackScenery(ctx);};uncachedMs=sample();}finally{drawCachedScenery=original;}
    camX+=5000;render(0);const moved=sceneryCache.builds===built+1,b=renderBounds,c=sceneryCache.bounds;
    const covered=c.left<=b.left&&c.right>=b.right&&c.top<=b.top&&c.bottom>=b.bottom;
    const before=sceneryCache.builds;S.my.name+=' Test';render(0);const renamed=sceneryCache.builds===before+1;
    const size=sceneryCache.canvas.width*sceneryCache.canvas.height;
    camX=pl.x;camY=pl.y;render(0);const rollingStart=sceneryCache.builds;
    cars.forEach(c=>c.go=true);pl.ai=true;for(let i=0;i<120;i++){update(1/60);render(1/60);}
    const rollingBuilds=sceneryCache.builds-rollingStart;
    return{circuit,cachedMs,uncachedMs,hits,initial:built===first+1,moved,covered,renamed,size,rollingBuilds};
   },circuit);
   assert.ok(result.initial&&result.hits&&result.moved&&result.covered&&result.renamed,JSON.stringify(result));assert.ok(result.size<=12000000);assert.ok(result.rollingBuilds<12,JSON.stringify(result));
   timings.push(result);await page.screenshot({path:path.join(folder,circuit+'-cached.png')});
  }
  await page.setViewportSize({width:3840,height:2160});
  const large=await page.evaluate(()=>{render(0);const built=sceneryCache.builds;render(0);return{reused:sceneryCache.builds===built,size:sceneryCache.canvas.width*sceneryCache.canvas.height,pixels:cv.width*cv.height};});
  assert.ok(large.reused);assert.ok(large.size<=12000000);assert.ok(large.pixels<=3840*2160);
  await page.setViewportSize({width:360,height:800});await page.evaluate(()=>render(0));await page.screenshot({path:path.join(folder,'mobile-hidpi.png')});
  const standard=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});await standard.addInitScript(()=>requestAnimationFrame=()=>0);await standard.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  assert.equal(await standard.evaluate(()=>scenePixelRatio()),1.5);await standard.close();
  assert.deepEqual(errors,[]);console.log(JSON.stringify(timings));console.log('Cache riutilizzata, spostamenti, cambio pista/livrea, HiDPI e limite 4K verificati. Screenshot:',folder);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
