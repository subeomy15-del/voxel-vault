import assert from 'node:assert/strict';
import {connect,sleep} from './cdp.js';
const c=await connect();
try{
 await c.evaluate(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.ui=m.ui;g.start('adventure',true);g.pos={x:100.5,y:80,z:100.5};g.mobs=[];window.merchant=g.spawnMob(101.5,100.5,'trader',80);merchant.site='lodge';g.add('wheat',20);g.tradingSite='lodge';g.pause('trading');ui.render();ui.refreshItems();window.row=document.querySelector('[data-trade-row=bread]');window.art=row.querySelector('svg');})()`);
 await c.click('[data-trade=bread]');assert.equal(await c.evaluate('g.state.inv.bread'),4);assert.equal(await c.evaluate('row===document.querySelector("[data-trade-row=bread]")&&art===row.querySelector("svg")'),true);
 await c.evaluate(`(async()=>{const entry=document.querySelector('script[type=module]').src,{activateWaystone}=await import(new URL('exploration.js'+new URL(entry).search,entry));for(const x of [100,130]){for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){g.world.set(x+dx,79,100+dz,'stone');for(let y=80;y<84;y++)g.world.set(x+dx,y,100+dz,null);}g.world.set(x,80,100,'waystone');g.pos={x:x+1.5,y:80,z:100.5};activateWaystone(g,{x,y:80,z:100});g.resume();}g.pos={x:101.5,y:80,z:100.5};activateWaystone(g,{x:100,y:80,z:100});ui.render();})()`);
 await sleep(150);await c.click('[data-waystone="overworld:130,80,100"]');assert.equal(await c.evaluate('g.pos.x>128&&g.screen===null'),true);
 await c.evaluate(`g.pause('sea-charts');g.state.exploration.caches=[{id:'sea-5',x:144,y:2,z:108,claimed:false}];ui.render()`);
 for(const width of [390,1440]){await c.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width===390});await sleep(120);assert.equal(await c.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await c.screenshot('exploration-'+width);}
 await c.evaluate('(async()=>{g.save(true);await g.saveReady})()');await c.send('Page.reload');await sleep(1200);assert.equal(await c.evaluate(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);return m.game.state.exploration.stones.length})()`),2);
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);console.log('PASS: real barter UI, unchanged row/icon nodes, waystone travel, treasure chart layouts and saved network.');
}finally{await c.close();}
