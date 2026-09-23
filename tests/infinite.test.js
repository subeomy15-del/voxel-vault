import test from 'node:test';
import assert from 'node:assert/strict';
import {World,WORLD_BOTTOM} from '../src/world.js?v=37';
import {freshState,loadState,saveState} from '../src/save.js?v=37';
import {meshChunk} from '../src/mesh.js?v=37';

test('terrain and editable meshes continue in both directions in all realms',()=>{
 for(const dimension of ['overworld','nether','ender'])for(const x of [-2400,2400]){
  const w=new World(7821,[],6,dimension),z=960;
  assert.ok(w.get(x,dimension==='overworld'?WORLD_BOTTOM:w.height(x,z),z));
  assert.equal(w.set(x,75,z,'plank'),true);
  const mesh=meshChunk(w,x/16,z/16);
  assert.ok(mesh.solid.position.some((v,i)=>i%3===1&&v===76));
  assert.equal(new World(w.seed,[...w.edits],6,dimension).get(x,75,z),'plank');
 }
 const w=new World();assert.ok(w.height(2400,960)>4);
 for(const x of [NaN,Infinity,-Infinity])assert.equal(w.set(x,20,0,'stone'),false);
});
test('far away homes, positions, animals and drops survive save reload',()=>{
 const s=freshState(7821,'creative');
 s.pos={x:2400.5,y:40,z:-3200.5};s.spawn={...s.pos};s.origin={...s.pos};
 s.animals=[{kind:'cow',x:2402,y:40,z:-3200,hp:10,angle:0}];
 s.drops=[{item:'wood',x:2401,y:40,z:-3200,count:2,age:0}];
 const values=new Map(),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};
 saveState(storage,s);const loaded=loadState(storage,'creative');
 assert.deepEqual(loaded.pos,s.pos);assert.deepEqual(loaded.spawn,s.spawn);assert.deepEqual(loaded.origin,s.origin);
 assert.equal(loaded.animals[0].x,2402);assert.equal(loaded.drops[0].z,-3200);
});
test('cache eviction preserves nearby terrain and regenerates distant trees without losing edits',()=>{
 const w=new World(),before=meshChunk(w,150,60);
 w.set(2401,75,961,'plank');w.prepare(-150,-60);w.pruneCache(150,60,7);
 assert.ok(w.prepared.has('150,60'));assert.equal(w.prepared.has('-150,-60'),false);
 w.pruneCache(-150,-60,7);assert.equal(w.get(2401,75,961),'plank');
 w.set(2401,75,961,null);w.edits.delete('2401,75,961');
 assert.deepEqual(meshChunk(w,150,60),before);
});
