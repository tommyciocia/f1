'use strict';
/* Box: assegnazione permanente, ingresso facoltativo, transito e uscita assistita.
   Le fasi garage/release oppure entry -> lane -> exit -> track usano fisica e follower esistenti.
   Un futuro ingresso/sosta potrà aggiungere fasi senza cambiare il sistema di guida. */
const PIT={speedLimit:80/.32,entryStart:80,entryCaptureEnd:300,entryEnd:900,laneStart:280,laneEnd:3300,exitEnd:4400,laneD:-290,stallD:-470,exitD:-65,mergeLength:300,releaseInterval:2};
const pitActive=c=>!!c.pit&&c.pit.phase!=='track';
const onTrack=c=>!pitActive(c);
// Ingresso e ricongiungimento sono già traffico per l'IA, prima del cambio di fase.
const trackTraffic=c=>onTrack(c)||c.go&&(c.pit.phase==='entry'||c.pit.phase==='exit');
const pitEase=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function pitPoint(s,d){const q=botPointAt(s);return{x:q.x+q.nx*d,y:q.y+q.ny*d,trackS:s,trackD:d};}
function pitEntryOffset(s){return PIT.exitD+(PIT.laneD-PIT.exitD)*pitEase((s-PIT.entryStart)/(PIT.entryEnd-PIT.entryStart));}
function pitExitOffset(s){return PIT.laneD+(PIT.exitD-PIT.laneD)*pitEase((s-PIT.laneEnd)/(PIT.exitEnd-PIT.laneEnd));}
const PIT_GARAGES=TEAMS.map((_,team)=>({team,s:500+team*200}));
function finishPitRoute(points){
 let length=0;
 points.forEach((p,i)=>{const b=points[i+1];p.s=length;p.len=b?Math.hypot(b.x-p.x,b.y-p.y):1;p.ang=b?Math.atan2(b.y-p.y,b.x-p.x):botPointAt(PIT.exitEnd).ang;if(b)length+=p.len;});
 return{points,length};
}
function makePitRoute(stallS){
 const points=[],count=Math.ceil((PIT.exitEnd-stallS)/12);
 for(let k=0;k<=count;k++){
  const s=stallS+(PIT.exitEnd-stallS)*k/count;
  const d=s<stallS+PIT.mergeLength?PIT.stallD+(PIT.laneD-PIT.stallD)*pitEase((s-stallS)/PIT.mergeLength):pitExitOffset(s);
  points.push(pitPoint(s,d));
 }
 return finishPitRoute(points);
}
function makePitEntryRoute(c,s,d){
 const points=[],count=Math.ceil((PIT.exitEnd-s)/12),offset=d-pitEntryOffset(s);
 for(let k=0;k<=count;k++){
  const at=s+(PIT.exitEnd-s)*k/count;
  const lane=at<PIT.entryEnd?pitEntryOffset(at)+offset*(1-pitEase((at-s)/(PIT.entryEnd-s))):pitExitOffset(at);
  points.push(pitPoint(at,lane));
 }
 // La prima coordinata è quella reale del giocatore: nessun riposizionamento all'ingresso.
 points[0].x=c.x;points[0].y=c.y;
 return finishPitRoute(points);
}
function pitTrackPosition(c){
 let best=Infinity,position=null;
 for(let i=0;i<N;i++){
  const q=T[i],along=clamp((c.x-q.x)*Math.cos(q.ang)+(c.y-q.y)*Math.sin(q.ang),0,q.len);
  const distance=(c.x-q.x-Math.cos(q.ang)*along)**2+(c.y-q.y-Math.sin(q.ang)*along)**2;
  if(distance<best){best=distance;const s=(q.s+along)%L,p=botPointAt(s);position={s,i:p.i,d:(c.x-p.x)*p.nx+(c.y-p.y)*p.ny};}
 }
 return position;
}
function requestPitEntry(c=pl){
 if(!c||!c.isP||!c.go||c.fin||c.qd||pitActive(c)||(state!=='racing'&&state!=='quali'))return false;
 c.pit.requested=!c.pit.requested;
 banner(c.pit.requested?'BOX PRENOTATI: ingresso a sinistra, max 80 km/h':'INGRESSO BOX ANNULLATO',2200);
 return true;
}
function tryPitEntry(c){
 if(!c||!c.isP||!c.pit.requested||pitActive(c)||!c.go||c.fin||c.qd||(state!=='racing'&&state!=='quali'))return false;
 const p=pitTrackPosition(c),speed=Math.hypot(c.vx,c.vy),q=botPointAt(p.s);
 // Il pilota raggiunge l'entrata indicata, sul lato sinistro, già sotto il limite.
 // Una prenotazione lontano dall'ingresso non cambia posizione, velocità o comandi.
 if(p.s<PIT.entryStart||p.s>PIT.entryCaptureEnd||Math.abs(p.d-pitEntryOffset(p.s))>30||p.d>-25||speed>PIT.speedLimit+1e-6||c.vx*Math.cos(q.ang)+c.vy*Math.sin(q.ang)<=0)return false;
 c.pit.route=makePitEntryRoute(c,p.s,p.d);c.pit.progress=0;c.pit.phase='entry';c.pit.fromTrack=true;c.pit.requested=false;
 c.idx=p.i;c.trackS=p.s;c.d=p.d;c.lane=p.d;c.off=c.kerb=false;c.tow=0;c.yaw=0;c.steer=0;c.stuck=0;c.recoveryT=0;c.passTarget=null;c.passSide=0;
 if(state==='quali'){
  c.lap=-1;c.lapStart=raceTime;c.secs=[null,null,null];c.secDelta=[null,null,null];c.secState=['wait','wait','wait'];c.secStart=raceTime;c.activeSec=0;
 }
 banner('INGRESSO BOX · GUIDA ASSISTITA · MAX 80 km/h',1800);
 return true;
}
function pitHudMessage(c){
 if(c.pit.requested)return 'BOX PRENOTATI · INGRESSO A SINISTRA · MAX 80 km/h';
 if(!pitActive(c))return '';
 if(!c.go)return 'BOX · IN ATTESA';
 const phase=c.pit.phase==='entry'?'INGRESSO BOX':c.pit.fromTrack&&c.pit.phase==='lane'?'TRANSITO BOX':'USCITA BOX';
 return phase+' · MAX 80 km/h · GUIDA ASSISTITA';
}
function assignPitStalls(){
 for(const garage of PIT_GARAGES){
  const residents=cars.filter(c=>c.team===garage.team).sort((a,b)=>a.e.di-b.e.di);
  residents.forEach((c,slot)=>{const stallS=garage.s+(residents.length===1?0:(slot?44:-44));
   c.pit={team:c.team,slot,stallId:c.team+':'+slot,stallS,phase:'track',progress:0,route:makePitRoute(stallS),requested:false,fromTrack:false};
  });
 }
}
function parkInGarage(c){
 const p=botPointAt(0,c.pit.route),q=botPointAt(p.trackS);
 c.pit.phase='garage';c.pit.progress=0;c.go=false;c.x=p.x;c.y=p.y;c.a=p.ang;c.vx=c.vy=0;c.idx=q.i;c.trackS=p.trackS;c.d=p.trackD;c.lane=p.trackD;
 c.off=c.kerb=false;c.tow=0;c.steer=0;c.yaw=0;
}
function canReleaseFromGarage(c){
 // Aspetta solo se il tratto iniziale è materialmente occupato, senza sovrapporre le auto.
 const p=botPointAt(100,c.pit.route);
 return cars.every(o=>o===c||pitActive(o)&&!o.go||Math.hypot(o.x-c.x,o.y-c.y)>100&&Math.hypot(o.x-p.x,o.y-p.y)>100);
}
function pitTrafficSpeed(c){
 let target=PIT.speedLimit;
 for(const o of cars){
  if(o===c||!o.go)continue;
  const dx=o.x-c.x,dy=o.y-c.y,f=dx*Math.cos(c.a)+dy*Math.sin(c.a),side=Math.abs(-dx*Math.sin(c.a)+dy*Math.cos(c.a));
  if(f<=0||f>360||side>66)continue;
  const speed=Math.max(0,o.vx*Math.cos(c.a)+o.vy*Math.sin(c.a));
  // Spazio per una vettura intera più il margine di frenata: le attese non sono stalli.
  target=Math.min(target,Math.max(0,speed+(f-105)*1.5));
 }
 return target;
}
function canMergeFromPits(c){
 const end=botPointAt(PIT.exitEnd),exit=pitPoint(PIT.exitEnd,PIT.exitD);
 return cars.every(o=>{
  if(o===c||!onTrack(o))return true;
  const along=(o.x-exit.x)*Math.cos(end.ang)+(o.y-exit.y)*Math.sin(end.ang);
  const side=Math.abs((o.x-exit.x)*end.nx+(o.y-exit.y)*end.ny);
  if(side>160)return true;
  if(Math.abs(o.d-PIT.exitD)>AI_SIDE_GAP)return true;
  return along>160||along<-(Math.max(240,Math.hypot(o.vx,o.vy)*1.4));
 });
}
function pitInput(c){
 if(!c.go)return{st:0,thr:0,brk:0,hb:false};
 let target=pitTrafficSpeed(c);c.pit.yielding=false;
 // Prima della corsia di accelerazione si dà precedenza a chi è già sul circuito.
 // Dopo aver impegnato l'uscita, le normali distanze di traffico gestiscono il ricongiungimento.
 if(c.trackS<PIT.laneEnd+30&&!canMergeFromPits(c)){
  const distance=Math.max(0,PIT.laneEnd-c.trackS-15);
  target=Math.min(target,Math.sqrt(2*c.brk*.55*distance));c.pit.yielding=target<PIT.speedLimit;
 }
 const p=botPointAt(Math.min(c.pit.route.length,c.pit.progress+100),c.pit.route);
 const st=clamp(angDiff(Math.atan2(p.y-c.y,p.x-c.x),c.a)*3.15,-1,1);
 return speedInput(Math.hypot(c.vx,c.vy),target,st);
}
function updatePitPhase(c){
 if(c.pit.progress>=c.pit.route.length-1e-6){
  c.pit.phase='track';c.lane=c.d;c.launchLane=c.d;c.launchT=1.5;c.stuck=0;c.pit.yielding=false;
 }else if(c.pit.fromTrack)c.pit.phase=c.trackS<PIT.entryEnd?'entry':c.trackS>=PIT.laneEnd?'exit':'lane';
 else c.pit.phase=c.trackS>=PIT.laneEnd?'exit':c.trackS>=c.pit.stallS+PIT.mergeLength?'lane':'release';
}
// Il transito non prevede fermate, gomme o rifornimento. L'AI non richiede rientri in gara.
const pitEntryPoints=[];
for(let s=PIT.entryStart;s<PIT.entryEnd;s+=12)pitEntryPoints.push(pitPoint(s,pitEntryOffset(s)));
pitEntryPoints.push(pitPoint(PIT.entryEnd,PIT.laneD));
const pitLanePoints=[];
for(let s=PIT.laneStart;s<PIT.exitEnd;s+=15)pitLanePoints.push(pitPoint(s,pitExitOffset(s)));
pitLanePoints.push(pitPoint(PIT.exitEnd,PIT.exitD));
rebuildMiniTrack([...pitEntryPoints,...pitLanePoints,...PIT_GARAGES.map(g=>pitPoint(g.s,-590))]);
function strokePitLine(g,points,width,color){g.beginPath();points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.lineWidth=width;g.strokeStyle=color;g.stroke();}
function drawPits(){
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 const apron=[];for(let s=340;s<=3050;s+=20)apron.push(pitPoint(s,-390));
 strokePitLine(ctx,apron,220,'#555b63');
 strokePitLine(ctx,pitEntryPoints,104,'#eee');strokePitLine(ctx,pitEntryPoints,96,'#454b53');
 strokePitLine(ctx,pitLanePoints,104,'#eee');strokePitLine(ctx,pitLanePoints,96,'#454b53');
 ctx.setLineDash([30,30]);strokePitLine(ctx,pitEntryPoints,3,'#e8ca62');strokePitLine(ctx,pitLanePoints,3,'#e8ca62');ctx.setLineDash([]);
 const entrySign=pitPoint(PIT.entryStart+80,-170);ctx.save();ctx.translate(entrySign.x,entrySign.y);ctx.rotate(botPointAt(PIT.entryStart+80).ang);ctx.fillStyle='#fff';ctx.font='bold 18px Segoe UI,sans-serif';ctx.textAlign='left';ctx.fillText('BOX → 80',0,0);ctx.restore();
 for(const garage of PIT_GARAGES){
  const q=botPointAt(garage.s),residents=cars.filter(c=>c.team===garage.team),col=garage.team===TEAMS.length-1?S.my.c1:TEAMS[garage.team][0];
  ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.ang);
  ctx.fillStyle='#1c222a';ctx.fillRect(-90,-585,180,180);ctx.strokeStyle='#a1a8af';ctx.lineWidth=3;ctx.strokeRect(-90,-585,180,180);
  ctx.fillStyle=col;ctx.fillRect(-90,-585,180,16);ctx.fillStyle='#fff';ctx.font='bold 14px Segoe UI,sans-serif';ctx.textAlign='center';
  ctx.fillText(garage.team===TEAMS.length-1?S.my.name:teamName(garage.team),0,-546,170);
  for(const c of residents){const x=c.pit.stallS-garage.s;ctx.strokeStyle=col;ctx.lineWidth=2;ctx.strokeRect(x-41,-513,82,86);ctx.fillStyle='#fff';ctx.font='12px Segoe UI,sans-serif';ctx.fillText(c.code+' #'+c.num,x,-415);}
  ctx.restore();
 }
 const sign=pitPoint(PIT.laneStart+100,PIT.laneD+62);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sign.x,sign.y,28,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e10600';ctx.lineWidth=6;ctx.stroke();ctx.fillStyle='#111';ctx.font='bold 22px Segoe UI,sans-serif';ctx.textAlign='center';ctx.fillText('80',sign.x,sign.y+8);
 ctx.restore();
}
function drawMiniPits(){for(const points of [pitEntryPoints,pitLanePoints])strokePitLine(mctx,points.map(p=>({x:mX(p),y:mY(p)})),2,'#ddd');}
