import {World} from '../src/world.js?v=35';
import {meshChunk} from '../src/mesh.js?v=35';
import {writeFile} from 'node:fs/promises';
const report={node:process.version,seed:7821,scenes:[],editLookup:{}};
for(const terrain of[7,8])for(const [name,center]of[['starter',[0,0]],['forest',[80,110]],['distant',[-50,110]]]){
 const w=new World(7821,[],terrain),times=[];let bytes=0;
 for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){const start=performance.now(),mesh=meshChunk(w,center[0]+x,center[1]+z);times.push(performance.now()-start);for(const group of Object.values(mesh))for(const a of Object.values(group))bytes+=a.byteLength;}
 times.sort((a,b)=>a-b);report.scenes.push({terrain,name,medianMs:times[12],p95Ms:times[23],bytes,columns:w.columns.size,structures:w.structures.size});
}
const w=new World(7821,[],7);for(let i=0;i<100000;i++)w.edits.set(`${i+1000},40,1000`,'stone');w.edits.set('1,7,1','torch');
for(const indexed of[false,true]){const samples=[];for(let n=0;n<30;n++){const start=performance.now();let count=0;
 if(indexed){for(const[k,t]of w.edits.chunkEntries(0,0))if(t)count++;w.edits.lights.nearest({x:0,y:7,z:0});}
 else{for(const[k,t]of w.edits){const[x,,z]=k.split(',').map(Number);if(t&&Math.floor(x/16)===0&&Math.floor(z/16)===0)count++;}for(const[k,t]of w.edits)if(['torch','lantern','campfire'].includes(t))k.split(',').map(Number);}
 if(count!==1)throw Error('Edit index mismatch');samples.push(performance.now()-start);}
 samples.sort((a,b)=>a-b);report.editLookup[indexed?'indexed':'fullScan']={medianMs:samples[15],p95Ms:samples[28]};}
await writeFile(process.argv[2]||'/private/tmp/voxel-vault-worldgen-performance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
