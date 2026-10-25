'use strict';
/* Urti tra vetture e contro le barriere */
function hit(v){const n=performance.now();if(v>120&&n-lastHit>200){lastHit=n;thud(clamp(v/600,.1,.5));}}
function collide(){for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){const a=cars[i],b=cars[j];if(!a.go&&pitActive(a)||!b.go&&pitActive(b))continue;let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
 if(d<48&&d>.01){dx/=d;dy/=d;const o=(48-d)/2;a.x-=dx*o;a.y-=dy*o;b.x+=dx*o;b.y+=dy*o;
  const vn=(b.vx-a.vx)*dx+(b.vy-a.vy)*dy;
  if(vn<0){const J=-1.2*vn/2;a.vx-=J*dx;a.vy-=J*dy;b.vx+=J*dx;b.vy+=J*dy;a.vx*=.99;a.vy*=.99;hit(-vn*1.5);}}}
 // Il limitatore resta valido anche dopo un contatto, non solo sotto accelerazione.
 for(const c of cars)if(pitActive(c)){const speed=Math.hypot(c.vx,c.vy);if(speed>PIT.speedLimit){c.vx*=PIT.speedLimit/speed;c.vy*=PIT.speedLimit/speed;}}
}
