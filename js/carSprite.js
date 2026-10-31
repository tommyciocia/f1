'use strict';
/* Carrozzerie originali in alta risoluzione. Solo ruote, sterzo e LED sono dinamici. */
const carArtCache=new Map();let carShadowArt=null;
function carShade(hex,shift){
 hex=/^#[0-9a-f]{3,6}$/i.test(hex||'')?hex:'#aeb8c4';
 if(hex.length===4)hex='#'+Array.from(hex.slice(1),c=>c+c).join('');
 const n=parseInt(hex.slice(1),16);
 return '#'+[n>>16&255,n>>8&255,n&255].map(v=>clamp(v+shift,0,255).toString(16).padStart(2,'0')).join('');
}
function carBodyArt(c){
 const col=c.col||'#ffd400',accent=c.acc||'#17212d',key=col+'|'+accent+'|'+(c.num||'');
 if(carArtCache.has(key))return carArtCache.get(key);
 const canvas=document.createElement('canvas');canvas.width=336;canvas.height=216;
 const g=canvas.getContext('2d');g.setTransform(3,0,0,3,168,108);g.lineJoin='round';
 // Fondoscocca in carbonio e tiranti delle sospensioni.
 g.fillStyle='#121c24';g.beginPath();g.moveTo(-34,-13);g.lineTo(12,-13);g.lineTo(29,-6);g.lineTo(29,6);g.lineTo(12,13);g.lineTo(-34,13);g.closePath();g.fill();
 g.strokeStyle='#7c8994';g.lineWidth=1.4;
 for(const side of [-1,1]){g.beginPath();g.moveTo(-18,side*7);g.lineTo(-27,side*16);g.moveTo(-10,side*8);g.lineTo(-23,side*16);g.moveTo(3,side*5);g.lineTo(22,side*16);g.moveTo(11,side*3);g.lineTo(19,side*16);g.stroke();}
 // Ali multielemento e paratie, senza sponsor o marchi.
 g.fillStyle='#111820';g.fillRect(-40,-21,8,42);g.fillRect(30,-21,9,42);
 g.fillStyle=accent;g.fillRect(-39,-19,5,38);g.fillRect(33,-19,4,38);
 g.fillStyle=carShade(accent,36);g.fillRect(-39,-19,1.2,38);g.fillRect(33,-19,1.2,38);
 g.fillStyle=col;g.fillRect(31,-17,1.7,34);g.fillRect(-34,-17,1.3,34);
 g.fillStyle='#10171e';for(const side of [-1,1]){g.fillRect(-40,side*20-1,10,2);g.fillRect(29,side*20-1,11,2);}
 // Le pance hanno bordi in luce e una parte inferiore più scura.
 for(const side of [-1,1]){
  g.fillStyle=artGradient(g,0,-12,0,12,[[0,carShade(col,48)],[.32,col],[.7,carShade(col,-17)],[1,carShade(col,-65)]],col);
  g.beginPath();g.moveTo(-28,side*5);g.lineTo(-23,side*11);g.lineTo(-4,side*12);g.quadraticCurveTo(9,side*11,13,side*5);g.lineTo(1,side*3);g.closePath();g.fill();
  g.strokeStyle=carShade(col,65);g.lineWidth=.6;g.beginPath();g.moveTo(-23,side*10);g.lineTo(-5,side*11);g.quadraticCurveTo(7,side*10,11,side*5);g.stroke();
  g.fillStyle='#10202b';g.beginPath();g.moveTo(4,side*5);g.lineTo(-1,side*9);g.lineTo(-9,side*8);g.lineTo(-6,side*5);g.closePath();g.fill();
 }
 g.fillStyle=artGradient(g,0,-6,0,6,[[0,carShade(col,65)],[.25,col],[.65,col],[1,carShade(col,-60)]],col);
 g.beginPath();g.moveTo(-33,-4);g.lineTo(-20,-6);g.lineTo(-10,-5);g.lineTo(4,-4);g.lineTo(35,-2.5);g.lineTo(35,2.5);g.lineTo(4,4);g.lineTo(-10,5);g.lineTo(-20,6);g.lineTo(-33,4);g.closePath();g.fill();
 g.fillStyle=accent;g.fillRect(12,-1.3,22,2.6);g.fillRect(-31,-1.3,13,2.6);
 // Cockpit, casco, visiera e halo.
 g.fillStyle='#0a1118';g.beginPath();g.ellipse(-4,0,7.2,5.5,0,0,Math.PI*2);g.fill();
 g.fillStyle=carShade(accent,45);g.beginPath();g.arc(-5,0,3.6,0,Math.PI*2);g.fill();
 g.fillStyle='#dceef6';g.beginPath();g.arc(-6,-1,1.5,0,Math.PI*2);g.fill();g.fillStyle='#15212e';g.fillRect(-3,-2.8,1.6,5.6);
 g.strokeStyle='#101923';g.lineWidth=2.7;g.beginPath();g.moveTo(-9,-5);g.bezierCurveTo(10,-9,13,9,-9,5);g.stroke();
 g.strokeStyle='#9eacb8';g.lineWidth=.65;g.beginPath();g.moveTo(-8,-5.8);g.bezierCurveTo(10,-8,12,8,-8,5.8);g.stroke();
 g.strokeStyle='#263541';g.lineWidth=1.5;g.beginPath();g.moveTo(9,0);g.lineTo(2,0);g.stroke();
 g.fillStyle='#172530';g.fillRect(-16,-2.2,4,4.4);g.fillStyle='#ffffff66';g.fillRect(-15,-2.2,2,.8);
 if(c.num){g.save();g.translate(-23,0);g.rotate(Math.PI/2);g.font='900 6px Segoe UI,sans-serif';g.textAlign='center';g.fillStyle='#f4f8fa';g.strokeStyle='#101722';g.lineWidth=1.1;g.strokeText(String(c.num),0,2);g.fillText(String(c.num),0,2);g.restore();}
 carArtCache.set(key,canvas);if(carArtCache.size>48)carArtCache.delete(carArtCache.keys().next().value);return canvas;
}
function carShadow(){
 if(carShadowArt)return carShadowArt;
 const canvas=document.createElement('canvas');canvas.width=224;canvas.height=144;
 const g=canvas.getContext('2d');g.setTransform(2,0,0,2,112,72);g.fillStyle='#07111f66';g.shadowColor='#07111f66';g.shadowBlur=4;
 g.beginPath();g.roundRect(-39,-21,79,42,7);g.fill();carShadowArt=canvas;return canvas;
}
function drawCarTyre(g,x,y,steer,phase,color){
 g.save();g.translate(x,y);g.rotate(steer);
 g.fillStyle='#070d13';g.beginPath();g.roundRect(-8,-5.5,16,11,2.5);g.fill();
 g.fillStyle='#26323c';g.fillRect(-6,-4,12,1);g.fillStyle='#111b24';g.fillRect(-6,3.2,12,1);
 g.strokeStyle=color;g.lineWidth=.7;g.beginPath();g.roundRect(-6.8,-4.5,13.6,9,1.5);g.stroke();
 g.fillStyle='#9fabb13d';g.fillRect(-6+phase%10,-3.5,1.6,7);g.restore();
}
function drawCar(c,shadow,g){
 g=g||ctx;g.save();g.translate(c.x+(shadow?6:0),c.y+(shadow?9:0));g.rotate(c.a);
 if(shadow){if(S.qual==='high')g.drawImage(carShadow(),-56,-36,112,72);g.restore();return;}
 const phase=(c.wheelPhase||0)*5,color=c.tyres?tyreCompound(c).color:'#9ba7b3';
 for(const side of [-1,1]){drawCarTyre(g,-25,side*17,0,phase,color);drawCarTyre(g,20,side*17,c.steer*.43,phase,color);}
 g.drawImage(carBodyArt(c),-56,-36,112,72);
 if(c.inp.brk>.5){g.fillStyle='#ff4956';g.fillRect(-40,-2,2.8,4);g.fillStyle='#ff495622';g.fillRect(-43,-4,5,8);}
 g.restore();
}
