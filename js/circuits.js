'use strict';
/* Selezione consentita nella Home: nessuna geometria cambia durante una sessione. */
let previewCircuitId=activeCircuit.id;
const circuitKm=c=>c.lengthKm.toLocaleString('it-IT',{minimumFractionDigits:3,maximumFractionDigits:3});
function selectCircuit(id){
 if(state!=='menu'||!CIRCUIT_DATA.some(c=>c.id===id))return false;
 loadCircuit(id);rebuildPitGeometry();S.circuitId=activeCircuit.id;save();
 lastGrid=null;quali=null;resetQualiRelease();particles=[];sessionBestSecs=[1e9,1e9,1e9];
 mkCars();camX=pl.x;camY=pl.y;updateCircuitLabels();previewCircuit(id);return true;
}
function updateCircuitLabels(){
 $('homeCircuit').textContent='CIRCUITO SELEZIONATO · '+activeCircuit.name;
 $('circuitCurrent').textContent='SELEZIONATO · '+activeCircuit.name;
}
function circuitMap(c,large=false){
 // Proiezione degli stessi campioni impiegati dalla fisica: nessun disegno separato.
 const pit=c.pitData.samples;
 // Rotazione rigida per far leggere anche i tracciati stretti nella scheda.
 // Coordinate, proporzioni e direzione restano quelle della simulazione.
 if(c.previewAngle===undefined){let best=-1;for(let a=-Math.PI/2;a<=Math.PI/2;a+=Math.PI/36){const co=Math.cos(a),si=Math.sin(a),pts=c.points.map(p=>({x:p[0]*co-p[1]*si,y:p[0]*si+p[1]*co})),xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),score=Math.min(640/(Math.max(...xs)-Math.min(...xs)),300/(Math.max(...ys)-Math.min(...ys)));if(score>best){best=score;c.previewAngle=a;}}}
 const co=Math.cos(c.previewAngle),si=Math.sin(c.previewAngle),rotate=p=>({x:p.x*co-p.y*si,y:p.x*si+p.y*co});
 const all=[...c.samples,...pit].map(rotate),xs=all.map(p=>p.x),ys=all.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys),w=Math.max(...xs)-minX,h=Math.max(...ys)-minY;
 const scale=Math.min(640/w,300/h),ox=(800-w*scale)/2,oy=(410-h*scale)/2;
 const xy=p=>{p=rotate(p);return[ox+(p.x-minX)*scale,oy+(p.y-minY)*scale];},pair=p=>xy(p).map(v=>v.toFixed(2)).join(','),line='M'+c.samples.map(pair).join('L')+'Z';
 const start=c.samples[0],pos=xy(start),marks=c.sectorMarks.map((s,i)=>{const p=xy(pointAtDistance(s,c));return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5" fill="'+['#bf93ff','#ffcd54'][i]+'"/><text x="'+(p[0]+12)+'" y="'+(p[1]-10)+'">S'+(i+1)+'</text>';}).join('');
 const bridge=c.bridge?Array.from({length:21},(_,i)=>pointAtDistance(c.bridge.over-760+i*76,c)):[];
 const deck=bridge.length?'<path d="M'+bridge.map(pair).join('L')+'" fill="none" stroke="#111b28" stroke-width="15"/><path d="M'+bridge.map(pair).join('L')+'" fill="none" stroke="'+c.color+'" stroke-width="6"/>':'';
 const labels=large?c.features.map(f=>{const p=xy(pointAtDistance(f.s,c));return '<text x="'+(p[0]+10)+'" y="'+(p[1]+18)+'" fill="#c2ceda" font-size="11">'+esc(f.name)+'</text>';}).join(''):'';
 return '<svg viewBox="0 0 800 410" role="img" aria-label="Mappa '+esc(c.name)+': tracciato, partenza e corsia box" xmlns="http://www.w3.org/2000/svg"><path d="'+line+'" fill="none" stroke="#ffffff" stroke-opacity=".04" stroke-width="34"/><path d="'+line+'" fill="none" stroke="#374450" stroke-width="14"/><path d="M'+pit.map(pair).join('L')+'" fill="none" stroke="#91a7b8" stroke-width="3"/><path d="'+line+'" fill="none" stroke="'+c.color+'" stroke-width="6" stroke-linejoin="round"/>'+deck+'<g fill="#b8c4d1" font-family="Segoe UI,sans-serif" font-size="16" font-weight="700">'+(large?marks:'')+labels+'</g><g transform="translate('+pos.join(' ')+') rotate('+((start.ang+c.previewAngle)*180/Math.PI)+')"><path d="M0 -13V13" stroke="#10151e" stroke-width="10"/><path d="M0 -13V13" stroke="#fff" stroke-width="7" stroke-dasharray="4 4"/><path d="M22 -7L32 0L22 7" fill="none" stroke="#fff" stroke-width="3"/></g></svg>';
}
function renderCircuits(){
 updateCircuitLabels();
 $('circuitGrid').innerHTML=CIRCUIT_DATA.map((c,i)=>'<article class="circuit-card" data-circuit-card="'+c.id+'" style="--circuit-color:'+c.color+'"><span class="circuit-card-top"><span>'+String(i+1).padStart(2,'0')+' / '+c.type+'</span><span class="circuit-card-status"></span></span>'+circuitMap(c)+'<strong>'+esc(c.name)+'</strong><span class="circuit-card-meta">'+circuitKm(c)+' km <i>·</i> '+c.turns+' curve</span><small>'+esc(c.country)+'</small>'+(c.layoutStatus==='preliminary'?'<small class="circuit-preliminary">SAGOMA PRELIMINARE</small>':'')+'<div class="circuit-card-actions"><button type="button" data-circuit="'+c.id+'" aria-controls="circuitPreview" aria-label="Dettagli '+esc(c.name)+'">DETTAGLI ↗</button><button type="button" class="circuit-card-select" data-select-circuit="'+c.id+'" aria-label="Seleziona '+esc(c.name)+'">SELEZIONA CIRCUITO</button></div></article>').join('');
 previewCircuit(activeCircuit.id);
}
function previewCircuit(id){
 const c=CIRCUIT_DATA.find(c=>c.id===id);if(!c)return;
 previewCircuitId=c.id;$('circuitPreview').innerHTML=circuitMap(c,true)+'<div class="circuit-map-legend"><span>━ Tracciato</span><span>━ Box</span><span>▦ S3 / partenza / arrivo</span></div>';
 $('circuitLocation').textContent=c.country.toUpperCase()+' / '+c.type;
 $('circuitName').textContent=c.name;$('circuitDescription').textContent=c.description;
 $('circuitAccuracy').textContent=c.accuracy;
 $('circuitStats').innerHTML='<div><dt>LUNGHEZZA</dt><dd>'+circuitKm(c)+' <small>km</small></dd></div><div><dt>CURVE</dt><dd>'+c.turns+'</dd></div><div><dt>DIREZIONE</dt><dd class="circuit-direction">'+esc(c.direction)+'</dd></div>';
 $('circuitTraits').innerHTML=c.traits.map(t=>'<span>'+esc(t)+'</span>').join('');
 $('circuitPreview').style.setProperty('--circuit-color',c.color);
 const selected=c.id===activeCircuit.id;$('selectCircuitBtn').disabled=selected;
 $('selectCircuitBtn').textContent=selected?'✓ CIRCUITO SELEZIONATO':'SELEZIONA CIRCUITO';
 document.querySelectorAll('[data-circuit-card]').forEach(card=>{
  const current=card.dataset.circuitCard===activeCircuit.id,preview=card.dataset.circuitCard===id;
  card.classList.toggle('selected',current);card.classList.toggle('previewing',preview);
  card.querySelector('[data-circuit]').setAttribute('aria-pressed',String(preview));
  const select=card.querySelector('[data-select-circuit]');select.disabled=current;select.textContent=current?'✓ SELEZIONATO':'SELEZIONA CIRCUITO';
  const badge=card.querySelector('.circuit-card-status');if(badge)badge.textContent=current?'✓ SELEZIONATO':preview?'ANTEPRIMA':'';
 });
}
updateCircuitLabels();
