import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=42';
import {loadState} from '../src/save.js?v=42';
import {ITEMS} from '../src/data.js?v=42';
import {packSlot} from '../src/inventory-layout.js?v=42';
const make=()=>{const data=new Map();const g=new Game({setWorld(){},stream(){},burst(){}},{play(){}},{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});g.screen=null;g.mobs=[];return g;};
test('nearby ground drops collect automatically once and respect full backpack capacity',()=>{
 const g=make();g.state.inv={};g.events=[];g.state.drops=[{id:1,item:'stone',count:3,x:g.pos.x,y:g.pos.y+.2,z:g.pos.z,age:0}];
 g.updateDrops(.3);assert.equal(g.state.drops.length,1);g.updateDrops(.4);assert.equal(g.state.inv.stone,3);assert.equal(g.state.drops.length,0);assert.equal(g.events.filter(e=>e.type==='collected').length,1);
 g.state.inv=Object.fromEntries(Object.keys(ITEMS).filter(k=>k!=='stone').slice(0,36).map(k=>[k,999]));g.state.drops=[{id:2,item:'stone',count:2,x:g.pos.x,y:g.pos.y,z:g.pos.z,age:1}];g.events=[];g.updateDrops(1);assert.equal(g.state.drops[0].count,2);assert.equal(g.events.length,0);
 delete g.state.inv[Object.keys(g.state.inv)[0]];g.updateDrops(.1);assert.equal(g.state.inv.stone,2);
});
test('pickup pauses with menus and does not collect drops across floors',()=>{
 const g=make();g.state.inv={};g.state.drops=[{id:1,item:'stone',count:1,x:g.pos.x,y:g.pos.y+5,z:g.pos.z,age:1}];g.updateDrops(1);assert.equal(g.state.drops.length,1);g.state.drops[0].y=g.pos.y;g.screen='map';g.updateDrops(1);assert.equal(g.state.drops.length,1);
});
test('three saved sites persist and teleport safely without carrying movement momentum',()=>{
 const g=make();g.grounded=true;assert.equal(g.saveTravelSite(0),true);assert.equal(g.saveTravelSite(3),false);const site={...g.state.travelSites[0]};assert.deepEqual(loadState(g.storage).travelSites[0],site);
 g.pos.x+=10;g.vx=20;g.velocity=-10;g.gliding=true;assert.equal(g.teleportToSite(0),true);assert.equal(g.pos.x,site.x);assert.equal(g.vx,0);assert.equal(g.velocity,0);assert.equal(g.gliding,false);
 g.world.set(Math.floor(site.x),Math.floor(site.y),Math.floor(site.z),'stone');assert.equal(g.teleportToSite(0),false);g.state.travelSites[0].dimension='nether';assert.equal(g.teleportToSite(0),false);g.multiplayer={active:true};assert.equal(g.saveTravelSite(1),false);
});
test('depleted hotbar slots render empty and accept a new building item',()=>{
 const g=make();g.state.inv.stone=0;g.state.bar[0]='stone';g.state.selected=0;const html=packSlot(g,'stone',0,'data-action="pack-slot-0"');assert.match(html,/data-item=""/);assert.doesNotMatch(html,/<b>0<\/b>/);g.add('plank',4);g.equip('plank');assert.equal(g.held,'plank');
});
test('dragging assigns any owned item to any hotbar slot, swaps slots and drops without duplication',()=>{
 const g=make();g.screen='inventory';g.state.inv.plank=6;g.state.inv.stone=4;g.state.bar[0]='plank';g.state.bar[1]='stone';
 assert.equal(g.assignHotbar('plank',1,0),true);assert.equal(g.state.bar[0],'stone');assert.equal(g.state.bar[1],'plank');assert.equal(g.state.inv.plank,6);
 assert.equal(g.assignHotbar('plank',8),true);assert.equal(g.state.bar[8],'plank');assert.equal(g.assignHotbar('plank',9),false);
 assert.equal(g.dropInventoryItem('plank',true),true);assert.equal(g.state.inv.plank,5);assert.equal(g.state.drops[0].count,1);assert.equal(g.dropInventoryItem('plank'),true);assert.equal(g.state.inv.plank,0);assert.equal(g.state.drops.reduce((n,d)=>n+d.count,0),6);
 g.multiplayer={active:true};assert.equal(g.dropInventoryItem('stone'),false);assert.equal(g.state.inv.stone,4);
});
