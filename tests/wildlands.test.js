import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js?v=14';
import { World } from '../src/world.js?v=14';
import { ITEMS,BLOCKS,CROPS,RECIPES,ORE_GLIDERS,canCraft,craft } from '../src/data.js?v=14';
import { ANIMALS,animalKind } from '../src/wildlife.js?v=14';
import { tickSurvival,canEat } from '../src/survival.js?v=14';
import { updateProjectiles } from '../src/combat.js?v=14';
import { loadState } from '../src/save.js?v=14';
const make=()=>{const data=new Map(),g=new Game({setWorld(){},stream(){},burst(){}},{play(){}},{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});g.screen=null;g.pos={x:.5,y:7,z:9.5};g.yaw=0;g.pitch=0;g.mobs=[];return g;};
const ticks=(fn,seconds)=>{for(let t=0;t<seconds-1e-8;t+=.05)fn(.05);};

test('all six huntable species drop their own raw meat and collect it once',()=>{
  for(const[kind,info]of Object.entries(ANIMALS)){
    const g=make(),m=g.spawnMob(.5,7,kind,7);g.state.bar[0]='diamond_sword';g.add('diamond_sword');g.pitch=Math.atan2(info.height*.6-1.58,2.5);
    g.attack();if(g.mobs.includes(m)){g.attackCooldown=0;g.attack();}assert.equal(g.mobs.includes(m),false,kind);
    for(const[item,[low,high]]of Object.entries(info.drops)){const drop=g.state.drops.find(d=>d.item===item);assert.ok(drop&&drop.count>=low&&drop.count<=high,kind+' '+item);assert.equal(g.state.inv[item]||0,0);}
    const drops=g.state.drops.map(d=>({...d}));g.hit(m,99);assert.deepEqual(g.state.drops,drops);
    g.pos={x:.5,y:7,z:7};g.updateDrops(.6);assert.equal(g.state.drops.length,0);for(const d of drops)assert.equal(g.state.inv[d.item],d.count);g.updateDrops(2);for(const d of drops)assert.equal(g.state.inv[d.item],d.count);
  }
});
test('raw animal meats require a placed furnace and provide much more energy after cooking',()=>{
  const g=make();g.world.set(1,7,9,'campfire');g.station={x:1,y:7,z:9};g.add('coal',20);
  for(const meat of ['venison','pork','beef','mutton','chicken','rabbit']){g.add('raw_'+meat);assert.equal(g.smelt('cooked_'+meat),false);}
  assert.equal(g.state.inv.coal,20);g.world.set(1,7,9,'furnace');
  for(const meat of ['venison','pork','beef','mutton','chicken','rabbit']){assert.ok(g.smelt('cooked_'+meat));assert.equal(g.state.inv['raw_'+meat],0);assert.equal(g.state.inv['cooked_'+meat],1);assert.ok(ITEMS['cooked_'+meat].saturation>ITEMS['raw_'+meat].saturation*4);}
  assert.equal(g.state.inv.coal,14);g.pos.z+=10;g.add('raw_pork');assert.equal(g.smelt('cooked_pork'),false);
});
test('food has a chewing action, stores reserves and gradually regenerates health',()=>{
  const g=make();g.state.hp=8;g.state.food=9;g.state.saturation=0;g.add('cooked_beef',2);
  assert.ok(g.eat('cooked_beef'));assert.equal(g.eat('cooked_beef'),false);tickSurvival(g,.4);assert.equal(g.state.inv.cooked_beef,2);tickSurvival(g,.5);assert.equal(g.state.inv.cooked_beef,1);assert.equal(g.state.food,17);assert.equal(g.state.saturation,13);assert.equal(g.state.hp,8);
  ticks(dt=>tickSurvival(g,dt),3);assert.equal(g.state.hp,9);assert.ok(g.state.exhaustion>1);
  g.state.food=20;g.state.saturation=20;assert.equal(canEat(g,'cooked_beef'),false);
  g.state.food=10;g.eat('cooked_beef');g.select(2);tickSurvival(g,1);assert.equal(g.state.inv.cooked_beef,1);
  g.state.food=0;g.state.saturation=0;g.state.hp=2;ticks(dt=>tickSurvival(g,dt),15);assert.equal(g.state.hp,1);
});
test('all effect foods work at full health, expire, pause and persist with equipment and drops',()=>{
  const g=make();g.state.hp=20;g.state.food=20;g.state.saturation=20;
  for(const[name,item]of Object.entries(ITEMS).filter(([,i])=>i.effect)){delete g.state.effects[item.effect];g.add(name);assert.ok(g.eat(name));tickSurvival(g,.9);assert.equal(g.state.effects[item.effect],item.duration);assert.equal(g.state.inv[name],0);}
  g.add('gold_glider');g.equip('gold_glider');g.add('gold_armor');g.equip('gold_armor');g.add('frost_arrows',4);g.equip('frost_arrows');g.dropItem('raw_venison',2,2,7,9);g.save();
  const saved=loadState(g.storage);assert.deepEqual(saved.effects,g.state.effects);assert.equal(saved.glider,'gold_glider');assert.equal(saved.armor,'gold_armor');assert.equal(saved.ammo,'frost_arrows');assert.equal(saved.drops[0].item,'raw_venison');
  g.pause();const before={...g.state.effects};g.update(1);assert.deepEqual(g.state.effects,before);g.resume();ticks(dt=>tickSurvival(g,dt),121);assert.deepEqual(g.state.effects,{});
});
test('hunger consumes reserves before food and disables sprinting when depleted',()=>{
  const g=make();g.state.food=10;g.state.saturation=1;g.state.exhaustion=4;tickSurvival(g,.01);assert.equal(g.state.saturation,0);assert.equal(g.state.food,10);
  g.state.exhaustion=4;tickSurvival(g,.01);assert.equal(g.state.food,9);
  g.state.food=5;g.grounded=true;g.keys.add('KeyW');g.keys.add('ShiftLeft');g.move(.1);assert.equal(g.sprinting,false);
});
test('speed, jumping, featherfall and invisibility alter actual movement and detection',()=>{
  const normal=make(),fast=make();for(const g of [normal,fast]){g.grounded=true;g.keys.add('KeyW');}fast.state.effects.speed=90;ticks(dt=>normal.move(dt),.6);ticks(dt=>fast.move(dt),.6);assert.ok(fast.pos.z<normal.pos.z-.5);
  const a=make(),b=make();a.grounded=b.grounded=true;b.state.effects.jump=90;a.jump();b.jump();assert.ok(b.velocity>a.velocity*1.4);
  b.state.effects.slowfall=90;b.pos.y=15;b.grounded=false;b.velocity=-25;ticks(dt=>b.move(dt),1);assert.ok(b.velocity>=-2.4);assert.equal(b.state.hp,20);
  const g=make(),m=g.spawnMob(.5,4,'stalker',7);g.state.effects.invisibility=75;m.cooldown=0;g.updateMobs(.2);assert.equal(m.z,4);g.revealTime=4;g.updateMobs(.2);assert.ok(m.z>4||m.windup>0);
});
test('charged bows release one arrow and special ammunition changes the hit',()=>{
  const g=make();g.add('longbow');g.equip('longbow');g.add('iron_arrows',3);g.equip('iron_arrows');const m=g.spawnMob(.5,4,'cow',7);g.pitch=Math.atan2(.85-1.5,5.5);
  g.attack();assert.ok(g.drawState);assert.equal(g.projectiles.length,0);g.drawState.time=1.1;g.releaseAttack();assert.equal(g.drawState,null);assert.equal(g.state.inv.iron_arrows,2);assert.equal(g.projectiles.length,1);g.releaseAttack();assert.equal(g.state.inv.iron_arrows,2);
  ticks(dt=>updateProjectiles(g,dt),.4);assert.equal(g.mobs.includes(m),false);assert.ok(g.state.drops.find(d=>d.item==='raw_beef'));
  g.attackCooldown=0;g.add('crossbow');g.equip('crossbow');g.add('frost_arrows',2);g.equip('frost_arrows');const deer=g.spawnMob(.5,4,'deer',7);deer.hp=40;g.attack();ticks(dt=>updateProjectiles(g,dt),.3);assert.ok(deer.slow>0);assert.equal(g.state.inv.frost_arrows,1);
});
test('nine crops grow with hydration, harvest their own produce and survive saves',()=>{
  for(const[kind,crop]of Object.entries(CROPS)){
    const g=make();g.world.set(0,6,8,'farmland');g.world.set(0,7,8,null);g.world.set(4,6,8,'water');g.add(crop.seed,3);g.equip(crop.seed);g.target={x:0,y:6,z:8,type:'farmland'};const before=g.state.inv[crop.seed];assert.ok(g.plant(),kind);assert.equal(g.state.inv[crop.seed],before-1);
    const ready=g.state.crops['0,7,8'].readyAt;assert.equal(ready,crop.seconds*.75);g.save();assert.equal(loadState(g.storage).crops['0,7,8'].kind,kind);
    g.state.elapsed=ready-.1;g.growCrops();assert.equal(g.world.get(0,7,8),crop.sprout);g.state.elapsed=ready;g.growCrops();assert.equal(g.world.get(0,7,8),crop.mature);
    const inv={...g.state.inv};assert.ok(g.harvest({x:0,y:7,z:8,type:crop.mature}));for(const[k,n]of Object.entries(crop.loot))assert.equal(g.state.inv[k],(inv[k]||0)+n);
  }
});
test('each ore crafts a distinct glider; flight trades forward travel for height and ends on landing',()=>{
  assert.equal(ORE_GLIDERS.length,3);const flights={};
  for(const[id]of ORE_GLIDERS){const name=id+'_glider',recipe=RECIPES.find(r=>r.item===name),inv={...recipe.cost};assert.ok(canCraft(inv,recipe));assert.ok(craft(inv,name));assert.equal(inv[name],1);
    const g=make();g.add(name);g.equip(name);assert.equal(g.held,'wood_sword');g.grounded=true;assert.equal(g.toggleGlide(),false);g.pos.y=55;g.grounded=false;assert.ok(g.toggleGlide());ticks(dt=>g.move(dt),2);assert.ok(g.pos.z<0);assert.ok(g.pos.y<55&&g.pos.y>50);flights[id]={z:g.pos.z,y:g.pos.y};g.grounded=true;g.move(.05);assert.equal(g.gliding,false);
  }
  assert.ok(flights.gold.z<flights.iron.z);assert.ok(flights.diamond.y>flights.gold.y);assert.ok(flights.diamond.y>flights.iron.y);
});
test('new recipe ingredients exist, gold equipment functions and vegetation stays in sparse patches',()=>{
  for(const r of RECIPES){assert.ok(ITEMS[r.item],r.item);for(const k of Object.keys(r.cost))assert.ok(ITEMS[k],k);}
  const g=make();g.add('gold_armor');g.equip('gold_armor');g.hurt(10);assert.equal(g.state.hp,13);
  let plants=0,columns=0;const types=new Set(),animals=new Set();
  for(const seed of [1,481,901]){const w=new World(seed);for(let x=64;x<192;x++)for(let z=64;z<192;z++){const type=w.get(x,w.height(x,z)+1,z);columns++;if(BLOCKS[type]?.plant||type?.endsWith('_crop')){plants++;types.add(type);}if(x%13===0&&z%13===0)animals.add(animalKind(w,x,z));}}
  assert.ok(plants>20);assert.ok(plants/columns<.04,plants/columns);assert.ok(types.size>=8,types.size);assert.ok(animals.size>=5,animals.size);
});

test('a melon waits to mature until the player steps out of its growing space',()=>{
  const g=make();g.world.set(0,6,8,'farmland');g.world.set(0,7,8,'watermelon_sprout');g.state.crops['0,7,8']={kind:'watermelon',readyAt:1};g.state.elapsed=2;g.pos={x:.5,y:7,z:8.5};g.growCrops();assert.equal(g.world.get(0,7,8),'watermelon_sprout');g.pos.z=10;g.growCrops();assert.equal(g.world.get(0,7,8),'watermelon_crop');
});
