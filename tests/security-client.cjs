'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {game}=require('./helpers/game.cjs');
const records=g=>{g.run(fs.readFileSync(path.join(__dirname,'../js/menuRecords.js'),'utf8'));g.run('renderRecords()');return g.elements.get('recList').innerHTML;};
test('salvataggi ostili non inquinano prototipi o iniettano attributi tramite i colori',()=>{
 const raw='{"__proto__":{"admin":true},"constructor":{"prototype":{"admin":true}},"admin":true,"my":{"__proto__":{"admin":true},"c1":"red\" onpointerover=\"alert(1)","c2":"url(https://evil.invalid)","code":"<svg/onload=1>","num":{},"driver":"<img src=x onerror=alert(1)>"}}';
 const g=game({}, {'f1sim.set':raw});
 assert.equal(g.run('Object.getPrototypeOf(S)===Object.prototype'),true);
 assert.equal(g.run('Object.getPrototypeOf(S.my)===Object.prototype'),true);
 assert.equal(g.run('S.admin'),undefined);assert.equal(g.run('({}).admin'),undefined);
 assert.equal(g.run('S.my.c1'),'#ffd400');assert.equal(g.run('S.my.c2'),'#111111');
 g.run('startRace();hudUpdate(1);');
 assert.doesNotMatch(g.elements.get('tower').innerHTML,/<img|onpointerover=|url\(https:/);
 assert.ok(g.run('cars.every(c=>Number.isFinite(c.top)&&Number.isFinite(c.grip))'));
 g.run('pl.col=\'red" onpointerover="alert(1)\';hudUpdate(1);');assert.doesNotMatch(g.elements.get('tower').innerHTML,/onpointerover=/);
 g.run('startQuali();pl.col=\'red" onpointerover="alert(1)\';');assert.doesNotMatch(g.run('qualiTable()'),/onpointerover=/);
});
test('record con posizione HTML o struttura errata vengono scartati senza bloccare menu o fine gara',()=>{
 for(const raw of ['null','{}','"not an array"','{"length":5}','[null,{},false]',
  '[{"d":"today","pos":"<img src=x onerror=alert(1)>","tot":1,"best":1}]','{invalid']){
  const g=game({}, {'f1sim.rec':raw});assert.match(records(g),/Nessuna gara/);
  g.run('startRace();pl.fin=100;endRace();');assert.equal(g.run('readRecords().length'),1);
 }
});
test('date e nomi nei record vengono visualizzati come testo; schema e quantità sono limitati',()=>{
 const row={d:'<img src=x onerror=alert(1)>',circuitName:'<script>bad()</script>',pos:1,tot:100,best:50};
 const g=game({}, {'f1sim.rec':JSON.stringify(Array(20).fill(row))}),html=records(g);
 assert.equal(g.run('readRecords().length'),10);assert.doesNotMatch(html,/<img|<script/);assert.match(html,/&lt;img/);
 for(const raw of ['[{"pos":1,"tot":1e999,"best":1}]','[{"pos":24,"tot":1,"best":1}]','[{"pos":1,"tot":-1,"best":1}]']){
  g.storage.set('f1sim.rec',raw);assert.equal(g.run('readRecords().length'),0);
 }
});
test('limiti, enum e valori non finiti dei salvataggi vengono normalizzati',()=>{
 const g=game({diff:99,laps:1e300,sens:'Infinity',vol:null,ctrl:'evil',qual:{},inv:'true',qualiMinutes:[null,'Infinity',0],
  padMap:{steerAxis:1e300,brake:{},pit:-100},myStats:[1e300,'NaN',null,-100],teamStats:[['Infinity',0,{},[]]],
  roster:Array(22).fill([{},null,[],{}]),teamNames:Array(12).fill({}),startCompound:'<script>'});
 assert.equal(g.run('S.diff'),4);assert.equal(g.run('S.laps'),65);assert.equal(g.run('S.sens'),1);assert.equal(g.run('S.vol'),.6);
 assert.equal(g.run('S.ctrl'),'auto');assert.equal(g.run('S.qual'),'high');assert.equal(g.run('S.inv'),false);
 assert.equal(g.run('S.padMap.steerAxis'),15);assert.equal(g.run('S.padMap.brake'),6);assert.equal(g.run('S.padMap.pit'),0);
 assert.ok(g.run('S.myStats.every(Number.isFinite)&&S.teamStats.flat().every(Number.isFinite)'));
 assert.ok(g.run('TEAMS.slice(0,-1).every((_,i)=>S.roster.filter(d=>d[3]===i).length===2)'));
 g.run('startRace();state="racing";pl.ai=true;');g.advance(10);
 assert.ok(g.run('cars.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.y))'));
});
test('salvataggi troppo grandi e storage indisponibile usano fallback sicuri',()=>{
 for(const raw of ['null','[]','42','"text"','{"vol":0,"padding":"'+'x'.repeat(65536)+'"}']){
  const g=game({}, {'f1sim.set':raw});assert.equal(g.run('S.vol'),.6);assert.equal(g.run('cars.length'),23);
 }
 const g=game();g.run('localStorage.getItem=()=>{throw Error("unavailable")};localStorage.setItem=()=>{throw Error("quota")};');
 assert.equal(g.run('readRecords().length'),0);g.run('save();startRace();pl.fin=10;endRace()');
});
test('scelte legittime di auto, controller, paddock e circuito restano salvabili',()=>{
 const g=game({my:{name:'Squadra italiana',driver:'José',code:'abc',num:'42',c1:'#abcdef',c2:'#123456'},
  laps:8,vol:0,qualiEnabled:false,padMap:{pit:4},padPitCustom:true,circuitId:'monza'});
 assert.equal(g.run('S.my.driver'),'José');assert.equal(g.run('S.my.code'),'ABC');assert.equal(g.run('S.my.num'),42);
 assert.equal(g.run('activeCircuit.id'),'monza');assert.equal(g.run('S.qualiEnabled'),false);assert.equal(g.run('S.padMap.pit'),4);
 g.run('S.roster[0][3]=1;S.roster[2][3]=0;save()');
 const again=game({},Object.fromEntries(g.storage));assert.equal(again.run('S.roster[0][3]'),1);assert.equal(again.run('S.my.name'),'Squadra italiana');
});
