import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/world.js?v=26';
import { Game } from '../src/game.js?v=26';
import { CROPS,ITEMS } from '../src/data.js?v=26';
import { freshState,loadState,saveState } from '../src/save.js?v=26';
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const renderer={setWorld(){},stream(){},burst(){}},audio={play(){}};
const game=()=>{const g=new Game(renderer,audio,storage());g.screen=null;g.pos={x:.5,y:7,z:9.5};return g;};

test('new seeds choose varied, dry clearings with safe footing and headroom',()=>{
  const positions=new Set(),biomes=new Set();
  for(let seed=1;seed<=48;seed++){
    const w=new World(seed),p=w.findSpawn();positions.add(`${p.x},${p.z}`);biomes.add(w.biome(p.x,p.z));
    assert.ok(w.solid(Math.floor(p.x),p.y-1,Math.floor(p.z)));
    assert.equal(w.intersects(p.x,p.y,p.z),false);assert.equal(w.waterAt(p.x,p.y,p.z),false);
    assert.ok(Math.abs(p.x)<300&&Math.abs(p.z)<300);assert.deepEqual(p,w.findSpawn());
  }
  assert.ok(positions.size>40);assert.ok(biomes.size>=3);
});
test('continuing an existing save preserves its position and bed while a fresh seed sets home',()=>{
  const st=storage(),s=freshState(3);s.pos={x:.5,y:7,z:20.5};s.spawn={x:2.5,y:7,z:20.5};saveState(st,s);
  const g=new Game(renderer,audio,st);assert.deepEqual(g.pos,s.pos);assert.deepEqual(g.state.spawn,s.spawn);
  g.start('adventure');assert.deepEqual(g.pos,s.pos);
  g.state=freshState(551);g.loadWorld();assert.deepEqual(g.state.spawn,g.pos);assert.deepEqual(g.state.origin,g.pos);
  g.pos.x+=12;g.returnHome();assert.deepEqual(g.pos,g.state.origin);
});
test('gardening consumes seeds once, grows after play time, persists and harvests without duplication',()=>{
  const g=game();g.state.bar[0]='stone_hoe';g.add('stone_hoe');g.target={x:0,y:6,z:8,type:'grass'};
  assert.ok(g.till());assert.equal(g.world.get(0,6,8),'farmland');
  g.state.bar[0]='seeds';g.target.type='farmland';const n=g.state.inv.seeds;
  assert.ok(g.plant());assert.equal(g.state.inv.seeds,n-1);assert.equal(g.plant(),false);assert.equal(g.state.inv.seeds,n-1);
  assert.equal(g.world.get(0,7,8),'wheat_sprout');g.save();const saved=loadState(g.storage);assert.equal(saved.crops['0,7,8'].kind,'wheat');
  g.state.elapsed=CROPS.wheat.seconds-1;g.growCrops();assert.equal(g.world.get(0,7,8),'wheat_sprout');
  g.state.elapsed++;g.growCrops();assert.equal(g.world.get(0,7,8),'wheat_crop');assert.equal(g.state.crops['0,7,8'],undefined);
  const target={x:0,y:7,z:8,type:'wheat_crop'};assert.ok(g.harvest(target));assert.equal(g.state.inv.wheat,3);assert.equal(g.state.inv.seeds,n+1);assert.equal(g.harvest(target),false);assert.equal(g.state.inv.wheat,3);
});
test('iron hoe tills a clear 3 by 3 patch and unsupported seedlings cannot mature',()=>{
  const g=game();g.state.bar[0]='iron_hoe';g.target={x:0,y:6,z:8,type:'grass'};assert.ok(g.till());
  for(let x=-1;x<=1;x++)for(let z=7;z<=9;z++)assert.equal(g.world.get(x,6,z),'farmland');
  g.state.bar[0]='carrot';g.target.type='farmland';assert.ok(g.plant());g.world.set(0,6,8,null);g.state.elapsed=100;g.growCrops();assert.equal(g.world.get(0,7,8),null);assert.equal(g.state.crops['0,7,8'],undefined);
});
test('campfires cook food but cannot smelt metal; meals store energy instead of healing instantly',()=>{
  const g=game();g.world.set(1,7,9,'campfire');g.station={x:1,y:7,z:9,type:'campfire'};g.add('wood',3);g.add('mushroom',2);g.add('iron');
  assert.equal(g.smelt('iron_ingot'),false);assert.equal(g.state.inv.wood,3);assert.ok(g.smelt('roasted_mushroom'));assert.equal(g.state.inv.wood,2);assert.equal(g.state.inv.mushroom,1);
  g.state.hp=2;g.state.food=10;g.state.saturation=0;g.heal('roasted_mushroom');assert.equal(g.state.hp,2);assert.equal(g.state.food,15);assert.equal(g.state.saturation,6);
  g.add('vegetable_stew');g.heal('vegetable_stew');assert.equal(g.state.hp,2);assert.equal(g.state.food,20);assert.equal(g.state.saturation,18);
  assert.ok(Object.values(ITEMS).filter(i=>!i.hidden).length>=100);
});
