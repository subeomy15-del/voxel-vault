import assert from 'node:assert/strict';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate;
try{
 await c.send('Network.setCacheDisabled',{cacheDisabled:true});
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await c.send('Page.navigate',{url:'http://localhost:3001/'});await sleep(1500);
 await ev(`(async()=>{const m=await import('/src/main.js?v=37');window.g=m.game;window.ui=m.ui;g.start('adventure',true);g.pause('pause');g.screen=null;ui.render();})()`);await sleep(1200);
 assert.match(await ev("document.querySelector('#rift-objective').textContent"),/Gather your first timber/);
 await ev("g.add('wood',6);g.updateJourney();ui.hud()");
 await c.click('#rift-objective button');assert.equal(await ev('g.screen'),'craft');
 await c.click('[data-craft="bench"]');assert.equal(await ev('g.state.inv.bench'),1);
 await ev("g.world.set(Math.floor(g.pos.x)+2,Math.floor(g.pos.y),Math.floor(g.pos.z),'bench');g.updateJourney();g.pause('journal');ui.render()");
 assert.equal(await ev('document.querySelectorAll(".journey-journal li").length'),8);
 assert.match(await ev('document.querySelector(".journey-journal li.current").textContent'),/Forge iron equipment/);
 await c.screenshot('journey-journal');
 await ev("g.resume();ui.render()");await sleep(1000);await c.screenshot('journey-overworld');
 await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(300);await c.screenshot('journey-mobile');
 const box=await ev("(()=>{const r=document.querySelector('#rift-objective').getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom}})()");assert.ok(box.left>=0&&box.right<=390&&box.bottom<600);
 await ev("g.save()");await c.send('Page.reload');await sleep(1200);
 await ev(`(async()=>{const m=await import('/src/main.js?v=37');window.g=m.game;window.ui=m.ui;g.start();g.pause('journal');ui.render();})()`);
 assert.equal(await ev('g.state.journeyStage'),2);
 await c.screenshot('journey-journal-mobile');assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth'));
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);
 console.log('PASS: first chapters, actual workbench craft, journal, save reload, desktop/mobile HUD and zero browser errors');
}finally{c.socket.close();}
