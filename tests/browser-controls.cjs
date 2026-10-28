'use strict';
// Browser isolato. I pad di prova sono fixture dell'API: il gioco usa sempre navigator.getGamepads.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:process.env.F1_BROWSER_CHANNEL||'msedge',headless:true}),errors=[];
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'f1-controls-ui-'));
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;if(!localStorage.getItem('f1sim.set'))localStorage.setItem('f1sim.set',JSON.stringify({vol:0}));});
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  console.log('API nativa:',JSON.stringify(await page.evaluate(()=>({available:typeof navigator.getGamepads==='function',secure:isSecureContext,devices:Array.from(navigator.getGamepads?.()||[]).filter(Boolean).length}))));
  await page.locator('#menu [data-go="controls"]').click();
  assert.match(await page.locator('#controls').textContent(),/X ingresso e pilota automatico box/);
  await page.keyboard.down('w');await page.evaluate(()=>testUpdate());assert.match(await page.locator('#inputReadout').textContent(),/ACCELERATORE/);await page.keyboard.up('w');
  await page.keyboard.down('ArrowLeft');await page.evaluate(()=>testUpdate());assert.match(await page.locator('#inputReadout').textContent(),/STERZO/);await page.keyboard.up('ArrowLeft');
  await page.locator('.controller-config summary').click();await page.locator('[data-pad-bind="pit"]').fill('4');await page.locator('#padMode').selectOption('positiveAxes');
  assert.equal(await page.evaluate(()=>S.padMap.pit),4);assert.equal(await page.evaluate(()=>S.padTriggers),'positiveAxes');
  await page.reload();assert.equal(await page.evaluate(()=>S.padMap.pit),4);
  await page.locator('#menu [data-go="controls"]').click();await page.locator('.controller-config summary').click();await page.locator('#resetPadControls').click();
  assert.equal(await page.evaluate(()=>S.padMap.pit),2);assert.equal(await page.evaluate(()=>S.padTriggers),'auto');
  await page.screenshot({path:path.join(folder,'controls.png')});
  await page.evaluate(()=>{
   PIT.serviceAllowed=false;startRace();state='racing';pl.go=true; // Isola i comandi di transito dal servizio, verificato in browser-tyres.
   globalThis.pose=(s,d,v)=>{const q=botPointAt(s);pl.x=q.x+q.nx*d;pl.y=q.y+q.ny*d;pl.idx=q.i;pl.trackS=q.trackS;pl.d=pl.lane=d;pl.a=q.ang;pl.vx=Math.cos(q.ang)*v;pl.vy=Math.sin(q.ang)*v;pl.pit.phase='track';pl.pit.auto=false;pl.pit.onLane=false;pl.ai=false;};
   pose(2000,0,600);updatePitPrompt();
  });
  await page.keyboard.down('x');assert.ok(!await page.evaluate(()=>pitAutopilot(pl)));
  await page.evaluate(()=>{pose(PIT.entryStart-100,20,1000);updatePitPrompt();});assert.equal(await page.locator('#pitPrompt').textContent(),'PREMI X PER ENTRARE AI BOX');
  await page.keyboard.down('x');assert.ok(!await page.evaluate(()=>pitAutopilot(pl)));await page.keyboard.up('x');await page.keyboard.down('x');
  assert.ok(await page.evaluate(()=>pitAutopilot(pl)));assert.equal(await page.evaluate(()=>pl.pit.phase),'approach');
  await page.keyboard.down('ArrowLeft');await page.keyboard.down('s');await page.keyboard.down('r');
  await page.evaluate(()=>{for(let i=0;i<200;i++)update(.01);camX=pl.x;camY=pl.y;camZ=.5;render();$('banner').textContent='';});
  assert.ok(await page.locator('#pitPrompt').isHidden());assert.ok(await page.evaluate(()=>pitAutopilot(pl)&&!pl.inp.rev));
  await page.screenshot({path:path.join(folder,'pit-entry.png')});
  const speed=await page.evaluate(()=>{let max=0;for(let i=0;i<4000&&pitAutopilot(pl);i++){update(.01);if(pitLimited(pl))max=Math.max(max,Math.hypot(pl.vx,pl.vy)*.32);}return max;});
  assert.ok(speed<=80+1e-6);assert.ok(await page.evaluate(()=>!pitAutopilot(pl)&&!pl.ai));
  assert.equal(await page.evaluate(()=>pl.pit.phase),'track');
  assert.ok(await page.evaluate(()=>onTrack(pl)&&pl.pitStops===0&&pl.tyres.compound==='SOFT'));
  for(const key of ['x','s','r','ArrowLeft'])await page.keyboard.up(key);
  await page.evaluate(()=>{
   globalThis.testPad={index:0,id:'API fixture',connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({value:0,pressed:false}))};
   Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[testPad]});pose(PIT.entryStart-100,0,200);testPad.buttons[2].value=1;pollPad();
  });
  assert.ok(await page.evaluate(()=>pitAutopilot(pl)));await page.evaluate(()=>{for(let i=0;i<4000&&pitAutopilot(pl);i++)update(.01);pose(PIT.entryStart-100,0,200);pollPad();});
  assert.ok(!await page.evaluate(()=>pitAutopilot(pl)));await page.evaluate(()=>{testPad.buttons[2].value=0;pollPad();testPad.buttons[2].value=1;pollPad();});assert.ok(await page.evaluate(()=>pitAutopilot(pl)));
  await page.evaluate(()=>{testPad.buttons[2].value=0;pose(2000,0,0);});await page.keyboard.down('r');
  await page.evaluate(()=>{for(let i=0;i<60;i++)update(.01);});assert.equal(await page.locator('#gear').textContent(),'R');await page.keyboard.up('r');
  await page.keyboard.down('s');await page.evaluate(()=>{for(let i=0;i<50;i++)update(.01);});assert.equal(await page.locator('#gear').textContent(),'N');await page.keyboard.up('s');
  await page.evaluate(()=>{testPad.id='Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)';pose(PIT.entryStart-100,0,200);testPad.buttons[0].value=1;pollPad();});
  assert.ok(await page.evaluate(()=>pitAutopilot(pl)&&readPad(testPad).thr===0));
  await page.evaluate(()=>{testPad.buttons[9].value=1;pollPad();pollPad();});assert.equal(await page.evaluate(()=>state),'paused');
  assert.equal(errors.length,0,errors.join('\n'));console.log('Comandi, calibrazione, X tastiera/controller, retromarcia, pausa e pilota automatico verificati. Screenshot:',folder);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
