'use strict';
// NODE_PATH=<pacchetti runtime> node tests/browser.cjs
// Browser headless isolato: non usa finestre, profili o dati del browser dell'utente.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.F1_BROWSER_CHANNEL||'msedge',headless:true});
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'f1-quali-ui-')),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('f1sim.set',JSON.stringify({vol:0}));});
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await page.evaluate(()=>render());assert.ok(await page.locator('#menuBackdrop').isVisible());
  const artworkWidth=await page.evaluate(async()=>{const artwork=new Image();artwork.src='assets/menu-duel.png';await artwork.decode();return artwork.naturalWidth;});
  assert.ok(artworkWidth>=1280);
  await page.screenshot({path:path.join(folder,'menu.png')});
  await page.setViewportSize({width:360,height:800});await page.evaluate(()=>render());
  await page.screenshot({path:path.join(folder,'menu-mobile.png')});
  await page.setViewportSize({width:1280,height:800});
  await page.getByRole('button',{name:'IMPOSTAZIONI',exact:true}).click();
  for(const [i,value] of ['18','15','12'].entries())assert.equal(await page.locator('[data-qminutes="'+i+'"]').inputValue(),value);
  assert.ok(await page.locator('[data-set="qualiEnabled"]').isChecked());
  await page.locator('#settings [data-go="menu"]').click();await page.locator('#menu [data-act="play"]').click();
  assert.ok(await page.locator('#menuBackdrop').isHidden());
  await page.evaluate(()=>{pl.ai=true;for(let n=0;n<2000;n++)update(.05);camX=pl.x;camY=pl.y;render();qHud(1);$('banner').textContent='';});
  assert.equal(await page.locator('#tower tbody tr').count(),23);assert.match(await page.locator('#lapTxt').textContent(),/Q1/);
  assert.equal(await page.locator('#timeTxt').textContent(),'16:20');assert.equal(await page.locator('#tyreText').textContent(),'SOFT — 100%');
  assert.equal(await page.locator('#tower .q-danger').count(),6,JSON.stringify(await page.locator('#tower tbody tr').evaluateAll(rows=>rows.map(row=>({text:row.textContent,classes:row.className})))));assert.equal(await page.locator('#tower .q-cut').count(),1);
  await page.screenshot({path:path.join(folder,'q1-desktop.png')});
  await page.setViewportSize({width:360,height:800});await page.evaluate(()=>render());
  await page.screenshot({path:path.join(folder,'q1-mobile.png')});
  const layout=await page.evaluate(()=>{
   const rect=id=>{const r=$(id).getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};};
   return{tower:rect('tower'),top:rect('top'),tyres:rect('tyreIndicator'),mini:rect('mini'),car:{x:innerWidth/2+(pl.x-camX)*camZ,y:innerHeight*.68+(pl.y-camY)*camZ}};
  });
  assert.ok(layout.tyres.x+layout.tyres.w<=layout.mini.x);assert.ok(layout.car.y>layout.tower.y+layout.tower.h&&layout.car.y<800);
  console.log('Layout mobile:',JSON.stringify(layout));
  await page.setViewportSize({width:1280,height:800});
  for(let phase=0;phase<3;phase++){
   if(phase>0)await page.evaluate(()=>{if(pl.qActive)pl.ai=true;for(let n=0;n<2400;n++)update(.05);});
   await page.evaluate(()=>{endQuali();render();});
   assert.equal(await page.evaluate(()=>state),phase===2?'qdone':'qbetween');
   assert.equal(await page.locator('#qList tbody tr').count(),23);
   if(phase<2){
    assert.ok(await page.locator('#nextQBtn').isVisible());assert.ok(await page.locator('#gridBtn').isHidden());
    await page.locator('#nextQBtn').click();
    assert.equal(await page.evaluate(()=>qualiParticipants().length),[17,10][phase]);
    assert.ok(await page.evaluate(()=>qualiParticipants().every(c=>c.best===1e9)));
   }
  }
  assert.ok(await page.locator('#gridBtn').isVisible());assert.ok(await page.locator('#nextQBtn').isHidden());
  await page.screenshot({path:path.join(folder,'final-grid.png')});
  const ids=await page.evaluate(()=>quali.finalGrid.map(r=>r.id));await page.locator('#gridBtn').click();
  assert.ok(await page.locator('#raceTyres').isVisible());await page.locator('#startCompound').selectOption('MEDIUM');await page.locator('#startRaceBtn').click();
  assert.equal(await page.evaluate(()=>pl.tyres.compound),'MEDIUM');
  assert.deepEqual(await page.evaluate(()=>cars.map(c=>c.id)),ids);
  await page.evaluate(()=>{pl.ai=true;for(let n=0;n<400;n++)update(.05);render();});
  assert.ok(await page.evaluate(()=>cars.every(c=>c.tyres.degradation&&c.tyres.condition<1)));
  assert.equal(errors.length,0,errors.join('\n'));console.log('UI, timer, pulsanti Q1/Q2/Q3 e griglia gara verificati. Screenshot:',folder);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
