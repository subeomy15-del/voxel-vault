import assert from 'node:assert/strict';
import {connect,sleep} from './cdp.js';
const c=await connect();
try{
 await c.evaluate(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.ui=m.ui;g.start('adventure',true);g.pause('inventory');ui.render();g.events=[];ui.update();window.pack=document.querySelector('.pack-grid');window.slot=document.querySelector('.pack-slot');g.add('diamond',2);ui.update();window.row=document.querySelector('[data-pickup=diamond]');window.icon=row.querySelector('svg');g.add('diamond',3);ui.update();})()`);
 assert.equal(await c.evaluate('row===document.querySelector("[data-pickup=diamond]")&&icon===row.querySelector("svg")'),true);
 assert.equal(await c.evaluate('row.querySelector("b").textContent'),'+5');
 assert.equal(await c.evaluate('slot===document.querySelector(".pack-slot")'),true);
 assert.equal(await c.evaluate('document.querySelectorAll("[data-pickup=diamond]").length'),1);
 await c.evaluate(`for(const n of ['wood','apple','coal','iron_ingot','gold_ingot','bread'])g.add(n,1);ui.update()`);
 assert.equal(await c.evaluate('ui.pickups.rows.size'),5);
 await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(100);
 assert.equal(await c.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await c.screenshot('collected-items');
 await c.evaluate('ui.pickups.update(null,performance.now()+6000)');assert.equal(await c.evaluate('ui.pickups.rows.size'),0);
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);console.log('PASS: collected item icons/counts, aggregated quantities, stable inventory nodes, bounded feed and mobile layout');
}finally{await c.close();}
