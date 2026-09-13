import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=27';
import {World} from '../src/world.js?v=27';
const make=(storage)=>new Game({setWorld(){},burst(){},stream(){}},{play(){},quiet(){}},storage||{data:new Map(),getItem(k){return this.data.get(k)||null;},setItem(k,v){this.data.set(k,v);}});
test('three realm portal journey preserves inventory, terrain and reloads',()=>{
 const g=make();g.start();g.add('diamond',8);g.world.set(9,45,9,'gold_block');
 const use=p=>{g.target=null;g.pos={x:p.x+.5,y:p.y,z:p.z+1.5};g.interact();};
 use(g.state.gate);assert.equal(g.state.dimension,'nether');assert.equal(g.world.intersects(g.pos.x,g.pos.y,g.pos.z),false);
 g.world.set(10,40,10,'iron_block');g.pos={x:72.5,y:25,z:-40};g.updateFortress();assert.equal(g.travel('ender'),false);const guard=g.mobs.find(m=>m.fortress);assert.ok(guard);g.hit(guard,guard.maxHp);assert.equal(g.state.fortressCleared,true);use({x:72,y:25,z:-48});assert.equal(g.state.dimension,'ender');
 use(g.state.gate);assert.equal(g.state.dimension,'nether');assert.equal(g.pos.x,72.5);assert.equal(g.world.get(10,40,10),'iron_block');
 g.save();const loaded=make(g.storage);assert.equal(loaded.state.dimension,'nether');assert.equal(loaded.state.inv.diamond,8);assert.equal(loaded.world.get(72,25,-48),'ender_gate');
 loaded.pos={x:.5,y:25,z:1.5};loaded.interact();assert.equal(loaded.state.dimension,'overworld');assert.equal(loaded.world.get(9,45,9),'gold_block');
});
test('Nether terrain and both gates exist across seeds with clear spawn and a fortress doorway',()=>{
 for(const seed of [1,72,7821]){const w=new World(seed,[],6,'nether'),p=w.findSpawn();assert.equal(w.intersects(p.x,p.y,p.z),false);assert.equal(w.get(0,25,0),'ender_gate');assert.equal(w.get(72,25,-48),'ender_gate');assert.equal(w.get(72,25,-39),null);assert.equal(w.get(81,26,-48),'dark_bricks');assert.equal(w.get(0,-64,0),'bedrock');}
});
