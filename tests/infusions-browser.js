import assert from 'node:assert/strict';
import {connect,sleep} from './cdp.js';
const c=await connect();
try{
 await c.evaluate(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.ui=m.ui;g.start('adventure',true);g.pos={x:100.5,y:80,z:100.5};g.world.set(101,80,100,'basic_altar');g.state.aura=500;g.target={x:101,y:80,z:100,type:'basic_altar'};g.interact();ui.render();ui.refreshItems();window.panel=document.querySelector('.infusion-panel');window.select=panel.querySelector('select');select.value='wood_sword';select.dispatchEvent(new Event('change',{bubbles:true}));window.panel=document.querySelector('.infusion-panel');window.offers=[...panel.querySelectorAll('[data-infuse]')];window.xp=g.state.aura;})()`);
 await sleep(200);await c.evaluate(`select=document.querySelector('[data-infusion-gear]');select.value='wood_sword';select.dispatchEvent(new Event('change',{bubbles:true}));panel=document.querySelector('.infusion-panel');offers=[...panel.querySelectorAll('[data-infuse]')];`);
 assert.equal(await c.evaluate('offers.length'),3);await c.click('[data-infuse="1"]');await sleep(500);
 assert.equal(await c.evaluate('g.state.aura'),461);assert.equal(await c.evaluate('!!g.state.infusions.wood_sword'),true);
 assert.equal(await c.evaluate('offers.every((n,i)=>n===document.querySelectorAll("[data-infuse]")[i])&&panel===document.querySelector(".infusion-panel")'),true);
 assert.equal(await c.evaluate('offers.every(n=>n.disabled)'),true);
 await c.click('[data-reroll-confirm]');await c.click('[data-infuse="0"]');await sleep(400);assert.equal(await c.evaluate('g.state.aura'),443);assert.equal(await c.evaluate('g.state.infusionSeq'),2);
 assert.equal(await c.evaluate('document.querySelector(".infusion-result").textContent.includes("TIER")'),true);
 await c.evaluate(`Object.defineProperty(g,'saveReady',{configurable:true,get:()=>new Promise(resolve=>window.releaseInfusionSave=resolve)});void 0;`);
 await c.click('[data-reroll-confirm]');await c.click('[data-infuse="0"]');
 await c.evaluate(`select=document.querySelector('[data-infusion-gear]');select.value='wood_pickaxe';select.dispatchEvent(new Event('change',{bubbles:true}));delete g.saveReady;releaseInfusionSave(true);`);
 await sleep(400);
 assert.equal(await c.evaluate('g.state.infusionSeq'),3);
 assert.equal(await c.evaluate('document.querySelector(".infusion-result").textContent.includes("No infusion yet")'),true,'the completed sword roll must not appear on the newly selected pickaxe');
 assert.equal(await c.evaluate('g.state.infusions.wood_pickaxe'),undefined);
 await c.evaluate('(async()=>{g.save(true);await g.saveReady})()');
 for(const width of [320,390,1440]){await c.send('Emulation.setDeviceMetricsOverride',{width,height:width<500?844:900,deviceScaleFactor:1,mobile:width<500});await sleep(250);assert.equal(await c.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await c.screenshot('infusion-'+width);}
 await c.send('Page.reload');await sleep(1500);assert.equal(await c.evaluate(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);return m.game.state.infusionSeq})()`),3);
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);console.log('PASS: altar interaction, odds, XP spending, explicit reroll consent, stable offers, codex/result reveal, 320/390/1440 layouts and reload persistence.');
}finally{await c.close();}
