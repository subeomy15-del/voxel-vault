// Map-compatible edits retain explicit air; dirty entries feed incremental saves.
import {SpatialLights} from './spatial-lights.js?v=38';
export class EditMap extends Map {
  constructor(entries=[]){super();this.revision=0;this.pending=new Map();this.chunks=new Map();this.snapshots=new Set();this.lights=new SpatialLights();for(const[k,v]of entries){super.set(k,v);this.index(k,v);this.lights.update(k,v,null);}}
  index(key,value,remove=false){const[x,,z]=key.split(',').map(Number),tag=`${Math.floor(x/16)},${Math.floor(z/16)}`;let chunk=this.chunks.get(tag);if(chunk&&[...this.snapshots].some(snapshot=>snapshot.get(tag)===chunk)){chunk=new Map(chunk);this.chunks.set(tag,chunk);}if(remove){chunk?.delete(key);if(!chunk?.size)this.chunks.delete(tag);}else{if(!chunk){chunk=new Map();this.chunks.set(tag,chunk);}chunk.set(key,value);}}
  snapshot(){
    const chunks=new Map(this.chunks);this.snapshots.add(chunks);
    return {revision:this.revision,pending:[...this.pending].map(([key,e])=>[key,e.value,e.deleted===true]),
      *[Symbol.iterator](){for(const chunk of chunks.values())yield* chunk;},
      release:()=>this.snapshots.delete(chunks)};
  }
  chunkEntries(cx,cz){return this.chunks.get(`${cx},${cz}`)||[];}
  set(key,value){if(this.has(key)&&this.get(key)===value)return this;const previous=this.get(key);super.set(key,value);this.index(key,value);this.lights.update(key,value,previous);this.pending.set(key,{value,revision:++this.revision});return this;}
  delete(key){const previous=this.get(key);if(!super.delete(key))return false;this.index(key,null,true);this.lights.update(key,null,previous);this.pending.set(key,{deleted:true,revision:++this.revision});return true;}
  clear(){for(const key of this.keys())this.delete(key);}
  acknowledge(revision){for(const[key,entry]of this.pending)if(entry.revision<=revision)this.pending.delete(key);}
}
