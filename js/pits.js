'use strict';
/* Box: ingresso X, fermata alla piazzola e cambio gomme confermato dal giocatore. */
const PIT={speedLimit:80/.32,laneD:-290,stallD:-470,exitD:0,mergeLength:300,releaseInterval:.5,tyreServiceTime:2.8,serviceAllowed:true};
const pitActive=c=>!!c.pit&&c.pit.phase!=='track';
const pitAutopilot=c=>pitActive(c)&&c.go&&c.pit.auto!==false;
const pitLimited=c=>pitAutopilot(c)?c.pit.phase!=='approach':!!c.pit?.onLane;
const pitVelocityLimit=c=>pitLimited(c)?PIT.speedLimit:pitAutopilot(c)?Math.max(PIT.speedLimit,c.pit.approachMaxSpeed||0):Infinity;
const onTrack=c=>!pitActive(c);
// Ingresso e ricongiungimento sono già traffico per l'IA, prima del cambio di fase.
const trackTraffic=c=>onTrack(c)||c.go&&['approach','entry','exit'].includes(c.pit.phase);
const pitEase=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function pitCoordinate(s){return signedTrackDistance(0,s);}
function pitCenterAt(s,circuit=activeCircuit){
 const pts=circuit.pitData.samples;s=clamp(s,pts[0].trackS,pts.at(-1).trackS);let low=0,high=pts.length-1;
 while(low<high){const mid=Math.ceil((low+high)/2);if(pts[mid].trackS<=s)low=mid;else high=mid-1;}
 const a=pts[low],b=pts[Math.min(low+1,pts.length-1)],t=clamp((s-a.trackS)/(b.trackS-a.trackS||1),0,1),ang=a.ang+angDiff(b.ang,a.ang)*t;
 return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,ang,nx:-Math.sin(ang),ny:Math.cos(ang)};
}
function pitPoint(s,d=PIT.laneD,circuit=activeCircuit){
 const q=pitCenterAt(s,circuit),data=circuit.pitData,offset=(d-PIT.laneD)*-data.side;
 const release=smoothStep((s-data.laneEnd)/(data.exitEnd-data.laneEnd));
 return{x:q.x+q.nx*offset,y:q.y+q.ny*offset,trackS:s,trackD:d-PIT.laneD*release};
}
// Tutte le piazzole vengono dopo il raccordo e lasciano spazio per il rientro in corsia.
const PIT_GARAGES=[];
function finishPitRoute(points){
 let length=0;
 points.forEach((p,i)=>{const b=points[i+1];p.s=length;p.len=b?Math.hypot(b.x-p.x,b.y-p.y):1;p.ang=b?Math.atan2(b.y-p.y,b.x-p.x):botPointAt(PIT.exitEnd).ang;if(b)length+=p.len;});
 return{points,length};
}
function makePitRoute(stallS){
 const points=[],count=Math.ceil((PIT.exitEnd-stallS)/12);
 for(let k=0;k<=count;k++){
  const s=stallS+(PIT.exitEnd-stallS)*k/count;
  const d=s<stallS+PIT.mergeLength?PIT.stallD+(PIT.laneD-PIT.stallD)*pitEase((s-stallS)/PIT.mergeLength):PIT.laneD;
  points.push(pitPoint(s,d));
 }
 return finishPitRoute(points);
}
function makePitEntryRoute(c,s,d,inside=false){
 const speed=Math.hypot(c.vx,c.vy),brakeDistance=inside?0:Math.max(0,(speed*speed-PIT.speedLimit**2)/(2*c.brk*.85));
 const brakeEnd=s+(brakeDistance>0?brakeDistance+35:0),join=inside?Math.min(s+300,PIT.laneEnd):PIT.entryEnd;
 // In qualifica, o se la propria piazzola è già stata superata, si prosegue in avanti.
 const stop=PIT.serviceAllowed&&mode==='race'&&c.pit.stallS>=join+PIT.mergeLength;
 const end=stop?c.pit.stallS:PIT.exitEnd,stallEntry=c.pit.stallS-PIT.mergeLength;
 const points=[],count=Math.ceil((end-s)/10);
 for(let k=0;k<=count;k++){
  const at=s+(end-s)*k/count;
  const base=pitPoint(at,PIT.laneD);
  if(!inside&&at<join){
   const q=pointAtDistance(at,activeCircuit,true),blend=pitEase((at-Math.max(PIT.entryStart,brakeEnd))/Math.max(120,join-Math.max(PIT.entryStart,brakeEnd)));
   const x=q.x+q.nx*d,y=q.y+q.ny*d;
   points.push({x:x+(base.x-x)*blend,y:y+(base.y-y)*blend,trackS:at,trackD:d+(PIT.laneD-d)*blend});
  }else if(stop)points.push(pitPoint(at,PIT.laneD+(PIT.stallD-PIT.laneD)*pitEase((at-stallEntry)/PIT.mergeLength)));
  else points.push(base);
 }
 // La prima coordinata è quella reale del giocatore: nessun riposizionamento all'ingresso.
 points[0].x=c.x;points[0].y=c.y;
 const stallIndex=points.length-1;
 if(stop)points.push(...makePitRoute(c.pit.stallS).points.slice(1));
 const route=finishPitRoute(points);
 route.stopAt=stop?route.points[stallIndex].s:Infinity;route.brakeEnd=brakeEnd;route.joinS=inside?s:join;return route;
}
function pitTrackPosition(c){
 let best=Infinity,bestS=0;
 for(let i=0;i<N;i++){
  const q=T[i],along=clamp((c.x-q.x)*Math.cos(q.ang)+(c.y-q.y)*Math.sin(q.ang),0,q.len);
  const distance=(c.x-q.x-Math.cos(q.ang)*along)**2+(c.y-q.y-Math.sin(q.ang)*along)**2;
  if(distance<best){best=distance;bestS=(q.s+along)%L;}
 }
 const p=botPointAt(bestS);return{s:bestS,i:p.i,d:(c.x-p.x)*p.nx+(c.y-p.y)*p.ny};
}
function pitEntryInfo(c){
 if(!c||!c.go||c.fin||c.qd||pitAutopilot(c)||c.pit?.phase==='waiting'||c.pit?.phase==='service'||state==='quali'&&(qEnd||!c.qActive)||(state!=='racing'&&state!=='quali'))return null;
 const near=pitCoordinate(c.trackS);if(!c.pit.onLane&&(near<PIT.entryZoneStart-100||near>PIT.exitEnd+100))return null;
 const surface=nearestPitPoint(c),p=pitTrackPosition(c);p.s=pitCoordinate(p.s);
 const inside=surface.distance<42&&surface.s>=PIT.laneStart&&surface.s<PIT.exitEnd-40;
 const q=inside?pitCenterAt(surface.s):botPointAt(p.s),forward=c.vx*Math.cos(c.a)+c.vy*Math.sin(c.a);
 if(Math.cos(c.a-q.ang)<.7||forward<-5)return null;
 if(inside&&(c.pit.onLane||Math.abs(p.d)>TW/2+10))return{s:surface.s,i:pointAtDistance(surface.s).i,d:PIT.laneD,inside:true};
 if(p.s>=PIT.entryZoneStart&&p.s<=PIT.entryCaptureEnd&&Math.abs(p.d)<=TW/2+10)return{...p,inside:false};
 return null;
}
function requestPitEntry(c=pl){return !!c&&c.isP&&tryPitEntry(c);}
function tryPitEntry(c){
 const p=pitEntryInfo(c);if(!p)return false;
 return startPitAutopilot(c,p);
}
function startPitAutopilot(c,p,resetLap=true){
 const speed=Math.hypot(c.vx,c.vy);
 c.pit.route=makePitEntryRoute(c,p.s,p.d,p.inside);c.pit.progress=0;c.pit.phase=!p.inside&&speed>PIT.speedLimit?'approach':p.inside?'lane':'entry';
 c.pit.auto=true;c.pit.approachMaxSpeed=speed;c.pit.entryJoinS=c.pit.route.joinS;c.pit.fromTrack=true;c.pit.requested=false;c.pit.onLane=p.inside;
 c.pit.stopPending=Number.isFinite(c.pit.route.stopAt);
 c.idx=p.i;c.trackS=p.s;c.d=p.d;c.lane=p.d;c.off=c.kerb=false;c.tow=0;c.yaw=0;c.steer=0;c.stuck=0;c.recoveryT=0;c.passTarget=null;c.passSide=0;
 if(state==='quali'&&resetLap){
  invalidateQualiLap(c);
  c.lap=-1;c.lapStart=raceTime;c.secs=[null,null,null];c.secDelta=[null,null,null];c.secState=['wait','wait','wait'];c.secStart=raceTime;c.activeSec=0;
 }
 if(c.isP)banner(c.pit.phase==='approach'?'FRENATA AUTOMATICA · INGRESSO BOX':'PILOTA AUTOMATICO BOX · MAX 80 km/h',1800);
 return true;
}
function aiServiceCompound(c){
 return bestAiTyrePlan(c,remainingRaceLaps(c)).compound;
}
function choosePitCompound(compound){
 if(!pl?.pit||pl.pit.phase!=='waiting'||!TYRE_COMPOUNDS[compound])return false;
 pl.pit.selectedCompound=compound;renderPitService();return true;
}
function renderPitService(){
 const panel=$('pitService'),active=pl?.pit?.phase==='waiting'||pl?.pit?.phase==='service';
 panel.classList.toggle('hidden',!active);if(!active)return;
 const tyre=TYRE_COMPOUNDS[pl.pit.selectedCompound]||TYRE_COMPOUNDS.SOFT;
 $('pitServiceStatus').textContent=pl.pit.phase==='service'?'Cambio '+tyre.name+' in corso… '+Math.ceil(pl.pit.serviceLeft)+' s':'Selezionata: '+tyre.name;
 document.querySelectorAll('#pitService [data-tyre]').forEach(button=>button.classList.toggle('selected',button.dataset.tyre===pl.pit.selectedCompound));
 $('confirmTyres').classList.toggle('hidden',pl.pit.phase==='service');
}
function startPitService(c,compound){
 if(!PIT.serviceAllowed||mode!=='race'||state!=='racing'||!c?.go||c.fin||!c.pit||c.pit.phase!=='waiting'||!TYRE_COMPOUNDS[compound])return false;
 c.pit.selectedCompound=compound;c.pit.phase='service';c.pit.serviceStarted=true;c.pit.serviceLeft=PIT.tyreServiceTime;c.pit.auto=false;c.vx=c.vy=0;
 if(c.isP){renderPitService();banner('CAMBIO GOMME · '+TYRE_COMPOUNDS[compound].name,1200);}return true;
}
function confirmPitTyres(){return startPitService(pl,pl?.pit?.selectedCompound);}
function updatePitService(c,dt){
 if(mode!=='race'||state!=='racing'||c.pit?.phase!=='service'||!c.pit.serviceStarted)return;
 c.pit.serviceLeft=Math.max(0,c.pit.serviceLeft-dt);c.vx=c.vy=0;
 if(c.isP)renderPitService();
 if(c.pit.serviceLeft>0)return;
 c.pit.serviceStarted=false;
 if(!c.fin&&c.go){fitTyres(c,c.pit.selectedCompound);c.pitStops++;planAiPitStop(c);}
 c.pit.phase='release';c.pit.auto=true;c.pit.onLane=true;c.pit.yielding=false;
 if(c.isP){renderPitService();banner(TYRE_COMPOUNDS[c.tyres.compound].name+' · 100%',1500);}
}
function pitRoadSurface(c){
 const near=pitCoordinate(c.trackS);if(!c.pit.onLane&&(near<PIT.entryStart-100||near>PIT.exitEnd+100))return{road:false,limited:false,position:{s:near,i:c.idx,d:c.d}};
 const p=nearestPitPoint(c),lane=p.distance<=46,apron=pitAprons.some(poly=>pointInPolygon(c,poly));
 return{road:lane||apron,limited:(lane||apron)&&p.s>=PIT.laneStart,position:{s:p.s,i:pointAtDistance(p.s).i,d:PIT.laneD}};
}
function nearestPitPoint(c){
 let distance=Infinity,s=0;const pts=activeCircuit.pitData.samples;
 for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((c.x-a.x)*dx+(c.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1),d=Math.hypot(c.x-a.x-dx*t,c.y-a.y-dy*t);if(d<distance){distance=d;s=a.trackS+(b.trackS-a.trackS)*t;}}
 return{distance,s};
}
function pointInPolygon(p,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
function updatePitPrompt(){
 const prompt=$('pitPrompt'),info=pitEntryInfo(pl),text=info?'PREMI X PER ENTRARE AI BOX':'';
 prompt.textContent=text;prompt.classList.toggle('hidden',!text);
}
function pitHudMessage(c){
 if(!pitActive(c))return '';
 if(!c.go)return 'BOX · IN ATTESA';
 if(c.pit.phase==='approach')return 'INGRESSO BOX · FRENATA AUTOMATICA';
 if(c.pit.phase==='waiting')return 'BOX · SCEGLI LE GOMME';if(c.pit.phase==='service')return 'BOX · CAMBIO GOMME';
 const phase=c.pit.phase==='entry'?'INGRESSO BOX':c.pit.fromTrack&&c.pit.phase==='lane'?'TRANSITO BOX':'USCITA BOX';
 return phase+' · MAX 80 km/h · GUIDA ASSISTITA';
}
function pitStopBadge(c){
 if(!PIT.serviceAllowed)return '';
 const missed=missedMandatoryPit(c),met=pitObligationSatisfied(c);
 const label=missed?'DSQ':c.pitStops+(c.pitRequired?'/1':'');
 const title=missed?'Squalificato: sosta obbligatoria non effettuata':c.pitStops+' soste completate · '+(c.pitRequired?'almeno una obbligatoria':'sosta facoltativa');
 return '<span class="pit-stop-status '+(missed?'pit-dsq':met?'pit-met':'pit-due')+'" title="'+title+'" aria-label="'+title+'">'+label+'</span>';
}
function pitRuleHud(){
 const status=$('pitRuleStatus');status.classList.toggle('hidden',mode!=='race');
 if(mode!=='race')return;
 if(!PIT.serviceAllowed){status.textContent='BOX · TRANSITO X · LIMITE 80 km/h';status.classList.remove('pit-due');status.classList.remove('pit-dsq');return;}
 const missed=missedMandatoryPit(pl),met=pitObligationSatisfied(pl);
 status.classList.toggle('pit-met',met);status.classList.toggle('pit-due',!met);status.classList.toggle('pit-dsq',missed);
 const text=missed?'SQUALIFICATO · SOSTA MANCANTE':pl.pitRequired?(met?'SOSTA OBBLIGATORIA COMPLETATA · '+pl.pitStops:'BOX OBBLIGATORIO · 0/1 · PREMI X ALL’INGRESSO'):'BOX FACOLTATIVO · SOSTE '+pl.pitStops;
 if(status.textContent!==text)status.textContent=text;
}
function assignPitStalls(){
 for(const garage of PIT_GARAGES){
  const residents=cars.filter(c=>c.team===garage.team).sort((a,b)=>a.e.di-b.e.di);
  residents.forEach((c,slot)=>{const stallS=garage.s+(residents.length===1?0:(slot?44:-44));
   c.pit={team:c.team,slot,stallId:c.team+':'+slot,stallS,phase:'track',progress:0,route:makePitRoute(stallS),requested:false,fromTrack:false,auto:false,onLane:false,selectedCompound:'SOFT',serviceLeft:0};
  });
 }
}
function parkInGarage(c){
 const p=botPointAt(0,c.pit.route),q=botPointAt(p.trackS);
 c.pit.phase='garage';c.pit.auto=false;c.pit.onLane=false;c.pit.progress=0;c.go=false;c.x=p.x;c.y=p.y;c.a=p.ang;c.vx=c.vy=0;c.idx=q.i;c.trackS=p.trackS;c.d=p.trackD;c.lane=p.trackD;
 c.off=c.kerb=false;c.tow=0;c.steer=0;c.yaw=0;
}
function canReleaseFromGarage(c){
 // Aspetta solo se il tratto iniziale è materialmente occupato, senza sovrapporre le auto.
 return cars.every(o=>o===c||pitActive(o)&&!o.go||Math.hypot(o.x-c.x,o.y-c.y)>100);
}
function pitTrafficSpeed(c){
 let target=PIT.speedLimit;
 const ownOrder=Math.round(c.trackS*10),speed=Math.hypot(c.vx,c.vy);
 for(const o of cars){
  if(o===c||!o.go)continue;
  const otherS=pitAutopilot(o)?o.trackS:pitCoordinate(o.ai?o.trackS:pitTrackPosition(o).s),distance=otherS-c.trackS,otherOrder=Math.round(otherS*10);
  // Un ordine longitudinale unico evita che due auto su raccordi con angoli diversi
  // si considerino entrambe "davanti", fermandosi a vicenda.
  if(otherOrder<ownOrder||otherOrder===ownOrder&&o.aiId>c.aiId||Math.abs(distance)>Math.max(500,speed))continue;
  const future=Math.max(otherS,c.trackS)+Math.max(300,speed*.7);
  const side=Math.min(Math.abs(o.d-c.d),Math.abs(pitLaneAt(c,future)-pitLaneAt(o,future)));
  if(side>72)continue;
  const aheadSpeed=Math.hypot(o.vx,o.vy),gap=110+Math.max(0,speed-aheadSpeed)*.6;
  target=Math.min(target,Math.max(0,aheadSpeed+(Math.max(0,distance)-gap)*1.5));
 }
 return target;
}
function pitLaneAt(c,s){
 if(!pitAutopilot(c))return c.d;
 const points=c.pit.route.points;let low=0,high=points.length-1;
 while(low<high){const mid=Math.ceil((low+high)/2);if(points[mid].trackS<=s)low=mid;else high=mid-1;}
 const a=points[low],b=points[Math.min(low+1,points.length-1)],t=clamp((s-a.trackS)/Math.max(1,b.trackS-a.trackS),0,1);
 return a.trackD+(b.trackD-a.trackD)*t;
}
function canMergeFromPits(c){
 const end=botPointAt(PIT.exitEnd),exit=pitPoint(PIT.exitEnd,PIT.laneD);
 return cars.every(o=>{
  if(o===c||!onTrack(o))return true;
  const along=(o.x-exit.x)*Math.cos(end.ang)+(o.y-exit.y)*Math.sin(end.ang);
  const side=Math.abs((o.x-exit.x)*end.nx+(o.y-exit.y)*end.ny);
  if(side>160)return true;
  if(Math.abs(o.d)>AI_SIDE_GAP)return true;
  return along>160||along<-(Math.max(240,Math.hypot(o.vx,o.vy)*1.4));
 });
}
function pitInput(c){
 if(!c.go||c.pit.phase==='waiting'||c.pit.phase==='service')return{st:0,thr:0,brk:0,hb:false};
 let target=pitTrafficSpeed(c);c.pit.yielding=false;
 if(c.pit.stopPending){const distance=Math.max(0,c.pit.route.stopAt-c.pit.progress);target=Math.min(target,Math.sqrt(2*c.brk*.45*distance));}
 // Prima della corsia di accelerazione si dà precedenza a chi è già sul circuito.
 // Dopo aver impegnato l'uscita, le normali distanze di traffico gestiscono il ricongiungimento.
 if(c.trackS<PIT.laneEnd+30&&!canMergeFromPits(c)){
  const distance=Math.max(0,PIT.laneEnd-c.trackS-15);
  target=Math.min(target,Math.sqrt(2*c.brk*.55*distance));c.pit.yielding=target<PIT.speedLimit;
 }
 const p=botPointAt(Math.min(c.pit.route.length,c.pit.progress+100),c.pit.route);
 const st=clamp(angDiff(Math.atan2(p.y-c.y,p.x-c.x),c.a)*3.15,-1,1);
 const speed=Math.hypot(c.vx,c.vy),input=speedInput(speed,target,st);
 // Anticipa la frenata reale: il solo controllo proporzionale della velocità
 // lasciava ancora velocità residua al punto di arresto.
 if(c.pit.stopPending&&speed>=Math.sqrt(2*c.brk*.45*Math.max(0,c.pit.route.stopAt-c.pit.progress))*.9){input.thr=0;input.brk=Math.max(input.brk,.5);}
 return input;
}
function updatePitPhase(c){
 if(c.pit.phase==='waiting'||c.pit.phase==='service')return;
 if(c.fin)c.pit.stopPending=false;
 if(c.pit.progress>=c.pit.route.length-1e-6){
  c.pit.phase='track';c.pit.auto=false;c.pit.onLane=false;c.lane=c.d;c.launchLane=c.d;c.launchT=1.5;c.stuck=0;c.pit.yielding=false;
 }else if(c.pit.stopPending&&c.pit.progress>=c.pit.route.stopAt-1e-6){
  c.pit.stopPending=false;c.pit.progress=c.pit.route.stopAt;c.pit.phase='waiting';c.pit.auto=false;c.pit.onLane=true;c.vx=c.vy=0;c.pit.selectedCompound=c.isP?(c.pit.selectedCompound||c.tyres.compound):aiServiceCompound(c);
  if(c.isP){renderPitService();banner('BOX · SCEGLI LA MESCOLA',1800);}else startPitService(c,c.pit.selectedCompound);
 }else if(c.pit.fromTrack){
  const joined=c.trackS>=c.pit.entryJoinS;
  const releasing=Number.isFinite(c.pit.route.stopAt)&&!c.pit.stopPending&&c.trackS<c.pit.stallS+PIT.mergeLength;
  c.pit.phase=!joined&&c.pit.phase==='approach'&&Math.hypot(c.vx,c.vy)>PIT.speedLimit?'approach':!joined?'entry':releasing?'release':c.trackS>=PIT.laneEnd?'exit':'lane';
  c.pit.onLane=joined;
 }
 else c.pit.phase=c.trackS>=PIT.laneEnd?'exit':c.trackS>=c.pit.stallS+PIT.mergeLength?'lane':'release';
}
const pitEntryPoints=[],pitLanePoints=[],pitRoadPoints=[],pitAprons=[];
function rebuildPitGeometry(){
 Object.assign(PIT,activeCircuit.pitData);PIT.entryZoneStart=PIT.entryStart-1200;PIT.entryCaptureEnd=PIT.entryStart+120;
 PIT_GARAGES.length=0;const start=PIT.laneStart+350,end=PIT.laneEnd-350;
 TEAMS.forEach((_,team)=>PIT_GARAGES.push({team,s:start+(end-start)*team/(TEAMS.length-1)}));
 pitEntryPoints.length=pitLanePoints.length=pitRoadPoints.length=pitAprons.length=0;
 for(let s=PIT.entryStart;s<PIT.entryEnd;s+=12)pitEntryPoints.push(pitPoint(s,PIT.laneD));
 pitEntryPoints.push(pitPoint(PIT.entryEnd,PIT.laneD));
 for(let s=PIT.laneStart;s<PIT.exitEnd;s+=15)pitLanePoints.push(pitPoint(s,PIT.laneD));
 pitLanePoints.push(pitPoint(PIT.exitEnd,PIT.laneD));
 pitRoadPoints.push(...pitEntryPoints,...pitLanePoints.slice(1));
 for(const [from,to] of [[PIT.entryStart,PIT.entryEnd],[PIT.laneEnd,PIT.exitEnd]]){
  const inner=[],outer=[];for(let s=from;s<=to+1;s+=Math.min(25,(to-from)/30)){const at=Math.min(s,to),q=pointAtDistance(at,activeCircuit,true),p=pitCenterAt(at);inner.push({x:q.x+q.nx*PIT.side*(TW/2-4),y:q.y+q.ny*PIT.side*(TW/2-4)});outer.push({x:p.x+p.nx*PIT.side*48,y:p.y+p.ny*PIT.side*48});}pitAprons.push([...inner,...outer.reverse()]);
 }
 // Il piazzale collega materialmente tutti i garage alla corsia, senza erba
 // fra la posizione di qualifica e il percorso di rilascio.
 const garageA=[],garageB=[];
 for(let s=PIT_GARAGES[0].s-PIT.mergeLength;s<=PIT_GARAGES.at(-1).s+PIT.mergeLength;s+=25){garageA.push(pitPoint(s,PIT.stallD-60));garageB.push(pitPoint(s,PIT.laneD+44));}
 pitAprons.push([...garageA,...garageB.reverse()]);
 rebuildMiniTrack([...pitRoadPoints,...PIT_GARAGES.map(g=>pitPoint(g.s,-590))]);
}
rebuildPitGeometry();
function strokePitLine(g,points,width,color){g.beginPath();points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.lineWidth=width;g.strokeStyle=color;g.stroke();}
function drawPits(g=ctx){g.save();g.lineJoin='round';g.lineCap='round';drawCircuitPits(g);g.restore();}
function drawMiniPits(g=mctx){strokePitLine(g,pitRoadPoints.map(p=>({x:mX(p),y:mY(p)})),2,'#ddd');}
function drawCircuitPits(g=ctx){
 for(const poly of pitAprons){g.fillStyle='#454b53';g.fill(makePath(poly,true));}
 strokePitLine(g,pitRoadPoints,96,'#e4e8ed');strokePitLine(g,pitRoadPoints,88,'#454b53');
 g.setLineDash([28,25]);strokePitLine(g,pitRoadPoints,3,'#e8ca62');g.setLineDash([]);
 for(const garage of PIT_GARAGES){
  if(careerRun?.kind==='driver'&&garage.team===TEAMS.length-1)continue;
  const q=pitPoint(garage.s,PIT.stallD),base=pitCenterAt(garage.s),col=garage.team===TEAMS.length-1?S.my.c1:TEAMS[garage.team][0];
  g.save();g.translate(q.x,q.y);g.rotate(base.ang);g.fillStyle='#1c222a';g.fillRect(-82,-65,164,130);g.strokeStyle='#a1a8af';g.lineWidth=2;g.strokeRect(-82,-65,164,130);g.fillStyle=col;g.fillRect(-82,-65,164,12);g.fillStyle='#fff';g.font='12px Segoe UI,sans-serif';g.textAlign='center';g.fillText(garage.team===TEAMS.length-1?S.my.name:teamName(garage.team),0,-35,155);g.restore();
 }
 const sign=pitCenterAt(PIT.entryEnd),label=pointAtDistance(PIT.entryStart);g.fillStyle='#fff';g.font='bold 18px Segoe UI,sans-serif';g.textAlign='center';g.fillText('BOX · 80',sign.x,sign.y-60);g.fillText('INGRESSO BOX',label.x,label.y-TW/2-40);
}
