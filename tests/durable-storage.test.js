import test from 'node:test';
import assert from 'node:assert/strict';
import {DurableStorage} from '../src/durable-storage.js?v=34';
import {EditMap} from '../src/edit-map.js?v=34';
import {freshState,slotKey} from '../src/save.js?v=34';
import {saveHealth} from '../src/save-health.js?v=34';
function setup(){const messages=[],worker={postMessage(m){messages.push(m);if(m.type==='commit')queueMicrotask(()=>worker.onmessage({data:worker.fail?{id:m.id,ok:false,error:'Full',name:'QuotaExceededError'}:{id:m.id,ok:true,bytes:200,workerMs:1}}));},terminate(){}};return {messages,worker,storage:new DurableStorage({getItem:()=>null,setItem(){}},worker)};}
test('debounced saves coalesce metadata and transfer large edits in bounded batches',async()=>{
 const {storage,messages}=setup(),state=freshState(),world={edits:new EditMap(Array.from({length:1200},(_,i)=>[`${i},4,0`,'stone']))};
 storage.queueWorld(state,world);state.inv.diamond=20;storage.queueWorld(state,world);assert.equal(await storage.flush(),true);
 assert.equal(messages.filter(m=>m.type==='begin').length,1);assert.equal(messages[0].meta.inv.diamond,20);assert.equal('edits' in messages[0].meta,false);
 assert.equal(messages.filter(m=>m.type==='patch').every(m=>m.entries.length<=500),true);assert.equal(messages.filter(m=>m.type==='patch').reduce((n,m)=>n+m.entries.length,0),1200);
 messages.length=0;world.edits.set('1,4,0',null);storage.queueWorld(state,world);await storage.flush();assert.deepEqual(messages.find(m=>m.type==='patch').entries,[['1,4,0',null,false]]);assert.equal(world.edits.pending.size,0);storage.dispose();
});
test('failed durable writes retain dirty edits for retry and never report saved',async()=>{
 const {storage,worker}=setup(),state=freshState(),world={edits:new EditMap()};world.edits.set('0,4,0',null);worker.fail=true;
 storage.queueWorld(state,world);assert.equal(await storage.flush(),false);assert.equal(saveHealth(storage,slotKey(state.mode)).status,'storage full');assert.equal(world.edits.pending.size,1);
 worker.fail=false;storage.queueWorld(state,world);assert.equal(await storage.flush(),true);assert.equal(world.edits.pending.size,0);storage.dispose();
});

test('same-seed imports explicitly preserve the previous durable world and retries retain that intent',async()=>{
 const {storage,messages,worker}=setup(),state=freshState();worker.fail=true;assert.equal(await storage.replaceState(state),false);assert.equal(messages.find(m=>m.type==='begin').replacement,true);
 messages.length=0;worker.fail=false;await storage.replaceState(state);assert.equal(messages.find(m=>m.type==='begin').replacement,true);assert.equal(storage.replacements.size,0);storage.dispose();
});
