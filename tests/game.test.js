import test from 'node:test';
import assert from 'node:assert/strict';
import { World,WORLD_BOTTOM,WORLD_LIMIT } from '../src/world.js?v=35';
import { Game } from '../src/game.js?v=35';
import { ITEMS,craft,starterInventory,dailySeed } from '../src/data.js?v=35';
import { freshState,loadState,saveState,slotKey,importLegacy } from '../src/save.js?v=35';
import { updateProjectiles } from '../src/combat.js?v=35';
import { meshChunk } from '../src/mesh.js?v=35';
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const renderer={setWorld(){},stream(){},burst(){},swing:0},audio={play(){},tone(){}};
const game=()=>{const g=new Game(renderer,audio,storage());g.screen=null;g.yaw=0;return g;};

test('deterministic terrain extends well beyond the old island',()=>{
 const a=new World(7821),b=new World(7821),c=new World(27);
 for(const[x,z]of[[300,250],[-400,-320],[480,0]]){assert.equal(a.height(x,z),b.height(x,z));assert.ok(a.get(x,WORLD_BOTTOM,z));}
 assert.notDeepEqual([a.height(300,250),a.height(-200,40)],[c.height(300,250),c.height(-200,40)]);
 assert.equal(a.landmarks.filter(l=>l.type==='shrine'||l.type==='vault').length,0);
 assert.equal(a.intersects(.5,7,20.5),false);
});
test('ore is buried, with no ore piles on the surface',()=>{
 const w=new World(),ores=new Set(['iron','gold','coal','copper','diamond','crystal']);
 for(let x=-60;x<=60;x+=4)for(let z=-60;z<=60;z+=4){const h=w.height(x,z);for(let y=h;y<=h+8;y++)assert.equal(ores.has(w.get(x,y,z)),false,`${x},${y},${z}`);}
 let deposits=0;for(let x=-20;x<20;x+=2)for(let z=-20;z<20;z+=2)for(let y=-50;y<-5;y+=3)if(ores.has(w.get(x,y,z)))deposits++;
 assert.ok(deposits>20,'underground veins should be discoverable');
});
test('caves contain dry air and stone floors; rivers contain actual water cells',()=>{
 const w=new World();assert.equal(w.get(23,-16,-31),null);assert.equal(w.waterAt(23,-16,-31),false);assert.ok(w.ground(23,-31,-16)<-16);
 let water=0;for(let x=-40;x<=40;x+=4)for(let z=35;z<100;z++)if(w.waterAt(x,4,z))water++;assert.ok(water>20);
 for(let z=10;z>=-32;z--){const floor=w.height(22,10)-Math.floor((10-z)*.65);assert.equal(w.get(22,floor+2,z),null);}
});
test('edits persist outside the old world bounds and invalidate neighboring chunks',()=>{
 const w=new World();assert.equal(w.set(303,20,305,'plank'),true);assert.ok(w.dirty.has('19,19'));w.set(303,20,305,null);const r=new World(w.seed,[...w.edits]);assert.equal(r.get(303,20,305),null);
 assert.equal(w.set(0,WORLD_BOTTOM,0,null),false);assert.equal(w.set(WORLD_LIMIT+1,10,0,'stone'),false);
});
test('raycasts respect reach and placement normals',()=>{
 const w=new World();w.set(0,9,6,'stone');const h=w.raycast({x:.5,y:9.5,z:9.5},{x:0,y:0,z:-1},6);assert.equal(h.z,6);assert.deepEqual(h.normal,{x:0,y:0,z:1});assert.equal(w.raycast({x:.5,y:9.5,z:9.5},{x:0,y:0,z:-1},2),null);
});
test('crafting consumes exact resources and rejects unaffordable recipes',()=>{
 const inv=starterInventory(),before={...inv};assert.equal(craft(inv,'iron_pickaxe'),false);assert.deepEqual(inv,before);inv.stone=8;assert.equal(craft(inv,'furnace'),true);assert.equal(inv.stone,0);assert.equal(inv.furnace,1);assert.equal(craft(inv,'missing'),false);
});
test('smelting requires a nearby furnace, ingredients and fuel',()=>{
 const g=game();g.pos={x:.5,y:7,z:9.5};g.add('iron',2);g.add('coal',2);assert.equal(g.smelt('iron_ingot'),false);
 g.world.set(1,7,9,'furnace');g.station={x:1,y:7,z:9};assert.equal(g.smelt('iron_ingot'),true);assert.equal(g.state.inv.iron_ingot,1);assert.equal(g.state.inv.iron,1);assert.equal(g.state.inv.coal,1);
 g.pos.x=30;assert.equal(g.smelt('iron_ingot'),false);
});
test('storage transfers stacks without duplicating items and survives reload',()=>{
 const g=game();g.containerKey='0,8,3';g.add('stone',80);assert.equal(g.transfer('stone'),true);assert.equal(g.state.inv.stone,16);assert.equal(g.state.containers[g.containerKey].stone,64);g.transfer('stone',true);assert.equal(g.state.inv.stone,80);g.transfer('stone');g.save();const r=loadState(g.storage);assert.equal(r.containers['0,8,3'].stone,64);
});
test('new items, bed spawn and far-away positions survive save/load',()=>{
 const st=storage(),s=freshState();s.pos={x:330,y:-40,z:-205};s.spawn={x:40,y:15,z:30};s.inv.diamond=9;s.edits=[['330,-40,-205','stonebrick']];saveState(st,s);const r=loadState(st);assert.deepEqual(r.pos,s.pos);assert.deepEqual(r.spawn,s.spawn);assert.equal(r.inv.diamond,9);assert.deepEqual(r.edits,s.edits);assert.equal(loadState(st,'creative'),null);assert.equal(dailySeed(new Date('2026-09-12T03:00:00Z')),20260912);
});
test('invalid saves recover and older inventories migrate without deletion',()=>{
 const st=storage();st.setItem(slotKey('adventure'),'{invalid');assert.equal(loadState(st),null);st.setItem('voxel-vault-player-v3',JSON.stringify({inv:{wood:22,diamond_sword:1}}));const s=freshState();assert.equal(importLegacy(st,s),true);assert.equal(s.inv.wood,22);assert.ok(st.getItem('voxel-vault-player-v3'));
});
test('jump clears a full block, keeps forward momentum, and lands without sinking',()=>{
 const g=game();g.pos={x:.5,y:7,z:20.5};g.mobs=[];for(let i=0;i<20;i++)g.move(1/120);assert.ok(g.grounded);
 g.keys.add('KeyW');g.keys.add('ShiftLeft');for(let i=0;i<25;i++)g.move(1/120);g.keys.add('Space');g.jump();const start={...g.pos};let apex=g.pos.y;for(let i=0;i<100;i++){g.move(1/120);apex=Math.max(apex,g.pos.y);if(i===45)g.keys.delete('Space');}
 assert.ok(apex-start.y>1.4);assert.ok(start.z-g.pos.z>3);assert.ok(g.grounded);assert.ok(Math.abs(g.pos.y-7)<.04);
});
test('jump buffer and coyote time accept near-miss jump inputs',()=>{
 const g=game();g.pos={x:.5,y:7.15,z:9.5};g.grounded=false;g.velocity=-2;g.jump();assert.equal(g.velocity,-2);for(let i=0;i<12;i++)g.move(1/120);assert.ok(g.velocity>0,'buffered jump fires on landing');
 g.grounded=false;g.coyote=.07;g.velocity=-1;g.jump();assert.equal(g.velocity,8.8);
});
test('dry underground movement uses gravity, not swimming physics',()=>{
 const g=game();g.pos={x:23.5,y:-14,z:-31.5};g.velocity=0;g.move(.05);assert.ok(g.velocity<-1);assert.equal(g.world.waterAt(g.pos.x,g.pos.y,g.pos.z),false);
});
test('walls block movement and placement cannot intersect the player',()=>{
 const g=game();g.pos={x:.5,y:7,z:9.5};for(let y=7;y<11;y++)g.world.set(0,y,8,'stone');g.keys.add('KeyW');for(let i=0;i<100;i++)g.move(.01);assert.ok(g.pos.z>=9.27);
 g.select(3);g.target={x:0,y:6,z:9,normal:{x:0,y:1,z:0}};assert.equal(g.place(),false);
});
test('bow projectiles travel, hit enemies, and consume arrows',()=>{
 const g=game();g.pos={x:.5,y:7,z:9.5};g.mobs=[];const m=g.spawnMob(.5,6.5,'sentinel',7);g.state.bar[0]='bow';g.add('arrows',1);g.attack();assert.equal(m.hp,m.maxHp);assert.equal(g.state.inv.arrows,0);for(let i=0;i<30;i++)updateProjectiles(g,.01);assert.equal(m.hp,m.maxHp-7);
});
test('creative has every item and death preserves inventory',()=>{
 const g=game();g.state=freshState(20,'creative');for(const k of Object.keys(ITEMS))assert.ok(g.state.inv[k]>0);g.hurt(200);assert.equal(g.state.hp,20);g.state.mode='adventure';g.add('diamond',7);const n=g.state.inv.diamond;g.hurt(200);assert.equal(g.screen,'death');g.respawn();assert.equal(g.state.inv.diamond,n);assert.equal(g.state.hp,20);
});
test('worker meshing separates real water geometry and excludes empty draw groups',()=>{
 const w=new World(),g=meshChunk(w,0,0);assert.ok(g.solid.index.length>0);assert.equal(g.water.index.length,0);assert.ok(g.solid.position.every(Number.isFinite));
 const river=meshChunk(w,0,4);assert.ok(river.water.index.length>0);assert.ok(river.water.position.filter((_,i)=>i%3===1).every(y=>y<=5));
});
