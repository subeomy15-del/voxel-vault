import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=35';
import {World} from '../src/world.js?v=35';
import {BLOCKS,craft} from '../src/data.js?v=35';
import {meshChunk} from '../src/mesh.js?v=35';
const make=()=>new Game({setWorld(){},burst(){},stream(){}},{play(){},quiet(){}},{getItem(){return null;},setItem(){}});
test('lava basins exist across seeds while both Nether arrivals stay safe',()=>{
  for(const seed of [1,72,7821]){
    const w=new World(seed,[],6,'nether');
    assert.equal(w.get(25,22,12),'lava');assert.equal(w.solid(25,22,12),false);assert.equal(w.waterAt(25,22,12),false);
    for(const [x,z]of [[0,0],[72,-48]]){assert.equal(w.get(x,25,z),'ender_gate');assert.notEqual(w.get(x,24,z),'lava');}
    const geometry=meshChunk(w,1,0);assert.ok(geometry.solid.index.length);assert.ok(geometry.solid.position.every(Number.isFinite));
  }
});
test('lava contact and magma footing damage survival players with cooldown and creative immunity',()=>{
  const g=make();g.start();g.pos={x:100.5,y:60,z:100.5};g.world.set(100,60,100,'lava');g.hurtCooldown=0;
  g.updateHeat();assert.equal(g.state.hp,16);g.updateHeat();assert.equal(g.state.hp,16);
  g.world.set(100,60,100,null);g.world.set(100,59,100,'magma');g.grounded=true;g.hurtCooldown=0;g.updateHeat();assert.equal(g.state.hp,15);
  g.state.mode='creative';g.hurtCooldown=0;g.updateHeat();assert.equal(g.state.hp,15);
  g.save();
});
test('new Nether recipes consume gathered materials and create placeable blocks',()=>{
  const inv={netherrack:4};assert.equal(craft(inv,'nether_bricks'),true);assert.equal(inv.netherrack,0);assert.equal(inv.nether_bricks,4);assert.equal(BLOCKS.nether_bricks.solid,true);
});
