'use strict';
/* Dati di scuderie, piloti e statistiche (modificabili dal paddock) */
// [colore, accento, nome squadra, nome breve]. L'ultima è la livrea del giocatore (Tommy Racing)
const TEAMS=[['#00d2be','#111','Mercedes-AMG F1','Mercedes'],['#e10600','#ffd400','Scuderia Ferrari','Ferrari'],['#ff8700','#0a3cff','McLaren F1 Team','McLaren'],['#1b2a6b','#e10600','Red Bull Racing','Red Bull'],['#6692ff','#fff','Racing Bulls','Racing Bulls'],['#00665e','#c8f000','Aston Martin','Aston Martin'],['#0a5cff','#fff','Williams Racing','Williams'],['#ff87bc','#0090ff','Alpine F1 Team','Alpine'],['#d3d8de','#e10600','Haas F1 Team','Haas'],['#b6b9bd','#e10600','Audi F1 Team','Audi'],['#232323','#fff','Cadillac F1 Team','Cadillac'],['#ffd400','#111','Tommy Racing','Tommy']];
// moltiplicatori [velocità max, accelerazione, frenata, aderenza]
const TSTAT=[[1.02,1.02,1.01,1.02],[1.01,1.01,1.01,1.01],[1.01,1.01,1,1.02],[1.01,1,1.01,1.01],[.99,1,1,1],[.98,.99,1,.99],[.99,1,.99,1],[.98,.99,.99,.99],[.98,.98,1,.99],[.97,.98,.98,.98],[.96,.97,.98,.97],[1,1,1,1]];
// griglia 2026: [sigla, nome, numero, squadra]
const DR=[['RUS','George Russell',63,0],['ANT','Kimi Antonelli',12,0],['LEC','Charles Leclerc',16,1],['HAM','Lewis Hamilton',44,1],['NOR','Lando Norris',1,2],['PIA','Oscar Piastri',81,2],['VER','Max Verstappen',3,3],['HAD','Isack Hadjar',6,3],['LAW','Liam Lawson',30,4],['LIN','Arvid Lindblad',41,4],['ALO','Fernando Alonso',14,5],['STR','Lance Stroll',18,5],['ALB','Alexander Albon',23,6],['SAI','Carlos Sainz',55,6],['GAS','Pierre Gasly',10,7],['COL','Franco Colapinto',43,7],['OCO','Esteban Ocon',31,8],['BEA','Oliver Bearman',87,8],['HUL','Nico Hülkenberg',27,9],['BOR','Gabriel Bortoleto',5,9],['BOT','Valtteri Bottas',77,10],['PER','Sergio Pérez',11,10]];
const PLAYER='TOM',NCARS=23,PSLOT=12;
// La griglia resta modificabile senza toccare i dati base della simulazione.
S.teamNames=Array.isArray(S.teamNames)&&S.teamNames.length===TEAMS.length?S.teamNames:TEAMS.map(t=>t[2]);
S.roster=Array.isArray(S.roster)&&S.roster.length===DR.length?S.roster:DR.map(d=>d.slice());
S.roster=S.roster.map((d,i)=>Array.isArray(d)&&d.length>=4?[String(d[0]),String(d[1]),clamp(+d[2]||DR[i][2],1,99),clamp(+d[3]||0,0,TEAMS.length-2)]:DR[i].slice());
const cleanStats=(a,def)=>Array.isArray(a)&&a.length>=4?def.map((v,k)=>clamp(+a[k]||v,.8,1.2)):def.slice();
S.teamStats=TSTAT.map((d,i)=>cleanStats(Array.isArray(S.teamStats)?S.teamStats[i]:null,d));
S.myStats=cleanStats(S.myStats,[1,1,1,1]);
const teamName=i=>S.teamNames[i]||TEAMS[i][2];
