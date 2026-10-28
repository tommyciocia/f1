'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {game,placePlayer,checkSeats}=require('./helpers/game.cjs');
test('servizio disabilitato: 23 piazzole, percorsi monotoni e transito senza arresto',()=>{
 const g=game();g.run('PIT.serviceAllowed=false;startRace();');checkSeats(g);
 assert.ok(g.run(`cars.every(c=>{const route=makePitEntryRoute(c,PIT.entryStart-100,0);return c.pit.stallS>PIT.entryEnd&&c.pit.stallS<PIT.laneEnd&&route.stopAt===Infinity&&route.points.every((p,i)=>!i||p.trackS>=route.points[i-1].trackS);})`));
});
test('servizio disabilitato: frenata continua, traguardo ai box e uscita',()=>{
 const g=game();g.run('PIT.serviceAllowed=false;startRace();state="racing";pl.go=true;pl.lap=0;');placePlayer(g,g.run('PIT.entryStart')-100,0,1000);
 // Fixture a fine giro: entrambi i rilevamenti già superati e distanza realmente percorsa.
 g.run('pl.raceStarted=true;pl.raceLapSectors=3;pl.raceLapDistance=wrapDistance(pl.trackS);');
 const before=g.run('[pl.x,pl.y]');assert.equal(g.run('requestPitEntry()'),true);assert.deepEqual(Array.from(g.run('[pl.x,pl.y]')),Array.from(before));
 const info=g.run(`(()=>{let speed=0,step=0,stops=0;for(let i=0;i<3000&&pitActive(pl);i++){const p={x:pl.x,y:pl.y};update(.05);if(pitLimited(pl)){speed=Math.max(speed,Math.hypot(pl.vx,pl.vy)*.32);step=Math.max(step,Math.hypot(pl.x-p.x,pl.y-p.y));}if(['waiting','service'].includes(pl.pit.phase))stops++;}return{speed,step,stops,phase:pl.pit.phase,lap:pl.lap};})()`);
 assert.equal(info.phase,'track');assert.equal(info.lap,1);assert.equal(info.stops,0);assert.ok(info.speed<=80.001);assert.ok(info.step<14,JSON.stringify(info));
});
test('servizio disabilitato: riprendere un transito non crea retromarcia',()=>{
 const g=game();g.run('PIT.serviceAllowed=false;startRace();globalThis.c=cars[0];');assert.ok(g.run(`(()=>{const r=makePitEntryRoute(c,c.pit.stallS+100,PIT.laneD,true);return r.stopAt===Infinity&&r.points.every((p,i)=>!i||p.trackS>=r.points[i-1].trackS);})()`));
});
