'use strict';
/* Menu "Seleziona auto": nome, colori e statistiche della tua auto */
if(!S.myIdentityReady){
 ['name','driver','code','num'].forEach(k=>{if(S.my[k]===DEF.my[k])S.my[k]='';});
 S.myIdentityReady=true;save();
}
if(!S.myTeamNameReady){
 if(S.my.name===DEF.my.name)S.my.name='';
 S.myTeamNameReady=true;save();
}
function drawPrev(){
 const canvas=$('prev'),p=canvas.getContext('2d');canvas.width=660;canvas.height=300;p.setTransform(3,0,0,3,0,0);
 p.fillStyle=artGradient(p,0,0,220,100,[[0,'#263b4d'],[1,'#0d1a29']],'#162738');p.fillRect(0,0,220,100);
 p.strokeStyle='#7999af12';p.lineWidth=.5;
 for(let x=0;x<220;x+=16){p.beginPath();p.moveTo(x,0);p.lineTo(x,100);p.stroke();}
 for(let y=0;y<100;y+=16){p.beginPath();p.moveTo(0,y);p.lineTo(220,y);p.stroke();}
 p.fillStyle='#040c1533';p.beginPath();p.ellipse(112,60,96,27,0,0,Math.PI*2);p.fill();
 p.setTransform(6,0,0,6,0,0);
 const c={x:55,y:25,a:0,steer:0,vx:0,vy:0,col:S.my.c1,acc:S.my.c2,num:S.my.num,inp:{brk:0}};
 drawCar({...c,x:c.x-4,y:c.y-7},true,p);drawCar(c,false,p);
}
function renderMyStats(){document.querySelectorAll('[data-ms]').forEach(el=>{const k=+el.dataset.ms;el.value=S.myStats[k];document.querySelector('[data-mv="'+k+'"]').textContent=Math.round(S.myStats[k]*100)+'%';});}
document.querySelectorAll('[data-ms]').forEach(el=>el.addEventListener('input',()=>{S.myStats[+el.dataset.ms]=+el.value;save();renderMyStats();}));
function renderCars(){renderMyStats();document.querySelectorAll('[data-my]').forEach(el=>el.value=S.my[el.dataset.my]);drawPrev();}
document.querySelectorAll('[data-my]').forEach(el=>el.addEventListener('input',()=>{const k=el.dataset.my;let v=el.value;
 if(!Object.hasOwn(DEF.my,k))return;
 if(k==='code'){v=v.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);el.value=v;}
 S.my=cleanPlayer({...S.my,[k]:v},DEF.my);save();drawPrev();}));
