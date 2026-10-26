'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../..');
function game(settings={}){
 const elements=new Map(),events=new Map(),docEvents=new Map(),ctx=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 function element(id){
  if(!elements.has(id)){
   const classes=new Set(['hidden']),attrs={};
   elements.set(id,{id,style:{setProperty(k,v){this[k]=v;}},dataset:{},children:[],textContent:'',innerHTML:'',
    classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle(c,on){if(on===undefined)on=!classes.has(c);if(on)classes.add(c);else classes.delete(c);}},
    setAttribute:(k,v)=>attrs[k]=String(v),getAttribute:k=>attrs[k],getContext:()=>ctx,addEventListener(){}});
  }
  return elements.get(id);
 }
 element('lights').children=Array.from({length:5},()=>element(Symbol()));
 const storage=new Map([['f1sim.set',JSON.stringify(settings)]]);
 const register=(map,type,handler)=>{if(!map.has(type))map.set(type,[]);map.get(type).push(handler);};
 const env=vm.createContext({console,Math:Object.create(Math),Date,performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},Path2D:class{moveTo(){}lineTo(){}closePath(){}},
  document:{getElementById:element,createElement:()=>element(Symbol()),querySelectorAll:()=>[],addEventListener:(t,h)=>register(docEvents,t,h)},
  innerWidth:1280,innerHeight:800,devicePixelRatio:1,window:{},navigator:{getGamepads:()=>[]},addEventListener:(t,h)=>register(events,t,h),requestAnimationFrame(){}});
 let seed=12345;env.Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const [,file] of html.matchAll(/<script src="([^"]+)"/g)){
  if(file.startsWith('js/menu')&&file!=='js/menuClicks.js')continue;
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),env,{filename:file});
 }
 const run=code=>vm.runInContext(code,env);
 function advance(seconds,dt=1/30){const count=Math.ceil(seconds/dt);run(`for(let step=0;step<${count};step++)if(state!=='paused')update(${dt});`);}
 function click(action){for(const handler of docEvents.get('click')||[])handler({target:{closest:()=>({dataset:{act:action}})}});}
 return{run,advance,elements,events,click};
}
function placePlayer(g,s,d,speed){
 g.run(`{const q=botPointAt(${s});pl.x=q.x+q.nx*${d};pl.y=q.y+q.ny*${d};pl.a=q.ang;pl.idx=q.i;pl.trackS=q.trackS;pl.d=pl.lane=${d};pl.vx=Math.cos(q.ang)*${speed};pl.vy=Math.sin(q.ang)*${speed};pl.go=true;pl.pit.phase='track';pl.pit.auto=pl.pit.onLane=false;pl.off=pl.kerb=false;}`);
}
function placePitLane(g,s,lateral=0,speed=150){
 g.run(`{const q=pitCenterAt(${s}),p=pointAtDistance(${s});pl.x=q.x+q.nx*${lateral};pl.y=q.y+q.ny*${lateral};pl.a=q.ang;pl.idx=p.i;pl.trackS=p.s;pl.vx=Math.cos(q.ang)*${speed};pl.vy=Math.sin(q.ang)*${speed};pl.go=true;pl.pit.phase='track';pl.pit.auto=pl.pit.onLane=false;pl.off=pl.kerb=false;pl.d=pl.lane=pitTrackPosition(pl).d;}`);
}
function checkSeats(g){
 assert.equal(g.run('cars.length'),23);assert.equal(g.run('new Set(cars.map(c=>c.team)).size'),12);
 assert.equal(g.run('cars.filter(c=>c.team===11).length'),1);
 assert.ok(g.run('TEAMS.slice(0,-1).every((_,i)=>cars.filter(c=>c.team===i).length===2)'));
 assert.equal(g.run('new Set(cars.map(c=>c.pit.stallId)).size'),23);
}
module.exports={game,placePlayer,placePitLane,checkSeats};
