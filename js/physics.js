'use strict';
/* Fisica di una vettura (accelerazione, frenata, aderenza, barriere) e avanzamento di tutte le vetture */
function stepCar(c,h){
 const f={x:Math.cos(c.a),y:Math.sin(c.a)},r={x:-f.y,y:f.x},inp=c.inp;
 let vF=c.vx*f.x+c.vy*f.y,vL=c.vx*r.x+c.vy*r.y;
 // La scia dà un vantaggio limitato, ma abbastanza evidente per preparare un sorpasso.
 const go=c.go,tp=c.top*(1+.075*(c.tow||0));
 // acceleratore progressivo (cala verso la velocità massima)
 if(go&&inp.thr>0)vF+=inp.thr*c.accel*(1+.46*(c.tow||0))*(1-clamp(vF/tp,0,1)**2)*h*(c.off?.45:1);
 else vF-=vF*.35*h;
 if(go&&inp.brk>0){if(vF>8)vF-=inp.brk*c.brk*h;else vF=Math.max(-250,vF-inp.brk*380*h);} // frenata e retromarcia
 if(inp.hb&&go){vF-=Math.sign(vF)*500*h;}
 // Rete di sicurezza fisica per le IA: una collisione o un riferimento di traiettoria
 // non può lasciarle ferme in mezzo alla pista. È un recupero graduale, non un reset.
 if(c.ai&&go&&(state==='racing'||state==='quali')&&!c.fin&&vF<115){
  const rollingTarget=c.recoveryT>0?185:125;
  vF+=(rollingTarget-vF)*Math.min(1,h*3.4);
 }
 if(c.off)vF-=vF*1.7*h;else if(c.kerb)vF-=vF*.25*h; // erba / cordoli
 if(vF>tp)vF-=(vF-tp)*3*h;
 // sterzo progressivo: meno angolo ad alta velocità
 c.steer+=(inp.st-c.steer)*Math.min(1,h*12);
 c.a+=c.steer*2.7/(1+Math.abs(vF)/480)*clamp(vF/70,-1,1)*h;
 // aderenza: la velocità laterale decade, ma solo se la gomma tiene
 c.slip=Math.abs(vL);let g=(inp.hb?2.2:7)*c.grip;if(c.slip>230)g*=.45;
 vL*=Math.exp(-g*h);
 c.vx=f.x*vF+r.x*vL;c.vy=f.y*vF+r.y*vL;c.x+=c.vx*h;c.y+=c.vy*h;
 // posizione sul tracciato
 // L'IA deve cercare prima attorno al proprio segmento: una scansione completa a
 // ogni frame può agganciare un ramo distante ma geometricamente vicino del circuito,
 // lasciando l'auto ferma sul posto pur con velocità calcolata. La ricerca completa
 // resta disponibile solo se è davvero uscita dalla pista o ha perso il riferimento.
 const lostTrack=!Number.isFinite(c.idx)||Math.abs(c.d||0)>TW*.6||c.trackGuard>0;
 let ni=nearest(c,lostTrack),q=T[ni],d=(c.x-q.x)*q.nx+(c.y-q.y)*q.ny;
 // Il follower dei bot restituisce anche il segmento effettivamente raggiunto:
 // aggiornare tempi e giri con quello evita disallineamenti tra posizione e velocità.
 if(c.ai){const followed=followTrackAsBot(c,ni,h);ni=followed.idx;q=T[ni];d=followed.d;}
 if(state==='racing'||state==='quali'){sectorProgress(c,c.idx,ni);progress(c,c.idx,ni);}c.idx=ni;c.d=d;
 // L'erba resta percorribile e rallenta la vettura; i muri fermano solo chi va davvero fuori.
 let ad=Math.abs(d);c.off=ad>TW/2+22;
 const k=ad>TW/2&&!c.off;
 if(k&&!c.kerb&&c.isP&&Math.abs(vF)>200)beep(120,.05,'square',.1);c.kerb=k;
 // barriere di sicurezza: rimbalzo e perdita di velocità
 const lim=TW/2+BAR;
 if(ad>lim){const sg=Math.sign(d);c.x-=q.nx*sg*(ad-lim);c.y-=q.ny*sg*(ad-lim);const vn=c.vx*q.nx+c.vy*q.ny;
  if(vn*sg>0){c.vx-=1.5*vn*q.nx;c.vy-=1.5*vn*q.ny;c.vx*=.6;c.vy*=.6;hit(Math.abs(vn));}}
}
function stepAllCars(dt){const n=Math.max(1,Math.ceil(dt/.01)),h=dt/n;
 for(let s=0;s<n;s++){for(const c of cars)stepCar(c,h);collide();}}
