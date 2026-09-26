import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/world.js';
import {habitatInstances} from '../src/visual-habitat.js';
import {meshChunk} from '../src/mesh.js';
test('visual foliage works in old saves without modifying terrain or player edits',()=>{
 for(const terrain of[6,10,11,12]){
  const w=new World(7821,[],terrain),before=[...w.edits];let count=0;
  for(const[cx,cz]of[[0,4],[-313,69],[-375,-312],[-375,-360]]){const one=habitatInstances(w,cx,cz,'high'),two=habitatInstances(w,cx,cz,'high');assert.deepEqual(one,two);assert.ok(one.water.length<=8&&one.ground.length<=24);count+=one.water.length+one.ground.length;}
  assert.ok(count>0,'version '+terrain);assert.deepEqual([...w.edits],before);assert.equal(w.terrain,terrain);
 }
});
test('aquatic garnish is sparse, rooted in water and suppressed beside edits including chunk seams',()=>{
 const w=new World(7821,[],10);let total=0;
 for(let cx=-20;cx<=20;cx+=4)for(let cz=-20;cz<=20;cz+=4){const {water}=habitatInstances(w,cx,cz);for(const p of water){total++;assert.ok(w.waterAt(p.x,p.y,p.z));assert.ok(w.solid(Math.floor(p.x),p.y-1,Math.floor(p.z)));assert.ok(p.scale<=8);const x=Math.floor(p.x),z=Math.floor(p.z);w.set(x,p.y+1,z,'glass');assert.ok(!habitatInstances(w,cx,cz).water.some(q=>q.x===p.x&&q.z===p.z));}}
 assert.ok(total>0);
 const mock={seed:42,edits:{*chunkEntries(cx,cz){if(cx===1&&cz===0)yield ['16,5,5','plank'];}},height:()=>8,biome:()=> 'meadow',get:(x,y)=>y===8?'grass':null,noise:()=>1};
 assert.ok(habitatInstances(mock,0,0,'high').ground.every(p=>!(Math.floor(p.x)===15&&Math.abs(Math.floor(p.z)-5)<=1)));
});
test('water meshes carry finite depth data without changing saved world contents',()=>{
 const w=new World(7821,[],7),before=[...w.edits],m=meshChunk(w,80,110,false,{localCoordinates:true});assert.ok(m.water.position.length>0);assert.equal(m.water.waterDepth.length,m.water.position.length/3);assert.ok(m.water.waterDepth.every(n=>Number.isFinite(n)&&n>0&&n<=32));assert.deepEqual([...w.edits],before);
});
