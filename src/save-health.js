const stores=new WeakMap();
function records(storage){let map=stores.get(storage);if(!map){map=new Map();stores.set(storage,map);}return map;}
export function saveHealth(storage,key){return records(storage).get(key)||{status:'not saved',durationMs:0,bytes:0};}
export function setSaveHealth(storage,key,value){const next={...saveHealth(storage,key),...value};records(storage).set(key,next);return next;}
export function storageFailure(error){return error?.name==='QuotaExceededError'||error?.code===22||error?.code===1014?'storage full':'save failed';}
export function readDocument(storage,key,validate){
  let text;
  try{
    text=storage.getItem(key);if(!text)return null;
    const raw=JSON.parse(text);if(!validate(raw))throw Error('Unsupported or malformed save');
    setSaveHealth(storage,key,{status:'saved',blocked:false,bytes:text.length*2});return raw;
  }catch(error){
    for(const suffix of['.recovery-0','.recovery-1'])try{
      const raw=JSON.parse(storage.getItem(key+suffix)||'null');if(!validate(raw))continue;
      setSaveHealth(storage,key,{status:'recovered',blocked:false,damaged:text,message:'Recovered the previous snapshot. The damaged save has been kept.'});return raw;
    }catch{}
    setSaveHealth(storage,key,{status:'save failed',blocked:true,message:text?'The stored world cannot be read. Export its backup before replacing it.':'Browser storage is unavailable.',error:String(error.message)});return null;
  }
}
export function writeDocument(storage,key,text){
  const started=performance.now(),health=saveHealth(storage,key);
  if(health.blocked)return false;
  try{
    const previous=storage.getItem(key);
    if(previous===text){setSaveHealth(storage,key,{status:'saved',durationMs:performance.now()-started,bytes:text.length*2});return true;}
    if(health.damaged){storage.setItem(key+'.damaged',health.damaged);}
    else if(previous){const older=storage.getItem(key+'.recovery-0');if(older)storage.setItem(key+'.recovery-1',older);storage.setItem(key+'.recovery-0',previous);}
    storage.setItem(key,text);setSaveHealth(storage,key,{status:'saved',damaged:null,durationMs:performance.now()-started,bytes:text.length*2,message:''});return true;
  }catch(error){setSaveHealth(storage,key,{status:storageFailure(error),durationMs:performance.now()-started,message:String(error.message)});return false;}
}
export function preserveBeforeReplacement(storage,key){
  try{const raw=storage.getItem(key);if(raw)storage.setItem(key+'.before-replacement',raw);setSaveHealth(storage,key,{blocked:false});return true;}
  catch(error){setSaveHealth(storage,key,{status:storageFailure(error),message:String(error.message)});return false;}
}
