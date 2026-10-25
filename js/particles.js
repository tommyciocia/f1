'use strict';
/* Particelle: fumo, erba e scia d'aria */
function spawn(c,type){if(particles.length>(S.qual==='high'?160:40))return;
 const f={x:Math.cos(c.a),y:Math.sin(c.a)},r={x:-f.y,y:f.x},s=Math.random()<.5?-1:1;
 particles.push({x:c.x-f.x*32+r.x*s*13,y:c.y-f.y*32+r.y*s*13,vx:c.vx*.1+(Math.random()-.5)*40,vy:c.vy*.1+(Math.random()-.5)*40,life:.6,t:type});}
function spawnAir(c){if(particles.length>(S.qual==='high'?160:40))return;
 const f={x:Math.cos(c.a),y:Math.sin(c.a)},r={x:-f.y,y:f.x},s=Math.random()<.5?-1:1;
 particles.push({x:c.x+f.x*(10+Math.random()*26)+r.x*s*(12+Math.random()*16),y:c.y+f.y*(10+Math.random()*26)+r.y*s*(12+Math.random()*16),vx:-f.x*(130+Math.random()*110)+c.vx*.1,vy:-f.y*(130+Math.random()*110)+c.vy*.1,life:.34+Math.random()*.22,t:2,sz:18+Math.random()*22});
}
function emitParticles(){
 for(const c of cars){const v=Math.hypot(c.vx,c.vy);
   if(c.tow>.12&&v>260&&Math.random()<.72)spawnAir(c);
   else if(c.slip>170&&v>150&&Math.random()<.6)spawn(c,0);else if(c.inp.brk>.6&&v>400&&Math.random()<.4)spawn(c,0);else if(c.off&&v>120&&Math.random()<.5)spawn(c,1);}
}
function updateParticles(dt){ for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.life<=0)particles.splice(i,1);}}
