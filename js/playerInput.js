'use strict';
/* Input del giocatore: unisce tastiera e controller */
function getInput(dt){
 const kr=(keys.ArrowRight||keys.KeyD?1:0)-(keys.ArrowLeft||keys.KeyA?1:0);
 ks+=(kr-ks)*Math.min(1,dt*(kr?7:12)); // sterzo progressivo da tastiera
 let i={st:ks*S.sens>1?1:ks*Math.min(S.sens,1.2),thr:keys.ArrowUp||keys.KeyW?1:0,brk:keys.ArrowDown||keys.KeyS?1:0,hb:!!keys.Space};
 const p=S.ctrl!=='kb'?getPad():null;
 if(p){const r=readPad(p);if(Math.abs(r.st)>0)i.st=r.st;i.thr=Math.max(i.thr,r.thr);i.brk=Math.max(i.brk,r.brk);}
 i.st=clamp(i.st,-1,1);return i;}
