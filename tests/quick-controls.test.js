import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=35';
const make=()=>{const data=new Map(),g=new Game({setWorld(){},stream(){},burst(){},firework(){}},{play(){}},{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});g.screen=null;g.pos={x:500.5,y:85,z:500.5};g.mobs=[];return g;};
test('firecracker uses backpack stock instantly without changing equipped item or slot, and respects cooldown',()=>{
 const g=make();g.add('firecracker',3);const bar=[...g.state.bar],selected=g.state.selected;g.gliding=true;g.yaw=0;g.pitch=0;
 assert.equal(g.useFirecracker(),true);assert.equal(g.state.inv.firecracker,2);assert.equal(g.useFirecracker(),false);assert.equal(g.state.inv.firecracker,2);assert.deepEqual(g.state.bar,bar);assert.equal(g.state.selected,selected);assert.equal(g.vz,-14);
 g.firecrackerCooldown=0;g.screen='inventory';assert.equal(g.useFirecracker(),true);assert.equal(g.screen,'inventory');g.firecrackerCooldown=0;g.screen='death';assert.equal(g.useFirecracker(),false);assert.equal(g.state.inv.firecracker,1);
});
test('glider opens immediately, catches a fast fall and follows a 90-degree turn on the next simulation step',()=>{
 const g=make();g.add('hang_glider');g.state.glider='hang_glider';g.grounded=false;g.velocity=-20;g.yaw=0;
 assert.equal(g.toggleGlide(),true);assert.ok(g.vz<-7);assert.ok(g.velocity>-4);g.yaw=-Math.PI/2;g.move(1/60);assert.ok(g.vx>7);assert.ok(Math.abs(g.vz)<.001);
 const speeds=[];for(const hz of [30,60,144]){const a=make();a.add('hang_glider');a.state.glider='hang_glider';a.toggleGlide();a.useFirecracker();for(let i=0;i<hz/2;i++)a.move(1/hz);speeds.push(Math.hypot(a.vx,a.vz));}assert.ok(Math.max(...speeds)-Math.min(...speeds)<.02);
});
