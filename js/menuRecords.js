'use strict';
/* Menu "Classifiche" */
function renderRecords(){let r=[];try{r=JSON.parse(localStorage.getItem('f1sim.rec')||'[]');}catch(e){}
 $('recList').innerHTML=r.length?r.map(x=>`<div><span>${esc(x.d)}<small class="result-pits">${esc(x.circuitName||'Tracciato precedente')}</small></span><b class="${x.disqualified?'pit-dsq':''}">${x.disqualified?'DSQ':'P'+x.pos}</b><span style="flex:1">${fmt(x.tot)}</span><span>Best ${fmt(x.best)}</span></div>`).join(''):'<p>Nessuna gara completata.</p>';}
