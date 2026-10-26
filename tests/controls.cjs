'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {game,placePlayer,placePitLane,checkSeats}=require('./helpers/game.cjs');
const key=(g,code,down=true,repeat=false,target)=>{for(const fn of g.events.get(down?'keydown':'keyup')||[])fn({code,repeat,target,preventDefault(){}});};
function race(g){g.run('startRace();state="racing";pl.go=true;');}
function pad(g,standard=true){g.run(`globalThis.pad={index:0,id:'Test pad',connected:true,mapping:${standard?'"standard"':'""'},axes:[0,0,-1,0,0,-1],buttons:Array.from({length:16},()=>({value:0,pressed:false}))};navigator.getGamepads=()=>[pad];`);}
test('WASD e frecce, freno separato dalla retromarcia, tasti di pausa e campi di testo',()=>{
 const g=game();race(g);placePlayer(g,2000,0,0);
 key(g,'KeyW');assert.equal(g.run('getInput(.1).thr'),1);key(g,'KeyW',false);
 key(g,'ArrowUp');assert.equal(g.run('getInput(.1).thr'),1);key(g,'ArrowUp',false);
 for(const code of ['KeyA','ArrowLeft']){key(g,code);assert.ok(g.run('getInput(.1).st')<0);key(g,code,false);g.run('ks=0;');}
 for(const code of ['KeyD','ArrowRight']){key(g,code);assert.ok(g.run('getInput(.1).st')>0);key(g,code,false);g.run('ks=0;');}
 key(g,'KeyS');assert.equal(g.run('getInput(.1).brk'),1);assert.equal(g.run('getInput(.1).rev'),0);g.advance(.5);assert.ok(g.run('pl.vx*Math.cos(pl.a)+pl.vy*Math.sin(pl.a)>=0'));key(g,'KeyS',false);
 key(g,'Escape');assert.equal(g.run('state'),'paused');key(g,'Escape',false);key(g,'Escape');assert.equal(g.run('state'),'racing');
 key(g,'KeyX',true,false,{tagName:'INPUT'});assert.ok(g.run('!keys.KeyX'));
});
test('R arretra senza riposizionare né penalizzare; T conserva il recupero esistente',()=>{
 const g=game();race(g);placePlayer(g,2000,0,0);const x=g.run('pl.x');
 key(g,'KeyR');assert.equal(g.run('pl.x'),x);g.advance(.7);
 assert.ok(g.run('pl.vx*Math.cos(pl.a)+pl.vy*Math.sin(pl.a)<-20'));assert.equal(g.run('carGear(pl)'),'R');assert.equal(g.run('pl.pen'),0);
 key(g,'KeyR',false);key(g,'KeyT');assert.equal(g.run('pl.pen'),3);
});
test('Gamepad API standard legge RT/LT, analogico sinistro, B retromarcia, Start e X',()=>{
 const g=game();race(g);pad(g);placePlayer(g,2000,0,0);
 g.run('pad.buttons[7].value=.7;pad.axes[0]=-.65;');assert.equal(g.run('readPad(pad).thr'),.7);assert.ok(g.run('readPad(pad).st')<-.5);
 g.run('pad.buttons[7].value=0;pad.buttons[6].value=.4;');assert.equal(g.run('readPad(pad).brk'),.4);
 g.run('pad.buttons[6].value=0;pad.buttons[1]={pressed:true,value:0};');assert.equal(g.run('readPad(pad).rev'),1);assert.equal(g.run('readPad(pad).brk'),0);
 g.run('pad.axes[0]=0;');g.advance(.7);assert.equal(g.run('carGear(pl)'),'R');
 g.run('pad.buttons[1].pressed=false;pad.buttons[9].value=1;pollPad();');assert.equal(g.run('state'),'paused');g.run('pollPad();');assert.equal(g.run('state'),'paused');
 g.run('pad.buttons[9].value=0;pollPad();pad.buttons[9].value=1;pollPad();');assert.equal(g.run('state'),'racing');
 placePlayer(g,g.run("PIT.entryStart")-100,0,200);g.run('pad.buttons[2].value=1;pollPad();');assert.ok(g.run('pitAutopilot(pl)'));
});
for(const [id,standard,cross,circle] of [
 ['Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 05c4)',true,0,1],
 ['Sony DualShock 4 (Vendor: 054c Product: 09cc)',true,0,1],
 ['Wireless Controller (Vendor: 054c Product: 09cc)',false,1,2]
])test('PS4 X/Croce attiva i box, senza accelerare o inserire la retromarcia: '+id,()=>{
 const g=game();race(g);pad(g,standard);g.run('pad.id='+JSON.stringify(id)+';');placePlayer(g,2000,0,200);
 g.run('pad.buttons['+cross+']={value:1,pressed:true};pollPad();');
 assert.ok(!g.run('pitAutopilot(pl)'));assert.equal(g.run('readPad(pad).thr'),0);assert.equal(g.run('readPad(pad).rev'),0);
 placePlayer(g,g.run("PIT.entryStart")-100,0,200);g.run('pollPad();');assert.ok(!g.run('pitAutopilot(pl)'));
 g.run('pad.buttons['+cross+']={value:0,pressed:false};pollPad();pad.buttons['+circle+']={value:1,pressed:true};');
 assert.equal(g.run('readPad(pad).rev'),1);assert.equal(g.run('readPad(pad).x'),false);
 g.run('pad.buttons['+circle+']={value:0,pressed:false};pad.buttons['+cross+']={value:1,pressed:true};pollPad();');
 assert.ok(g.run('pitAutopilot(pl)'));const route=g.run('pl.pit.route');g.advance(.1);const progress=g.run('pl.pit.progress');
 g.run('pollPad();');assert.equal(g.run('pl.pit.route'),route);assert.equal(g.run('pl.pit.progress'),progress);
});
test('PS4 conserva il pulsante box personalizzato e lo separa dall acceleratore',()=>{
 const g=game({padMap:{pit:2},padPitCustom:true});pad(g);g.run('pad.id="Sony DualShock 4";pad.buttons[0].value=1;');
 assert.equal(g.run('readPad(pad).x'),false);g.run('pad.buttons[2].value=1;');assert.equal(g.run('readPad(pad).x'),true);
 g.run('S.padMap.pit=4;pad.buttons[2].value=0;pad.buttons[4].value=1;');assert.equal(g.run('readPad(pad).x'),true);
 g.run('S.padMap.pit=0;');assert.equal(g.run('readPad(pad).thr'),0);assert.equal(g.run('readPad(pad).x'),true);
});
test('Xbox Wireless Controller conserva X per i box e A per accelerare',()=>{
 const g=game();pad(g);g.run('pad.id="Xbox Wireless Controller (STANDARD GAMEPAD)";pad.buttons[0].value=1;');
 assert.equal(g.run('readPad(pad).thr'),1);assert.equal(g.run('readPad(pad).x'),false);
 g.run('pad.buttons[0].value=0;pad.buttons[2].value=1;');assert.equal(g.run('readPad(pad).x'),true);
});
test('retromarcia PS4 e tastiera funzionano anche con un piccolo residuo del freno',()=>{
 const g=game();race(g);pad(g);placePlayer(g,2000,0,0);
 g.run('pad.id="Sony DualShock 4";pad.buttons[6].value=.02;pad.buttons[1].value=1;');g.advance(.6);
 assert.equal(g.run('pl.inp.rev'),1);assert.equal(g.run('pl.inp.brk'),0);assert.equal(g.run('carGear(pl)'),'R');
 g.run('pad.buttons[1].value=0;keys.KeyR=true;');g.advance(.2);assert.equal(g.run('carGear(pl)'),'R');
 g.run('pad.buttons[6].value=.5;');assert.equal(g.run('getInput(.01).rev'),1);assert.equal(g.run('getInput(.01).brk'),0);
 g.run('keys.KeyR=false;');assert.equal(g.run('getInput(.01).rev'),.5);assert.equal(g.run('getInput(.01).brk'),0);
});
for(const controller of [false,true])test('la retro non si blocca con freno e acceleratore premuti: '+(controller?'PS4':'tastiera'),()=>{
 const g=game();race(g);placePlayer(g,2000,0,300);
 if(controller){pad(g);g.run('pad.id="Sony DualShock 4";pad.buttons[1].value=1;pad.buttons[6].value=.8;pad.buttons[7].value=1;');}
 else g.run('keys.KeyR=keys.KeyS=keys.KeyW=true;');
 g.run('keys.Space=true;');const start=g.run('({x:pl.x,y:pl.y,a:pl.a})');
 g.advance(.8);assert.equal(g.run('carGear(pl)'),'R');assert.equal(g.run('pl.inp.brk'),0);assert.equal(g.run('pl.inp.thr'),0);
 g.advance(3);assert.ok(g.run('pl.vx*Math.cos(pl.a)+pl.vy*Math.sin(pl.a)<-100'));
 const end=g.run('({x:pl.x,y:pl.y})');assert.ok((end.x-start.x)*Math.cos(start.a)+(end.y-start.y)*Math.sin(start.a)<-100);assert.equal(g.run('pl.inp.hb'),false);
 g.run('keys.Space=false;');
 if(controller)g.run('pad.buttons[1].value=pad.buttons[6].value=pad.buttons[7].value=0;keys.KeyS=true;');else g.run('keys.KeyR=keys.KeyW=false;');
 g.advance(.5);assert.equal(g.run('carGear(pl)'),'N');g.advance(.5);assert.equal(g.run('carGear(pl)'),'N');
});
for(const mapping of ['standard','raw-buttons','raw-axes'])test('R2 accelera, L2 frena e poi arretra realmente: '+mapping,()=>{
 const g=game();race(g);pad(g,mapping==='standard');placePlayer(g,2000,0,0);
 g.run('pad.id="Sony DualShock 4";S.padTriggers='+JSON.stringify(mapping==='raw-buttons'?'buttons':'auto')+';readPad(pad);');
 const axes=mapping==='raw-axes';
 g.run(axes?'pad.axes[5]=1;':'pad.buttons[7].value=1;');g.advance(.4);
 assert.ok(g.run('pl.vx*Math.cos(pl.a)+pl.vy*Math.sin(pl.a)>50'));
 g.run(axes?'pad.axes[5]=-1;pad.axes[2]=1;':'pad.buttons[7].value=0;pad.buttons[6].value=1;');
 assert.equal(g.run('getInput(.01).brk'),1);assert.equal(g.run('getInput(.01).rev'),0);
 g.advance(.8);assert.equal(g.run('carGear(pl)'),'R');const start=g.run('({x:pl.x,y:pl.y,a:pl.a})');g.advance(1.5);
 const end=g.run('({x:pl.x,y:pl.y})');assert.ok((end.x-start.x)*Math.cos(start.a)+(end.y-start.y)*Math.sin(start.a)<-100);
 g.run(axes?'pad.axes[2]=-1;pad.axes[5]=1;':'pad.buttons[6].value=0;pad.buttons[7].value=1;');g.advance(.9);
 assert.ok(g.run('pl.vx*Math.cos(pl.a)+pl.vy*Math.sin(pl.a)>20'));
});
for(const [s,d] of [[100,0],[200,0]])test('toccare la linea di uscita box dalla pista non inserisce il limitatore a '+s,()=>{
 const g=game();race(g);placePitLane(g,g.run("PIT.exitEnd")-s,d,700);
 g.run('pl.pit.auto=false;pl.pit.onLane=false;pl.inp={st:0,thr:0,brk:0,rev:0};stepCar(pl,.01);collide();');
 assert.equal(g.run('pitLimited(pl)'),false);assert.equal(g.run('pl.pit.onLane'),false);assert.ok(g.run('Math.hypot(pl.vx,pl.vy)*.32>200'));
});
test('il limitatore resta attivo sulla stessa uscita per chi proviene dai box',()=>{
 const g=game();race(g);placePitLane(g,g.run("PIT.exitEnd")-200,0,700);
 g.run('pl.pit.auto=false;pl.pit.onLane=true;pl.inp={st:0,thr:0,brk:0,rev:0};stepCar(pl,.01);collide();');
 assert.equal(g.run('pitLimited(pl)'),true);assert.ok(g.run('Math.hypot(pl.vx,pl.vy)*.32<=80+1e-6'));
});
test('joystick non standard: apprendimento degli assi e calibrazione esplicita',()=>{
 const g=game();pad(g,false);g.run('readPad(pad);pad.axes[5]=.5;pad.axes[2]=-.5;');
 assert.equal(g.run('readPad(pad).thr'),.75);assert.equal(g.run('readPad(pad).brk'),.25);
 g.run('S.padTriggers="positiveAxes";S.padMap.throttleAxis=3;S.padMap.brakeAxis=2;pad.axes[3]=.8;pad.axes[2]=.2;');
 assert.equal(g.run('readPad(pad).thr'),.8);assert.equal(g.run('readPad(pad).brk'),.2);
 g.run('S.padTriggers="negativeAxes";pad.axes[3]=-.8;');assert.equal(g.run('readPad(pad).thr'),.8);
 g.run('S.padTriggers="invertedAxes";pad.axes[3]=-.5;');assert.equal(g.run('readPad(pad).thr'),.75);
 g.run('S.inv=true;pad.axes[0]=.9;');assert.ok(g.run('readPad(pad).st')<0);
});
test('rileva il controller attivo, gestisce scollegamento e indisponibilità API',()=>{
 const g=game();pad(g);g.run('globalThis.second={...pad,index:1,id:"Second pad",axes:[.8,0]};navigator.getGamepads=()=>[pad,second];');assert.equal(g.run('getPad().index'),1);
 g.run('second.connected=false;');assert.equal(g.run('getPad().index'),0);
 g.run('navigator.getGamepads=()=>{const e=new Error("denied");e.name="SecurityError";throw e;};');assert.equal(g.run('getPad()'),null);assert.match(g.run('padError'),/SecurityError/);
 g.run('navigator.getGamepads=undefined;keys.KeyW=true;');assert.equal(g.run('getInput(.01).thr'),1);assert.equal(g.run('getPad()'),null);
});
test('selettore Tastiera disattiva i comandi del pad; resta il fallback tastiera',()=>{
 const g=game({ctrl:'kb'});race(g);pad(g);placePlayer(g,g.run("PIT.entryStart")-100,0,200);
 g.run('pad.buttons[2].value=1;pad.buttons[7].value=1;pollPad();');assert.ok(g.run('!pitAutopilot(pl)'));assert.equal(g.run('getInput(.1).thr'),0);
 key(g,'KeyW');assert.equal(g.run('getInput(.1).thr'),1);
});
test('X fuori zona non prenota: tenere X premuto fino all’ingresso non attiva il pilota',()=>{
 const g=game();race(g);placePlayer(g,2000,0,300);key(g,'KeyX');assert.ok(g.run('!pitAutopilot(pl)&&!pl.pit.requested'));
 placePlayer(g,g.run("PIT.entryStart")-100,0,300);key(g,'KeyX',true,true);key(g,'KeyX');assert.ok(g.run('!pitAutopilot(pl)'));
 key(g,'KeyX',false);g.run('updatePitPrompt();');assert.equal(g.elements.get('pitPrompt').textContent,'PREMI X PER ENTRARE AI BOX');
 key(g,'KeyX');assert.ok(g.run('pitAutopilot(pl)'));const route=g.run('pl.pit.route');g.advance(.2);const progress=g.run('pl.pit.progress');
 key(g,'KeyX',true,true);key(g,'KeyX');assert.equal(g.run('pl.pit.route'),route);assert.equal(g.run('pl.pit.progress'),progress);
});
for(const [s,d,v] of [[10,-55,1000],[590,70,1250],[350,0,0],[150,55,200]])test('percorso continuo e frenata assistita da '+[s,d,v].join('/'),()=>{
 const g=game({laps:5});race(g);placePlayer(g,g.run("PIT.entryZoneStart")+s*2,d,v);const start=g.run('[pl.x,pl.y,pl.vx,pl.vy]');
 assert.ok(g.run('requestPitEntry()'));assert.deepEqual(Array.from(g.run('[pl.x,pl.y,pl.vx,pl.vy]')),Array.from(start));
 const data=g.run(`(()=>{
  let maxSpeed=0,maxStep=0,maxDeceleration=0,badRoad=0,previousS=pl.trackS,backwards=0;
  const phases=new Set([pl.pit.phase]);
  for(let n=0;n<6000&&pitActive(pl);n++){
   const x=pl.x,y=pl.y,v=Math.hypot(pl.vx,pl.vy),wasLimited=pitLimited(pl);update(.01);phases.add(pl.pit.phase);
   if(pl.pit.phase==='waiting')confirmPitTyres();
   maxDeceleration=Math.max(maxDeceleration,(v-Math.hypot(pl.vx,pl.vy))/.01);
   if(pitAutopilot(pl)){
    if(pitLimited(pl))maxSpeed=Math.max(maxSpeed,Math.hypot(pl.vx,pl.vy)*.32);
    maxStep=Math.max(maxStep,Math.hypot(pl.x-x,pl.y-y));if(pl.trackS<previousS-1e-6)backwards++;previousS=pl.trackS;
    const q=pointAtDistance(pl.trackS);if(Math.abs((pl.x-q.x)*q.nx+(pl.y-q.y)*q.ny)>TW/2+22&&!pitRoadSurface(pl).road)badRoad++;
   }
   if(![pl.x,pl.y,pl.a,pl.vx,pl.vy].every(Number.isFinite))throw Error('Valori non finiti');
  }
  return{phase:pl.pit.phase,auto:pl.pit.auto,maxSpeed,maxStep,maxDeceleration,badRoad,backwards,phases:[...phases],s:pl.trackS};
 })()`);
 assert.equal(data.phase,'track',JSON.stringify(data));assert.equal(data.auto,false);assert.ok(data.maxSpeed<=80+1e-6,JSON.stringify(data));
 assert.ok(data.maxStep<=Math.max(v,250)*.01+.2,JSON.stringify(data));assert.ok(data.maxDeceleration<2200,JSON.stringify(data));
 assert.equal(data.backwards,0);assert.equal(data.badRoad,0,JSON.stringify(data));checkSeats(g);
 key(g,'KeyW');g.advance(.01);assert.equal(g.run('pl.inp.thr'),1);
});
test('manuale e controller non interferiscono con la guida assistita; pausa e ripresa conservano il percorso',()=>{
 const a=game(),b=game();for(const g of [a,b]){race(g);placePlayer(g,g.run("PIT.entryStart")-100,0,600);g.run('requestPitEntry();');}
 a.run('keys.KeyW=keys.KeyS=keys.KeyR=keys.KeyA=keys.Space=true;');pad(a);a.run('pad.buttons[1].value=pad.buttons[6].value=pad.buttons[7].value=1;pad.axes[0]=1;');
 for(const g of [a,b])g.advance(3);
 assert.ok(Math.abs(a.run('pl.x')-b.run('pl.x'))<1e-6);assert.ok(Math.abs(a.run('pl.y')-b.run('pl.y'))<1e-6);
 const progress=a.run('pl.pit.progress');key(a,'Escape');a.advance(5);assert.equal(a.run('pl.pit.progress'),progress);key(a,'Escape',false);key(a,'Escape');a.advance(.1);assert.ok(a.run('pl.pit.progress')>progress);
});
test('riprende da dentro la pit lane senza tornare all’ingresso né teletrasportarsi',()=>{
 const g=game();race(g);placePitLane(g,g.run("PIT.laneStart")+500,0,180);g.advance(.01);assert.ok(g.run('pl.pit.onLane&&!pitAutopilot(pl)'));
 const start=g.run('[pl.x,pl.y]');assert.ok(g.run('requestPitEntry()'));assert.deepEqual(Array.from(g.run('[pl.x,pl.y]')),Array.from(start));
 assert.equal(g.run('pl.pit.phase'),'lane');assert.ok(g.run('pl.pit.route.points[0].trackS>PIT.laneStart+400'));
 g.run('for(let i=0;i<1800&&pitActive(pl);i++){update(1/30);if(pl.pit.phase==="waiting")confirmPitTyres();}');assert.ok(g.run('onTrack(pl)&&!pl.pit.auto'));
});
test('due ingressi affiancati si ordinano senza sovrapporsi o bloccarsi a vicenda',()=>{
 const g=game();race(g);placePlayer(g,g.run("PIT.entryStart")-80,-45,900);
 g.run(`{const c=cars.find(c=>!c.isP),p=botPointAt(PIT.entryStart-80);c.x=p.x+p.nx*45;c.y=p.y+p.ny*45;c.a=p.ang;c.idx=p.i;c.trackS=p.trackS;c.d=c.lane=45;c.vx=Math.cos(p.ang)*900;c.vy=Math.sin(p.ang)*900;c.go=true;globalThis.peer=c;pl.ai=true;tryPitEntry(pl);tryPitEntry(peer);}`);
 const data=g.run(`(()=>{let minGap=Infinity;for(let i=0;i<6000&&(pitActive(pl)||pitActive(peer));i++){update(.01);if(pl.pit.phase==='waiting')confirmPitTyres();minGap=Math.min(minGap,Math.hypot(pl.x-peer.x,pl.y-peer.y));}return{minGap,a:pl.pit.phase,b:peer.pit.phase};})()`);
 assert.equal(data.a,'track',JSON.stringify(data));assert.equal(data.b,'track',JSON.stringify(data));assert.ok(data.minGap>=76,JSON.stringify(data));
});
test('fine qualifica durante il transito manuale: il rallentamento continua nei box senza salti',()=>{
 const g=game();g.run('startQuali();');placePitLane(g,g.run("PIT.laneStart")+500,0,150);g.run('pl.pit.onLane=true;');
 const before=g.run('[pl.x,pl.y]');g.run('expireQualiSession();');
 assert.deepEqual(Array.from(g.run('[pl.x,pl.y]')),Array.from(before));assert.ok(g.run('pl.qd&&pitAutopilot(pl)&&pl.pit.phase==="lane"'));
});
test('23 monoposto e 12 team: tutte percorrono anche l’ingresso, con traffico e senza usura in qualifica',()=>{
 const g=game({qualiMinutes:[10,10,10]});g.run('startQuali();pl.ai=true;');
 const data=g.run(`(()=>{
  const entered=new Set(),finished=new Set();let lastAdmission=-2,maxPitSpeed=0,minGap=Infinity;
  for(let n=0;n<12000&&finished.size<23;n++){
   update(.05);
   for(const c of cars){
    if(!entered.has(c.id)&&onTrack(c)&&raceTime>=lastAdmission+2&&pitEntryInfo(c)){
     if(tryPitEntry(c)){entered.add(c.id);lastAdmission=raceTime;}
    }
    if(entered.has(c.id)&&onTrack(c))finished.add(c.id);
    if(pitLimited(c))maxPitSpeed=Math.max(maxPitSpeed,Math.hypot(c.vx,c.vy)*.32);
   }
   const inLane=cars.filter(c=>pitAutopilot(c)&&c.pit.fromTrack);
   for(let i=0;i<inLane.length;i++)for(let j=i+1;j<inLane.length;j++)minGap=Math.min(minGap,Math.hypot(inLane[i].x-inLane[j].x,inLane[i].y-inLane[j].y));
  }
  return{entered:entered.size,finished:finished.size,maxPitSpeed,minGap,locked:cars.every(c=>c.tyres.condition===1),time:raceTime,pending:cars.filter(c=>entered.has(c.id)&&!finished.has(c.id)).map(c=>({id:c.id,s:c.trackS,d:c.d,v:Math.hypot(c.vx,c.vy),phase:c.pit.phase,yielding:c.pit.yielding}))};
 })()`);
 console.log('Ingressi di tutte le monoposto:',JSON.stringify(data));assert.equal(data.entered,23,JSON.stringify(data));assert.equal(data.finished,23,JSON.stringify(data));
 assert.ok(data.maxPitSpeed<=80+1e-6,JSON.stringify(data));assert.ok(data.minGap>=47.5,JSON.stringify(data));assert.ok(data.locked);checkSeats(g);
});
