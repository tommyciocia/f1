'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {game,checkSeats}=require('./helpers/game.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));
function startRound(g,compound='MEDIUM'){
 g.click('careerresume');g.click('careergp');assert.equal(g.run('state'),'quali');
 for(let phase=0;phase<3;phase++){g.click('endq');if(phase<2)g.click('nextq');}
 g.click('grid');assert.equal(g.run('state'),'prerace');g.run(`chooseRaceCompound('${compound}');`);g.click('startrace');g.run('updateCountdown(6);');
 assert.equal(g.run('state'),'racing');
}
function finishRound(g,ids=Array.from(g.run('cars.map(c=>c.id)'))){
 // Classifica controllata per isolare punteggi e salvataggio. La suite browser
 // percorre invece tutte e 24 le gare con la fisica e l'IA reali.
 g.run(`{const ids=${JSON.stringify(ids)};for(const c of cars){c.lap=S.laps;c.fin=100+ids.indexOf(c.id);c.pitStops=1;c.best=.1;}
  raceTime=150;endRace();}`);
}
function reload(g){
 return game(plain(g.run('S')),Object.fromEntries([...g.storage].filter(([key])=>key!=='f1sim.set')));
}
function legacySave(g,completed,pending=false){
 const raw=JSON.parse(g.storage.get('f1sim.career.v1')),template=raw.results[0];
 raw.calendar=['barcelona','suzuka','spa','monaco','silverstone','red-bull-ring','cota','bahrain','singapore','monza'];
 raw.results=raw.calendar.slice(0,completed).map((circuitId,round)=>({...plain(template),id:raw.id+':'+round,round,circuitId}));
 raw.pendingRound=pending?completed:null;
 for(const key of ['f1sim.career.v1','f1sim.career.backup.v1'])g.storage.set(key,JSON.stringify(raw));
 return raw;
}
const identity=(name='Scuderia Nuova')=>({name,driver:'Luca',code:'LUC',num:28,c1:'#123456',c2:'#abcdef',replaceDriver:3,myStats:[1.1,.9,1.02,1.03]});
const createProfile=(g,kind,input=identity())=>g.run(`createCareerProfile(${JSON.stringify(kind)},${JSON.stringify(input)})`);
const selectProfile=(g,kind)=>g.run(`selectCareerSlot(${JSON.stringify(kind)})`);

test('la Home carriera propone due percorsi senza creare o cancellare salvataggi',()=>{
 const g=game();g.click('career');assert.equal(g.run('career'),null);
 assert.match(g.elements.get('careerSlots').innerHTML,/Crea la tua squadra/);assert.match(g.elements.get('careerSlots').innerHTML,/Sostituisci un pilota/);
 assert.equal(g.storage.has('f1sim.career.v1'),false);assert.equal(g.storage.has('f1sim.career.driver.v1'),false);
});

test('creare una squadra salva identità e prestazioni senza modificare le gare singole',()=>{
 const g=game({laps:7,diff:1,circuitId:'monza'}),before=g.run('JSON.stringify(S)'),single=g.storage.get('f1sim.set');
 assert.equal(createProfile(g,'team'),true);assert.equal(g.run('career.kind'),'team');
 assert.equal(g.run('career.roster.find(d=>d.id==="player").name'),'Luca');assert.equal(g.run('career.teams.at(-1).name'),'Scuderia Nuova');
 assert.deepEqual(plain(g.run('career.settings.myStats')),[1.1,.9,1.02,1.03]);
 assert.equal(g.run('JSON.stringify(S)'),before);assert.equal(g.storage.get('f1sim.set'),single);
 const saved=g.storage.get('f1sim.career.v1');assert.equal(createProfile(g,'team',identity('Da non sovrascrivere')),false);
 assert.equal(g.storage.get('f1sim.career.v1'),saved);
});

test('impostazioni indipendenti fra i due slot e la gara singola, applicate solo durante il weekend',()=>{
 const g=game({laps:7,diff:1,qualiEnabled:false,vol:.6,circuitId:'monza',startCompound:'SOFT'});createProfile(g,'team');
 g.run('setCareerSetting("laps",5);setCareerSetting("diff",4);setCareerSetting("sens",1.4);setCareerSetting("vol",.1);setCareerSetting("qual","low");setCareerSetting("ctrl","kb");setCareerSetting("inv",true);setCareerQualiMinutes(0,3);');
 createProfile(g,'driver');g.run('setCareerSetting("laps",2);setCareerSetting("diff",0);setCareerSetting("qualiEnabled",false);');
 const single=g.run('JSON.stringify(S)'),stored=g.storage.get('f1sim.set');
 selectProfile(g,'team');assert.ok(g.run('career.settings.laps===5&&career.settings.diff===4&&career.settings.qualiMinutes[0]===3'));
 g.click('careergp');assert.ok(g.run('S.laps===5&&S.diff===4&&S.vol===.1&&S.qual==="low"&&S.ctrl==="kb"&&S.inv&&S.sens===1.4'));
 assert.equal(g.run('setCareerSetting("laps",12)'),false);g.click('endq');g.click('nextq');g.click('endq');g.click('nextq');g.click('endq');g.click('grid');g.run('chooseRaceCompound("HARD");');
 assert.equal(g.storage.get('f1sim.set'),stored);g.click('menu');assert.equal(g.run('JSON.stringify(S)'),single);
 selectProfile(g,'driver');g.click('careergp');assert.equal(g.run('state'),'prerace');assert.ok(g.run('S.laps===2&&S.diff===0&&S.startCompound==="SOFT"'));
 g.click('menu');selectProfile(g,'team');assert.equal(g.run('career.settings.startCompound'),'HARD');
 assert.equal(g.run('JSON.stringify(S)'),single);assert.equal(g.storage.get('f1sim.set'),stored);
});

test('sostituzione reale in ognuno dei 22 sedili: un giocatore, compagno, livrea, statistiche e box corretti',()=>{
 const g=game();
 for(let seat=0;seat<22;seat++){
  g.run(`careerSlot='driver';career=createCareerSeason(null,{kind:'driver',replaceDriver:${seat}});saveCareer();beginCareerGP();`);
  assert.ok(g.run(`cars.length===22&&cars.filter(c=>c.isP).length===1&&!cars.some(c=>c.id==='driver:${seat}')&&pl.team===S.roster[${seat}][3]`));
  assert.ok(g.run('new Set(cars.map(c=>c.team)).size===11&&new Set(cars.map(c=>c.pit.stallId)).size===22&&cars.filter(c=>c.team===pl.team).length===2'));
  assert.ok(g.run('pl.col===TEAMS[pl.team][0]&&pl.acc===TEAMS[pl.team][1]&&pl.tname===teamName(pl.team)&&pl.top===1000*S.teamStats[pl.team][0]'));
  assert.equal(g.run('career.roster.length'),22);assert.equal(g.run('career.teams.length'),11);g.click('menu');assert.equal(g.run('cars.length'),23);
 }
});

test('due carriere avanzano separatamente e sopravvivono a riapertura e weekend interrotti',()=>{
 const g=game();createProfile(g,'team');startRound(g);finishRound(g);g.click('careerresume');
 const teamResults=g.run('JSON.stringify(career.results)'),teamId=g.run('career.id');createProfile(g,'driver');startRound(g);finishRound(g);startRound(g);finishRound(g);g.click('careerresume');g.click('careergp');g.click('menu');
 const driverResults=g.run('JSON.stringify(career.results)'),driverId=g.run('career.id');
 const restored=game({},Object.fromEntries(g.storage));selectProfile(restored,'team');
 assert.equal(restored.run('career.id'),teamId);assert.equal(restored.run('JSON.stringify(career.results)'),teamResults);assert.equal(restored.run('career.currentRound'),1);
 selectProfile(restored,'driver');assert.equal(restored.run('career.id'),driverId);assert.equal(restored.run('JSON.stringify(career.results)'),driverResults);
 assert.ok(restored.run('career.currentRound===2&&career.pendingRound===2&&career.driverStandings.reduce((n,d)=>n+d.points,0)===202'));
 restored.click('careergp');assert.equal(restored.run('activeCircuit.id'),'suzuka');assert.equal(restored.run('cars.length'),22);
});

test('il vecchio salvataggio migra nello slot squadra mantenendo risultati e identità',()=>{
 const g=game();startRound(g);finishRound(g);const raw=plain(g.run('career'));delete raw.kind;delete raw.settings;delete raw.replaceDriver;
 g.storage.set('f1sim.career.v1',JSON.stringify(raw));const restored=game({},Object.fromEntries(g.storage));selectProfile(restored,'team');
 assert.equal(restored.run('career.currentRound'),1);assert.deepEqual(plain(restored.run('career.results')),raw.results);
 assert.equal(restored.run('career.settings.my.driver'),raw.roster.find(d=>d.id==='player').name);
 assert.equal(JSON.parse(restored.storage.get('f1sim.career.v1')).kind,'team');assert.equal(restored.storage.has('f1sim.career.driver.v1'),false);
 restored.run('S.laps=42;S.my.driver="Gara singola";save();');selectProfile(restored,'team');assert.equal(restored.run('career.settings.laps'),raw.results[0].laps);
});

test('backup e validazione di uno slot non modificano l’altro salvataggio',()=>{
 const g=game();createProfile(g,'team');startRound(g);finishRound(g);g.click('careerresume');const team=g.storage.get('f1sim.career.v1');
 createProfile(g,'driver');startRound(g);finishRound(g);const driver=g.storage.get('f1sim.career.driver.v1');g.click('menu');
 g.storage.set('f1sim.career.driver.v1','{broken');selectProfile(g,'driver');assert.equal(g.run('career.currentRound'),1);
 assert.equal(g.storage.get('f1sim.career.v1'),team);
 g.storage.set('f1sim.career.v1',driver);selectProfile(g,'team');assert.equal(g.run('career.kind'),'team');assert.equal(g.run('career.currentRound'),1);
 assert.equal(g.storage.get('f1sim.career.driver.v1'),driver);
});

test('carriera pilota: Q1/Q2/Q3 22→16→10, campioni al 24° GP e nuova stagione nello stesso sedile',()=>{
 const g=game();createProfile(g,'driver');g.run('setCareerSetting("laps",2);setCareerSetting("diff",4);');
 g.click('careergp');for(const count of [22,16,10]){assert.equal(g.run('qualiParticipants().length'),count);g.click('endq');if(count!==10)g.click('nextq');}
 assert.equal(g.run('quali.finalGrid.length'),22);g.click('menu');
 for(let round=0;round<24;round++){startRound(g);finishRound(g);assert.equal(g.run('career.currentRound'),round+1);if(round<23)assert.equal(g.run('career.status'),'active');}
 assert.equal(g.run('career.status'),'complete');assert.equal(g.run('career.teams.length'),11);assert.equal(g.run('career.driverStandings.reduce((n,d)=>n+d.points,0)'),2424);
 const team=g.storage.get('f1sim.career.v1');g.click('careernew');assert.ok(g.run('career.kind==="driver"&&career.replaceDriver===3&&career.number===2&&career.settings.laps===2&&career.settings.diff===4&&career.currentRound===0'));
 assert.equal(g.storage.get('f1sim.career.v1'),team);g.click('careergp');assert.equal(g.run('pl.team'),1);assert.equal(g.run('cars.length'),22);
});

test('le nuove impostazioni salvate vengono validate senza proprietà arbitrarie o piloti reinseriti',()=>{
 const g=game();createProfile(g,'driver');const raw=plain(g.run('career'));
 raw.settings={...raw.settings,laps:9999,diff:'Infinity',qual:'invalid',my:{driver:'<script>bad</script>',c1:'red'},padMap:{...raw.settings.padMap,pit:99999},unexpected:'ignored'};
 Object.defineProperty(raw.settings,'__proto__',{value:{careerPolluted:true},enumerable:true});
 g.storage.set('f1sim.career.driver.v1',JSON.stringify(raw));selectProfile(g,'driver');
 assert.ok(g.run('career.settings.laps===65&&career.settings.diff===S.diff&&career.settings.qual===S.qual&&career.settings.padMap.pit===31'));
 assert.equal(g.run('career.settings.unexpected'),undefined);assert.equal(g.run('({}).careerPolluted'),undefined);
 g.run('career.roster.find(d=>d.id==="player").name=career.settings.my.driver;renderCareer();');assert.doesNotMatch(g.elements.get('careerDriverStandings').innerHTML,/<script>/);
 startRound(g);finishRound(g);const bad=plain(g.run('career'));bad.results[0].rows.find(r=>r.id==='driver:2').id='driver:3';
 assert.equal(g.run(`normalizeCareer(${JSON.stringify(bad)},'driver')`),null);
});

test('storage pieno: cambiare carriera conserva entrambi i progressi in memoria e permette di risalvarli',()=>{
 const g=game();g.run('const originalCareerStorageWrite=localStorage.setItem;localStorage.setItem=()=>{throw Error("quota");};');
 createProfile(g,'team');startRound(g);finishRound(g);g.click('careerresume');createProfile(g,'driver');startRound(g);finishRound(g);g.click('careerresume');
 selectProfile(g,'team');assert.equal(g.run('career.currentRound'),1);assert.match(g.elements.get('careerSaveStatus').textContent,/memoria/);
 selectProfile(g,'driver');assert.equal(g.run('career.currentRound'),1);assert.equal(g.run('careerPendingSaves.size'),2);
 g.run('localStorage.setItem=originalCareerStorageWrite;');selectProfile(g,'team');selectProfile(g,'driver');
 assert.equal(g.run('careerPendingSaves.size'),0);assert.equal(JSON.parse(g.storage.get('f1sim.career.v1')).currentRound,1);assert.equal(JSON.parse(g.storage.get('f1sim.career.driver.v1')).currentRound,1);
});

test('calendario ufficiale F1 2026 da 24 GP, 23 piloti e 12 team; nessun punto prima della gara',()=>{
 const g=game({circuitId:'monza',qualiEnabled:false});g.click('careerresume');
 assert.deepEqual(plain(g.run('career.calendar')),['albert-park','shanghai','suzuka','bahrain','jeddah','miami','montreal','monaco','barcelona','red-bull-ring','silverstone','spa','hungaroring','zandvoort','monza','madring','baku','singapore','cota','mexico','interlagos','las-vegas','lusail','yas-marina']);
 assert.deepEqual([...plain(g.run('career.calendar'))].sort(),plain(g.run('CIRCUIT_DATA.map(c=>c.id)')).sort());
 assert.equal(g.run('CIRCUIT_DATA.length'),24);assert.equal(g.run('new Set(career.calendar).size'),24);
 assert.equal(g.elements.get('careerProgressText').textContent,'0/24 gare completate');
 assert.equal(g.run('career.roster.length'),23);assert.equal(g.run('career.teams.length'),12);
 assert.ok(g.run('career.currentRound===0&&career.results.length===0&&career.status==="active"&&career.driverStandings.every(d=>d.points===0)'));
 assert.equal(g.run('activeCircuit.id'),'monza');assert.equal(g.run('S.circuitId'),'monza');
 g.click('careergp');assert.equal(g.run('activeCircuit.id'),'albert-park');assert.equal(g.run('S.circuitId'),'monza');
 assert.ok(g.run('career.pendingRound===0&&career.results.length===0&&quali.stage===0&&cars.length===23&&cars.every(c=>c.tyres.compound==="SOFT")'));
 g.click('menu');assert.equal(g.run('activeCircuit.id'),'monza');assert.equal(g.run('career.currentRound'),0);assert.equal(g.run('careerRun'),null);
});

test('un weekend di carriera riusa Q1/Q2/Q3, griglia, gomme, box e guida esistenti',()=>{
 const g=game({qualiEnabled:false,laps:3});g.click('careerresume');g.click('careergp');checkSeats(g);
 for(const [phase,count] of [23,17,10].entries()){
  assert.equal(g.run('quali.stage'),phase);assert.equal(g.run('qualiParticipants().length'),count);
  assert.ok(g.run('cars.every(c=>c.tyres.compound==="SOFT"&&c.tyres.condition===1&&!c.tyres.degradation)'));
  g.click('endq');if(phase<2)g.click('nextq');
 }
 const grid=plain(g.run('quali.finalGrid.map(r=>r.id)'));g.click('grid');g.run('chooseRaceCompound("HARD");');g.click('startrace');
 assert.equal(g.run('state'),'countdown');assert.deepEqual(plain(g.run('cars.map(c=>c.id)')),grid);checkSeats(g);
 assert.ok(g.run('pl.tyres.compound==="HARD"&&pl.tyres.condition===1&&cars.every(c=>c.tyres.degradation&&c.pitRequired)&&!careerRun.raceStarted'));
 g.run('updateCountdown(6);');assert.ok(g.run('careerRun.raceStarted&&!pl.ai&&cars.every(c=>c.go)'));
 assert.equal(g.run('career.currentRound'),0);
});

test('punti dalla classifica definitiva: tabella 25–1, nessun bonus veloce e somma dei due piloti',()=>{
 const g=game({laps:3});startRound(g);const ids=Array.from(g.run('cars.map(c=>c.id)'));finishRound(g,ids);
 const result=plain(g.run('career.results[0]'));
 assert.deepEqual(result.rows.map(r=>r.points),[25,18,15,12,10,8,6,4,2,1,...Array(13).fill(0)]);
 assert.deepEqual(result.rows.map(r=>r.id),ids);assert.ok(result.rows.every(r=>r.classified&&r.finished));
 assert.equal(g.run('career.currentRound'),1);assert.equal(g.run('career.status'),'active');
 assert.ok(g.run('career.driverStandings.reduce((n,d)=>n+d.points,0)===101&&career.constructorStandings.reduce((n,t)=>n+t.points,0)===101'));
 assert.ok(g.run('career.driverStandings[0].wins===1&&career.driverStandings[0].podiums===1&&career.driverStandings.every(d=>d.completed===1)'));
 for(const team of plain(g.run('career.constructorStandings'))){assert.equal(team.points,result.rows.filter(r=>r.team===team.id).reduce((n,r)=>n+r.points,0));}
 assert.ok(g.elements.get('raceRestartBtn').classList.contains('hidden'));assert.ok(!g.elements.get('careerContinueBtn').classList.contains('hidden'));
});

test('risultati registrati una sola volta, anche dopo una riapertura o un secondo endRace',()=>{
 const g=game();startRound(g);finishRound(g);const first=g.run('JSON.stringify(career.results)');g.run('endRace();');
 assert.equal(g.run('JSON.stringify(career.results)'),first);assert.equal(g.run('completeCareerGP(order())'),false);
 const restored=reload(g);assert.equal(restored.run('JSON.stringify(career.results)'),first);assert.equal(restored.run('career.currentRound'),1);
 restored.click('careerresume');restored.click('careergp');assert.equal(restored.run('activeCircuit.id'),'shanghai');assert.equal(restored.run('career.currentRound'),1);
});

test('una gara interrotta riparte dalle qualifiche del GP corrente e conserva i risultati precedenti',()=>{
 const g=game({circuitId:'monza'});startRound(g);finishRound(g);g.click('careerresume');g.click('careergp');g.advance(.1);g.click('menu');
 assert.equal(g.run('activeCircuit.id'),'monza');const restored=reload(g);restored.click('careerresume');
 assert.ok(restored.run('career.currentRound===1&&career.pendingRound===1&&career.results.length===1'));
 assert.match(restored.elements.get('careerNextGP').innerHTML,/RIPRENDI GRAN PREMIO/);
 restored.click('careergp');assert.equal(restored.run('activeCircuit.id'),'shanghai');assert.equal(restored.run('quali.stage'),0);
 assert.equal(restored.run('career.driverStandings.reduce((n,d)=>n+d.points,0)'),101);
});

test('una gara singola non assegna punti alla carriera, neppure con un GP della stagione in sospeso',()=>{
 const g=game({qualiEnabled:false});g.click('careerresume');g.click('careergp');g.click('menu');g.click('play');g.click('startrace');g.run('updateCountdown(6);');finishRound(g);
 assert.equal(g.run('career.results.length'),0);assert.equal(g.run('career.pendingRound'),0);assert.equal(g.run('careerRun'),null);
 assert.ok(g.elements.get('careerContinueBtn').classList.contains('hidden'));assert.ok(!g.elements.get('raceRestartBtn').classList.contains('hidden'));
});

test('countdown, risultati incompleti e circuito errato non fanno avanzare il calendario',()=>{
 const g=game();g.click('careerresume');g.click('careergp');g.run('startRace();');finishRound(g);
 assert.equal(g.run('career.currentRound'),0);
 g.run('startRace();updateCountdown(6);cars.forEach(c=>{c.lap=0;c.fin=100;c.pitStops=1;});raceTime=150;endRace();');
 assert.equal(g.run('career.currentRound'),0);
 g.run('startRace();updateCountdown(6);loadCircuit("monza");');finishRound(g);assert.equal(g.run('career.currentRound'),0);
});

test('NC e DSQ non prendono punti; un ritirato classificato al 90% può riceverli',()=>{
 const g=game({laps:10});startRound(g);
 g.run(`cars.forEach((c,i)=>{c.pitStops=1;c.lap=i<8?10:i===8?9:8;c.fin=i<8?100+i:0;});raceTime=150;endRace();`);
 const result=plain(g.run('career.results[0]'));
 const classified=result.rows.find(r=>!r.finished&&r.laps===9),nc=result.rows.find(r=>r.laps===8);
 assert.equal(classified.position,9);assert.equal(classified.points,2);assert.equal(classified.status,'CLASSIFIED');assert.ok(classified.classified);
 assert.equal(nc.points,0);assert.equal(nc.status,'DNF');assert.equal(nc.classified,false);
 const other=game({laps:3});startRound(other);
 other.run('cars.forEach((c,i)=>{c.lap=3;c.fin=100+i;c.pitStops=c.isP?0:1;});raceTime=150;endRace();');
 assert.ok(other.run('career.results[0].rows.find(r=>r.id==="player").status==="DSQ"&&career.results[0].rows.find(r=>r.id==="player").points===0'));
 assert.ok(other.run('career.results[0].rows[0].id!=="player"&&career.results[0].rows[0].points===25'));
});

test('spareggi piloti e costruttori: vittorie, secondi, terzi e poi risultati delle qualifiche',()=>{
 const g=game();
 const values=g.run(`(()=>{const make=()=>({points:50,finishes:Array(23).fill(0),qualifying:Array(23).fill(0)}),a=make(),b=make(),out=[];
  a.finishes[0]=1;out.push(compareCareerStats(a,b)<0);b.finishes[0]=1;b.finishes[1]=2;out.push(compareCareerStats(b,a)<0);
  a.finishes[1]=2;a.finishes[2]=1;out.push(compareCareerStats(a,b)<0);b.finishes[2]=1;b.qualifying[0]=1;out.push(compareCareerStats(b,a)<0);
  a.qualifying[0]=1;out.push(compareCareerStats(a,b)===0);a.points=51;out.push(compareCareerStats(a,b)<0);return out;})()`);
 assert.ok(Array.from(values).every(Boolean));
});

test('parità nelle gare risolta dai risultati reali delle qualifiche per piloti e costruttori',()=>{
 const g=game();
 const orders=[['driver:0','driver:2','driver:3','driver:1'],['driver:2','driver:0','driver:1','driver:3']];
 for(const lead of orders){startRound(g);const ids=Array.from(g.run('cars.map(c=>c.id)'));finishRound(g,[...lead,...ids.filter(id=>!lead.includes(id))]);}
 const drivers=plain(g.run('career.driverStandings')),teams=plain(g.run('career.constructorStandings'));
 const russell=drivers.find(d=>d.id==='driver:0'),leclerc=drivers.find(d=>d.id==='driver:2');
 assert.equal(russell.points,43);assert.equal(leclerc.points,43);assert.deepEqual(russell.finishes,leclerc.finishes);assert.ok(russell.position<leclerc.position);
 assert.equal(teams[0].id,0);assert.equal(teams[1].id,1);assert.equal(teams[0].points,70);assert.equal(teams[1].points,70);
 assert.deepEqual(teams[0].finishes,teams[1].finishes);assert.ok(teams[0].qualifying[1]>teams[1].qualifying[1]);
});

test('il 90% usa i giri del vincitore classificato anche se altri arrivati sono squalificati',()=>{
 const g=game({laps:10});startRound(g);
 g.run(`cars.forEach((c,i)=>{c.lap=i===1?9:i===2?8:10;c.fin=i===1||i===2?0:100+i;c.pitStops=i===1||i===2?1:0;});raceTime=150;endRace();`);
 assert.ok(g.run('career.results[0].rows[0].laps===9&&career.results[0].rows[0].points===25'));
 assert.ok(g.run('career.results[0].rows[1].laps===8&&career.results[0].rows[1].classified&&career.results[0].rows[1].points===18'));
});

test('parità assoluta anche in qualifica: la cerimonia non inventa un campione casuale',()=>{
 const g=game();g.click('careerresume');
 const html=g.run(`(()=>{const list=careerStandings(career).drivers;return careerChampionCard([list[0],list[2]]);})()`);
 assert.match(html,/PARITÀ ASSOLUTA/);assert.match(html,/George Russell/);assert.match(html,/Charles Leclerc/);assert.match(html,/Mercedes-AMG F1/);assert.match(html,/Scuderia Ferrari/);assert.doesNotMatch(html,/CAMPIONE PILOTI/);
});

test('ricaricamento: punti e classifiche derivano dai risultati, non dai totali modificati nel salvataggio',()=>{
 const g=game();startRound(g);finishRound(g);
 const raw=JSON.parse(g.storage.get('f1sim.career.v1'));raw.currentRound=24;raw.status='complete';raw.driverStandings.forEach(d=>d.points=9999);raw.results[0].rows.forEach(r=>r.points=9999);
 g.storage.set('f1sim.career.v1',JSON.stringify(raw));const restored=reload(g);
 assert.ok(restored.run('career.currentRound===1&&career.status==="active"&&career.driverStandings.reduce((n,d)=>n+d.points,0)===101'));
});

test('salvataggio primario danneggiato o calendario duplicato: recupero della copia di sicurezza',()=>{
 const g=game();startRound(g);finishRound(g);const original=g.storage.get('f1sim.career.v1');
 for(const broken of ['{broken',JSON.stringify({...JSON.parse(original),calendar:Array(24).fill('monza')})]){
  g.storage.set('f1sim.career.v1',broken);const restored=reload(g);
  assert.ok(restored.run('careerRecovered&&career.currentRound===1&&career.results.length===1'));
 }
});

test('un calendario salvato in ordine diverso riparte dall’ordine ufficiale prima del primo GP',()=>{
 const g=game();g.click('careerresume');const raw=plain(g.run('career')),expected=raw.calendar.slice();
 raw.calendar.reverse();g.storage.set('f1sim.career.v1',JSON.stringify(raw));
 const restored=reload(g);assert.deepEqual(plain(restored.run('career.calendar')),expected);
 assert.equal(restored.run('career.currentRound'),0);assert.equal(restored.run('career.pendingRound'),null);
 restored.click('careerresume');restored.click('careergp');assert.equal(restored.run('activeCircuit.id'),'albert-park');
 assert.deepEqual(plain(reload(restored).run('career.calendar')),expected);
});

test('il riordino conserva GP conclusi e GP in corso e ordina solo le tappe ancora da iniziare',()=>{
 const g=game();startRound(g);finishRound(g);const raw=plain(g.run('career')),official=raw.calendar.slice();
 raw.calendar.reverse();raw.results[0].circuitId=raw.calendar[0];raw.pendingRound=1;
 g.storage.set('f1sim.career.v1',JSON.stringify(raw));const restored=reload(g),played=raw.calendar.slice(0,2);
 assert.deepEqual(plain(restored.run('career.calendar')),[...played,...official.filter(id=>!played.includes(id))]);
 assert.deepEqual(plain(restored.run('career.results')),raw.results);
 assert.equal(restored.run('career.currentRound'),1);assert.equal(restored.run('career.pendingRound'),1);
 assert.equal(restored.run('career.driverStandings.reduce((n,d)=>n+d.points,0)'),101);
 restored.click('careerresume');restored.click('careergp');assert.equal(restored.run('activeCircuit.id'),played[1]);
 restored.click('menu');restored.click('careerresume');restored.run('career=createCareerSeason(career);');
 assert.deepEqual(plain(restored.run('career.calendar')),official);
});

test('salvataggi da dieci GP: conserva risultati e GP interrotto, aggiungendo tutte le piste mancanti',()=>{
 const g=game();startRound(g);finishRound(g);const old=legacySave(g,3,true),restored=reload(g);
 assert.equal(restored.run('career.currentRound'),3);assert.equal(restored.run('career.pendingRound'),3);
 assert.equal(restored.run('career.calendar.length'),24);assert.equal(restored.run('new Set(career.calendar).size'),24);
 assert.deepEqual(plain(restored.run('career.results')),old.results);
 assert.deepEqual(plain(restored.run('career.calendar.slice(0,4)')),old.calendar.slice(0,4));
 assert.deepEqual(plain(restored.run('career.calendar.slice(4)')),plain(restored.run('CAREER_CIRCUIT_IDS.filter(id=>!career.calendar.slice(0,4).includes(id))')));
 assert.equal(restored.run('career.driverStandings.reduce((n,d)=>n+d.points,0)'),303);
 restored.click('careerresume');assert.equal(restored.elements.get('careerProgressText').textContent,'3/24 gare completate');
 restored.click('careergp');assert.equal(restored.run('activeCircuit.id'),'monaco');
 const again=reload(restored);assert.deepEqual(plain(again.run('career.results')),old.results);
 assert.deepEqual(plain(again.run('career.calendar')),plain(restored.run('career.calendar')));
});

test('una vecchia stagione da dieci GP conclusa continua fino a 24 senza azzerare i punti',()=>{
 const g=game();startRound(g);finishRound(g);const old=legacySave(g,10),restored=reload(g);
 restored.click('careerresume');assert.equal(restored.run('career.currentRound'),10);assert.equal(restored.run('career.status'),'active');
 assert.ok(restored.elements.get('careerChampions').classList.contains('hidden'));
 assert.deepEqual(plain(restored.run('career.results')),old.results);
 assert.equal(restored.run('career.driverStandings.reduce((n,d)=>n+d.points,0)'),1010);
 startRound(restored);assert.equal(restored.run('activeCircuit.id'),'albert-park');finishRound(restored);
 const again=reload(restored);assert.equal(again.run('career.currentRound'),11);assert.equal(again.run('career.status'),'active');
 assert.equal(again.run('career.calendar.length'),24);assert.equal(again.run('career.driverStandings.reduce((n,d)=>n+d.points,0)'),1111);
});

test('nomi ostili sono testo e proprietà estranee del salvataggio non vengono fuse',()=>{
 const g=game();g.click('careerresume');const raw=plain(g.run('career'));raw.roster[0].name='<img src=x onerror=alert(1)>';raw.teams[0].name='<script>bad</script>';
 raw.__proto__={careerPolluted:true};g.storage.set('f1sim.career.v1',JSON.stringify(raw));const restored=reload(g);restored.click('careerresume');
 assert.equal(restored.run('({}).careerPolluted'),undefined);
 assert.doesNotMatch(restored.elements.get('careerDriverStandings').innerHTML,/<img/);assert.match(restored.elements.get('careerDriverStandings').innerHTML,/&lt;img/);
 assert.doesNotMatch(restored.elements.get('careerConstructorStandings').innerHTML,/<script>/);
});

test('storage indisponibile: nessun blocco e messaggio esplicito sui progressi in memoria',()=>{
 const g=game();g.run('localStorage.setItem=()=>{throw Error("quota");};');startRound(g);finishRound(g);g.click('careerresume');
 assert.equal(g.run('career.currentRound'),1);assert.match(g.elements.get('careerSaveStatus').textContent,/non disponibile/);
 assert.ok(g.run('careerSaveError&&career.results.length===1'));
});

test('due schede sullo stesso GP non raddoppiano né sostituiscono i punti già assegnati',()=>{
 const first=game();startRound(first);const second=reload(first);startRound(second);finishRound(first);
 for(const key of ['f1sim.career.v1','f1sim.career.backup.v1'])second.storage.set(key,first.storage.get(key));
 const before=first.storage.get('f1sim.career.v1');finishRound(second,Array.from(second.run('cars.map(c=>c.id)')).reverse());
 assert.equal(second.run('career.currentRound'),1);assert.equal(second.run('JSON.stringify(career.results)'),first.run('JSON.stringify(career.results)'));
 assert.equal(second.storage.get('f1sim.career.v1'),before);
});

test('ritiro del giocatore: disponibile soltanto durante una gara di carriera e punti dal risultato finale',()=>{
 const g=game({laps:3});g.click('careerresume');g.click('careergp');assert.equal(g.run('retireCareerGP()'),false);
 g.run('startRace();updateCountdown(6);togglePause();');assert.ok(!g.elements.get('careerRetireBtn').classList.contains('hidden'));
 g.click('careerretire');assert.ok(g.run('pl.retired&&!pl.go&&pl.fin===0&&state==="racing"&&career.currentRound===0'));
 g.run('cars.filter(c=>!c.isP).forEach((c,i)=>{c.lap=3;c.fin=100+i;c.pitStops=1;});raceTime=150;checkRaceFinish();');
 assert.equal(g.run('career.currentRound'),1);assert.ok(g.run('career.results[0].rows.find(r=>r.id==="player").points===0'));
 assert.equal(g.run('retireCareerGP()'),false);
});

test('la stagione termina solo al 24° GP, mostra entrambi i campioni e riparte con gli stessi partecipanti',()=>{
 const g=game();let driverWinner;
 for(let round=0;round<24;round++){
  if(round===23)g.run('setCareerTab("calendar");');
  startRound(g);const ids=Array.from(g.run('cars.map(c=>c.id)'));if(round===0)driverWinner=ids[0];if(round===23)[ids[0],ids[1]]=[ids[1],ids[0]];
  finishRound(g,ids);assert.equal(g.run('career.currentRound'),round+1);
  if(round<23){assert.equal(g.run('career.status'),'active');g.click('careerresume');assert.ok(g.elements.get('careerChampions').classList.contains('hidden'));}
 }
 assert.equal(g.run('career.status'),'complete');assert.equal(g.run('state'),'menu');assert.equal(g.run('careerRun'),null);
 assert.ok(reload(g).run('career.currentRound===24&&career.status==="complete"&&career.results.length===24'));
 assert.equal(g.run('careerTab'),'standings');
 assert.equal(g.run('career.driverStandings[0].id'),driverWinner);assert.equal(g.run('career.driverStandings[0].points'),593);
 assert.equal(g.run('career.constructorStandings[0].id'),0);assert.equal(g.run('career.constructorStandings[0].points'),799);
 assert.ok(!g.elements.get('careerChampions').classList.contains('hidden'));assert.match(g.elements.get('careerChampions').innerHTML,/CAMPIONI DEL MONDO/);
 assert.equal(g.run('new Set(career.results.map(r=>r.circuitId)).size'),24);assert.equal(g.run('beginCareerGP()'),false);
 const roster=plain(g.run('career.roster')),teams=plain(g.run('career.teams')),calendar=plain(g.run('career.calendar'));
 g.click('careernew');assert.equal(g.run('career.number'),2);assert.equal(g.run('career.currentRound'),0);assert.equal(g.run('career.results.length'),0);
 assert.deepEqual(plain(g.run('career.roster')),roster);assert.deepEqual(plain(g.run('career.teams')),teams);assert.deepEqual(plain(g.run('career.calendar')),calendar);
 assert.ok(g.run('career.driverStandings.every(d=>d.points===0&&d.wins===0&&d.podiums===0)&&career.constructorStandings.every(t=>t.points===0)'));
});
