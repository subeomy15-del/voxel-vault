import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=34';
import {ITEMS,RECIPES} from '../src/data.js?v=34';
import {POTIONS} from '../src/potion-content.js?v=34';
import {tickPotions,normalizeBrews,potionDamageMultiplier} from '../src/potions.js?v=34';
import {loadState} from '../src/save.js?v=34';
const make=()=>{const data=new Map(),g=new Game({setWorld(){},stream(){},burst(){}},{play(){},quiet(){}},{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});g.screen=null;g.pos={x:100.5,y:80,z:100.5};g.mobs=[];return g;};
const bottle=(g,id)=>{g.add(id,2);g.state.potionCooldown=0;return g.drink(id);};
test('all 36 infusions require a real nearby brewing station and exact materials',()=>{
 assert.equal(Object.keys(POTIONS).length,36);
 for(const [id,p]of Object.entries(POTIONS)){
  const g=make(),r=RECIPES.find(r=>r.item===id);assert.ok(ITEMS[id]);Object.assign(g.state.inv,r.cost);const before={...g.state.inv};
  assert.equal(g.craft(id),false);assert.deepEqual(g.state.inv,before);
  g.world.set(101,80,100,'brewing_station');assert.equal(g.craft(id),true,id);assert.equal(g.state.inv[id],1);
  for(const [k,n]of Object.entries(r.cost))assert.equal(g.state.inv[k],before[k]-n);
  assert.equal(g.craft(id),false);assert.ok(p.power>0);
 }
});
test('filling flasks needs water and returns one reusable flask per drink',()=>{
 const g=make();g.add('empty_flask');assert.equal(g.craft('water_flask'),false);g.world.set(101,80,100,'water');assert.ok(g.craft('water_flask'));assert.equal(g.state.inv.empty_flask,0);
 assert.ok(bottle(g,'speed_potion'));assert.equal(g.state.inv.empty_flask,1);assert.equal(g.state.selected,0);assert.equal(g.drink('speed_potion'),false);assert.equal(g.state.inv.speed_potion,1);
});
test('instant healing, cooldown across bottles and no wasted full-health drink',()=>{
 const g=make();g.add('healing_potion',3);assert.equal(g.drink('healing_potion'),false);g.state.hp=5;assert.ok(g.drink('healing_potion'));assert.equal(g.state.hp,13);assert.equal(g.eating,null);
 g.add('healing_potion_strong');assert.equal(g.drink('healing_potion_strong'),false);tickPotions(g,3);assert.ok(g.drink('healing_potion_strong'));assert.equal(g.state.hp,20);assert.equal(g.state.inv.healing_potion,2);
});
test('refresh never stacks power or duration and weaker bottles cannot downgrade a strong infusion',()=>{
 const g=make();bottle(g,'speed_potion');tickPotions(g,5);bottle(g,'speed_potion');assert.equal(g.state.brews.speed.remaining,90);assert.equal(g.potionPower('speed'),.18);
 bottle(g,'speed_potion_strong');const count=g.state.inv.speed_potion_extended||0;assert.equal(bottle(g,'speed_potion_extended'),false);assert.equal(g.state.inv.speed_potion_extended,count+2);assert.equal(g.potionPower('speed'),.27);
 tickPotions(g,50);assert.equal(g.potionPower('speed'),0);assert.ok(bottle(g,'speed_potion_extended'));assert.equal(g.state.brews.speed.remaining,180);
});
test('regeneration and extended healing stop at expiry and are frame independent',()=>{
 for(const step of [.1,1,20]){const g=make();g.state.hp=1;bottle(g,'healing_potion_extended');for(let t=0;t<20;t+=step)tickPotions(g,Math.min(step,20-t));assert.ok(Math.abs(g.state.hp-13)<1e-7);assert.equal(g.state.brews.healing,undefined);}
 const g=make();g.state.hp=1;bottle(g,'regeneration_potion');tickPotions(g,60);assert.equal(g.state.hp,16);assert.equal(g.state.brews.regeneration,undefined);
});
test('defense and realm resistances stay bounded and apply only to matching hazards',()=>{
 const g=make();bottle(g,'fire_resistance_potion');assert.equal(potionDamageMultiplier(g,'physical'),1);assert.equal(potionDamageMultiplier(g,'fire'),.55);
 bottle(g,'defense_potion_strong');assert.ok(Math.abs(potionDamageMultiplier(g,'physical')-.82)<1e-8);bottle(g,'ash_resistance_potion_strong');g.state.dimension='nether';assert.ok(Math.abs(potionDamageMultiplier(g,'fire')-.328)<1e-8);
 bottle(g,'void_resistance_potion');assert.ok(potionDamageMultiplier(g,'void')<potionDamageMultiplier(g,'physical'));g.state.dimension='overworld';assert.ok(Math.abs(potionDamageMultiplier(g,'combat')-.82)<1e-8);
});
test('water breathing slows oxygen loss, surfacing restores it, pause freezes buffs',()=>{
 const g=make();g.world.waterAt=()=>true;tickPotions(g,10);assert.equal(g.state.breath,10);g.state.breath=20;bottle(g,'water_breathing_potion');tickPotions(g,10);assert.equal(g.state.breath,16);
 g.world.waterAt=()=>false;tickPotions(g,1);assert.equal(g.state.breath,20);g.pause('inventory');const time=g.state.brews.water_breathing.remaining;g.update(3);assert.equal(g.state.brews.water_breathing.remaining,time);assert.equal(g.state.potionCooldown,0);
});
test('brews and cooldown survive reload and travel; death clears buffs; invalid data is rejected',()=>{
 const g=make();bottle(g,'mining_potion_extended');g.save();const s=loadState(g.storage);assert.equal(s.brews.mining.remaining,240);assert.equal(s.potionCooldown,3);assert.equal(s.inv.mining_potion_extended,1);
 g.state=s;g.loadWorld();g.travel('nether');assert.equal(g.potionPower('mining'),.25);g.respawn();assert.deepEqual(g.state.brews,{});
 assert.deepEqual(normalizeBrews({speed:{id:'strength_potion',remaining:30},mining:{id:'mining_potion',remaining:Infinity}}),{});
 assert.equal(normalizeBrews({speed:{id:'speed_potion',remaining:999}}).speed.remaining,90);
});
test('potions cannot escape competitive authority or be consumed from death/menu screens',()=>{
 const g=make();g.add('strength_potion',2);g.multiplayer={competitive:true};assert.equal(g.drink('strength_potion'),false);g.multiplayer=null;g.screen='death';assert.equal(g.drink('strength_potion'),false);g.screen='menu';assert.equal(g.drink('strength_potion'),false);assert.equal(g.state.inv.strength_potion,2);
});
