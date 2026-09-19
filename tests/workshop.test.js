import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=33';
const make=()=>new Game({setWorld(){},burst(){},stream(){}},{play(){},quiet(){}},{getItem(){return null;},setItem(){}});
test('hand crafts a bench; advanced recipes require a present, nearby bench without spending on rejection',()=>{
 const g=make();g.start();g.pos={x:150.5,y:70,z:150.5};g.add('wood',6);assert.equal(g.craft('bench'),true);g.add('stone',16);
 const before=g.state.inv.stone;assert.equal(g.craft('furnace'),false);assert.equal(g.state.inv.stone,before);
 g.world.set(151,70,150,'bench');assert.equal(g.craft('furnace'),true);assert.equal(g.state.inv.stone,before-8);
 g.world.set(151,70,150,null);assert.equal(g.craft('furnace'),false);g.world.set(151,70,150,'bench');g.pos.x+=10;assert.equal(g.craft('furnace'),false);
});
test('stone resists hand mining and the right pickaxe is faster',()=>{
 const g=make();g.start();g.target={x:150,y:70,z:150,type:'stone'};g.world.set(150,70,150,'stone');g.state.bar[g.state.selected]='apple';g.mine(.1);const hand=g.mineProgress;assert.ok(hand<.1);assert.equal(g.world.get(150,70,150),'stone');
 g.mineProgress=0;g.state.bar[g.state.selected]='wood_pickaxe';g.mine(.1);assert.ok(g.mineProgress>hand);assert.ok(g.mineProgress<1);g.mine(5);assert.equal(g.world.get(150,70,150),null);
});
