import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js?v=19';
import { World } from '../src/world.js?v=19';
import { craft,ingredientCount,RECIPES } from '../src/data.js?v=19';
import { meshChunk } from '../src/mesh.js?v=19';
const renderer={setWorld(){},stream(){},burst(){}},audio={play(){}};
const game=()=>{const g=new Game(renderer,audio,{getItem:()=>null,setItem(){}});g.pos={x:.5,y:7,z:9.5};g.screen=null;g.yaw=0;g.mobs=[];return g;};

test('general recipes combine timber species without consuming extra logs',()=>{
  const inv={wood:1,birch:1,pinewood:5,stone:5};const recipe=RECIPES.find(r=>r.item==='stone_pickaxe');assert.equal(ingredientCount(inv,'wood',recipe),7);
  assert.ok(craft(inv,'stone_pickaxe'));assert.equal(inv.wood,0);assert.equal(inv.birch,0);assert.equal(inv.pinewood,5);assert.equal(inv.stone,0);
  assert.equal(craft({birch:3},'plank'),false);const birch={birch:3};assert.ok(craft(birch,'birch_plank'));assert.equal(birch.birch_plank,4);
  const bed={plank:2,pine_plank:2,birch_plank:2,leaf:8};assert.ok(craft(bed,'bed'));assert.equal(bed.bed,1);
});
test('slab collision, top height and raycasts match the visible half block',()=>{
  const w=new World();w.set(0,7,8,'oak_slab');w.set(0,7,6,'stone');
  assert.equal(w.intersects(.5,7.5,8.5),false);assert.equal(w.intersects(.5,7.4,8.5),true);assert.equal(w.ground(.5,8.5,9),7.5);
  const down=w.raycast({x:.5,y:8.5,z:8.5},{x:0,y:-1,z:0});assert.equal(down.type,'oak_slab');assert.equal(down.distance,1);assert.equal(down.normal.y,1);
  const over=w.raycast({x:.5,y:7.75,z:9.5},{x:0,y:0,z:-1});assert.equal(over.z,6);assert.equal(over.type,'stone');
});
test('walking climbs slabs and stairs smoothly but cannot step up a full block',()=>{
  const g=game();g.world.set(0,7,8,'oak_slab');g.world.set(0,7,7,'oak_stairs');g.world.set(0,7,6,'stone');
  for(let i=0;i<20;i++)g.move(.01);g.keys.add('KeyW');let high=7;for(let i=0;i<90;i++){g.move(.01);high=Math.max(high,g.pos.y);}assert.ok(high>7.95);assert.ok(g.pos.z<7.6);
  const blocked=game();blocked.world.set(0,7,8,'stone');for(let i=0;i<20;i++)blocked.move(.01);blocked.keys.add('KeyW');for(let i=0;i<60;i++)blocked.move(.01);assert.ok(blocked.pos.z>=9.27);assert.ok(blocked.pos.y<7.1);
});
test('stairs rotate on placement, keep shape on reload and mine to the original item',()=>{
  const g=game();g.add('oak_stairs',2);g.equip('oak_stairs');g.target={x:0,y:6,z:8,type:'grass',normal:{x:0,y:1,z:0}};assert.ok(g.place());assert.equal(g.world.get(0,7,8),'oak_stairs');
  g.rotateBuilding();g.target.x=1;assert.ok(g.place());assert.equal(g.world.get(1,7,8),'oak_stairs_e');const w=new World(g.world.seed,[...g.world.edits]);assert.equal(w.ground(1.75,8.5,9),8);assert.equal(w.ground(1.1,8.5,9),7.5);
  g.state.bar[g.state.selected]='wood_pickaxe';g.target={x:1,y:7,z:8,type:'oak_stairs_e'};g.mine(5);assert.equal(g.state.inv.oak_stairs,1);assert.equal(g.state.inv.oak_stairs_e,undefined);
});
test('matching slabs combine into a full block and blocked placement spends nothing',()=>{
  const g=game();g.add('oak_slab',3);g.equip('oak_slab');g.target={x:0,y:6,z:8,type:'grass',normal:{x:0,y:1,z:0}};assert.ok(g.place());g.target={x:0,y:7,z:8,type:'oak_slab',normal:{x:0,y:1,z:0}};assert.ok(g.place());assert.equal(g.world.get(0,7,8),'plank');assert.equal(g.state.inv.oak_slab,1);
  g.target={x:0,y:6,z:9,type:'grass',normal:{x:0,y:1,z:0}};assert.equal(g.placement().valid,false);assert.equal(g.place(),false);assert.equal(g.state.inv.oak_slab,1);
});
test('shape meshes use valid coordinates in the expanded material atlas',()=>{
  const w=new World();w.set(3,7,9,'marble_stairs_w');w.set(4,7,9,'birch_slab');const mesh=meshChunk(w,0,0).solid;
  assert.ok(mesh.position.every(Number.isFinite));assert.ok(mesh.uv.every(v=>v>=0&&v<=1));assert.ok(mesh.index.every(i=>i<mesh.position.length/3));
});
