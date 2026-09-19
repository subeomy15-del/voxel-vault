import { World } from './world.js?v=33';
import { meshChunk } from './mesh.js?v=33';
let world,epoch=0;
self.onmessage=({data})=>{
  if(data.type==='init'){world=new World(data.seed,data.edits,data.terrain,data.dimension);epoch=data.epoch;return;}
  if(data.type==='edits'){for(const[k,t]of data.edits)world.edits.set(k,t);return;}
  if(data.type==='mesh'&&data.epoch===epoch){
    const started=performance.now();
    const geometry=meshChunk(world,data.cx,data.cz,data.underground,{ambientOcclusion:data.ambientOcclusion});
    const transfer=Object.values(geometry).flatMap(g=>Object.values(g).map(a=>a.buffer));
    self.postMessage({type:'mesh',epoch,revision:data.revision,cx:data.cx,cz:data.cz,ambientOcclusion:data.ambientOcclusion,geometry,buildMs:performance.now()-started},transfer);
    // Keep generated columns and trees bounded during long exploration sessions.
    if(world.columns.size>80000){world.pruneCache(data.cx,data.cz,7);}
  }
};
