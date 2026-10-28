'use strict';
/* Campionato locale: usa soltanto le classifiche definitive delle gare del gioco. */
// Calendario F1 2026 originale da 24 GP, indipendente dall'ordine del selettore piste.
// Fonte: formula1.com/en/latest/article/formula-1-reveals-calendar-for-2026-season.YctbMZWqBvrgyddrnauo8
const CAREER_CIRCUIT_IDS=Object.freeze([
 'albert-park','shanghai','suzuka','bahrain','jeddah','miami','montreal','monaco',
 'barcelona','red-bull-ring','silverstone','spa','hungaroring','zandvoort','monza','madring',
 'baku','singapore','cota','mexico','interlagos','las-vegas','lusail','yas-marina'
]);
const CAREER_LEGACY_CIRCUIT_IDS=Object.freeze(['barcelona','suzuka','spa','monaco','silverstone','red-bull-ring','cota','bahrain','singapore','monza']);
const CAREER_POINTS=Object.freeze([25,18,15,12,10,8,6,4,2,1]);
let careerRun=null,careerSaveError='',careerRecovered=false;

function careerRoster(settings=S,kind='team',replaceDriver=null){
 const entries=settings.roster.map((d,i)=>({id:'driver:'+i,name:d[1],code:d[0],number:d[2],team:d[3],color:TEAMS[d[3]][0]}));
 const team=kind==='driver'?settings.roster[replaceDriver][3]:TEAMS.length-1;
 const player={id:'player',name:settings.my.driver||'Tommy',code:settings.my.code||'TOM',number:+settings.my.num||99,team,color:kind==='driver'?TEAMS[team][0]:settings.my.c1};
 if(kind==='driver')entries.splice(replaceDriver,1,player);else entries.splice(PSLOT,0,player);
 return entries;
}
function careerTeams(settings=S,kind='team'){return TEAMS.slice(0,careerTeamCount(kind)).map((t,i)=>({id:i,name:i===TEAMS.length-1?settings.my.name||'Tommy Racing':settings.teamNames[i]||t[2],color:i===TEAMS.length-1?settings.my.c1:t[0]}));}
function compareCareerStats(a,b){
 if(a.points!==b.points)return b.points-a.points;
 for(const key of ['finishes','qualifying'])for(let i=0;i<NCARS;i++)if(a[key][i]!==b[key][i])return b[key][i]-a[key][i];
 return 0;
}
function careerStandings(data){
 const stats=()=>({points:0,wins:0,podiums:0,completed:0,finishes:Array(NCARS).fill(0),qualifying:Array(NCARS).fill(0)});
 const drivers=data.roster.map((d,seed)=>({...d,...stats(),seed})),teams=data.teams.map((t,seed)=>({...t,...stats(),seed}));
 const byId=new Map(drivers.map(d=>[d.id,d]));
 for(const result of data.results)for(const row of result.rows){
  const driver=byId.get(row.id),team=teams[row.team];
  for(const entry of [driver,team]){
   entry.points+=row.points;
   if(row.classified){entry.finishes[row.position-1]++;if(row.position===1)entry.wins++;if(row.position<=3)entry.podiums++;}
   if(row.finished&&!row.disqualified)entry.completed++;
   if(row.qualifyingPosition!==null)entry.qualifying[row.qualifyingPosition-1]++;
  }
 }
 const rank=list=>list.sort((a,b)=>compareCareerStats(a,b)||a.seed-b.seed).map((entry,i)=>({...entry,position:i+1}));
 return{drivers:rank(drivers),teams:rank(teams)};
}
function updateCareerTotals(data){
 const standings=careerStandings(data);
 data.currentRound=data.results.length;data.status=data.currentRound===CAREER_CIRCUIT_IDS.length?'complete':'active';
 data.driverStandings=standings.drivers;data.constructorStandings=standings.teams;
 return data;
}
function normalizeCareerResult(raw,seasonId,round,calendar,kind='team',replaceDriver=null){
 const ids=careerDriverIds(kind,replaceDriver),count=ids.length;
 if(!isRecord(raw)||raw.round!==round||raw.circuitId!==calendar[round]||raw.id!==seasonId+':'+round||
  !Number.isInteger(raw.laps)||raw.laps<1||raw.laps>65||!Array.isArray(raw.rows)||raw.rows.length!==count)return null;
 const winnerLaps=Math.max(0,...raw.rows.filter(row=>isRecord(row)&&row.disqualified!==true).map(row=>Number.isInteger(row.laps)?row.laps:0));
 const seen=new Set(),qualifying=new Set(),threshold=Math.max(1,Math.floor(winnerLaps*.9)),rows=[];
 for(const [i,row] of raw.rows.entries()){
  if(!isRecord(row)||!ids.includes(row.id)||seen.has(row.id)||row.position!==i+1||
   !Number.isInteger(row.team)||row.team<0||row.team>=careerTeamCount(kind)||!Number.isInteger(row.laps)||row.laps<0||row.laps>raw.laps)return null;
  seen.add(row.id);
  const time=row.time===null?null:typeof row.time==='number'&&Number.isFinite(row.time)&&row.time>0&&row.time<=86400?row.time:NaN;
  if(Number.isNaN(time)||time!==null&&row.laps!==raw.laps)return null;
  const q=row.qualifyingPosition;
  if(q!==null&&(!Number.isInteger(q)||q<1||q>count||qualifying.has(q)))return null;
  if(q!==null)qualifying.add(q);
  const disqualified=row.disqualified===true,finished=time!==null,classified=!disqualified&&(finished||row.laps>=threshold);
  rows.push({id:row.id,name:boundedText(row.name,64,'Pilota'),team:row.team,teamName:boundedText(row.teamName,28,'Scuderia'),
   position:i+1,laps:row.laps,time,disqualified,finished,classified,qualifyingPosition:q,
   status:disqualified?'DSQ':finished?'FINISHED':classified?'CLASSIFIED':'DNF',points:classified?(CAREER_POINTS[i]||0):0});
 }
 if(!rows.some(row=>row.finished))return null;
 const winner=rows.find(row=>row.classified);
 return{id:raw.id,round,circuitId:raw.circuitId,laps:raw.laps,completedAt:boundedText(raw.completedAt,40),winnerId:winner?.id||null,rows};
}
function normalizeCareer(raw,slot='team'){
 const kind=own(raw,'kind')===undefined?'team':raw.kind,replaceDriver=own(raw,'replaceDriver');
 if(kind!==slot||!Object.hasOwn(CAREER_SLOTS,kind)||kind==='driver'&&(!Number.isInteger(replaceDriver)||replaceDriver<0||replaceDriver>=DR.length))return null;
 const ids=careerDriverIds(kind,replaceDriver),teamCount=careerTeamCount(kind);
 if(!isRecord(raw)||raw.version!==1||typeof raw.id!=='string'||!/^season-[a-z0-9-]{1,80}$/.test(raw.id)||
  !Number.isInteger(raw.number)||raw.number<1||raw.number>9999||!Array.isArray(raw.calendar)||
  !Array.isArray(raw.roster)||raw.roster.length!==ids.length||!Array.isArray(raw.teams)||raw.teams.length!==teamCount||
  !Array.isArray(raw.results)||raw.results.length>raw.calendar.length)return null;
 const legacy=raw.calendar.length===CAREER_LEGACY_CIRCUIT_IDS.length&&raw.calendar.every((id,i)=>id===CAREER_LEGACY_CIRCUIT_IDS[i]);
 if(!legacy&&(raw.calendar.length!==CAREER_CIRCUIT_IDS.length||new Set(raw.calendar).size!==CAREER_CIRCUIT_IDS.length||
  raw.calendar.some(id=>!CAREER_CIRCUIT_IDS.includes(id))))return null;
 const seen=new Set(),roster=[];
 for(const d of raw.roster){
  if(!isRecord(d)||!ids.includes(d.id)||seen.has(d.id)||!Number.isInteger(d.team)||d.team<0||d.team>=teamCount)return null;
  seen.add(d.id);roster.push({id:d.id,name:boundedText(d.name,64,'Pilota'),code:boundedText(d.code,3,'F1').replace(/[^A-Z0-9]/g,''),
   number:boundedNumber(d.number,1,99,99,true),team:d.team,color:safeColor(d.color,TEAMS[d.team][0])});
 }
 const teams=[];
 for(const [i,t] of raw.teams.entries()){
  if(!isRecord(t)||t.id!==i)return null;
  teams.push({id:i,name:boundedText(t.name,28,TEAMS[i][2]),color:safeColor(t.color,TEAMS[i][0])});
 }
 const results=[];
 for(const [round,result] of raw.results.entries()){
  const valid=normalizeCareerResult(result,raw.id,round,raw.calendar,kind,replaceDriver);if(!valid)return null;results.push(valid);
 }
 const pendingRound=raw.pendingRound===results.length&&results.length<raw.calendar.length?results.length:null;
 // Conserva risultati e GP interrotto; le tappe restanti seguono il calendario F1.
 const played=raw.calendar.slice(0,results.length+(pendingRound!==null?1:0));
 const calendar=[...played,...CAREER_CIRCUIT_IDS.filter(id=>!played.includes(id))];
 const settings=cleanCareerSettings(raw.settings);
 if(!isRecord(raw.settings)){
  const player=roster.find(d=>d.id==='player');
  settings.my=cleanPlayer({name:teams[player.team].name,driver:player.name,code:player.code,num:player.number,c1:player.color,c2:settings.my.c2},settings.my);
 }
 return updateCareerTotals({version:1,id:raw.id,number:raw.number,kind,replaceDriver:kind==='driver'?replaceDriver:null,settings,calendar,roster,teams,results,pendingRound});
}
function loadCareer(slot=careerSlot){
 const keys=CAREER_SLOTS[slot];if(!keys)return null;
 if(careerPendingSaves.has(slot))return careerPendingSaves.get(slot);
 for(const [i,key] of [keys.key,keys.backup].entries()){
  const raw=readStoredJSON(key,null,262144);let valid=null;
  try{valid=normalizeCareer(raw,slot);}catch{}
  if(valid){careerRecovered=i===1;return valid;}
 }
 return null;
}
let career=loadCareer();
function saveCareer(){
 if(!career)return false;
 updateCareerTotals(career);
 try{
  const saved=JSON.stringify(career),keys=CAREER_SLOTS[career.kind];localStorage.setItem(keys.key,saved);
  try{localStorage.setItem(keys.backup,saved);}catch{}
  careerPendingSaves.delete(career.kind);careerSaveError='';return true;
 }catch{careerPendingSaves.set(career.kind,career);careerSaveError='Salvataggio non disponibile. I progressi restano in memoria finché il gioco è aperto.';return false;}
}
function createCareerSeason(previous=null,options=null){
 const kind=options?.kind||previous?.kind||careerSlot,replaceDriver=kind==='driver'?(options?.replaceDriver??previous?.replaceDriver):null;
 const settings=cleanCareerSettings(options?.settings||previous?.settings);
 return updateCareerTotals({version:1,id:'season-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),
  number:previous?Math.min(9999,previous.number+1):1,kind,replaceDriver,settings,calendar:CAREER_CIRCUIT_IDS.slice(),
  roster:careerRoster(settings,kind,replaceDriver),teams:careerTeams(settings,kind),results:[],pendingRound:null});
}
function ensureCareer(){if(!career){career=createCareerSeason();saveCareer();}return career;}
function openCareer(){
 if(state!=='menu'||careerRun)toMenu();
 ensureCareer();if(career.status==='complete')setCareerTab('standings');renderCareer();show('career');
}
function beginCareerGP(){
 if(state!=='menu'||careerRun)return false;
 const persisted=loadCareer();if(persisted&&(!career||persisted.id!==career.id||persisted.currentRound>career.currentRound))career=persisted;
 const season=ensureCareer();if(season.status==='complete')return false;
 const circuitId=season.calendar[season.currentRound];if(!CIRCUIT_DATA.some(c=>c.id===circuitId))return false;
 careerRun={seasonId:season.id,round:season.currentRound,circuitId,previousCircuit:activeCircuit.id,previousSettings:S,kind:season.kind,replaceDriver:season.replaceDriver,completed:false,raceStarted:false,raceLaps:null,qualifying:[]};
 S=season.settings;settingsSaveHook=()=>{career.settings=S;saveCareer();};applyVol();
 season.roster=careerRoster(S,season.kind,season.replaceDriver);season.teams=careerTeams(S,season.kind);season.pendingRound=season.currentRound;saveCareer();
 // La scelta del circuito nelle gare singole rimane in S.circuitId e non viene sovrascritta.
 loadCircuit(circuitId);rebuildPitGeometry();lastGrid=null;quali=null;if(S.qualiEnabled)startQuali();else showRaceSetup();
 if(careerSaveError)toast(careerSaveError);
 return true;
}
function exitCareerGP(){
 if(!careerRun)return;
 const previous=careerRun.previousCircuit;S=careerRun.previousSettings;settingsSaveHook=null;careerRun=null;applyVol();trgMap={};padPrev={};
 loadCircuit(previous);rebuildPitGeometry();lastGrid=null;quali=null;updateCircuitLabels();
}
function prepareCareerRace(){
 if(!careerRun||careerRun.completed)return;
 careerRun.raceStarted=false;careerRun.raceLaps=S.laps;pl.retired=false;
 careerRun.qualifying=quali?.finished?quali.finalGrid.map(row=>row.id):[];
}
function markCareerRaceStarted(){if(careerRun&&!careerRun.completed&&activeCircuit.id===careerRun.circuitId)careerRun.raceStarted=true;}
function completeCareerGP(finalOrder){
 if(!careerRun||!career||careerRun.completed||!careerRun.raceStarted||state!=='done'||mode!=='race'||
  career.id!==careerRun.seasonId||career.currentRound!==careerRun.round||career.pendingRound!==careerRun.round||
  activeCircuit.id!==careerRun.circuitId||(!pl?.fin&&!pl?.retired)||finalOrder.length!==career.roster.length||!finalOrder.some(c=>c.fin>0&&c.lap>=careerRun.raceLaps))return false;
 // Un'altra scheda può aver già concluso questo GP: non riscrivere né sommare il risultato.
 const persisted=loadCareer();
 if(persisted&&(persisted.id!==career.id||persisted.currentRound>careerRun.round)){
  career=persisted;careerRun.completed=true;return false;
 }
 const raw={id:career.id+':'+careerRun.round,round:careerRun.round,circuitId:activeCircuit.id,laps:careerRun.raceLaps,
  completedAt:new Date().toISOString(),rows:finalOrder.map((c,i)=>({id:c.id,name:c.name,team:c.team,teamName:c.tname,
   position:i+1,laps:clamp(c.lap,0,careerRun.raceLaps),time:c.fin||null,disqualified:!!c.disqualified,
   qualifyingPosition:careerRun.qualifying.includes(c.id)?careerRun.qualifying.indexOf(c.id)+1:null}))};
 const result=normalizeCareerResult(raw,career.id,careerRun.round,career.calendar,career.kind,career.replaceDriver);if(!result)return false;
 career.results.push(result);career.pendingRound=null;careerRun.completed=true;saveCareer();return true;
}
function careerResultActions(){
 $('careerContinueBtn').classList.toggle('hidden',!careerRun);
 $('raceRestartBtn').classList.toggle('hidden',!!careerRun?.completed);
 if(careerRun)$('careerContinueBtn').textContent=career.status==='complete'?'CAMPIONI DEL MONDO':'CONTINUA CARRIERA';
}
function careerPauseActions(){
 $('careerRetireBtn').classList.toggle('hidden',!(careerRun?.raceStarted&&!careerRun.completed&&mode==='race'&&!pl.fin&&!pl.retired));
}
function retireCareerGP(){
 if(!careerRun?.raceStarted||careerRun.completed||mode!=='race'||!['racing','paused'].includes(state)||pl.fin||pl.retired)return false;
 pl.retired=true;pl.ai=false;pl.inp={st:0,thr:0,brk:0,rev:0,hb:false};parkInGarage(pl);
 state='racing';hideAll();banner('RITIRO · SIMULAZIONE GARA',2500);return true;
}
function simulateCareerRetirement(){
 if(!careerRun||!pl.retired||state!=='racing')return;
 const deadline=performance.now()+6;
 for(let i=0;i<120&&state==='racing';i++){update(.05,true);if(performance.now()>=deadline)break;}
}
function newCareerSeason(){
 if(!career||career.status!=='complete'||careerRun)return false;
 career=createCareerSeason(career);careerRecovered=false;saveCareer();renderCareer();return true;
}
