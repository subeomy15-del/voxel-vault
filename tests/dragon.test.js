import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=16';
import {World} from '../src/world.js?v=16';
import {ITEMS,RECIPES,craft} from '../src/data.js?v=16';
import {freshState,saveState,loadState} from '../src/save.js?v=16';
import {summonDragon,DRAGON_TOWERS} from '../src/dragon.js?v=16';
import {launchBolt,updateProjectiles} from '../src/combat.js?v=16';
const make=()=>{const data=new Map();return new Game({setWorld(){},burst(){},stream(){}},{play(){},quiet(){}},{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});};
const arena=()=>{const g=make();g.start('ender');g.pos={x:.5,y:19,z:-4.5};return g;};
test('dragon requires its altar, grants a bow once and cycles flight, breath, swoop and melee landing',()=>{
 const g=arena();g.pos.x=25;assert.equal(summonDragon(g),false);g.pos.x=.5;assert.equal(summonDragon(g),true);assert.equal(summonDragon(g),false);assert.equal(g.state.inv.longbow,1);assert.equal(g.state.inv.arrows,64);
 const m=g.boss,stages=new Set(),health=g.state.hp;let shots=0;
 for(let i=0;i<1400;i++){g.hurtCooldown=Math.max(0,g.hurtCooldown-.02);g.updateMobs(.02);stages.add(m.stage);shots=Math.max(shots,g.projectiles.length);}
 assert.deepEqual([...stages].sort(),['breath','circle','perch','swoop']);assert.ok(shots>0);assert.ok(m.hp>0);assert.ok(g.state.hp<=health);
 g.respawn();assert.equal(g.boss,null);g.pos={x:.5,y:19,z:-4.5};assert.equal(summonDragon(g),true);assert.equal(g.state.inv.longbow,1);assert.equal(g.state.inv.arrows,64);
});
test('arrows break healing crystals and hit the dragon; destroyed crystals stop healing',()=>{
 const g=arena();summonDragon(g);const m=g.boss;m.hp=100;
 g.updateMobs(.1);assert.ok(m.hp>100);
 for(const[x,z]of DRAGON_TOWERS){launchBolt(g,{x:x+.5,y:25.5,z:z+3},{x:0,y:0,z:-1},10,false);for(let i=0;i<10;i++)updateProjectiles(g,.02);assert.equal(g.world.get(x,25,z),null);}
 const hp=m.hp;g.updateMobs(.1);assert.equal(m.hp,hp);
 m.x=0;m.y=29;m.z=0;launchBolt(g,{x:0,y:30,z:7},{x:0,y:0,z:-1},13,false);for(let i=0;i<20;i++)updateProjectiles(g,.02);assert.equal(m.hp,hp-13);
 m.y=19;m.z=5;g.pos={x:.5,y:19,z:9.5};g.yaw=0;g.pitch=0;g.attackCooldown=0;g.equip('moonstone_sword');g.attack();assert.ok(m.hp<hp-13);
});
test('dragon health and broken crystals survive travel, rewards are once-only and the trophy returns home',()=>{
 const g=arena();summonDragon(g);g.hit(g.boss,60);g.world.set(-8,25,-8,null);g.save();
 const loaded=new Game(g.renderer,g.audio,g.storage);assert.equal(loaded.boss.hp,200);assert.equal(loaded.world.get(-8,25,-8),null);
 loaded.travel('overworld');loaded.travel('ender');assert.equal(loaded.boss.hp,200);loaded.hit(loaded.boss,300);assert.equal(loaded.boss,null);assert.equal(loaded.state.inv.dragon_egg,1);const moon=loaded.state.inv.moonstone;
 loaded.pos={x:.5,y:19,z:-4.5};summonDragon(loaded);loaded.hit(loaded.boss,300);assert.equal(loaded.state.inv.dragon_egg,1);assert.equal(loaded.state.inv.moonstone,moon);assert.equal(loaded.state.dragon.wins,2);
 loaded.travel('overworld');assert.equal(loaded.state.inv.dragon_egg,1);assert.equal(loadState(loaded.storage).dragon.defeated,true);
});
test('older resources merge without losing stacks, equipment, containers or placed blocks',()=>{
 const g=make(),s=freshState();Object.assign(s.inv,{crystal:7,diamond:5,copper:4,ruby:2,crystal_sword:1});s.bar[0]='crystal_sword';s.containers['0,7,0']={emerald:3,diamond:2};s.moonChest={sapphire:4};s.edits=[['0,7,0','sapphire_block']];saveState(g.storage,s);
 const loaded=loadState(g.storage);assert.equal(loaded.inv.diamond,14);assert.equal(loaded.inv.iron,4);assert.equal(loaded.bar[0],'diamond_sword');assert.equal(loaded.inv.diamond_sword,1);assert.equal(loaded.containers['0,7,0'].diamond,5);assert.equal(loaded.moonChest.diamond,4);assert.equal(new World(1,loaded.edits).get(0,7,0),'diamond_block');
 saveState(g.storage,loaded);assert.equal(loadState(g.storage).inv.diamond,14);
});
test('coal only fuels furnaces and current recipes never require retired ores',()=>{
 assert.equal(new Set(RECIPES.map(r=>r.item)).size,RECIPES.length);
 for(const r of RECIPES){assert.ok(!ITEMS[r.item].hidden,r.item);for(const key of Object.keys(r.cost)){assert.ok(!['copper','copper_ingot','crystal','ruby','emerald','sapphire'].includes(key),r.item+': '+key);if(key==='coal')assert.equal(r.item,'firecracker');}}
 assert.equal(ITEMS.coal.place,false);assert.equal(craft({coal:20},'coal_glider'),false);
 const g=arena();g.pos={x:3.5,y:19,z:3.5};g.world.set(3,19,2,'campfire');g.station={x:3,y:19,z:2};g.add('coal',3);g.add('wheat',2);assert.equal(g.smelt('bread'),false);g.add('wood',1);assert.equal(g.smelt('bread'),true);assert.equal(g.state.inv.coal,3);g.world.set(3,19,2,'furnace');assert.equal(g.smelt('bread'),true);assert.equal(g.state.inv.coal,2);
});
test('deep terrain generates only coal, iron, gold and diamond, with moonstone in the Ender',()=>{
 const w=new World(72),found=new Set(),ores=['coal','iron','gold','diamond','moonstone','copper','crystal','ruby','emerald','sapphire'];
 for(let x=65;x<105;x+=2)for(let z=65;z<105;z+=2)for(let y=-60;y<0;y+=2){const type=w.get(x,y,z);if(ores.includes(type))found.add(type);}
 assert.deepEqual([...found].sort(),['coal','diamond','gold','iron']);const e=new World(72,[],6,'ender');let moon=false;for(let x=-10;x<10;x++)for(let z=-10;z<10;z++)if(e.get(x,16,z)==='moonstone')moon=true;assert.ok(moon);
});
