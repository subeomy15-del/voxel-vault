import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {saveHealth,readDocument,writeDocument,preserveBeforeReplacement} from '../src/save-health.js?v=35';
import {parseWorldBackup,exportWorld} from '../src/world-backup.js?v=35';
const memory=()=>{const data=new Map();return{data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
const valid=s=>s?.version===2;
test('rotating recovery snapshots survive malformed and interrupted primary writes',()=>{
 const s=memory();for(let i=0;i<4;i++)assert.equal(writeDocument(s,'world',JSON.stringify({version:2,i})),true);
 assert.equal(s.data.size,3);s.setItem('world','{broken');assert.equal(readDocument(s,'world',valid).i,2);assert.equal(saveHealth(s,'world').status,'recovered');
 assert.equal(writeDocument(s,'world','{"version":2,"i":5}'),true);assert.equal(s.getItem('world.damaged'),'{broken');assert.equal(JSON.parse(s.getItem('world.recovery-0')).i,2);
});
test('unknown versions cannot be silently overwritten and replacement preserves the original',()=>{
 const s=memory();s.setItem('world','{"version":999}');assert.equal(readDocument(s,'world',valid),null);assert.equal(writeDocument(s,'world','new'),false);assert.equal(s.getItem('world'),'{"version":999}');
 assert.equal(preserveBeforeReplacement(s,'world'),true);assert.equal(s.getItem('world.before-replacement'),'{"version":999}');
});
test('quota failure leaves committed data intact and reports storage full',()=>{
 const s=memory();writeDocument(s,'world','{"version":2}');s.setItem=()=>{throw new DOMException('Full','QuotaExceededError');};
 assert.equal(writeDocument(s,'world','{"version":2,"i":1}'),false);assert.equal(saveHealth(s,'world').status,'storage full');assert.equal(s.getItem('world'),'{"version":2}');
});
test('pre-upgrade fixture survives validated backup round trips with all realm and player edits',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/pre-upgrade-v31.json',import.meta.url)));
 const loaded=parseWorldBackup(exportWorld(fixture));assert.deepEqual(loaded.edits,fixture.edits);assert.deepEqual(loaded.containers,fixture.containers);assert.deepEqual(loaded.crops,fixture.crops);assert.deepEqual(loaded.outposts,fixture.outposts);assert.deepEqual(loaded.enchants,fixture.enchants);
 for(const realm of Object.keys(fixture.realms))assert.deepEqual(loaded.realms[realm].edits,fixture.realms[realm].edits);
 assert.equal(loaded.inv.diamond,fixture.inv.diamond);assert.deepEqual(loaded.opened,fixture.opened);assert.deepEqual(loaded.pos,fixture.pos);
 assert.throws(()=>parseWorldBackup('{broken'),/valid JSON/);assert.throws(()=>parseWorldBackup(JSON.stringify({...fixture,version:999})),/supported/);
 assert.throws(()=>parseWorldBackup(JSON.stringify({...fixture,edits:[['0,1,2','missing_block']]})),/invalid world edits/);
});
