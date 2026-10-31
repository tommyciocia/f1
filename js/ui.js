'use strict';
/* Utilità interfaccia: messaggi toast e visibilità dei pannelli */
function toast(t){const e=$('toast');e.textContent=t;e.style.opacity=1;clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.opacity=0,2500);}
function show(id){
 document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('hidden',p.id!==id));
 $('menuBackdrop').classList.toggle('hidden',state!=='menu'&&state!=='prerace');
 if(id==='menu')renderHomeSession();
 if(id){const panel=$(id);panel.scrollTop=0;const first=panel.querySelector?.('button,input,select,[tabindex]');first?.focus({preventScroll:true});}
 renderAudioState();
}
function hideAll(){show('');}
function renderHomeSession(){
 $('homeTrackName').textContent=activeCircuit.name;
 $('homeTrackMap').innerHTML=circuitMap(activeCircuit);
 $('homeTrackLocation').textContent=activeCircuit.country+' · '+circuitKm(activeCircuit)+' km · '+activeCircuit.turns+' curve';
 $('homeSessionFacts').innerHTML='<div><b>'+S.laps+'</b><span>GIRI DI GARA</span></div><div><b>'+NCARS+'</b><span>VETTURE</span></div><div><b>'+['ROOKIE','CLUB','PRO','EXPERT','ELITE'][S.diff]+'</b><span>DIFFICOLTÀ</span></div>';
 $('homeSessionFormat').textContent=S.qualiEnabled?'WEEKEND COMPLETO · Q1 / Q2 / Q3 + GARA':'GARA SINGOLA · PARTENZA DALLA GRIGLIA';
}
