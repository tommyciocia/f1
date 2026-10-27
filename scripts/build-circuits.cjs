'use strict';
// Ricrea il registro offline. Non richiede rete o pacchetti esterni.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'assets/circuits');
const defs=JSON.parse(fs.readFileSync(path.join(folder,'circuits.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'source/manifest.json'),'utf8'));
if(new Set(defs.map(c=>c.id)).size!==defs.length||new Set(defs.map(c=>c.source)).size!==defs.length)throw Error('Circuiti duplicati nel registro');
const circuits=defs.map(def=>{
 const json=JSON.parse(fs.readFileSync(path.join(folder,'source',def.source+'.geojson'),'utf8'));
 const raw=(json.features?.[0]||json).geometry.coordinates;
 const closed=Math.hypot(raw[0][0]-raw.at(-1)[0],raw[0][1]-raw.at(-1)[1])<1e-7;
 const coords=closed?raw.slice(0,-1):raw.slice(),origin=coords[def.startIndex];
 const cos=Math.cos(origin[1]*Math.PI/180),metresPerDegree=111319.49079327358;
 const project=p=>[+(metresPerDegree*(p[0]-origin[0])*cos).toFixed(3),+(-metresPerDegree*(p[1]-origin[1])).toFixed(3)];
 const points=coords.map((_,i)=>project(coords[(def.startIndex+(def.reverse?-i:i)+coords.length)%coords.length]));
 return{...def,points,sectorAnchors:def.sectorIndices.map(i=>project(coords[i])),features:def.features.map(f=>({...f,point:project(coords[f.index])})),
  tunnelAnchors:def.tunnelIndices?.map(i=>project(coords[i])),sourceCommit:manifest.commit,
  geometrySource:manifest.files.find(x=>x.id===def.source).url,accuracy:def.accuracy||'Ricostruzione 2D approssimata da dati geografici; box, larghezze e settori adattati al gioco.'};
});
fs.writeFileSync(path.join(root,'js/circuitData.js'),"'use strict';\n/* Generato da scripts/build-circuits.cjs. Dati geometrici MIT: assets/circuits/LICENSE-data.txt. */\nconst CIRCUITS=[\n"+circuits.map(c=>JSON.stringify(c)).join(',\n')+'\n];\n');
console.log('Registro offline generato: '+circuits.length+' circuiti reali.');
