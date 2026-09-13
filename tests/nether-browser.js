import assert from 'node:assert/strict';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate;
try{
 await c.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 await c.send('Page.navigate',{url:'http://localhost:3001/'});await sleep(1500);
 await ev(`(async()=>{const m=await import('/src/main.js?v=21');window.g=m.game;window.ui=m.ui;ui.settings.perspective=0;g.start('adventure',true);g.pause('inventory');ui.render();})()`);
 assert.equal(await ev('document.querySelectorAll(".pack-hotbar .pack-slot").length'),9);
 await c.click('[data-action="pack-slot-4"]');assert.equal(await ev('g.state.selected'),4);
 await ev("g.add('diamond',3);ui.render()");await c.click('.pack-storage [data-equip="diamond"]');assert.equal(await ev('g.state.bar[4]'),'diamond');
 await c.screenshot('classic-inventory');await c.click('[data-action="craft"]');assert.equal(await ev('g.screen'),'craft');
 await ev("g.pos={x:150.5,y:70,z:150.5};g.add('stone',16);ui.render()");
 assert.equal(await ev(`document.querySelector('[data-craft="furnace"]').disabled`),true);
 await ev("g.world.set(151,70,150,'bench');ui.render()");
 assert.equal(await ev(`document.querySelector('[data-craft="furnace"]').disabled`),false);
 await c.click('[data-craft="furnace"]');assert.equal(await ev('g.state.inv.furnace'),1);

 await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await ev("g.pause('inventory');ui.render()");await sleep(200);
 assert.ok(await ev('document.querySelector(".classic-pack").getBoundingClientRect().right<=innerWidth'));
 await c.screenshot('classic-inventory-mobile');
 await c.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 await ev("g.resume();g.target=null;g.pos={x:g.state.gate.x+.5,y:g.state.gate.y,z:g.state.gate.z+1.5};g.interact();ui.render()");assert.equal(await ev('g.state.dimension'),'nether');await sleep(5000);
 await ev("g.pos={x:72.5,y:25,z:-33.5};g.yaw=0;g.pitch=.05;g.vx=g.vz=0");await sleep(2500);await c.screenshot('nether-fortress');
 await ev("g.target=null;g.pos={x:72.5,y:25,z:-46.5};g.interact();ui.render()");assert.equal(await ev('g.state.dimension'),'ender');
 await ev("g.target=null;g.pos={x:.5,y:19,z:1.5};g.interact();ui.render()");assert.equal(await ev('g.state.dimension'),'nether');
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);await ev("g.pause('menu');ui.render()");console.log('PASS: inventory slots, equipping, recipes, mobile layout, Nether rendering and portal round trip');
}finally{c.socket.close();}
