import assert from 'node:assert/strict';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate;
const ready=async()=>{for(let i=0;i<300;i++){if(await ev('v.chunks.size>=9&&!v.inflight&&!v.queue.length&&!v.ready.length'))return;await sleep(100);}throw Error('Terrain did not settle');};
try{
 await c.send('Network.setCacheDisabled',{cacheDisabled:true});await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await c.send('Page.navigate',{url:'http://localhost:3001/'});await sleep(1500);
 await ev(`(async()=>{const m=await import('/src/main.js?v=36');window.g=m.game;window.v=m.renderer;window.ui=m.ui;g.state=(await import('/src/save.js?v=36')).freshState(72);g.loadWorld();g.pos={x:240.5,y:g.world.height(240,180)+1,z:180.5};g.state.time=110;g.screen='pause';ui.settings.perspective=0;ui.render();})()`);await ready();
 await ev("g.world.set(242,Math.floor(g.pos.y),180,'bench');g.add('knight_heart',9);g.add('diamond_sword',3);g.pause('craft');ui.search='Knight Sword';ui.render()");
 await c.click('[data-craft-all="knight_sword"]');assert.equal(await ev('g.state.inv.knight_sword'),2);assert.equal(await ev('g.state.inv.knight_heart'),1);await c.screenshot('badlands-craft-all');
 await ev("g.state.aura=500;for(const slot of ['helm','chestplate','gauntlets','leggings','boots']){g.add('diamond_'+slot);g.equip('diamond_'+slot);}g.pause('inventory');ui.search='';ui.catalogue=false;ui.render()");
 assert.equal(await ev('document.querySelectorAll(".pack-equipment [data-unequip]").length'),5);await c.screenshot('badlands-armor');
 await c.click('[data-unequip="helm"]');assert.equal(await ev('g.state.armorParts.helm'),undefined);await ev("g.equip('diamond_helm');ui.render()");
 await c.click('[data-action="enchant"]');await c.click('[data-enchant="knight_sword"]');assert.equal(await ev('g.state.enchants.knight_sword'),1);assert.equal(await ev('g.state.aura'),475);await c.screenshot('badlands-enchant');
 await ev("g.mobs=[];window.knight=g.spawnMob(g.pos.x,g.pos.z-4,'draugr_knight',g.pos.y);g.screen=null;g.keys.clear();g.yaw=0;g.pitch=-.08;g.equip('knight_sword');ui.render()");await sleep(300);assert.ok(await ev('v.mobMeshes.has(knight.id)'));await c.screenshot('badlands-knight');
 await ev("g.hit(knight,knight.hp);g.updateDrops(.1);g.add('firecracker',3);g.equip('firecracker');g.pitch=.35;g.useFirecracker()");await sleep(500);assert.ok(await ev('v.effects.length>60'));await c.screenshot('badlands-firework');
 await ev("g.pause('inventory');ui.render();for(let i=0;i<6;i++){const x=Math.floor(g.pos.x)+i-3,z=Math.floor(g.pos.z)-3,y=Math.floor(g.pos.y);g.world.set(x,y-1,z,'stone');g.world.set(x,y,z,['wood_spikes','stone_spikes','iron_spikes','gold_spikes','diamond_spikes','net'][i]);}");await ready();
 await ev("g.pitch=-.55;g.yaw=0;document.querySelector('#overlay').style.visibility='hidden';document.querySelector('#hud').hidden=false");await sleep(250);await c.screenshot('badlands-traps');await ev("document.querySelector('#overlay').style.visibility='';document.querySelector('#hud').hidden=true;g.save()");
 await c.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await ev("ui.render()");await sleep(200);await c.screenshot('badlands-mobile-armor');assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth'));
 await c.click('[data-action="enchant"]');await c.screenshot('badlands-mobile-enchant');assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth'));
 await c.send('Page.reload');await sleep(1200);await ev(`(async()=>{const m=await import('/src/main.js?v=36');window.g=m.game;window.ui=m.ui;g.start();g.pause('inventory');ui.render();})()`);
 assert.equal(await ev('g.state.enchants.knight_sword'),1);assert.equal(await ev('g.state.armorParts.boots'),'diamond_boots');assert.ok(await ev('g.state.aura>=475'));
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);console.log('PASS: Badlands, Knight Sword Craft All, five armor slots, aura enchanting, knight rendering, fireworks, traps, mobile and saved upgrades');
}finally{c.socket.close();}
