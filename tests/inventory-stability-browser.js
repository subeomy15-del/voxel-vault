import assert from 'node:assert/strict';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate;
try{
 await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.ui=m.ui;g.start('adventure',true);g.add('firecracker',5);g.add('iron_helm');g.add('hang_glider');g.add('wood',60);g.add('coal',10);g.add('iron',10);g.state.aura=300;ui.action('inventory');ui.refreshItems();window.pack=document.querySelector('.pack-storage');window.modal=document.querySelector('.modal');window.wood=pack.querySelector('[data-item="wood"]');window.woodIcon=wood.querySelector('img');window.boost=pack.querySelector('[data-use-firecracker]');boost.focus();modal.scrollTop=130;window.scroll=modal.scrollTop;window.hotbar=[...document.querySelector('#hotbar').children];window.hotIcons=hotbar.map(n=>n.querySelector('img'));window.oldSelected=g.state.selected;})()`);
 await c.click('.pack-storage [data-use-firecracker]');
 assert.equal(await ev('g.state.inv.firecracker'),4);assert.equal(await ev('g.state.selected===oldSelected&&g.screen==="inventory"'),true);
 assert.equal(await ev('pack===document.querySelector(".pack-storage")&&wood===pack.querySelector("[data-item=wood]")&&woodIcon===wood.querySelector("img")&&boost===pack.querySelector("[data-use-firecracker]")'),true);
 assert.equal(await ev('document.activeElement===boost&&modal.scrollTop===scroll'),true);
 await ev('g.add("wood",1);ui.refreshItems()');assert.equal(await ev('wood.querySelector("b").textContent'),String(await ev('g.state.inv.wood')));
 assert.equal(await ev('hotbar.every((n,i)=>n===document.querySelector("#hotbar").children[i]&&hotIcons[i]===n.querySelector("img"))'),true);
 await c.click('.pack-storage [data-item="iron_helm"]');assert.equal(await ev('g.state.armorParts.helm'), 'iron_helm');assert.equal(await ev('wood===document.querySelector(".pack-storage [data-item=wood]")'),true);
 await ev(`g.world.set(Math.floor(g.pos.x)+1,Math.floor(g.pos.y),Math.floor(g.pos.z),'bench');ui.action('craft');ui.refreshItems();window.recipe=document.querySelector('[data-recipe-item="plank"]');window.recipeIcon=recipe.querySelector('img');window.craftButton=recipe.querySelector('[data-craft]');`);
 await c.click('[data-craft="plank"]');assert.equal(await ev('recipe===document.querySelector("[data-recipe-item=plank]")&&recipeIcon===recipe.querySelector("img")&&craftButton===recipe.querySelector("[data-craft]")'),true);
 await ev(`ui.action('enchant');ui.refreshItems();window.enchant=document.querySelector('[data-enchant="wood_sword"]');window.enchantRow=enchant.closest('article');window.enchantIcon=enchantRow.querySelector('img');`);
 await c.click('[data-enchant="wood_sword"]');assert.equal(await ev('g.state.enchants.wood_sword'),1);assert.equal(await ev('enchant===document.querySelector("[data-enchant=wood_sword]")&&enchantIcon===enchantRow.querySelector("img")'),true);
 await ev(`g.containerKey='10,7,10';g.state.containers[g.containerKey]={stone:70};g.screen='storage';ui.render();ui.refreshItems();window.chest=document.querySelector('.storage-grid');window.stack=chest.querySelector('[data-transfer=stone]');window.stackIcon=stack.querySelector('img');`);
 await c.click('[data-withdraw="true"][data-transfer="stone"]');assert.equal(await ev('stack===document.querySelector("[data-withdraw=true][data-transfer=stone]")&&stackIcon===stack.querySelector("img")&&stack.querySelector("b").textContent==="6"'),true);
 await ev(`g.station={x:Math.floor(g.pos.x)+1,y:Math.floor(g.pos.y),z:Math.floor(g.pos.z),type:'furnace'};g.world.set(g.station.x,g.station.y,g.station.z,'furnace');g.screen='furnace';ui.render();ui.refreshItems();window.smelt=document.querySelector('[data-smelt=iron_ingot]');window.smeltIcon=smelt.querySelector('img');`);
 await c.click('[data-smelt="iron_ingot"]');assert.equal(await ev('smelt===document.querySelector("[data-smelt=iron_ingot]")&&smeltIcon===smelt.querySelector("img")'),true);
 await ev(`g.resume();ui.render();g.pos.y=85;g.grounded=false;g.state.glider='hang_glider';g.toggleGlide();g.yaw=-Math.PI/2;g.move(1/60);g.state.effects.speed=30;ui.hud();window.effect=document.querySelector('#active-effects span');window.effectTimer=effect.querySelector('b');g.state.effects.speed=29;ui.hud();`);
 assert.equal(await ev('Math.abs(g.vz)<.001&&g.vx>7&&effect===document.querySelector("#active-effects span")&&effectTimer===effect.querySelector("b")'),true);
 await sleep(400);
 await c.send('Input.dispatchKeyEvent',{type:'keyDown',key:'h',code:'KeyH',windowsVirtualKeyCode:72});await c.send('Input.dispatchKeyEvent',{type:'keyUp',key:'h',code:'KeyH',windowsVirtualKeyCode:72});await sleep(100);
 assert.equal(await ev('g.state.inv.firecracker'),3);assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);
 console.log('PASS: quick-use firecracker/glider and stable inventory, hotbar, equipment, crafting, enchanting, furnace, chest and effect-timer DOM.');
}finally{await c.close();}
