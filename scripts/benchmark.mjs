import {World} from '../src/world.js?v=34';
import {meshChunk} from '../src/mesh.js?v=34';
import {Game} from '../src/game.js?v=34';
import {freshState,loadState} from '../src/save.js?v=34';
import {writeFile} from 'node:fs/promises';
const out={date:new Date().toISOString(),node:process.version,terrain:{},saves:[]};
for(const dimension of ['overworld','nether','ender']){const w=new World(7821,[],6,dimension),times=[];let bytes=0;for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){const t=performance.now(),m=meshChunk(w,x,z);times.push(performance.now()-t);for(const group of Object.values(m))for(const a of Object.values(group))bytes+=a.byteLength;}const sorted=times.toSorted((a,b)=>a-b);out.terrain[dimension]={totalMs:times.reduce((a,b)=>a+b),medianMs:sorted[12],p95Ms:sorted[23],bytes};}
const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},renderer={setWorld(){},stream(){},burst(){}};
const g=new Game(renderer,{play(){}},storage);for(const count of [0,10000,100000]){for(let i=0;i<count;i++)g.world.edits.set(`${i%1000},40,${Math.floor(i/1000)}`,'stonebrick');const times=[];for(let i=0;i<5;i++){const t=performance.now();g.save();times.push(performance.now()-t);}out.saves.push({edits:g.world.edits.size,medianMs:times.toSorted((a,b)=>a-b)[2],bytes:[...map.values()].reduce((n,s)=>n+Buffer.byteLength(s),0)});}
out.invalidSave={badJSON:loadState({getItem:()=>'{broken'})===null,unknownVersion:loadState({getItem:()=>JSON.stringify({...freshState(),version:999})})===null};
const s=freshState();s.inv.blast_charge=1;g.state=s;g.loadWorld();g.screen=null;g.pos={x:.5,y:7,z:20.5};g.state.inv.blast_charge=1;g.state.bar[0]='blast_charge';g.state.selected=0;let explosions=0;g.detonate=()=>explosions++;const armed=g.useBlastCharge();g.loadWorld();await new Promise(r=>setTimeout(r,1300));out.delayedBlast={armed,explosionsAfterLoadWorld:explosions};
await writeFile(process.argv[2]||'/private/tmp/voxel-vault-benchmark.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
