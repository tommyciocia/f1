'use strict';
/* Disegno di una vettura */
function drawCar(c,shadow,g){g=g||ctx;
 g.save();g.translate(c.x+(shadow?8:0),c.y+(shadow?8:0));g.rotate(c.a);
 if(shadow){if(S.qual==='high'){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(-36,-17,72,34);}g.restore();return;}
 const sa=c.steer*.45,spin=Math.hypot(c.vx,c.vy)*.02;
 g.fillStyle='#111';g.fillRect(-30,-19,13,9);g.fillRect(-30,10,13,9);             // ruote posteriori
 for(const s of[-1,1]){g.save();g.translate(20,s*15);g.rotate(sa);g.fillRect(-7,-4.5,14,9);g.fillStyle='#555';g.fillRect(-7+((spin*8)%12),-1,3,2);g.restore();g.fillStyle='#111';} // anteriori sterzanti
 g.fillStyle=c.acc;g.fillRect(-38,-17,7,34);g.fillRect(30,-17,7,34);g.strokeStyle='#000';g.lineWidth=2;g.strokeRect(-38,-17,7,34);g.strokeRect(30,-17,7,34);              // alettoni
 g.fillStyle=c.col;g.beginPath();g.moveTo(-30,-8);g.lineTo(8,-9);g.lineTo(32,-3);g.lineTo(32,3);g.lineTo(8,9);g.lineTo(-30,8);g.closePath();g.fill();g.strokeStyle='#000';g.lineWidth=2.5;g.stroke();
 g.fillStyle=c.acc;g.fillRect(-18,-2,40,4);                                          // striscia livrea
 g.fillStyle='#111';g.beginPath();g.arc(-4,0,5.5,0,7);g.fill();g.fillStyle=c.acc;g.beginPath();g.arc(-4,0,2.5,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=1;g.stroke(); // casco
 if(c.inp.brk>.5){g.fillStyle='#f33';g.fillRect(-38,-4,3,8);}
 g.restore();}
