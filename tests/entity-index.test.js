import test from 'node:test';
import assert from 'node:assert/strict';
import {EntityIndex} from '../src/entity-index.js?v=31';
test('entity broad phase includes border-spanning large mobs and recycles bounded buckets',()=>{
 const index=new EntityIndex(),a={x:7.9,z:-.1},b={x:11,z:0};index.rebuild([a,b]);assert.deepEqual(new Set(index.near(8,0,4)),new Set([a,b]));
 for(let i=0;i<100;i++)index.rebuild(Array.from({length:300},(_,n)=>({x:i*4000+n*16,z:0})));
 assert.equal(index.cells.size,300);assert.ok(index.spare.length<=256);index.rebuild([]);assert.equal([...index.near(8,0,4)].length,0);assert.ok(index.spare.length<=256);
});
