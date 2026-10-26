'use strict';
/* Disegno della minimappa */
function drawMini(){mctx.clearRect(0,0,200,150);mctx.drawImage(mm,0,0);
 drawMiniPits();
 for(const [i,q] of [...SECTOR_LINES,T[0]].entries()){
  const a={x:q.x-q.nx*(TW/2+25),y:q.y-q.ny*(TW/2+25)},b={x:q.x+q.nx*(TW/2+25),y:q.y+q.ny*(TW/2+25)};
  mctx.strokeStyle=i===2?'#fff':'#00c8ff';mctx.lineWidth=i===2?3:2;mctx.beginPath();mctx.moveTo(mX(a),mY(a));mctx.lineTo(mX(b),mY(b));mctx.stroke();
 }
 for(const c of cars){mctx.fillStyle=c.col;mctx.beginPath();mctx.arc(mX(c),mY(c),c.isP?5:3.5,0,7);mctx.fill();mctx.strokeStyle=c.isP?'#fff':'#000';mctx.lineWidth=c.isP?2:1;mctx.stroke();}}
