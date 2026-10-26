'use strict';
/* HUD: velocità, giri, tempi, settori, torre di classifica e test controller */
const mmss=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
const carGear=c=>c.vx*Math.cos(c.a)+c.vy*Math.sin(c.a)<-5?'R':Math.hypot(c.vx,c.vy)<5?'N':1+Math.min(7,Math.floor(Math.hypot(c.vx,c.vy)/c.top*7.99));
function qHud(dt){const v=Math.hypot(pl.vx,pl.vy);$('spd').textContent=Math.round(v*.32);
 $('gear').textContent=carGear(pl);$('thr').style.width=pl.inp.thr*60+'px';$('brk').style.width=pl.inp.brk*60+'px';
 const phase=qualiStage();$('lapTxt').textContent=phase.name+' · '+qualiParticipants().length+' VETTURE';
 $('timeTxt').textContent=qEnd?'0:00 · Ultimo giro':mmss(Math.ceil(qualiTimeLeft()-1e-7));
 $('bestTxt').textContent='Giro '+fmt(pl.qLapActive?raceTime-pl.lapStart:0)+'  |  Miglior '+fmt(pl.best);
 sectorHud(pl);tyreHud();pitRuleHud();
 tickT-=dt;if(tickT>0)return;tickT=.2;
 const rows=qualiOrder(),pos=validQualiTime(pl.best)&&pl.qActive?rows.indexOf(pl)+1:0;
 const caption=phase.advance?phase.name+' · Passano i primi '+phase.advance+' · '+(rows.length-phase.advance)+' eliminati':phase.name+' · Lotta per la pole position';
 $('tower').innerHTML='<p class="quali-caption">'+caption+'</p>'+qualiTable();
 $('gapTxt').textContent=!pl.qActive?'ELIMINATO IN '+QUALI_STAGES[pl.qEliminatedAt].name+' · SPETTATORE':pl.qd?'TENTATIVI CONCLUSI':pitHudMessage(pl)||(pl.tow>.15?'SCIA  ':'')+(pos?'P'+pos:'Fai un giro lanciato');}
const fmt=t=>{if(!t||t>1e8)return '--:--.---';const m=Math.floor(t/60);return m+':'+(t%60).toFixed(3).padStart(6,'0');};
function sectorHud(c){
 const out=[];
 for(let i=0;i<3;i++){
  const isActive=c.activeSec===i&&!c.secs[i],time=c.secs[i],delta=c.secDelta[i],status=c.secState[i];
  const val=isActive?`${(raceTime-c.secStart).toFixed(3)}`:(time==null?'--.---':time.toFixed(3));
  const change=delta==null?(status==='first'?'PRIMO TEMPO':''):`${delta<0?'−':'+'}${Math.abs(delta).toFixed(3)}`;
  out.push(`<div class="${status} ${isActive?'active':''}"><b>S${i+1}</b><span>${val}</span><em>${change}</em></div>`);
 }
 $('sectors').innerHTML=out.join('');
}
function hudUpdate(dt){
 const v=Math.hypot(pl.vx,pl.vy);$('spd').textContent=Math.round(v*.32);
 $('gear').textContent=carGear(pl);
 $('thr').style.width=pl.inp.thr*60+'px';$('brk').style.width=pl.inp.brk*60+'px';
 const lap=clamp(pl.lap+1,1,S.laps);$('lapTxt').textContent='GIRO '+lap+'/'+S.laps;
 $('timeTxt').textContent='Tempo '+fmt(pl.fin||raceTime+pl.pen);
 $('bestTxt').textContent='Giro '+fmt(pl.lap>=0?raceTime-pl.lapStart:0)+'  |  Miglior '+fmt(pl.best);
 sectorHud(pl);tyreHud();pitRuleHud();
 // La torre viene riallineata ad ogni frame ai dati della vettura: un cambio
 // gomme, o un riordino della classifica, non lascia mai una sigla sulla riga sbagliata.
 const o=order(),me=o.indexOf(pl),fastest=fastestLapDriver();
 $('tower').innerHTML=o.map((c,i)=>`<div class="${[c.isP?'me':'',c===fastest?'fastest-lap':''].filter(Boolean).join(' ')}" data-driver-id="${esc(c.id)}" style="border-left-color:${c.col}" title="${esc(c.name)}"><b>${i+1}</b><span class="driver-name">${esc(c.code)}</span>${tyreBadge(c)}${pitStopBadge(c)}</div>`).join('');
 tickT-=dt;if(tickT>0)return;tickT=.2;
 const sp=Math.max(v,150),a=o[me-1],b=o[me+1];
 $('gapTxt').textContent=pitHudMessage(pl)||(pl.tow>.15?'SCIA  ':'')+(a?`▲ ${a.code} -${((prog(a)-prog(pl))/sp).toFixed(1)}s`:'Leader')+(b?`   ▼ ${b.code} +${((prog(pl)-prog(b))/sp).toFixed(1)}s`:'');}
function testUpdate(){const p=getPad(),s=$('padStat'),i=getInput(1/60),r=p?readPad(p):null;
 s.textContent=p?'Controller collegato: '+p.id.slice(0,60)+' · '+(p.mapping==='standard'?'Mappatura browser standard':'Mappatura joystick personalizzabile')+(S.ctrl==='kb'?' · Disabilitato: controllo Tastiera selezionato':''):padError||'Nessun controller rilevato. Collegalo e premi un pulsante; la tastiera resta disponibile.';
 $('tSt').style.cssText=`left:${i.st<0?50+i.st*50:50}%;width:${Math.abs(i.st)*50}%`;$('tTh').style.width=i.thr*100+'%';$('tBr').style.width=i.brk*100+'%';
 const actions=[i.thr>.01?'ACCELERATORE':'',i.brk>.01?'FRENO':'',i.rev>.01?'RETROMARCIA':'',Math.abs(i.st)>.01?'STERZO':'',keys.KeyX||r?.x?'BOX (X)':'',keys.Escape||r?.start?'PAUSA':''].filter(Boolean);
 $('inputReadout').textContent=actions.length?'Input riconosciuti: '+actions.join(' · '):'Premi un comando per verificarlo qui.';
 const pressed=p?Array.from(p.buttons||[]).map((_,n)=>padButton(p,n)>.1?n:null).filter(n=>n!==null):[];
 $('padButtons').textContent=p?'Pulsanti controller premuti: '+(pressed.length?pressed.join(', '):'nessuno'):'Pulsanti controller: nessun dispositivo';
 $('padAxes').textContent=p?'Assi controller: '+Array.from(p.axes||[]).map((_,n)=>n+': '+padAxis(p,n).toFixed(2)).join(' · '):'';
}
