let db;const worlds=new Map(),jobs=new Map();
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
async function open(){const req=indexedDB.open('voxel-vault-worlds',1);req.onupgradeneeded=()=>req.result.createObjectStore('snapshots');return request(req);}
function unpack(state){const maps=new Map();maps.set(state.dimension,new Map(state.edits));for(const[d,realm]of Object.entries(state.realms||{}))maps.set('realm:'+d,new Map(realm.edits));return maps;}
async function commit(job){
  const started=performance.now(),{key,meta,maps}=job,state={...meta,edits:[...(maps.get(meta.dimension)||[])],realms:{}};
  for(const[d,realm]of Object.entries(meta.realms||{}))state.realms[d]={...realm,edits:[...(maps.get('realm:'+d)||[])]};
  await new Promise((resolve,reject)=>{
    const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots'),previous=store.get(key),older=store.get(key+'.recovery-0');
    previous.onsuccess=()=>{if(previous.result)store.put(previous.result,key+(previous.result.version===2&&Array.isArray(previous.result.edits)?'.recovery-0':'.damaged'));};
    older.onsuccess=()=>{if(older.result)store.put(older.result,key+'.recovery-1');};
    const replacement=store.get(key);replacement.onsuccess=()=>{if(replacement.result&&replacement.result.seed!==state.seed)store.put(replacement.result,key+'.before-replacement');};
    store.put(state,key);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('Save interrupted'));tx.onerror=()=>{};
  });
  worlds.set(key,{state,maps});return {workerMs:performance.now()-started,bytes:new Blob([JSON.stringify(state)]).size};
}
onmessage=async({data:m})=>{
 try{
  if(m.type==='init'){
    db=await open();const states=[],issues=[];
    const valid=s=>s?.version===2&&Number.isFinite(s.seed)&&Array.isArray(s.edits)&&s.inv&&typeof s.inv==='object';
    for(const key of m.keys){
      let state=await request(db.transaction('snapshots').objectStore('snapshots').get(key));if(!state)continue;
      if(!valid(state)){
        let recovered=null;for(const suffix of['.recovery-0','.recovery-1']){const candidate=await request(db.transaction('snapshots').objectStore('snapshots').get(key+suffix));if(valid(candidate)){recovered=candidate;break;}}
        issues.push([key,{status:recovered?'recovered':'save failed',blocked:!recovered,message:recovered?'Recovered the previous world snapshot.':'The stored world cannot be read. Its data has been preserved.'}]);state=recovered;
      }
      if(state){worlds.set(key,{state,maps:unpack(state)});states.push([key,state]);}
    }
    postMessage({id:m.id,states,issues});return;
  }
  if(m.type==='begin'){
    const prior=worlds.get(m.key),maps=prior?.maps||new Map();if(m.reset)maps.clear();
    jobs.set(m.id,{key:m.key,meta:m.meta,maps});return;
  }
  if(m.type==='export'){const state=await request(db.transaction('snapshots').objectStore('snapshots').get(m.key));postMessage({id:m.id,text:JSON.stringify(state)});return;}
  if(m.type==='patch'){
    const job=jobs.get(m.id);if(!job)throw Error('Missing save transaction');
    if(m.replace||!job.maps.has(m.dimension))job.maps.set(m.dimension,new Map());const map=job.maps.get(m.dimension);
    for(const[key,value,deleted]of m.entries)if(deleted)map.delete(key);else map.set(key,value);return;
  }
  if(m.type==='commit'){const job=jobs.get(m.id);jobs.delete(m.id);const metrics=await commit(job);postMessage({id:m.id,ok:true,...metrics});}
 }catch(error){jobs.delete(m.id);postMessage({id:m.id,ok:false,error:error.message,name:error.name});}
};
