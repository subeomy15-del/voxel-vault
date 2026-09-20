import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.argv[2]||process.cwd();
const {World}=await import(pathToFileURL(resolve(root,'src/world.js')));
const {meshChunk}=await import(pathToFileURL(resolve(root,'src/mesh.js')));
const result={};
for(const dimension of ['overworld','nether','ender']){
 const times=[],digest=createHash('sha256');let bytes=0;
 for(let round=0;round<4;round++){
  const w=new World(7821,[],8,dimension);
  for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){
   const start=performance.now(),geometry=meshChunk(w,x,z,true),ms=performance.now()-start;
   if(round){times.push(ms);if(round===1)for(const g of Object.values(geometry))for(const a of Object.values(g)){bytes+=a.byteLength;digest.update(new Uint8Array(a.buffer));}}
  }
 }
 times.sort((a,b)=>a-b);result[dimension]={chunks:times.length,medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],totalMs:times.reduce((a,b)=>a+b,0),bytes,sha256:digest.digest('hex')};
}
console.log(JSON.stringify(result,null,2));
