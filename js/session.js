'use strict';
/* Controllo della sessione: avvio, pausa, riposizionamento, ritorno al menu */
function begin(){lastGrid=null;if(S.qmin>0)startQuali();else startRace();}
function banner(t,ms){const b=$('banner');b.textContent=t;clearTimeout(banner.t);banner.t=setTimeout(()=>b.textContent='',ms);}
function repos(){if((state!=='racing'&&state!=='quali')||!pl||pl.fin||pl.rep>0||pitActive(pl))return;const i=nearest(pl,true),q=T[i];
 pl.x=q.x;pl.y=q.y;pl.a=q.ang;pl.vx=pl.vy=0;pl.idx=i;pl.rep=1.5;
 if(state==='quali'){pl.lap=-1;banner('Giro annullato',1200);}else{pl.pen+=3;banner('+3 s penalità',1200);}}
function togglePause(){if(state==='racing'||state==='countdown'||state==='quali'){togglePause.prev=state;state='paused';show('pause');$('endqBtn').classList.toggle('hidden',mode!=='quali');}
 else if(state==='paused')resume();}
function resume(){state=togglePause.prev||'racing';hideAll();}
function toMenu(){resetQualiRelease();state='menu';mkCars();$('hud').classList.add('hidden');show('menu');if(engG)engG.gain.value=0;}
