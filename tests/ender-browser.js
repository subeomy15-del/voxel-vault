import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { connect,sleep } from './cdp.js';
const c=await connect(),ev=c.evaluate;
const ready=async()=>{for(let i=0;i<220;i++){if(await ev('v.chunks.size>=9&&!v.inflight&&!v.queue.length&&!v.ready.length'))return;await sleep(100);}throw Error('Terrain did not settle');};
const key=async code=>{await c.send('Input.dispatchKeyEvent',{type:'keyDown',code,key:code==='F5'?'F5':'v'});await c.send('Input.dispatchKeyEvent',{type:'keyUp',code,key:code==='F5'?'F5':'v'});await sleep(150);};
try{
 await c.send('Emulation.setDeviceMetricsOverride',{width:960,height:600,deviceScaleFactor:1,mobile:false});
 await c.send('Page.navigate',{url:'http://localhost:3001/'});await sleep(700);
 await ev(`(async()=>{const m=await import('/src/main.js?v=26');window.g=m.game;window.v=m.renderer;window.ui=m.ui;ui.settings.perspective=0;})()`);
 if(process.argv.includes('--previews')){
  await ev(`window.captureStyle=document.createElement('style');captureStyle.textContent='body>*:not(#world){visibility:hidden!important}';document.head.append(captureStyle)`);
  for(const [name,mode,x,z]of [['survival','adventure',-70,24],['creative','creative',0,14],['daily','daily',-135,-78],['ender','ender',0,0]]){
   await ev(`(async()=>{g.state=(await import('/src/save.js?v=26')).freshState(7821,'${mode}'==='ender'?'adventure':'${mode}');g.loadWorld();if('${mode}'==='ender')g.travel('ender');g.pos={x:${x},y:g.world.height(${x},${z})+1,z:${z}};g.state.time=110;g.screen='menu';ui.render();})()`);
   if(mode==='creative')await ev(`for(let x=-12;x<12;x++)for(let z=-10;z<12;z++)g.world.set(x,7,z,'white_concrete');for(let x=-9;x<=9;x+=6)for(let z=-7;z<=5;z+=6)for(let y=8;y<17;y++)g.world.set(x,y,z,y===16?'moonstone_block':'blue_concrete');for(let x=-10;x<=10;x++)for(let z=-8;z<=6;z++)if(x===-10||x===10||z===-8||z===6)g.world.set(x,17,z,'white_concrete')`);
   await ready();await sleep(300);
   await writeFile(new URL('../assets/'+name+'-preview.png',import.meta.url),Buffer.from((await c.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  await ev('captureStyle.remove()');c.errors.length=0;c.failed.length=0;
 }
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await ev(`g.screen='menu';ui.render()`);await c.click('[data-action="ender"]');await ready();
 assert.equal(await ev('g.world.dimension'),'ender');assert.equal(await ev('g.world.get(0,19,0)'),'ender_gate');assert.equal(await ev('g.state.glider'),'hang_glider');
 await ev('g.pos={x:.5,y:19,z:12.5};g.yaw=0;g.pitch=.03');await key('KeyV');assert.equal(await ev('ui.settings.perspective'),1);assert.equal(await ev('v.player.group.visible'),true);assert.equal(await ev('v.hand.visible'),false);await c.screenshot('ender-third-back');
 await key('F5');assert.equal(await ev('ui.settings.perspective'),2);assert.equal(await ev('v.player.group.visible'),true);await c.screenshot('ender-third-front');
 await key('KeyV');assert.equal(await ev('ui.settings.perspective'),0);assert.equal(await ev('v.hand.visible'),true);assert.equal(await ev('v.player.group.visible'),false);
 await ev('g.select(4);g.pitch=0;g.yaw=0');const orbs=await ev('g.state.inv.moonstone_orb');await c.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyE',key:'e'});await c.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyE',key:'e'});assert.equal(await ev('g.state.inv.moonstone_orb'),orbs-1);
 await ev(`g.world.set(2,27,2,'moonstone_block');g.save();ui.action('camera');g.pause();ui.render()`);
 await c.send('Page.reload');await sleep(700);await ev(`(async()=>{const m=await import('/src/main.js?v=26');window.g=m.game;window.v=m.renderer;window.ui=m.ui;})()`);await c.click('[data-action="ender"]');await ready();assert.equal(await ev('g.world.get(2,27,2)'),'moonstone_block');assert.equal(await ev('ui.settings.perspective'),1);
 await ev(`g.pause('inventory');ui.catalogue=true;ui.search='moonstone';ui.render()`);assert.ok(await ev('document.querySelectorAll(".item-card").length')>=8);await c.screenshot('moonstone-inventory');
 await ev('ui.resume()');
 for(const [id,x,z]of [['dawn',0,-48],['ember',48,-48],['dusk',48,0]]){
  await ev(`g.pos={x:${x}+1.5,y:g.world.height(${x},${z})+1,z:${z}+1.5};g.vx=g.vz=g.velocity=0;g.gliding=false;g.target=null`);await ready();await sleep(100);
  await c.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyE',key:'e'});await c.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyE',key:'e'});await sleep(150);
  assert.ok(await ev(`g.state.rift.collected.includes('${id}')`));
 }
 assert.equal(await ev('g.state.inv.moonstone_sword'),1);assert.equal(await ev('g.state.glider'),'moonstone_glider');await c.screenshot('rift-complete');
 await ev(`g.pos={x:.5,y:19,z:10.5};g.vx=g.vz=g.velocity=0;g.gliding=false;g.grounded=true;g.padCooldown=0;g.yaw=0;g.pitch=0`);await sleep(200);assert.ok(await ev('g.velocity')>10);await sleep(1300);assert.equal(await ev('g.gliding'),true);await c.screenshot('rift-launch');
 await ev('g.returnHome();g.pause();ui.render()');await c.click('[data-action="return-world"]');assert.equal(await ev('g.state.mode'),'adventure');assert.equal(await ev('g.state.dimension'),'overworld');assert.equal(await ev('g.state.inv.moonstone_sword'),1);
 await ev('g.pause();g.screen="menu";ui.render()');await ready();await c.screenshot('real-world-lobby');
 await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await ev('ui.render()');assert.ok(await ev('document.querySelector(".ender-world-button").getBoundingClientRect().right<=innerWidth'));assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth'));await c.screenshot('ender-mobile-lobby');
 await c.click('[data-action="ender"]');await ready();await c.click('[data-action="camera"]');assert.equal(await ev('ui.settings.perspective'),2);await c.screenshot('ender-mobile-camera');await ev("ui.settings.quality='low'");await sleep(200);await c.screenshot('rift-performance-mode');await ev("ui.settings.quality='high'");
 await ev('ui.settings.perspective=0;g.pause();g.screen="menu";ui.render()');await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);console.log('PASS: Ender worker terrain, all camera perspectives, avatar/hand visibility, real orb key input, saved builds and camera settings, moonstone catalogue, return travel, mobile lobby and camera control, three anchor rewards, automatic launch/glide, shared reward inventory, and Performance rendering.');
}finally{c.socket.close();}
