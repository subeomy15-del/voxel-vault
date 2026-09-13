import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js?v=18';
import { World } from '../src/world.js?v=18';
import { findMobPath,visibleBetween } from '../src/navigation.js?v=18';
import { ANIMALS } from '../src/wildlife.js?v=18';
import { targetMob } from '../src/combat.js?v=18';
import { freshState,loadState,saveState } from '../src/save.js?v=18';
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};};
const make=()=>{const g=new Game({setWorld(){},stream(){},burst(){}},{play(){}},storage());g.screen=null;g.pos={x:.5,y:7,z:9.5};g.yaw=0;g.pitch=0;g.mobs=[];return g;};

test('holding any tool or food attacks the aimed animal instead of mining behind it',()=>{
  for(const held of ['wood_pickaxe','wood_axe','apple','stone','wood_sword']){
    const g=make();g.add(held);g.equip(held);g.pitch=Math.atan2(.5-1.58,2.5);const pig=g.spawnMob(.5,7,'pig',7);g.updateMobs=()=>{};g.attackHeld=true;const n=g.state.inv[held];
    for(let i=0;i<11;i++)g.update(.05);assert.ok(pig.hp<=8,held+' must hit repeatedly');assert.equal(g.state.stats.mined,0);assert.equal(g.state.inv[held],n);assert.equal(g.eating,null);
  }
});
test('animal targeting covers the visible body, ignores flowers, and respects walls and reach',()=>{
  const g=make();g.pitch=-.35;const pig=g.spawnMob(.5,7,'pig',7);g.world.set(0,7,8,'flower_red');assert.equal(targetMob(g)?.mob,pig);
  g.world.set(0,7,8,'stone');g.world.set(0,8,8,'stone');assert.equal(targetMob(g),null);g.attack();assert.equal(pig.hp,12);
  g.world.set(0,7,8,null);g.world.set(0,8,8,null);pig.z=1;assert.equal(targetMob(g,4),null);
});
test('local pathfinding detours around walls and avoids water and blocked diagonal corners',()=>{
  const g=make(),w=g.world,m=g.spawnMob(.5,9.5,'pig',7);
  for(let x=-4;x<=4;x++)for(let z=3;z<=10;z++){w.set(x,6,z,'grass');for(let y=7;y<=9;y++)w.set(x,y,z,null);}
  for(let x=-1;x<=1;x++)for(let y=7;y<=9;y++)w.set(x,y,7,'stone');w.set(-2,6,7,'water');
  const path=findMobPath(w,m,{x:.5,z:4.5},ANIMALS.pig);assert.ok(path.length>0);assert.equal(path.at(-1).z,4.5);assert.ok(path.some(p=>Math.abs(p.x-.5)>=2));for(const p of path){assert.equal(w.intersects(p.x,p.y,p.z,.9,.4),false);assert.equal(w.waterAt(p.x,p.y,p.z),false);}
  assert.equal(visibleBetween(w,{x:.5,y:7.5,z:9.5},{x:.5,y:7.5,z:4.5}),false);
});
test('animals remain in their saved positions when leaving an area and reloading',()=>{
  const g=make(),deer=g.spawnMob(2.5,8.5,'deer',7);deer.hp=7;g.pos={x:250,y:50,z:250};g.spawnTimer=15;g.update(.05);assert.ok(g.mobs.includes(deer));g.save();const saved=loadState(g.storage);assert.ok(saved.animals.some(a=>a.kind==='deer'&&a.hp===7));const next=new Game(g.renderer,g.audio,g.storage);assert.ok(next.mobs.some(m=>m.kind==='deer'&&m.hp===7&&m.x===2.5));
});
test('version 5 worlds retain their terrain and new worlds use the smoother generator',()=>{
  const st=storage(),old=freshState(481);old.terrain=5;old.pos={x:.5,y:7,z:9.5};saveState(st,old);const loaded=loadState(st),g=new Game({setWorld(){},stream(){},burst(){}},{play(){}},st);assert.equal(loaded.terrain,5);assert.equal(g.world.terrain,5);
  const legacy=new World(481,[],5),modern=new World(481,[],6);let different=0;
  for(let x=-250;x<=250;x+=25)for(let z=-250;z<=250;z+=25){assert.equal(g.world.height(x,z),legacy.height(x,z));if(legacy.height(x,z)!==modern.height(x,z))different++;}
  assert.ok(different>100);assert.equal(freshState().terrain,6);
});
test('terrain transitions stay smooth away from coastlines and river valleys',()=>{
  const w=new World(481,[],6);let worst=0;
  for(let x=-300;x<=300;x+=3)for(let z=-280;z<0;z+=3){if(Math.hypot(x,z)<50)continue;worst=Math.max(worst,Math.abs(w.height(x,z)-w.height(x+1,z)),Math.abs(w.height(x,z)-w.height(x,z+1)));}
  assert.ok(worst<=3,'largest one-block elevation change: '+worst);
});
test('new trees agree across chunk preparation order and new spawns face open space',()=>{
  const a=new World(901),b=new World(901);a.prepare(4,4);a.prepare(5,4);b.prepare(5,4);b.prepare(4,4);
  for(let x=76;x<=84;x++)for(let z=64;z<80;z++)for(let y=20;y<=55;y++)assert.equal(a.get(x,y,z),b.get(x,y,z));
  const p=a.findSpawn(),yaw=a.spawnFacing(p),hit=a.raycast({x:p.x,y:p.y+1.6,z:p.z},{x:-Math.sin(yaw),y:0,z:-Math.cos(yaw)},8);assert.ok(!hit||hit.distance>2);
});
