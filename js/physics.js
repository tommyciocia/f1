'use strict';
/* Fisica di una vettura (accelerazione, frenata, aderenza, barriere) e avanzamento di tutte le vetture */
let physicsStepDuration=0;
function stepCar(c,h){
 const previousTrackS=c.trackS;
 if(pitActive(c)&&!c.go)return;
 if(c.pit?.phase==='waiting'||c.pit?.phase==='service'){c.vx=c.vy=0;return;}
 const inPits=pitAutopilot(c);
 const f={x:Math.cos(c.a),y:Math.sin(c.a)},r={x:-f.y,y:f.x},inp=c.inp;
 let vF=c.vx*f.x+c.vy*f.y,vL=c.vx*r.x+c.vy*r.y;
 // La scia dà un vantaggio limitato, ma abbastanza evidente per preparare un sorpasso.
 const go=c.go,traction=inPits?1:tyreGrip(c),tp=inPits?pitVelocityLimit(c):c.top*tyreSpeed(c)*(1+.075*(c.tow||0));
 // acceleratore progressivo (cala verso la velocità massima)
 if(go&&inp.thr>0)vF+=inp.thr*c.accel*traction*(1+.46*(c.tow||0))*(1-clamp(vF/tp,0,1)**2)*h*(c.off?.45:1);
 else vF-=vF*.35*h;
 if(go&&inp.brk>0)vF=vF>=0?Math.max(0,vF-inp.brk*c.brk*traction*h):Math.min(0,vF+inp.brk*c.brk*traction*h);
 // La retromarcia ha un comando esplicito: frena prima, poi arretra gradualmente.
 if(go&&inp.rev>0&&!inPits&&!inp.brk)vF=vF>8?Math.max(0,vF-inp.rev*c.brk*h):Math.max(-150,vF-inp.rev*380*h);
 if(inp.hb&&go){vF-=Math.sign(vF)*500*h;}
 // Rete di sicurezza fisica per le IA: una collisione o un riferimento di traiettoria
 // non può lasciarle ferme in mezzo alla pista. È un recupero graduale, non un reset.
 if(c.ai&&!inPits&&go&&(state==='racing'||state==='quali')&&!c.fin&&vF<115){
  const rollingTarget=c.recoveryT>0?185:125;
  vF+=(rollingTarget-vF)*Math.min(1,h*3.4);
 }
 if(c.off)vF-=vF*1.7*h;else if(c.kerb)vF-=vF*.25*h; // erba / cordoli
 if(vF>tp)vF-=(vF-tp)*3*h;
 // sterzo progressivo: meno angolo ad alta velocità
 c.steer+=(inp.st-c.steer)*Math.min(1,h*12);
 c.a+=c.steer*2.7/(1+Math.abs(vF)/480)*clamp(vF/70,-1,1)*h;
 // aderenza: la velocità laterale decade, ma solo se la gomma tiene
 c.slip=Math.abs(vL);let g=(inp.hb?2.2:7)*c.grip*tyreGrip(c);if(c.slip>230)g*=.45;
 vL*=Math.exp(-g*h);
 if(inPits){vF=clamp(vF,0,pitVelocityLimit(c));vL=0;}
 c.wheelPhase=((c.wheelPhase||0)+Math.abs(vF)*h*.02)%(Math.PI*2);
 c.vx=f.x*vF+r.x*vL;c.vy=f.y*vF+r.y*vL;c.x+=c.vx*h;c.y+=c.vy*h;
 // posizione sul tracciato
 // L'IA deve cercare prima attorno al proprio segmento: una scansione completa a
 // ogni frame può agganciare un ramo distante ma geometricamente vicino del circuito,
 // lasciando l'auto ferma sul posto pur con velocità calcolata. La ricerca completa
 // resta disponibile solo se è davvero uscita dalla pista o ha perso il riferimento.
 const lostTrack=!Number.isFinite(c.idx)||Math.abs(c.d||0)>TW*.6||c.trackGuard>0;
 // I bot hanno già un avanzamento longitudinale persistente: la ricerca spaziale
 // serve al giocatore manuale, non a ricalcolare 23 volte lo stesso riferimento.
 let ni=(inPits||c.ai&&Number.isFinite(c.trackS))&&Number.isFinite(c.idx)?c.idx:nearest(c,lostTrack),q=T[ni],d=(c.x-q.x)*q.nx+(c.y-q.y)*q.ny;
 // Il follower dei bot restituisce anche il segmento effettivamente raggiunto:
 // aggiornare tempi e giri con quello evita disallineamenti tra posizione e velocità.
 if(c.ai||inPits){const followed=followTrackAsBot(c,ni,h);ni=followed.idx;q=T[ni];d=followed.d;}
 if(!c.ai&&!inPits){const along=clamp((c.x-q.x)*Math.cos(q.ang)+(c.y-q.y)*Math.sin(q.ang),0,q.len);c.trackS=wrapDistance(q.s+along);}
 // I box reali attraversano il traguardo: il giro in gara conta anche nel transito.
 // L'out-lap di qualifica resta invece escluso fino all'uscita dalla corsia.
 if((!inPits||state==='racing')&&(state==='racing'||state==='quali')){recordRaceTiming(c,previousTrackS,c.trackS);sectorProgress(c,c.idx,ni,previousTrackS,c.trackS);progress(c,c.idx,ni,previousTrackS,c.trackS);}c.idx=ni;c.d=d;
 // Box e corsia di uscita hanno la propria superficie; non sono erba o barriere.
 if(inPits){c.off=c.kerb=false;return;}
 // Chi si trova già sulla corsia può proseguire manualmente fino alla pressione di X.
 // Anche qui il fondo è asfalto e il limitatore è reale; il muro resta attivo altrove.
 if(c.isP&&!c.ai){const surface=pitRoadSurface(c);c.pit.onLane=surface.limited&&(c.pit.onLane||surface.position.s<PIT.laneEnd);
  if(surface.road){c.off=c.kerb=false;const speed=Math.hypot(c.vx,c.vy);if(c.pit.onLane&&speed>PIT.speedLimit){c.vx*=PIT.speedLimit/speed;c.vy*=PIT.speedLimit/speed;}return;}}
 // L'erba resta percorribile e rallenta la vettura; i muri fermano solo chi va davvero fuori.
 let ad=Math.abs(d);c.off=ad>TW/2+22;
 const k=ad>TW/2&&!c.off;
 if(k&&!c.kerb&&c.isP&&Math.abs(vF)>200)beep(120,.05,'square',.1);c.kerb=k;
 // barriere di sicurezza: rimbalzo e perdita di velocità
 const lim=TW/2+BAR;
 if(ad>lim){const sg=Math.sign(d);c.x-=q.nx*sg*(ad-lim);c.y-=q.ny*sg*(ad-lim);const vn=c.vx*q.nx+c.vy*q.ny;
  if(vn*sg>0){c.vx-=1.5*vn*q.nx;c.vy-=1.5*vn*q.ny;c.vx*=.6;c.vy*=.6;hit(Math.abs(vn));}}
}
function stepAllCars(dt){const n=Math.max(1,Math.ceil(dt/.01)),h=dt/n,end=raceTime;
 const running=state==='racing'||state==='quali';physicsStepDuration=running?h:0;
 try{for(let s=0;s<n;s++){
  if(running)raceTime=end-dt+(s+1)*h;
  for(const c of cars)stepCar(c,h);collide();
 }}finally{raceTime=end;physicsStepDuration=0;}}
