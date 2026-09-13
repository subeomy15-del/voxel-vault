import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js?v=20';
import { freshState,loadState } from '../src/save.js?v=20';
import { ITEMS,RECIPES } from '../src/data.js?v=20';
import { existsSync } from 'node:fs';
import { FORGE_OFFERS } from '../src/expeditions.js?v=20';
const make=()=>{const data=new Map();return new Game({setWorld(){},burst(){},stream(){}},{play(){},quiet(){}},{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});};
test('all three outposts generate across terrain seeds and preserve player edits on reload',()=>{
 const g=make();for(const seed of [2,3,8,11,14,22,28]){g.state=freshState(seed);g.loadWorld();assert.equal(g.state.outposts.length,3);for(const p of g.state.outposts)assert.equal(g.world.get(p.x+1,p.y,p.z+1),'treasure_chest');}
 const p=g.state.outposts[0];g.world.set(p.x,p.y+6,p.z,'gold_block');g.save();g.state=loadState(g.storage);g.loadWorld();assert.equal(g.world.get(p.x,p.y+6,p.z),'gold_block');assert.equal(g.state.outposts.length,3);
});
test('relic forge exposes a full sacred gear tier with artwork',()=>{
 assert.ok(FORGE_OFFERS.length>=11);
 for(const [name,cost] of FORGE_OFFERS){assert.ok(ITEMS[name],name);assert.ok(cost>=3);assert.ok(existsSync(new URL('../assets/items/'+name+'.png',import.meta.url)),name);}
});
test('outpost treasure can be collected once and relic forging requires a real nearby station and exact payment',()=>{
 const g=make();g.start();const p=g.state.outposts.find(p=>p.id==='lodge');g.pos={x:p.x+.5,y:p.y,z:p.z+2.5};g.target={x:p.x+1,y:p.y,z:p.z+1,type:'treasure_chest'};g.interact();assert.equal(g.state.inv.diamond,2);assert.equal(g.world.get(p.x+1,p.y,p.z+1),'chest');g.interact();assert.equal(g.state.inv.diamond,2);
 g.station={x:p.x-2,y:p.y,z:p.z-2};assert.equal(g.forge('grappling_hook'),false);g.add('diamond',3);assert.equal(g.forge('grappling_hook'),true);assert.equal(g.state.inv.diamond,2);assert.equal(g.state.inv.grappling_hook,1);assert.equal(g.forge('grappling_hook'),false);g.add('diamond',9);g.pos.x+=40;assert.equal(g.forge('ruby_blade'),false);
 g.pos={x:p.x-.5,y:p.y,z:p.z-1.5};g.add('diamond',20);assert.equal(g.forge('dawnblade'),true);
});
test('grappling uses collision-aware movement, has a cooldown and rejects empty sky',()=>{
 const g=make();g.start('ender');g.add('grappling_hook');g.equip('grappling_hook');g.pos={x:10.5,y:19,z:8.5};g.yaw=0;g.pitch=0;g.world.set(10,20,1,'obsidian');assert.equal(g.useGrapple(),true);assert.equal(g.useGrapple(),false);const z=g.pos.z;
 for(let i=0;i<100;i++){g.move(.016);assert.equal(g.world.intersects(g.pos.x,g.pos.y,g.pos.z),false);}assert.ok(g.pos.z<z-2);g.grappleCooldown=0;g.pitch=1.4;assert.equal(g.useGrapple(),false);
});
test('ruby and sapphire weapons have distinct effects and the warhammer respects its recovery',()=>{
 const g=make();g.start('ender');g.pos={x:10.5,y:19,z:8.5};g.yaw=0;g.pitch=0;g.state.hp=10;const m=g.spawnMob(10.5,6.5,'brute',19);m.hp=100;
 g.add('ruby_blade');g.equip('ruby_blade');g.attack();assert.equal(g.state.hp,11);g.attackCooldown=0;g.add('sapphire_blade');g.equip('sapphire_blade');g.attack();assert.equal(m.slow,2);g.attackCooldown=0;g.add('warhammer');g.equip('warhammer');g.attack();assert.equal(g.attackCooldown,.85);const hp=m.hp;g.attack();assert.equal(m.hp,hp);
});
test('every catalogue item has rendered artwork and all recipe ingredients are real',()=>{
 for(const name of Object.keys(ITEMS))assert.ok(existsSync(new URL('../assets/items/'+name+'.png',import.meta.url)),name);
 for(const r of RECIPES){assert.ok(ITEMS[r.item],r.item);for(const name of Object.keys(r.cost))assert.ok(ITEMS[name],name);}
});
