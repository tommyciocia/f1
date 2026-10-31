'use strict';
/* Disegno della minimappa */
const miniScenery={canvas:document.createElement('canvas'),circuit:null,pits:null};
function drawMini(){
 const mini=$('mini'),dpr=miniPixelRatio(),width=Math.round(200*dpr),height=Math.round(150*dpr);
 if(mini.width!==width||mini.height!==height){mini.width=width;mini.height=height;}
 if(mm.width!==width||mm.height!==height)paintMiniTrack(dpr);
 if(miniScenery.circuit!==activeCircuit||miniScenery.pits!==PIT_GARAGES[0]||miniScenery.canvas.width!==width||miniScenery.canvas.height!==height){
 const g=miniScenery.canvas.getContext('2d');miniScenery.canvas.width=width;miniScenery.canvas.height=height;
 g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,200,150);g.drawImage(mm,0,0,200,150);drawMiniPits(g);
 for(const [i,q] of [...SECTOR_LINES,T[0]].entries()){
  const a={x:q.x-q.nx*(TW/2+25),y:q.y-q.ny*(TW/2+25)},b={x:q.x+q.nx*(TW/2+25),y:q.y+q.ny*(TW/2+25)};
  g.strokeStyle=i===2?'#fff':'#00c8ff';g.lineWidth=i===2?3:2;g.beginPath();g.moveTo(mX(a),mY(a));g.lineTo(mX(b),mY(b));g.stroke();
 }
 miniScenery.circuit=activeCircuit;miniScenery.pits=PIT_GARAGES[0];
 }
 mctx.setTransform(dpr,0,0,dpr,0,0);mctx.clearRect(0,0,200,150);mctx.drawImage(miniScenery.canvas,0,0,200,150);
 for(const c of cars){if(c.isP)continue;mctx.fillStyle=c.col;mctx.beginPath();mctx.arc(mX(c),mY(c),3.5,0,7);mctx.fill();mctx.strokeStyle='#091725';mctx.lineWidth=1;mctx.stroke();}
 // Il giocatore resta sopra gli altri punti; la freccia mostra l'orientamento.
 if(pl){mctx.save();mctx.translate(mX(pl),mY(pl));mctx.rotate(pl.a);mctx.fillStyle=pl.col;mctx.strokeStyle='#f2f7fb';mctx.lineWidth=1.6;
  mctx.beginPath();mctx.moveTo(8,0);mctx.lineTo(-5,5);mctx.lineTo(-2,0);mctx.lineTo(-5,-5);mctx.closePath();mctx.fill();mctx.stroke();mctx.restore();}}
