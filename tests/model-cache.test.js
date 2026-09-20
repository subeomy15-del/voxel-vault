import test from 'node:test';
import assert from 'node:assert/strict';
import {GeometryCache,ModelPool} from '../src/model-cache.js?v=35';
test('shared geometry survives one owner disposal and evicts only unused entries',()=>{
 let disposals=0;const cache=new GeometryCache(2),create=()=>({dispose(){disposals++;}}),a=cache.acquire('a',create),b=cache.acquire('a',create);
 assert.equal(a,b);cache.release(a);cache.acquire('b',create);cache.acquire('c',create);assert.equal(disposals,0);
 cache.release(b);assert.equal(disposals,1);assert.equal(cache.entries.size,2);cache.dispose();assert.equal(disposals,3);
});
test('model recycling reuses instances and bounds retained inactive models across kinds',()=>{
 let disposed=0;const pool=new ModelPool(()=>disposed++,3),model=()=>({removeFromParent(){this.detached=true;}}),first=model();pool.release('deer',first);
 assert.equal(pool.take('deer'),first);assert.equal(pool.count,0);for(let i=0;i<100;i++)pool.release('kind-'+i,model());
 assert.equal(pool.count,3);assert.equal(disposed,97);pool.clear();assert.equal(disposed,100);assert.equal(pool.buckets.size,0);
});
