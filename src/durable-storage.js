import {slotKey} from './save.js?v=33';
import {saveHealth,setSaveHealth,storageFailure} from './save-health.js?v=33';
const yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0));
function metadata(state){
  const {edits,realms,...rest}=state;return structuredClone({...rest,realms:Object.fromEntries(Object.entries(realms||{}).map(([d,{edits,...fields}])=>[d,fields]))});
}
export class DurableStorage {
  constructor(local,worker){this.local=local;this.worker=worker;this.serial=0;this.calls=new Map();this.cache=new Map();this.desired=new Map();this.known=new WeakSet();this.replacements=new Set();this.timer=null;this.running=null;
    worker.onmessage=({data})=>{const call=this.calls.get(data.id);if(call){this.calls.delete(data.id);clearTimeout(call.timer);data.ok===false?call.reject(Object.assign(Error(data.error),{name:data.name})):call.resolve(data);}};
    worker.onerror=event=>{for(const call of this.calls.values()){clearTimeout(call.timer);call.reject(Error(event.message||'Save worker failed'));}this.calls.clear();};
  }
  getItem(key){return this.local.getItem(key);}
  setItem(key,value){return this.local.setItem(key,value);}
  readState(key){if(saveHealth(this,key).blocked)return null;const entry=this.cache.get(key);if(!entry)return undefined;return entry.world?{...entry.state,edits:[...entry.world.edits]}:entry.state;}
  async exportStored(key){const id=++this.serial,result=this.response(id);this.worker.postMessage({type:'export',id,key});return(await result).text||this.local.getItem(key);}
  response(id){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.calls.delete(id);reject(Error('Saving timed out; the previous snapshot is still available.'));},30000);this.calls.set(id,{resolve,reject,timer});});}
  async initialize(){const id=++this.serial,result=this.response(id);this.worker.postMessage({type:'init',id,keys:['adventure','creative','daily','ender'].map(slotKey)});const data=await result;for(const[key,state]of data.states)this.cache.set(key,{state});for(const[key,issue]of data.issues||[])setSaveHealth(this,key,issue);return this;}
  queueWorld(state,world,onStatus){
    const key=slotKey(state.mode);if(saveHealth(this,key).blocked){onStatus?.(saveHealth(this,key));return false;}
    const meta=metadata(state),job={key,meta,world,realms:state.realms,onStatus};
    this.cache.set(key,{state,world});this.desired.delete(key+':'+state.dimension);this.desired.set(key+':'+state.dimension,job);
    setSaveHealth(this,key,{status:'saving'});onStatus?.(saveHealth(this,key));
    clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),150);return true;
  }
  async flush(){
    clearTimeout(this.timer);this.timer=null;if(this.running)return this.running;
    this.running=(async()=>{let ok=true;while(this.desired.size){const[token,job]=this.desired.entries().next().value;this.desired.delete(token);ok=await this.write(job)&&ok;}return ok;})();
    try{return await this.running;}finally{this.running=null;}
  }
  async write(job){
    const {key,meta,world,onStatus}=job,id=++this.serial,full=!this.known.has(world);let mainMs=0,revision=world.edits.revision;
    const send=message=>{const start=performance.now();this.worker.postMessage({...message,id});mainMs+=performance.now()-start;};
    const batch=async(dimension,entries,replace=false)=>{
      let part=[];for(const entry of entries){part.push(entry);if(part.length===500){send({type:'patch',dimension,entries:part,replace});replace=false;part=[];await yieldFrame();}}
      if(part.length||replace)send({type:'patch',dimension,entries:part,replace});
    };
    try{
      const result=this.response(id);send({type:'begin',key,meta,reset:false,replacement:this.replacements.has(key)});
      if(full){await batch(meta.dimension,world.edits,true);for(const[d,realm]of Object.entries(job.realms||{}))await batch('realm:'+d,realm.edits||[],true);}
      revision=world.edits.revision;
      const dirty=world.edits.pending;
      if(dirty)await batch(meta.dimension,(function*(){for(const[k,e]of dirty)if(e.revision<=revision)yield[k,e.value,e.deleted===true];})());
      send({type:'commit'});const metrics=await result;world.edits.acknowledge?.(revision);this.known.add(world);this.replacements.delete(key);
      const queued=[...this.desired.values()].some(next=>next.key===key);
      setSaveHealth(this,key,{status:queued?'saving':'saved',durationMs:mainMs,workerMs:metrics.workerMs,bytes:metrics.bytes,message:''});onStatus?.(saveHealth(this,key));return true;
    }catch(error){this.known.delete(world);setSaveHealth(this,key,{status:storageFailure(error),message:error.message,durationMs:mainMs});onStatus?.(saveHealth(this,key));return false;}
  }
  preserveBeforeReplacement(key){this.replacements.add(key);setSaveHealth(this,key,{blocked:false});return true;}
  async replaceState(state){
    await this.flush();const {EditMap}=await import('./edit-map.js?v=33');const world={edits:new EditMap(state.edits)};
    this.preserveBeforeReplacement(slotKey(state.mode));this.queueWorld(state,world);return this.flush();
  }
  dispose(){clearTimeout(this.timer);this.worker.terminate();for(const call of this.calls.values()){clearTimeout(call.timer);call.reject(Error('Save worker closed'));}this.calls.clear();}
}
export async function openDurableStorage(local){
  const worker=new Worker(new URL('./save-worker.js?v=33',import.meta.url),{type:'module'}),storage=new DurableStorage(local,worker);
  try{return await storage.initialize();}catch(error){storage.dispose();throw error;}
}
