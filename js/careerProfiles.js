'use strict';
/* Due slot indipendenti. Le opzioni della gara singola non vengono sovrascritte. */
const CAREER_SLOTS={team:{key:'f1sim.career.v1',backup:'f1sim.career.backup.v1',label:'Crea la tua squadra'},driver:{key:'f1sim.career.driver.v1',backup:'f1sim.career.driver.backup.v1',label:'Sostituisci un pilota'}};
let careerSlot='team',careerSetupKind='team';
const careerPendingSaves=new Map();
function cleanCareerSettings(raw,fallback=S){
 const val=key=>own(raw,key),out={dv:2};
 for(const [key,min,max,integer] of [['diff',0,4,true],['laps',1,65,true],['sens',.5,1.5,false],['vol',0,1,false]])out[key]=boundedNumber(val(key),min,max,fallback[key],integer);
 for(const [key,values] of [['ctrl',['auto','kb','pad']],['qual',['high','low']],['startCompound',['SOFT','MEDIUM','HARD']],['padTriggers',['auto','buttons','axes','invertedAxes','positiveAxes','negativeAxes']]])out[key]=values.includes(val(key))?val(key):fallback[key];
 for(const key of ['inv','padPitCustom'])out[key]=typeof val(key)==='boolean'?val(key):fallback[key];
 out.qualiEnabled=typeof val('qualiEnabled')==='boolean'?val('qualiEnabled'):true;
 out.qualiMinutes=[18,15,12].map((v,i)=>boundedNumber(Array.isArray(val('qualiMinutes'))?val('qualiMinutes')[i]:undefined,1,60,fallback.qualiMinutes[i]||v,true));
 out.qmin=out.qualiEnabled?2:0;out.circuitId=fallback.circuitId;
 out.padMap=Object.fromEntries(Object.entries(PAD_DEFAULT).map(([key,v])=>[key,boundedNumber(own(val('padMap'),key),0,key.endsWith('Axis')?15:31,fallback.padMap[key]??v,true)]));
 out.my=cleanPlayer(val('my'),fallback.my);
 out.myStats=cleanStats(val('myStats'),fallback.myStats);
 out.teamNames=TEAMS.map((t,i)=>boundedText(Array.isArray(val('teamNames'))?val('teamNames')[i]:undefined,28,fallback.teamNames[i]||t[2]));
 out.teamStats=TSTAT.map((t,i)=>cleanStats(Array.isArray(val('teamStats'))?val('teamStats')[i]:undefined,fallback.teamStats[i]||t));
 const roster=Array.isArray(val('roster'))&&val('roster').length===DR.length?val('roster'):fallback.roster;
 out.roster=roster.map((d,i)=>Array.isArray(d)?[boundedText(d[0],3,DR[i][0]).toUpperCase().replace(/[^A-Z0-9]/g,'')||DR[i][0],boundedText(d[1],64,DR[i][1])||DR[i][1],boundedNumber(d[2],1,99,DR[i][2],true),boundedNumber(d[3],0,TEAMS.length-2,DR[i][3],true)]:DR[i].slice());
 const seats=Array(TEAMS.length-1).fill(0),extra=[];
 for(const d of out.roster){if(seats[d[3]]<2)seats[d[3]]++;else extra.push(d);}
 for(const d of extra){const team=seats.findIndex(n=>n<2);d[3]=team;seats[team]++;}
 return out;
}
const careerDriverIds=(kind='team',replaceDriver=null)=>[...DR.flatMap((_,i)=>kind==='driver'&&i===replaceDriver?[]:['driver:'+i]),'player'];
const careerTeamCount=kind=>TEAMS.length-(kind==='driver'?1:0);
function setCareerSetting(key,value){
 if(!career||careerRun||state!=='menu')return false;
 const keys=['diff','laps','sens','vol','ctrl','qual','inv','qualiEnabled','startCompound'];if(!keys.includes(key))return false;
 career.settings=cleanCareerSettings({...career.settings,[key]:value},career.settings);saveCareer();return true;
}
function setCareerQualiMinutes(phase,value){
 if(!career||careerRun||state!=='menu'||!Number.isInteger(phase)||phase<0||phase>2)return false;
 career.settings.qualiMinutes[phase]=boundedNumber(value,1,60,career.settings.qualiMinutes[phase],true);saveCareer();return true;
}
function selectCareerSlot(kind){
 if(!Object.hasOwn(CAREER_SLOTS,kind))return false;
 if(state!=='menu'||careerRun)toMenu();
 careerSlot=kind;careerSaveError='';careerRecovered=false;career=loadCareer(kind);careerTab='standings';
 if(career){saveCareer();openCareer();}else{careerSetupKind=kind;renderCareerSetup();show('careerSetup');}
 return true;
}
function openCareerHub(){
 if(state!=='menu'||careerRun)toMenu();
 renderCareerHub();show('careerHub');
}
function createCareerProfile(kind,input){
 if(state!=='menu'||careerRun||!Object.hasOwn(CAREER_SLOTS,kind)||!isRecord(input))return false;
 // Un secondo avvio della creazione non può cancellare uno slot già occupato.
 if(loadCareer(kind)){selectCareerSlot(kind);return false;}
 const settings=cleanCareerSettings(null),my=cleanPlayer(input,settings.my);
 if(!my.driver.trim()||!my.code||!my.num||(kind==='team'&&!my.name.trim()))return false;
 const replaceDriver=kind==='driver'?boundedNumber(input.replaceDriver,0,DR.length-1,-1,true):null;
 if(kind==='driver'&&replaceDriver<0)return false;
 settings.my=my;settings.myStats=cleanStats(input.myStats,settings.myStats);
 if(kind==='driver'){const team=settings.roster[replaceDriver][3];settings.my.name=settings.teamNames[team];settings.my.c1=TEAMS[team][0];settings.my.c2=TEAMS[team][1];}
 careerSlot=kind;career=createCareerSeason(null,{kind,replaceDriver,settings});careerRecovered=false;saveCareer();openCareer();return true;
}
