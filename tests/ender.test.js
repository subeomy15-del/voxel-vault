import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/world.js?v=35';
import { Game } from '../src/game.js?v=35';
import { freshState,loadState,saveState } from '../src/save.js?v=35';
import { ITEMS,RECIPES,craft } from '../src/data.js?v=35';
import { cameraPosition } from '../src/perspective.js?v=35';
import { meshChunk } from '../src/mesh.js?v=35';
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const game=()=>new Game({setWorld(){},burst(){},stream(){}},{play(){},quiet(){}},storage());
test('Ender islands have a safe arrival, real voids, resources and visible undersides',()=>{
 const w=new World(72,[],6,'ender'),p=w.findSpawn();assert.equal(w.intersects(p.x,p.y,p.z),false);assert.equal(w.get(0,19,0),'ender_gate');assert.equal(w.get(24,18,24),null);assert.equal(w.get(5,26,-4),'moonstone');
 let ore=0;for(let x=-8;x<=8;x++)for(let y=4;y<18;y++)if(w.get(x,y,2)==='moonstone')ore++;assert.ok(ore>0);
 const mesh=meshChunk(w,0,0);assert.ok(mesh.solid.position.length>0);assert.ok([...mesh.solid.normal].some(v=>v===-1));assert.equal(mesh.water.position.length,0);
});
test('Connected dimensions preserve builds and one shared inventory through gate travel',()=>{
 const g=game();g.start('adventure');g.world.set(2,40,2,'stonebrick');g.add('diamond',7);g.save();g.start('adventure');g.state.fortressCleared=true;g.save();g.start('ender');g.add('hang_glider');g.state.glider='hang_glider';g.add('moonstone_orb',12);assert.equal(g.world.dimension,'ender');g.world.set(2,25,2,'moonstone_block');g.state.inv.moonstone_orb=4;g.save();
 g.pos={x:.5,y:19,z:2.5};g.target={x:0,y:19,z:0,type:'ender_gate'};g.interact();assert.equal(g.state.mode,'adventure');assert.equal(g.state.dimension,'nether');g.travel('overworld');assert.equal(g.world.get(2,40,2),'stonebrick');assert.equal(g.state.inv.diamond,7);
 g.start('adventure');g.state.fortressCleared=true;g.save();g.start('ender');g.add('hang_glider');g.state.glider='hang_glider';g.add('moonstone_orb',12);assert.equal(g.world.get(2,25,2),'moonstone_block');assert.equal(g.state.inv.moonstone_orb,16);assert.equal(g.state.glider,'hang_glider');
});
test('moonstone orb spends one item only for a safe landing and never crosses a wall',()=>{
 const g=game();g.start('adventure');g.state.fortressCleared=true;g.save();g.start('ender');g.add('hang_glider');g.state.glider='hang_glider';g.add('moonstone_orb',12);g.select(4);g.pos={x:.5,y:19,z:8.5};g.yaw=0;g.pitch=0;const count=g.state.inv.moonstone_orb;assert.equal(g.useOrb(),true);assert.equal(g.state.inv.moonstone_orb,count-1);assert.equal(g.world.intersects(g.pos.x,g.pos.y,g.pos.z),false);
 g.attackCooldown=0;g.pos={x:2.5,y:19,z:8.5};for(let y=19;y<23;y++)g.world.set(2,y,7,'obsidian');const before=g.state.inv.moonstone_orb;assert.equal(g.useOrb(),false);assert.equal(g.state.inv.moonstone_orb,before);
});
test('camera stops before a wall and has full distance in open space',()=>{
 const w=new World(7,[],6,'ender'),eye={x:2.5,y:21,z:8.5},direction={x:0,y:0,z:1};assert.ok(cameraPosition(w,eye,direction).distance>4);
 w.set(2,21,10,'obsidian');const p=cameraPosition(w,eye,direction);assert.ok(p.z<9.83);assert.equal(w.intersects(p.x,p.y-.16,p.z,.32,.18),false);
});
test('moonstone recipes consume resources and shared chests persist without duplicating inventory',()=>{
 const inv={moonstone:3,wood:2};assert.equal(craft(inv,'moonstone_pickaxe'),true);assert.equal(inv.moonstone,0);assert.equal(craft(inv,'moonstone_pickaxe'),false);
 for(const r of RECIPES)for(const k of Object.keys(r.cost))assert.ok(ITEMS[k],k);
 const g=game();g.start('adventure');g.state.fortressCleared=true;g.save();g.start('ender');g.add('hang_glider');g.state.glider='hang_glider';g.add('moonstone_orb',12);g.pos={x:.5,y:19,z:8.5};g.world.set(1,19,8,'moonstone_chest');g.target={x:1,y:19,z:8,type:'moonstone_chest'};g.interact();g.add('moonstone',5);assert.equal(g.transfer('moonstone'),true);g.resume();g.world.set(1,19,7,'moonstone_chest');g.target={x:1,y:19,z:7,type:'moonstone_chest'};g.interact();assert.equal(g.transfer('moonstone',true),true);assert.equal(g.state.inv.moonstone,5);assert.equal(g.transfer('moonstone',true),false);
 g.save();assert.equal(loadState(g.storage,'adventure').inv.moonstone,5);
 const s=freshState(3,'creative');delete s.inv.moonstone_sword;saveState(g.storage,s);assert.ok(loadState(g.storage,'creative').inv.moonstone_sword);
});

test('realm travel carries the same inventory, health and equipment and persists both sides on reload',()=>{
 const g=game();g.start('adventure');const home={...g.pos};g.add('diamond',13);g.state.hp=14;g.world.set(3,44,3,'gold_block');g.save();g.state.fortressCleared=true;g.travel('ender');assert.equal(g.state.mode,'adventure');assert.equal(g.state.inv.diamond,13);assert.equal(g.state.hp,14);g.add('moonstone',8);g.add('armor');g.state.armor='armor';g.world.set(4,36,4,'moonstone_block');g.save();
 const loaded=new Game({setWorld(){},burst(){},stream(){}},{play(){},quiet(){}},g.storage);assert.equal(loaded.state.dimension,'ender');assert.equal(loaded.world.get(4,36,4),'moonstone_block');loaded.travel('overworld');assert.deepEqual(loaded.pos,home);assert.equal(loaded.world.get(3,44,3),'gold_block');assert.equal(loaded.state.inv.moonstone,8);assert.equal(loaded.state.inv.diamond,13);assert.equal(loaded.state.armorParts.chestplate,'iron_chestplate');const kit=loaded.state.inv.moonstone_orb;loaded.travel('ender');assert.equal(loaded.state.inv.moonstone_orb,kit);assert.equal(loaded.world.get(4,36,4),'moonstone_block');
});
test('Rift Run requires reaching each anchor, rewards once, and saves completion',async()=>{
 const {RIFT_ANCHORS}=await import('../src/realms.js?v=35');const g=game();g.start('adventure');g.state.fortressCleared=true;g.save();g.start('ender');g.add('hang_glider');g.state.glider='hang_glider';g.add('moonstone_orb',12);assert.equal(g.collectAnchor('dawn'),false);g.state.elapsed+=20;
 for(const a of RIFT_ANCHORS){g.pos={x:a.x+.5,y:g.world.height(a.x,a.z)+1,z:a.z+.5};assert.equal(g.collectAnchor(a.id),true);assert.equal(g.collectAnchor(a.id),false);g.state.elapsed+=25;}
 assert.equal(g.state.rift.collected.length,3);assert.equal(g.state.inv.moonstone_sword||0,0);assert.equal(g.state.glider,'hang_glider');assert.ok(g.state.rift.best>0);g.travel('overworld');assert.equal(g.state.inv.moonstone_sword||0,0);assert.equal(loadState(g.storage).rift.rewarded,true);g.state.fortressCleared=true;g.travel('ender');assert.equal(g.restartRift(),true);
 for(const a of RIFT_ANCHORS){g.pos={x:a.x+.5,y:g.world.height(a.x,a.z)+1,z:a.z+.5};g.collectAnchor(a.id);g.state.elapsed+=10;}assert.equal(g.state.inv.moonstone_sword||0,0);assert.equal(g.state.rift.runs,2);
});
test('launch pads propel the player and open the glider near the apex',()=>{
 const g=game();g.start('adventure');g.state.fortressCleared=true;g.save();g.start('ender');g.add('hang_glider');g.state.glider='hang_glider';g.add('moonstone_orb',12);g.pos={x:.5,y:19,z:10.5};g.grounded=true;g.tickRift(.02);assert.equal(g.velocity,21);assert.equal(g.grounded,false);assert.equal(g.pendingGlide,true);g.velocity=1;g.tickRift(.02);assert.equal(g.gliding,true);assert.equal(g.pendingGlide,false);
});
test('walking through the home portal connects to the Nether realm without consuming inventory',()=>{
 const g=game();g.start('adventure');assert.ok(g.state.gate);const gate=g.state.gate;assert.equal(g.world.get(gate.x,gate.y,gate.z),'ender_gate');g.add('diamond',11);g.pos={x:gate.x+.5,y:gate.y,z:gate.z+.5};g.portalCooldown=0;assert.equal(g.tickRift(.05),true);assert.equal(g.state.dimension,'nether');assert.equal(g.state.inv.diamond,11);assert.ok(g.portalCooldown>0);
});

test('the first island is reachable by ordinary movement and the starter glider across seeds',()=>{
 for(const seed of [7,72,7821,917,381]){
  const g=game();g.state.seed=seed;g.state.fortressCleared=true;g.travel('ender');g.add('hang_glider');g.state.glider='hang_glider';g.pos={x:.5,y:19,z:-9.5};g.grounded=true;g.yaw=0;g.pitch=-.1;g.keys.add('KeyW');let reached=false;
  for(let i=0;i<360;i++){g.move(1/60);g.tickRift(1/60);if(Math.abs(g.pos.z+48)<14&&g.grounded){reached=true;break;}}
  assert.equal(reached,true,`seed ${seed}`);
 }
});

test('all three anchor islands can be reached with launch pads, steering and closing the starter glider',()=>{
 for(const seed of [7,72,7821,917,381]){
  const g=game();g.state.seed=seed;g.state.fortressCleared=true;g.travel('ender');g.add('hang_glider');g.state.glider='hang_glider';
  for(const[x,z,yaw,tx,tz]of [[.5,-9.5,0,0,-48],[10.5,-47.5,-Math.PI/2,48,-48],[48.5,-37.5,Math.PI,48,0]]){
   g.pos={x,y:g.world.ground(x,z),z};g.grounded=true;g.gliding=false;g.vx=g.vz=g.velocity=0;g.padCooldown=0;g.yaw=yaw;g.pitch=-.1;g.keys.add('KeyW');let reached=false;
   for(let i=0;i<420;i++){g.move(1/60);g.tickRift(1/60);const distance=Math.hypot(g.pos.x-tx,g.pos.z-tz);if(distance<7&&g.gliding){g.toggleGlide();g.keys.clear();}if(distance<14&&g.grounded){reached=true;break;}}
   assert.equal(reached,true,`seed ${seed} to ${tx},${tz}`);
  }
 }
});
