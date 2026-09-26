import assert from 'node:assert/strict';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate;
try{
 await ev(`localStorage.setItem('upgrade-sentinel','unchanged')`);
 const {identifier}=await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(url,options){if(String(url).includes('save-worker'))throw Error('Injected save worker startup failure');super(url,options);}};`});
 await c.send('Page.reload');await sleep(700);
 assert.match(await ev(`document.querySelector('#loading').textContent`),/Your world could not be opened/);
 assert.equal(await ev(`localStorage.getItem('upgrade-sentinel')`),'unchanged');
 assert.equal(await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);return m.game===undefined;})()`),true);
 await c.send('Page.removeScriptToEvaluateOnNewDocument',{identifier});
 await c.send('Page.reload');await sleep(1000);
 await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);m.game.save();await m.game.saveReady;m.game.save=()=>false;await new Promise((resolve,reject)=>{const request=indexedDB.open('voxel-vault-worlds',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('snapshots','readwrite'),s=tx.objectStore('snapshots');for(const suffix of['.recovery-0','.recovery-1'])s.delete('voxel-vault-v2-adventure'+suffix);s.put({version:999,seed:7,inv:{diamond:53},edits:[]},'voxel-vault-v2-adventure');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};});})()`);
 await c.send('Page.reload');await sleep(900);
 assert.match(await ev(`document.querySelector('#loading').textContent`),/Your world could not be opened/);
 const stored=await ev(`new Promise(resolve=>{const r=indexedDB.open('voxel-vault-worlds',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('snapshots').objectStore('snapshots').get('voxel-vault-v2-adventure');q.onsuccess=()=>{db.close();resolve(q.result);};};})`);
 assert.equal(stored.version,999);assert.equal(stored.inv.diamond,53);
 assert.equal(c.errors.length,2,'only the two deliberately injected startup errors');
 assert.deepEqual(c.failed,[]);console.log('PASS: save-worker startup failure and corrupt IndexedDB fail closed; persisted data is unchanged.');
}finally{await c.close();}
