import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=33';
import {freshState,loadState,slotKey} from '../src/save.js?v=33';
import {ITEMS} from '../src/data.js?v=33';
import {ALTARS,OFFERS,ENCHANTS,enchantUnlocked} from '../src/infusion-registry.js?v=33';
import {rollInfusion,normalizeRoll,infusionValue,nearbyAltar} from '../src/infusions.js?v=33';
import {weaponPower,miningPower,armorProtection,awardAura} from '../src/enchanting.js?v=33';
const make=()=>{const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};const g=new Game({setWorld(){},stream(){},burst(){}},{play(){},quiet(){}},storage);g.pos={x:100.5,y:80,z:100.5};g.screen='enchant';g.state.aura=1000;g.world.set(101,80,100,'basic_altar');return g;};
const rng=()=>{let seed=321;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};
test('75,000 rolls follow all 15 configured distributions and obey budgets, levels and conflicts',()=>{
 const state=freshState();Object.assign(state,{opened:['outpost-ruins'],fortressCleared:true,dimension:'ender',dragon:{defeated:true}});const random=rng();
 for(let altar=1;altar<=5;altar++)for(let offer=0;offer<3;offer++){
  const counts=[0,0,0,0,0];for(let i=0;i<5000;i++){const roll=rollInfusion(state,'iron_sword',altar,offer,random);counts[roll.tier-1]++;assert.deepEqual(normalizeRoll('iron_sword',roll),roll);}
  ALTARS[altar-1].odds[offer].forEach((percent,i)=>assert.ok(Math.abs(counts[i]/50-percent)<2.5,`${altar}/${offer}/${i}: ${counts[i]/50}% vs ${percent}%`));
 }
});
test('all item categories and unlock pools generate only implemented compatible effects',()=>{
 const s=freshState();Object.assign(s,{opened:['outpost-ruins'],fortressCleared:true,dimension:'ender',dragon:{defeated:true}});
 for(const name of ['wood_sword','iron_axe','iron_pickaxe','iron_shovel','iron_hoe','bow','iron_boots','iron_helm','armor'])for(let tier=1;tier<=5;tier++)for(let i=0;i<40;i++){const r=rollInfusion(s,name,tier,2);assert.ok(normalizeRoll(name,r),name);}
 assert.throws(()=>rollInfusion(s,'grass',1,0));assert.equal(normalizeRoll('wood_sword',{tier:2,altar:2,enchants:{impact:1,swift_strike:1}}),null);
 assert.equal(normalizeRoll('wood_sword',{tier:5,altar:5,enchants:{edge:6}}),null);
 const g=make();g.world.set(101,80,100,'ashen_altar');assert.equal(nearbyAltar(g),0);g.state.fortressCleared=true;assert.equal(nearbyAltar(g),4);
});
test('each offer charges once, double clicks cannot double spend, rerolls replace legacy and prior rolls',async()=>{
 const g=make();g.state.enchants.wood_sword=3;for(let offer=0;offer<3;offer++){const xp=g.state.aura,roll=await g.infuse('wood_sword',offer);assert.ok(roll);assert.equal(g.state.aura,xp-OFFERS[offer].cost);assert.deepEqual(g.state.infusions.wood_sword,roll);assert.equal(g.state.enchants.wood_sword,undefined);}
 const xp=g.state.aura,first=g.infuse('wood_sword',0),second=g.infuse('wood_sword',0);assert.equal(await second,false);assert.ok(await first);assert.equal(g.state.aura,xp-18);assert.equal(g.state.infusionSeq,4);
 const loaded=loadState(g.storage);assert.deepEqual(loaded.infusions,g.state.infusions);assert.equal(loaded.aura,g.state.aura);assert.ok(loaded.enchantCodex.length);
});
test('journal recovers an interrupted save with the same paid result and cannot replay twice',async()=>{
 const g=make();const save=g.save.bind(g);let before;
 g.save=()=>{if(!before){const result=save();before=g.storage.getItem(slotKey('adventure'));return result;}return false;};
 const roll=await g.infuse('wood_sword',2);assert.ok(roll);assert.equal(g.storage.getItem(slotKey('adventure')),before);
 const loaded=loadState(g.storage);assert.equal(loaded.aura,928);assert.deepEqual(loaded.infusions.wood_sword,roll);g.storage.setItem(slotKey('adventure'),JSON.stringify(loaded));assert.equal(loadState(g.storage).aura,928);
 const replacement=freshState(g.state.seed);g.storage.setItem(slotKey('adventure'),JSON.stringify(replacement));assert.deepEqual(loadState(g.storage).infusions,{});
});
test('quota failure, insufficient XP/material, unsupported modes and early altars do not consume resources',async()=>{
 const g=make();g.state.aura=17;assert.equal(await g.infuse('wood_sword',0),false);g.state.aura=100;assert.equal(await g.infuse('grass',0),false);
 const base=g.storage.setItem;g.storage.setItem=(key,value)=>{if(key.endsWith('.infusion'))throw Object.assign(Error('Full'),{name:'QuotaExceededError'});base(key,value);};assert.equal(await g.infuse('wood_sword',0),false);assert.equal(g.state.aura,100);assert.deepEqual(g.state.infusions,{});
 g.storage.setItem=base;g.world.set(101,80,100,'ancient_altar');g.state.opened=['outpost-ruins'];assert.equal(await g.infuse('wood_sword',2),false);g.add('diamond');assert.ok(await g.infuse('wood_sword',2));assert.equal(g.state.inv.diamond,0);
 g.multiplayer={active:true};assert.equal(await g.infuse('wood_sword',0),false);
});
test('weapon, tool, armor and dimension modifiers affect real gameplay without unbounded stacking',()=>{
 const g=make();g.state.infusions.wood_sword={tier:3,altar:3,enchants:{edge:3}};assert.equal(weaponPower(g.state,'wood_sword'),1.18);
 g.state.infusions.wood_pickaxe={tier:3,altar:3,enchants:{haste:3}};assert.equal(miningPower(g.state,'wood_pickaxe'),1.27);
 g.add('iron_boots');g.state.armorParts.boots='iron_boots';g.state.infusions.iron_boots={tier:3,altar:3,enchants:{ward:3}};assert.ok(armorProtection(g.state)>ITEMS.iron_boots.reduction);assert.ok(armorProtection(g.state)<=.8);
 g.state.infusions.wood_sword={tier:3,altar:3,enchants:{swift_strike:3}};g.screen=null;g.yaw=0;g.pitch=0;g.mobs=[];const m=g.spawnMob(100.5,98.5,'zombie',80);g.attack();assert.ok(m.hp<m.maxHp);assert.ok(Math.abs(g.attackCooldown-.36*.88)<1e-8);assert.equal(infusionValue(g.state,'wood_sword','swift_strike'),.12);
});
test('ruin altar unlock ignores starter supplies and persists through realm travel and reload',()=>{
 const g=make();g.state.opened=['starter'];assert.equal(enchantUnlocked(g.state,'ruins'),false);
 for(const id of ['outpost-lodge','outpost-tower','outpost-ruins','ruin:7821:7:8:4','grove','dunes','frost']){
  g.state.opened=[id];assert.equal(enchantUnlocked(g.state,'ruins'),true,id);
 }
 g.state.opened=['outpost-tower'];g.travel('nether');assert.equal(enchantUnlocked(g.state,'ruins'),true);
 assert.equal(enchantUnlocked(loadState(g.storage),'ruins'),true);
});
test('fractional mining XP bonuses accumulate fairly and survive reload without changing legacy balances',()=>{
 let g=make();g.state.aura=0;g.state.infusions.wood_pickaxe={tier:1,altar:3,enchants:{miners_aura:1}};
 for(let i=0;i<5;i++){
  awardAura(g,4*(1+infusionValue(g.state,'wood_pickaxe','miners_aura')));g.save();g.state=loadState(g.storage);
 }
 assert.equal(g.state.aura,22);assert.ok(g.state.auraRemainder<1e-8);
 awardAura(g,Infinity);assert.equal(g.state.aura,22);
 const legacy={...g.state};delete legacy.auraRemainder;g.storage.setItem(slotKey('adventure'),JSON.stringify(legacy));
 assert.equal(loadState(g.storage).auraRemainder,0);
});
test('leaving an altar while its save is pending cancels without payment or a revealed roll',async()=>{
 for(const change of [g=>{g.screen=null;},g=>{g.state=freshState(999);},g=>g.world.set(101,80,100,null)]){
  const g=make(),state=g.state;let resolve;
  Object.defineProperty(g,'saveReady',{get:()=>new Promise(r=>{resolve=r;})});
  const pending=g.infuse('wood_sword',2);assert.equal(g.infusing,true);change(g);resolve(true);
  assert.equal(await pending,false);assert.equal(state.aura,1000);assert.deepEqual(state.infusions,{});assert.equal(g.infusing,false);
 }
});
