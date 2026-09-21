import {World} from '../src/world.js?v=36';
import {meshChunk} from '../src/mesh.js?v=36';
import {writeFile} from 'node:fs/promises';
const scenes=[['badlands',416,-992],['conifer',1056,352],['cherry',-1632,-480],['jungle',288,-608],['fortress',965,352]],results=[];
for(const[name,x,z]of scenes)for(const version of[7,8]){
 const runs=[];let bytes=0;
 for(let repeat=0;repeat<3;repeat++){
  const w=new World(7821,[],version);for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
   const start=performance.now(),mesh=meshChunk(w,Math.floor(x/16)+dx,Math.floor(z/16)+dz);if(repeat)runs.push(performance.now()-start);
   if(repeat===2)for(const group of Object.values(mesh))for(const a of Object.values(group))bytes+=a.byteLength;
  }
 }
 runs.sort((a,b)=>a-b);results.push({name,version,medianMs:runs[25],p95Ms:runs[47],bytes});
}
await writeFile(new URL('../reports/regions/mesh-benchmark.json',import.meta.url),JSON.stringify({seed:7821,node:process.version,note:'50 timed chunk builds after one warmup pass; same coordinates, different generator versions may produce different terrain.',results},null,2));console.log(results);
