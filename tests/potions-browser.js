import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
const c=await connect();
try{
 await c.evaluate(`(async()=>{const entry=document.querySelector('script[type=module]').src,m=await import(entry);window.g=m.game;window.ui=m.ui;g.start('adventure',true);g.pos={x:100.5,y:80,z:100.5};g.world.set(101,80,100,'brewing_station');g.world.set(100,80,101,'water');g.add('empty_flask',3);g.add('sugar',6);g.add('diamond',1);g.target={x:101,y:80,z:100,type:'brewing_station'};g.interact();ui.filter='Brewing';ui.render();ui.refreshItems();})()`);
 await c.click('[data-craft="water_flask"]');await c.click('[data-craft="speed_potion"]');
 assert.equal(await c.evaluate('g.state.inv.speed_potion'),1);
 await c.evaluate(`ui.action('inventory');ui.refreshItems();window.slot=document.querySelector('[data-drink="speed_potion"]');window.art=slot.firstElementChild;window.modal=document.querySelector('.modal');window.bar=[...document.querySelector('#hotbar').children];window.selected=g.state.selected;slot.focus();`);
 await c.click('[data-drink="speed_potion"]');
 assert.equal(await c.evaluate('g.state.brews.speed.remaining'),90);
 assert.equal(await c.evaluate('slot===document.querySelector("[data-drink=speed_potion]")&&art===slot.firstElementChild&&modal===document.querySelector(".modal")&&bar.every((n,i)=>n===document.querySelector("#hotbar").children[i])&&g.state.selected===selected'),true);
 await c.evaluate(`g.add('speed_potion_strong');ui.refreshItems();`);await c.click('[data-drink="speed_potion_strong"]');assert.equal(await c.evaluate('g.state.inv.speed_potion_strong'),1);
 await sleep(3100);await c.click('[data-drink="speed_potion_strong"]');assert.equal(await c.evaluate('g.state.brews.speed.id'),'speed_potion_strong');
 await c.evaluate(`ui.hud();window.timer=document.querySelector('[data-effect="brew:speed"]');g.resume();ui.render();`);await sleep(300);
 assert.equal(await c.evaluate('timer===[...document.querySelectorAll("[data-effect]")].find(n=>n.dataset.effect==="brew:speed")'),true);
 for(const width of [390,1440]){await c.send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:900,deviceScaleFactor:1,mobile:width===390});await c.evaluate(`ui.action('inventory');ui.refreshItems()`);await sleep(180);assert.equal(await c.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await c.screenshot('potions-'+width);}
 await c.evaluate('(async()=>{g.save(true);await g.saveReady})()');await c.send('Page.reload');await sleep(1500);
 assert.equal(await c.evaluate(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);return m.game.state.brews.speed.id})()`),'speed_potion_strong');
 // Contact sheet uses the shipped PNGs, including tier marks at 36 px.
 await c.evaluate(`(async()=>{const entry=document.querySelector('script[type=module]').src,{POTIONS}=await import(new URL('potion-content.js'+new URL(entry).search,entry));const canvas=document.createElement('canvas');canvas.width=900;canvas.height=960;const ctx=canvas.getContext('2d');ctx.fillStyle='#25343a';ctx.fillRect(0,0,900,960);let n=0;for(const[id,p]of Object.entries(POTIONS)){const img=new Image();img.src=new URL('../assets/items/'+id+'.png',entry);await img.decode();const x=n%6*150,y=Math.floor(n/6)*160;ctx.drawImage(img,x+27,y+3,96,96);ctx.drawImage(img,x+10,y+106,36,36);ctx.fillStyle='#f3ead7';ctx.font='10px sans-serif';ctx.fillText(p.name,x+3,y+155);n++;}window.sheet=canvas.toDataURL('image/png').split(',')[1];})()`);
 await mkdir('reports/potions',{recursive:true});await writeFile('reports/potions/contact-sheet.png',Buffer.from(await c.evaluate('sheet'),'base64'));
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);console.log('PASS: real station/water recipes, instant drink, shared cooldown, stable slots/timers, persisted buffs, desktop/touch layouts and 36 rendered bottle icons.');
}finally{await c.close();}
