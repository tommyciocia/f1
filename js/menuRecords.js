'use strict';
/* Menu "Classifiche" */
function renderRecords(){let r=[];try{r=JSON.parse(localStorage.getItem('f1sim.rec')||'[]');}catch(e){}
 $('recList').innerHTML=r.length?r.map(x=>`<div><span>${x.d}</span><b>P${x.pos}</b><span style="flex:1">${fmt(x.tot)}</span><span>Best ${fmt(x.best)}</span></div>`).join(''):'<p>Nessuna gara completata.</p>';}
