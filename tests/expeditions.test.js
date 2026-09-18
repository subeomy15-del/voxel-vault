import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js?v=31';
import { freshState,loadState } from '../src/save.js?v=31';
import { ITEMS,RECIPES } from '../src/data.js?v=31';
import { existsSync } from 'node:fs';
import { FORGE_OFFERS } from '../src/expeditions.js?v=31';
const make=()=>{const data=new Map();return new Game({setWorld(){},burst(){},stream(){}},{play(){},quiet(){}},{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});};
test('all three outposts generate across terrain seeds and preserve player edits on reload',()=>{
 const g=make();for(const seed of [2,3,8,11,14,22,28]){g.state=freshState(seed);g.loadWorld();assert.equal(g.state.outposts.length,3);for(const p of g.state.outposts)assert.equal(g.world.get(p.x+1,p.y,p.z+1),'treasure_chest');}
 const p=g.state.outposts[0];g.world.set(p.x,p.y+6,p.z,'gold_block');g.save();g.state=loadState(g.storage);g.loadWorld();assert.equal(g.world.get(p.x,p.y+6,p.z),'gold_block');assert.equal(g.state.outposts.length,3);
});
test('retired forge has no offers and outpost treasure can only be collected once',()=>{
 assert.equal(FORGE_OFFERS.length,0);const g=make();g.start();const p=g.state.outposts.find(p=>p.id==='lodge');g.pos={x:p.x+.5,y:p.y,z:p.z+2.5};g.target={x:p.x+1,y:p.y,z:p.z+1,type:'treasure_chest'};g.interact();assert.equal(g.state.inv.diamond,2);assert.equal(g.world.get(p.x+1,p.y,p.z+1),'chest');g.interact();assert.equal(g.state.inv.diamond,2);assert.equal(g.forge('dawnblade'),false);
});
test('every catalogue item has rendered artwork and all recipe ingredients are real',()=>{
 for(const name of Object.keys(ITEMS))assert.ok(existsSync(new URL('../assets/items/'+name+'.png',import.meta.url)),name);
 for(const r of RECIPES){assert.ok(ITEMS[r.item],r.item);for(const name of Object.keys(r.cost))assert.ok(ITEMS[name],name);}
});
