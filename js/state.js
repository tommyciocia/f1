'use strict';
/* Stato globale della sessione (modalità, auto, tempi, camera) */
let mode='race',qEnd=false,qEndT=0,lastGrid=null,state='menu',cars=[],pl=null,raceTime=0,cd=0,hold=1,lit=0,finT=0,camX=0,camY=0,camZ=.6,particles=[],tickT=0,sessionBestSecs=[1e9,1e9,1e9];
let camMul=1; // zoom camera (tasto C)
let quali=null; // fasi, partecipanti, risultati indipendenti e griglia finale
