'use strict';
/* Le qualifiche bloccano la mescola e l'usura per tutte le auto, anche ai box.
   In gara il consumo segue la distanza effettivamente percorsa, senza soste automatiche. */
function resetTyres(c){c.tyres={compound:'SOFT',color:'#ff3344',condition:1,degradation:mode!=='quali'};}
function updateTyres(c,dt){
 if(mode==='quali'){c.tyres.compound='SOFT';c.tyres.color='#ff3344';c.tyres.condition=1;c.tyres.degradation=false;return;}
 c.tyres.degradation=true;
 if(state==='racing'&&c.go&&!c.fin)c.tyres.condition=clamp(c.tyres.condition-Math.hypot(c.vx,c.vy)*dt/L*.08,0,1);
}
function tyreGrip(c){return mode==='quali'?1:1-Math.max(0,.65-c.tyres.condition)*.25;}
function tyreSpeed(c){return mode==='quali'?1:1-Math.max(0,.65-c.tyres.condition)*.06;}
function tyreHud(){
 const percent=mode==='quali'?100:Math.floor(pl.tyres.condition*100+1e-7),ring=$('tyreIndicator');
 ring.style.setProperty('--tyre-condition',percent+'%');ring.style.setProperty('--tyre-color','#ff3344');
 ring.setAttribute('aria-label','SOFT — '+percent+'%');$('tyreText').textContent='SOFT — '+percent+'%';
}
