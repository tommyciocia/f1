'use strict';
/* HUD: velocità, giri, tempi, settori, torre di classifica e test controller */
const mmss=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
function qHud(dt){const v=Math.hypot(pl.vx,pl.vy);$('spd').textContent=Math.round(v*.32);
 $('gear').textContent=v<5?'N':1+Math.min(7,Math.floor(v/pl.top*7.99));$('thr').style.width=pl.inp.thr*60+'px';$('brk').style.width=pl.inp.brk*60+'px';
 $('lapTxt').textContent='QUALIFICHE';$('timeTxt').textContent=qEnd?'Ultimo giro':'Resta '+mmss(Math.max(0,S.qmin*60-raceTime));
 $('bestTxt').textContent='Giro '+fmt(pl.lap>=0?raceTime-pl.lapStart:0)+'  |  Miglior '+fmt(pl.best);
 sectorHud(pl);
 tickT-=dt;if(tickT>0)return;tickT=.2;
 const rows=cars.filter(c=>c.best<1e8).sort((a,b)=>a.best-b.best),pos=rows.indexOf(pl)+1;
 $('tower').innerHTML=rows.map((c,i)=>`<div class="${c.isP?'me':''}" style="border-left-color:${c.col}"><b>${i+1}</b>${esc(c.code)} ${fmt(c.best)}</div>`).join('');
 $('gapTxt').textContent=(pl.tow>.15?'SCIA  ':'')+(pos?'P'+pos:'Fai un giro lanciato');}
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
 $('gear').textContent=v<5?'N':1+Math.min(7,Math.floor(v/pl.top*7.99));
 $('thr').style.width=pl.inp.thr*60+'px';$('brk').style.width=pl.inp.brk*60+'px';
 const lap=clamp(pl.lap+1,1,S.laps);$('lapTxt').textContent='GIRO '+lap+'/'+S.laps;
 $('timeTxt').textContent='Tempo '+fmt(pl.fin||raceTime+pl.pen);
 $('bestTxt').textContent='Giro '+fmt(pl.lap>=0?raceTime-pl.lapStart:0)+'  |  Miglior '+fmt(pl.best);
 sectorHud(pl);tickT-=dt;if(tickT>0)return;tickT=.2;
 const o=order(),me=o.indexOf(pl),fastest=fastestLapDriver();
 $('tower').innerHTML=o.map((c,i)=>`<div class="${[c.isP?'me':'',c===fastest?'fastest-lap':''].filter(Boolean).join(' ')}" style="border-left-color:${c.col}" title="${esc(c.name)}"><b>${i+1}</b><span class="driver-name">${esc(c.code)}</span></div>`).join('');
 const sp=Math.max(v,150),a=o[me-1],b=o[me+1];
 $('gapTxt').textContent=(pl.tow>.15?'SCIA  ':'')+(a?`▲ ${a.code} -${((prog(a)-prog(pl))/sp).toFixed(1)}s`:'Leader')+(b?`   ▼ ${b.code} +${((prog(pl)-prog(b))/sp).toFixed(1)}s`:'');}
function testUpdate(){const p=getPad(),s=$('padStat');
 if(p){const r=readPad(p);s.textContent='Controller collegato: '+p.id.slice(0,50);
  $('tSt').style.cssText=`left:${r.st<0?50+r.st*50:50}%;width:${Math.abs(r.st)*50}%`;$('tTh').style.width=r.thr*100+'%';$('tBr').style.width=r.brk*100+'%';}
 else{s.textContent='Nessun controller rilevato. Collegalo e premi un pulsante; la tastiera funziona comunque.';
  $('tSt').style.cssText='left:50%;width:0';$('tTh').style.width='0';$('tBr').style.width='0';}}
