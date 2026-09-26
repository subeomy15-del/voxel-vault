import test from 'node:test';
import assert from 'node:assert/strict';
import {EditMap} from '../src/edit-map.js?v=38';
test('incremental edits distinguish removed overrides from explicit mined air and retain in-flight changes',()=>{
 const edits=new EditMap([['0,1,2','stone']]);assert.equal(edits.pending.size,0);
 edits.set('0,1,2',null);const revision=edits.revision;edits.set('0,1,2','plank');edits.acknowledge(revision);
 assert.equal(edits.pending.get('0,1,2').value,'plank');edits.acknowledge(edits.revision);assert.equal(edits.pending.size,0);
 edits.set('0,1,2','plank');assert.equal(edits.pending.size,0);edits.delete('0,1,2');assert.equal(edits.pending.get('0,1,2').deleted,true);
});

test('copy-on-write snapshots preserve deletions and additions without cloning every edit',()=>{
 const edits=new EditMap([['0,4,0','stone'],['16,4,0','wood']]),snapshot=edits.snapshot();
 edits.delete('0,4,0');edits.set('17,4,0','plank');edits.set('-1,4,0','gold');
 assert.deepEqual([...snapshot],[['0,4,0','stone'],['16,4,0','wood']]);
 snapshot.release();assert.equal(edits.snapshots.size,0);
});
