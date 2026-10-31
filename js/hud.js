'use strict';
/* HUD: velocità, giri, tempi, settori, torre di classifica e test controller */
const mmss=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
const carGear=c=>c.vx*Math.cos(c.a)+c.vy*Math.sin(c.a)<-5?'R':Math.hypot(c.vx,c.vy)<5?'N':1+Math.min(7,Math.floor(Math.hypot(c.vx,c.vy)/c.top*7.99));
const hudHTMLCache=new WeakMap();
let raceTowerSignature='';
const sectorHUDMarkup=[0,1,2].map(i=>'<div id="sector'+i+'"><b>S'+(i+1)+'</b><span id="sectorTime'+i+'"></span><em id="sectorDelta'+i+'"></em></div>').join('');
function setHudHTML(id,html){const e=$(id);if(hudHTMLCache.get(e)!==html){e.innerHTML=html;hudHTMLCache.set(e,html);}}
function setHudText(id,text){const e=$(id),value=String(text);if(e.textContent!==value)e.textContent=value;}
function qHud(dt){const v=Math.hypot(pl.vx,pl.vy);setHudText('spd',Math.round(v*.32));
 venueHud();
 setHudText('gear',carGear(pl));$('thr').style.width=pl.inp.thr*60+'px';$('brk').style.width=pl.inp.brk*60+'px';
 const phase=qualiStage();setHudText('lapTxt',phase.name+' · '+qualiParticipants().length+' VETTURE');
 setHudText('timeTxt',qEnd?'0:00 · Ultimo giro':mmss(Math.ceil(qualiTimeLeft()-1e-7)));
 setHudText('bestTxt','Giro '+fmt(pl.qLapActive?raceTime-pl.lapStart:0)+'  |  Miglior '+fmt(pl.best));
 sectorHud(pl);tyreHud();pitRuleHud();
 tickT-=dt;if(tickT>0&&dt!==0)return;tickT=.2;
 const rows=qualiOrder(),pos=validQualiTime(pl.best)&&pl.qActive?rows.indexOf(pl)+1:0;
 const caption=phase.advance?phase.name+' · Passano i primi '+phase.advance+' · '+(rows.length-phase.advance)+' eliminati':phase.name+' · Lotta per la pole position';
 setHudHTML('tower','<p class="quali-caption">'+caption+'</p>'+qualiTable());
 $('gapTxt').textContent=!pl.qActive?'ELIMINATO IN '+QUALI_STAGES[pl.qEliminatedAt].name+' · SPETTATORE':pl.qd?'TENTATIVI CONCLUSI':pitHudMessage(pl)||(pl.tow>.15?'SCIA  ':'')+(pos?'P'+pos:'Fai un giro lanciato');}
const fmt=t=>{if(!t||t>1e8)return '--:--.---';const m=Math.floor(t/60);return m+':'+(t%60).toFixed(3).padStart(6,'0');};
function sectorHud(c){
 // Conserva i nodi: il cronometro cambia ogni frame, la struttura dei settori no.
 setHudHTML('sectors',sectorHUDMarkup);
 for(let i=0;i<3;i++){
  const isActive=c.activeSec===i&&c.secs[i]==null,time=c.secs[i]??(!isActive?c.lastSecs[i]:null),delta=c.secs[i]==null&&!isActive?c.lastDelta[i]:c.secDelta[i],status=c.secs[i]==null&&!isActive?c.lastState[i]:c.secState[i];
  const val=isActive?`${(raceTime-c.secStart).toFixed(3)}`:(time==null?'--.---':time.toFixed(3));
  const change=delta==null?(status==='first'?'PRIMO TEMPO':''):`${delta<0?'−':'+'}${Math.abs(delta).toFixed(3)}`;
  const box=$('sector'+i),classes=status+' '+(isActive?'active':'');if(box.className!==classes)box.className=classes;
  setHudText('sectorTime'+i,val);setHudText('sectorDelta'+i,change);
 }
}
function hudUpdate(dt){
 venueHud();
 const v=Math.hypot(pl.vx,pl.vy);setHudText('spd',Math.round(v*.32));
 setHudText('gear',carGear(pl));
 $('thr').style.width=pl.inp.thr*60+'px';$('brk').style.width=pl.inp.brk*60+'px';
 const lap=clamp(pl.lap+1,1,S.laps);setHudText('lapTxt','GIRO '+lap+'/'+S.laps);
 setHudText('timeTxt','Tempo '+fmt(pl.fin||raceTime+pl.pen));
 setHudText('bestTxt','Giro '+fmt(pl.lap>=0?raceTime-pl.lapStart:0)+'  |  Miglior '+fmt(pl.best));
 sectorHud(pl);tyreHud();pitRuleHud();
 const signature=cars.map(c=>[c.id,c.tyres.compound,c.pitStops,c.best,c.lap,c.fin,c.retired,c.pen].join(',')).join(';');
 tickT-=dt;if(tickT>0&&dt!==0&&raceTowerSignature===signature)return;tickT=.2;raceTowerSignature=signature;
 const o=order(),me=o.indexOf(pl),fastest=fastestLapDriver();
 setHudHTML('tower',o.map((c,i)=>`<div class="${[c.isP?'me':'',c===fastest?'fastest-lap':''].filter(Boolean).join(' ')}" data-driver-id="${esc(c.id)}" style="border-left-color:${safeColor(c.col,'#ffffff')}" title="${esc(c.name)}"><b>${i+1}</b><span class="driver-name">${esc(c.code)}</span>${tyreBadge(c)}<span class="race-interval">${c.disqualified?'DSQ':c.retired?'RIT':c.fin?'FIN':i?raceInterval(o[i-1],c):'LEAD'}</span>${pitStopBadge(c)}</div>`).join(''));
 const a=o[me-1],b=o[me+1];
 $('gapTxt').textContent=pl.fin?'BANDIERA A SCACCHI · COMPLETAMENTO ARRIVI':pitHudMessage(pl)||(pl.tow>.15?'SCIA  ':'')+(a?`▲ ${a.code} ${raceInterval(a,pl)}`:'Leader')+(b?`   ▼ ${b.code} ${raceInterval(pl,b)}`:'');}
function testUpdate(){const p=getPad(),s=$('padStat'),i=getInput(1/60),r=p?readPad(p):null;
 s.textContent=p?'Controller collegato: '+p.id.slice(0,60)+' · '+(p.mapping==='standard'?'Mappatura browser standard':'Mappatura joystick personalizzabile')+(S.ctrl==='kb'?' · Disabilitato: controllo Tastiera selezionato':''):padError||'Nessun controller rilevato. Collegalo e premi un pulsante; la tastiera resta disponibile.';
 $('tSt').style.cssText=`left:${i.st<0?50+i.st*50:50}%;width:${Math.abs(i.st)*50}%`;$('tTh').style.width=i.thr*100+'%';$('tBr').style.width=i.brk*100+'%';
 const actions=[i.thr>.01?'ACCELERATORE':'',i.brk>.01?'FRENO':'',i.rev>.01?'RETROMARCIA':'',Math.abs(i.st)>.01?'STERZO':'',keys.KeyX||r?.x?'BOX (X)':'',keys.Escape||r?.start?'PAUSA':''].filter(Boolean);
 $('inputReadout').textContent=actions.length?'Input riconosciuti: '+actions.join(' · '):'Premi un comando per verificarlo qui.';
 const pressed=p?Array.from(p.buttons||[]).map((_,n)=>padButton(p,n)>.1?n:null).filter(n=>n!==null):[];
 $('padButtons').textContent=p?'Pulsanti controller premuti: '+(pressed.length?pressed.join(', '):'nessuno'):'Pulsanti controller: nessun dispositivo';
 $('padAxes').textContent=p?'Assi controller: '+Array.from(p.axes||[]).map((_,n)=>n+': '+padAxis(p,n).toFixed(2)).join(' · '):'';
}
function venueHud(){setHudText('venueName',activeCircuit.name);setHudText('venueCountry',activeCircuit.country.toUpperCase());}
