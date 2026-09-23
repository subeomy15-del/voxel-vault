import assert from 'node:assert/strict';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate;
const ready=async()=>{for(let i=0;i<250;i++){if(await ev('v.chunks.size>=9&&!v.inflight&&!v.queue.length&&!v.ready.length'))return;await sleep(100);}throw Error('Terrain did not finish');};
const press=async code=>{await c.send('Input.dispatchKeyEvent',{type:'keyDown',code,key:code.slice(-1).toLowerCase()});await c.send('Input.dispatchKeyEvent',{type:'keyUp',code,key:code.slice(-1).toLowerCase()});await sleep(160);};
try{
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await c.send('Page.navigate',{url:'http://localhost:3001/'});await sleep(800);
 await ev(`(async()=>{const m=await import('/src/main.js?v=37');window.g=m.game;window.v=m.renderer;window.ui=m.ui;g.state=(await import('/src/save.js?v=37')).freshState(7821);g.loadWorld();g.screen=null;ui.settings.perspective=0;ui.render();window.site=g.state.outposts.find(p=>p.id==='lodge');g.pos={x:site.x+.5,y:g.world.ground(site.x+.5,site.z+8.5),z:site.z+8.5};g.yaw=0;g.pitch=0;})()`);await ready();await c.screenshot('quality-lodge');
 await ev(`g.pos={x:site.x+1.5,y:site.y,z:site.z+2.5};g.yaw=0;g.pitch=-.6;g.vx=g.vz=g.velocity=0`);await sleep(200);assert.equal(await ev('g.target?.type'),'treasure_chest');await press('KeyE');assert.equal(await ev('g.state.inv.diamond'),2);assert.equal(await ev('g.world.get(site.x+1,site.y,site.z+1)'),'chest');
 await ev(`g.target={x:site.x+1,y:site.y,z:site.z+1,type:'treasure_chest'};g.interact()`);assert.equal(await ev('g.state.inv.diamond'),2);
 await ev(`g.grapple=null;g.pause('inventory');ui.catalogue=true;ui.search='';ui.render()`);await sleep(500);assert.ok(await ev('document.querySelectorAll(".item-card").length')>=200);assert.ok(await ev('document.querySelectorAll(".item-icon image").length')>100);await c.screenshot('quality-items');
 const images=await ev(`Promise.all([...document.querySelectorAll('.item-icon image')].map(el=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im.naturalWidth>0);im.onerror=()=>resolve(false);im.src=el.getAttribute('href');})))`);assert.ok(images.every(Boolean));
 await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await ev('ui.render()');await c.screenshot('quality-mobile-items');assert.ok(await ev('document.querySelector(".modal").getBoundingClientRect().right<=innerWidth'));
 await ev(`g.pause();g.screen='menu';ui.render()`);await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);console.log('PASS: visible lodge, real treasure interaction, one-time treasure rewards, 200+ item catalogue, all PNG icons load, and mobile inventory.');
}finally{c.socket.close();}
