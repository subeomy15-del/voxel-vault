import assert from 'node:assert/strict';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate;
const ready=async()=>{await sleep(150);for(let i=0;i<300;i++){if(await ev('v.chunks.size>=9&&!v.inflight&&!v.queue.length&&!v.ready.length'))return;await sleep(100);}throw Error('Terrain did not settle');};
try{
 await c.send('Page.bringToFront');
 await c.send('Network.setCacheDisabled',{cacheDisabled:true});
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await c.send('Page.navigate',{url:'http://localhost:3001/'});await sleep(1500);
 await ev(`(async()=>{const m=await import('/src/main.js?v=38');window.g=m.game;window.v=m.renderer;window.ui=m.ui;})()`);
 await ready();await c.screenshot('infinite-lobby');
 await ev("g.start('creative',true);g.pause('pause');g.screen=null;g.flying=true;g.pos={x:510.5,y:55,z:960};g.yaw=-Math.PI/2;g.keys.add('KeyW');ui.render()");
 await sleep(1500);await ev('g.keys.clear()');assert.ok(await ev('g.pos.x>512'));
 for(const x of [2400,-2400]){
  await ev(`g.pos={x:${x}.5,y:55,z:960.5};g.velocity=0;g.flying=true;g.pitch=-.35;g.world.set(${x},54,960,'plank')`);
  await ready();assert.ok(await ev(`v.chunks.has('${x/16},60')`));
  assert.equal(await ev(`g.world.get(${x},54,960)`),'plank');
 }
 await c.screenshot('infinite-world');
 assert.ok(await ev('v.chunks.size<=169'));
 await ev('g.save()');await c.send('Page.reload');await sleep(1500);
 await ev(`(async()=>{const m=await import('/src/main.js?v=38');window.g=m.game;window.v=m.renderer;window.ui=m.ui;g.start('creative');g.pause('pause');})()`);
 assert.ok(await ev('g.pos.x < -2300'));assert.equal(await ev('g.world.get(-2400,54,960)'),'plank');
 await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await ev("g.pause('menu');ui.render()");await sleep(300);await c.screenshot('infinite-mobile');
 assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth'));
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);
 console.log('PASS: movement across the old border, positive/negative distant chunks, bounded mesh count, saved distant builds and desktop/mobile branding.');
}catch(error){console.error(await ev('({pos:g.pos,screen:g.screen,chunks:v.chunks.size,queue:v.queue.length,inflight:v.inflight,ready:v.ready.length})'),c.errors);throw error;}finally{c.socket.close();}
