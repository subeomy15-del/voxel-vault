import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate;
const ready=async()=>{for(let i=0;i<300;i++){if(await ev('v.chunks.size>=9&&!v.inflight&&!v.queue.length&&!v.ready.length'))return;await sleep(100);}throw Error('Terrain did not settle');};
try{
 await c.send('Network.setCacheDisabled',{cacheDisabled:true});
 await c.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 await c.send('Page.navigate',{url:'http://localhost:3001/'});await sleep(1500);
 await ev(`(async()=>{const m=await import('/src/main.js?v=26');window.g=m.game;window.v=m.renderer;window.ui=m.ui;ui.settings.perspective=0;window.hideHUD=document.createElement('style');hideHUD.textContent='body>*:not(#world){visibility:hidden!important}';document.head.append(hideHUD);})()`);
 for(const [name,mode,x,z]of [['survival','adventure',-70,24],['creative','creative',0,14],['daily','daily',-135,-78]]){
  await ev(`(async()=>{g.state=(await import('/src/save.js?v=26')).freshState(7821,'${mode}');g.loadWorld();g.pos={x:${x},y:g.world.height(${x},${z})+1,z:${z}};g.state.time=110;g.screen='menu';ui.render();})()`);
  await ready();await sleep(400);
  await writeFile(new URL('../assets/'+name+'-preview.png',import.meta.url),Buffer.from((await c.send('Page.captureScreenshot')).data,'base64'));
 }
 await ev("hideHUD.remove();g.state.mode='adventure';g.travel('nether');g.pos={x:25,y:32,z:26};g.yaw=0;g.pitch=-.55;g.screen='inventory';ui.render()");
 await ready();await ev("document.head.append(hideHUD)");await sleep(400);await c.screenshot('natural-nether');
 assert.equal(await ev("g.world.get(25,22,12)"),'lava');
 await ev("g.state.fortressCleared=true;g.travel('ender');g.screen='menu';ui.render()");await ready();await sleep(400);
 await writeFile(new URL('../assets/ender-preview.png',import.meta.url),Buffer.from((await c.send('Page.captureScreenshot')).data,'base64'));
 await ev("hideHUD.remove();g.travel('nether');g.travel('overworld');g.screen='menu';ui.render()");await ready();await sleep(400);await c.screenshot('natural-menu');
 assert.ok(await ev("document.querySelector('.lobby-logo').textContent.includes('OVERWORLD / NETHER / END')"));
 await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(400);await c.screenshot('natural-mobile');
 assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth'));
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);
 console.log('PASS: natural world previews, lava rendering, branding, desktop/mobile layout and no browser errors');
}finally{c.socket.close();}
