'use strict';
/* Avvio del gioco e ciclo dei frame */
let last=0;
function frame(t){requestAnimationFrame(frame);const dt=clamp((t-last)/1000||0,0,.05);last=t;
 try{if(state!=='paused')update(dt);render(dt);}catch(err){console.error(err);}}
mkCars();show('menu');requestAnimationFrame(frame);
