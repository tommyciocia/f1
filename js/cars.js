'use strict';
/* Creazione delle vetture, griglia di partenza e ricerca del punto più vicino in pista */
function nearest(c,full){let b=1e18,bi=c.idx||0;const r=full?N:10;
 for(let k=-(full?0:r);k<=(full?N-1:r);k++){const i=full?k:(c.idx+k+N)%N,q=T[i],d=(c.x-q.x)**2+(c.y-q.y)**2;if(d<b){b=d;bi=i;}}return bi;}
// ordine di griglia: lista di {isP, di (indice pilota), dr, sk (livello di ritmo IA)}
const mkSk=di=>[.74,.85,.94,1,1.05][S.diff]*(1-di*.003+(Math.random()-.5)*.02);
function defOrder(){const o=S.roster.map((d,i)=>({isP:false,di:i,dr:d,sk:mkSk(i)}));o.splice(PSLOT,0,{isP:true,di:-1});return o;}
function mkCars(order){order=order||defOrder();cars=[];
 order.forEach((e,k)=>{const isP=e.isP,m=S.my;
  const dr=isP?[(m.code||'TOM'),(m.driver||'Tommy'),clamp(Math.round(+m.num)||99,2,99),TEAMS.length-1]:e.dr,team=dr[3];
  const ts=isP?S.myStats:S.teamStats[team],sk=isP?1:e.sk;
  const sp=clamp(L-(80+k*70),0,L);let idx=0;while(idx<N-1&&T[idx+1].s<=sp)idx++;const q=T[idx],lat=k%2?55:-55;
  const c={id:isP?'player':'driver:'+e.di,code:dr[0],name:dr[1],num:dr[2],team,tname:isP?(m.name||'Tommy Racing'):teamName(team),col:isP?m.c1:TEAMS[team][0],acc:isP?m.c2:TEAMS[team][1],isP,ai:!isP,
   top:1000*ts[0]*sk,accel:460*ts[1]*sk,brk:1400*ts[2],grip:ts[3],cs:Math.min(1.04,sk*ts[3]),x:q.x+q.nx*lat,y:q.y+q.ny*lat,a:q.ang,vx:0,vy:0,idx,trackS:q.s,d:lat,lane:lat,base:lat*.6,
   lap:-1,lapStart:0,best:1e9,fin:0,pen:0,go:false,stuck:0,steer:0,slip:0,inp:{st:0,thr:0,brk:0,hb:false},kerb:false,off:false,rep:0,e,tow:0,qd:false,relT:0,
   aiId:k,passTarget:null,passSide:0,passLane:lat*.6,passHold:0,recoveryT:0,recoveryLane:lat*.6,launchT:0,launchLane:lat,stallP:undefined,stallT:0,
   secs:[null,null,null],bestSecs:[1e9,1e9,1e9],secDelta:[null,null,null],secState:['wait','wait','wait'],lastSecs:[null,null,null],lastDelta:[null,null,null],lastState:['wait','wait','wait'],secStart:0,activeSec:0,trackGuard:false};
  c.qActive=true;c.qualiTimes=e.qualiTimes?e.qualiTimes.slice():[null,null,null];resetTyres(c);cars.push(c);});
 pl=cars.find(c=>c.isP);assignPitStalls();}
function placeStart(c,lat){const q=T[(()=>{let i=0;const sp=clamp(L-80,0,L);while(i<N-1&&T[i+1].s<=sp)i++;return i;})()],ix=T.indexOf(q);
 c.x=q.x+q.nx*lat;c.y=q.y+q.ny*lat;c.a=q.ang;c.vx=c.vy=0;c.idx=ix;c.trackS=q.s;c.d=lat;c.lane=lat;c.steer=0;c.yaw=0;}
