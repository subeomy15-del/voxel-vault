import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=21';
import {ITEMS,RECIPES} from '../src/data.js?v=21';
const make=()=>{const data=new Map();return new Game({setWorld(){},burst(){},stream(){}},{play(){},quiet(){}},{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});};
test('blast charges craft and arm with a timed detonation',()=>{
 const recipe=RECIPES.find(r=>r.item==='blast_charge');assert.deepEqual(recipe.cost,{coal:3,iron_ingot:2,sand:2});assert.equal(ITEMS.blast_charge.kind,'explosive');
 const g=make();g.start();g.world.set(Math.floor(g.pos.x)+1,Math.floor(g.pos.y),Math.floor(g.pos.z),'bench');g.add('coal',3);g.add('iron_ingot',2);g.add('sand',2);assert.equal(g.craft('blast_charge'),true);g.equip('blast_charge');g.direction=()=>({x:0,y:0,z:-1});g.world.get=()=>null;g.world.intersects=()=>false;let detonated=false;g.detonate=()=>{detonated=true;};assert.equal(g.useBlastCharge(),true);assert.equal(g.state.inv.blast_charge,0);assert.equal(g.blastCooldown,1.8);return new Promise(resolve=>setTimeout(()=>{assert.equal(detonated,true);resolve();},1250));
});
