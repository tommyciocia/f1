'use strict';
/* Menu "Seleziona auto": nome, colori e statistiche della tua auto */
if(!S.myIdentityReady){
 ['name','driver','code','num'].forEach(k=>{if(S.my[k]===DEF.my[k])S.my[k]='';});
 S.myIdentityReady=true;save();
}
function drawPrev(){const p=$('prev').getContext('2d');p.setTransform(1,0,0,1,0,0);p.fillStyle='#30343a';p.fillRect(0,0,220,100);p.setTransform(2.2,0,0,2.2,0,0);
 drawCar({x:50,y:22,a:0,steer:0,vx:0,vy:0,col:S.my.c1,acc:S.my.c2,inp:{brk:0}},false,p);}
function renderMyStats(){document.querySelectorAll('[data-ms]').forEach(el=>{const k=+el.dataset.ms;el.value=S.myStats[k];document.querySelector('[data-mv="'+k+'"]').textContent=Math.round(S.myStats[k]*100)+'%';});}
document.querySelectorAll('[data-ms]').forEach(el=>el.addEventListener('input',()=>{S.myStats[+el.dataset.ms]=+el.value;save();renderMyStats();}));
function renderCars(){renderMyStats();document.querySelectorAll('[data-my]').forEach(el=>el.value=S.my[el.dataset.my]);drawPrev();}
document.querySelectorAll('[data-my]').forEach(el=>el.addEventListener('input',()=>{const k=el.dataset.my;let v=el.value;
 if(k==='code'){v=v.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);el.value=v;}
 if(k==='name'||k==='driver')v=v.slice(0,22);S.my[k]=v;save();drawPrev();}));
