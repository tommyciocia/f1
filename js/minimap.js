'use strict';
/* Disegno della minimappa */
function drawMini(){mctx.clearRect(0,0,200,150);mctx.drawImage(mm,0,0);
 drawMiniPits();
 for(const q of SECTOR_LINES){mctx.strokeStyle='#00c8ff';mctx.lineWidth=2;mctx.beginPath();mctx.moveTo(mX(q.x-q.nx*(TW/2+20)),mY(q.y-q.ny*(TW/2+20)));mctx.lineTo(mX(q.x+q.nx*(TW/2+20)),mY(q.y+q.ny*(TW/2+20)));mctx.stroke();}
 for(const c of cars){mctx.fillStyle=c.col;mctx.beginPath();mctx.arc(mX(c),mY(c),c.isP?5:3.5,0,7);mctx.fill();mctx.strokeStyle=c.isP?'#fff':'#000';mctx.lineWidth=c.isP?2:1;mctx.stroke();}}
