import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=14';
import {ITEMS,RECIPES} from '../src/data.js?v=14';
const make=()=>{const data=new Map();return new Game({setWorld(){},burst(...args){this.last=args;},stream(){}},{play(){},quiet(){}},{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});};
test('firecrackers craft from coal and sunstone sand, then burst without changing terrain',()=>{
 const recipe=RECIPES.find(r=>r.item==='firecracker');assert.deepEqual(recipe.cost,{coal:1,sand:2});const g=make();g.start();g.add('coal',1);g.add('sand',2);assert.equal(g.craft('firecracker'),true);assert.equal(g.state.inv.firecracker,4);g.equip('firecracker');const before=g.state.inv.firecracker;g.direction=()=>({x:0,y:0,z:-1});assert.equal(g.useFirecracker(),true);assert.equal(g.state.inv.firecracker,before-1);assert.equal(g.renderer.last[3],'#f5d18a');assert.equal(ITEMS.firecracker.kind,'firecracker');
});
