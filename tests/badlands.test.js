import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js?v=31';
import {World} from '../src/world.js?v=31';
import {ITEMS,BLOCKS,RECIPES,maxCraft,craft} from '../src/data.js?v=31';
import {ARMOR_SLOTS,RETIRED_FORGE} from '../src/badlands-content.js?v=31';
import {armorProtection,gearPower} from '../src/enchanting.js?v=31';
import {tickTraps} from '../src/traps.js?v=31';
import {freshState,loadState,saveState} from '../src/save.js?v=31';
import {updateEnemies} from '../src/combat.js?v=31';
const make=()=>{const data=new Map();return new Game({setWorld(){},burst(){},stream(){},firework(){this.fired=true;}},{play(){},quiet(){}},{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});};
test('three new biomes generate across seeds with layered Badlands, marsh water and map markers',()=>{
 for(const seed of [1,72,7821]){const w=new World(seed,[],6);assert.equal(w.biome(240,180),'badlands');assert.equal(w.biome(220,-60),'savanna');assert.equal(w.biome(-240,200),'marsh');const h=w.height(240,180);assert.equal(w.get(240,h,180),'red_sand');assert.ok(['red_terracotta','ochre_terracotta','chalk'].includes(w.get(240,h-2,180)));assert.ok(w.landmarks.some(l=>l.id==='badlands'));}
 const w=new World(72,[],6);let water=0;for(let x=-260;x<-210;x++)for(let z=180;z<220;z++)if(w.get(x,w.height(x,z),z)==='water')water++;assert.ok(water>20);
});
test('Badlands spawn draugr knights during daytime and skeletons fire actual projectiles',()=>{
 const g=make();g.start();g.pos={x:240.5,y:g.world.height(240,180)+1,z:180.5};g.state.time=100;g.mobs=[];g.serial=1;g.spawnTimer=20;g.move=()=>{};g.updateMobs=()=>{};g.world.ground=()=>g.pos.y;g.world.intersects=()=>false;g.update(.01);assert.ok(g.mobs.some(m=>m.kind==='draugr_knight'));
 const s=make();s.pos={x:.5,y:60,z:8.5};s.mobs=[];for(let x=-2;x<3;x++)for(let z=-2;z<12;z++)s.world.set(x,59,z,'stone');const m=s.spawnMob(.5,1.5,'skeleton',60);m.windup=.01;m.cooldown=0;updateEnemies(s,.02);assert.ok(s.projectiles.some(p=>p.hostile));
});
test('knights drop hearts, kills grant aura once and the Knight Sword consumes hearts and a diamond sword',()=>{
 const g=make();const m=g.spawnMob(10,10,'draugr_knight',50);g.hit(m,m.hp);assert.equal(g.state.aura,35);assert.ok(g.state.drops.some(d=>d.item==='knight_heart'&&d.count>=1));g.hit(m,999);assert.equal(g.state.aura,35);
 g.pos={x:100.5,y:60,z:100.5};g.world.set(102,60,100,'bench');g.add('knight_heart',4);g.add('diamond_sword');assert.equal(g.craft('knight_sword'),true);assert.equal(g.state.inv.knight_heart,0);assert.equal(g.state.inv.diamond_sword,0);assert.equal(g.state.inv.knight_sword,1);
});
test('natural mining earns aura; replacing and remining a block does not',()=>{
 const g=make();g.add('diamond_pickaxe');g.equip('diamond_pickaxe');const y=-42;let x=0;while(!g.world.get(x,y,100)||!Number.isFinite(BLOCKS[g.world.get(x,y,100)]?.hardness))x++;
 const type=g.world.get(x,y,100);g.target={x,y,z:100,type};g.mine(10);assert.ok(g.state.aura>0);const before=g.state.aura;g.world.set(x,y,100,type);g.target={x,y,z:100,type};g.mine(10);assert.equal(g.state.aura,before);
});
test('enchanting charges rising aura costs, improves gear and persists across realms and reloads',()=>{
 const g=make();g.state.aura=1000;g.add('diamond_sword');assert.equal(g.enchant('diamond_sword'),true);assert.equal(g.state.aura,975);assert.equal(gearPower(g.state,'diamond_sword'),1.12);assert.equal(g.enchant('diamond_sword'),true);assert.equal(g.state.aura,875);
 g.pos={x:100.5,y:80,z:100.5};g.yaw=0;g.pitch=0;g.mobs=[];const target=g.spawnMob(100.5,97.5,'zombie',80);target.hp=200;g.equip('diamond_sword');g.attack();assert.ok(Math.abs(200-target.hp-ITEMS.diamond_sword.damage*1.24)<1e-8);
 g.add('iron_pickaxe');g.equip('iron_pickaxe');g.state.enchants.iron_pickaxe=3;g.attackCooldown=0;const hp=target.hp;g.attack();assert.equal(hp-target.hp,ITEMS.iron_pickaxe.damage||2);
 g.target={x:101,y:80,z:100,type:'stone'};g.world.set(101,80,100,'stone');g.mine(.1);const enchanted=g.mineProgress;g.mineProgress=0;g.state.enchants.iron_pickaxe=0;g.mine(.1);assert.ok(enchanted>g.mineProgress);
 g.state.aura=0;assert.equal(g.enchant('diamond_sword'),false);assert.equal(g.enchant('grass'),false);g.save();g.travel('nether');assert.equal(g.state.enchants.diamond_sword,2);const s=loadState(g.storage);assert.equal(s.enchants.diamond_sword,2);assert.equal(s.aura,0);
});
test('armor uses five independent slots, combines protection, and upgrades without exceeding the cap',()=>{
 const g=make();for(const slot of ARMOR_SLOTS){g.add('diamond_'+slot);g.equip('diamond_'+slot);}assert.equal(Object.keys(g.state.armorParts).length,5);assert.ok(Math.abs(armorProtection(g.state)-.6)<1e-8);g.add('iron_helm');g.equip('iron_helm');assert.equal(g.state.armorParts.helm,'iron_helm');assert.equal(g.state.armorParts.boots,'diamond_boots');
 for(const name of Object.values(g.state.armorParts))g.state.enchants[name]=5;assert.equal(armorProtection(g.state),.8);g.save();assert.deepEqual(loadState(g.storage).armorParts,g.state.armorParts);
 g.containerKey='100,80,100';assert.equal(g.transfer('diamond_boots'),true);assert.equal(g.state.armorParts.boots,undefined);assert.equal(loadState(g.storage).armorParts.boots,undefined);
});
test('old forge items and complete armor migrate in inventory, storage and equipped slots',()=>{
 const g=make(),s=freshState();s.inv={dawnblade:1,aegis_armor:1,armor:1,relic_forge:1};s.armor='aegis_armor';s.containers={'1,1,1':{vanguard_armor:1,seraph_glider:1}};s.edits=[['10,60,10','relic_forge']];saveState(g.storage,s);const loaded=loadState(g.storage);assert.equal(loaded.inv.diamond_sword,1);assert.equal(loaded.inv.stonebrick,1);for(const slot of ARMOR_SLOTS){assert.equal(loaded.inv['diamond_'+slot],1);assert.equal(loaded.inv['iron_'+slot],1);assert.equal(loaded.armorParts[slot],'diamond_'+slot);}assert.equal(loaded.containers['1,1,1'].diamond_boots,1);g.state=loaded;g.loadWorld();assert.equal(g.world.get(10,60,10),'stonebrick');for(const id of RETIRED_FORGE){assert.equal(!!loaded.inv[id],false);assert.ok(ITEMS[id].hidden);assert.equal(RECIPES.some(r=>r.item===id),false);}
});
test('Craft All uses exact materials, supports mixed timber and obeys workbench requirements',()=>{
 const inv={wood:4,birch:4,pinewood:4},r=RECIPES.find(r=>r.item==='bench');assert.equal(maxCraft(inv,r),2);assert.equal(craft(inv,'bench',2),true);assert.equal(inv.bench,2);assert.equal(inv.wood+inv.birch+inv.pinewood,0);
 const g=make();g.pos={x:100.5,y:60,z:100.5};g.add('knight_heart',9);g.add('diamond_sword',3);assert.equal(g.craft('knight_sword',true),false);assert.equal(g.state.inv.knight_heart,9);g.world.set(102,60,100,'bench');assert.equal(g.craft('knight_sword',true),true);assert.equal(g.state.inv.knight_sword,2);assert.equal(g.state.inv.knight_heart,1);assert.equal(g.state.inv.diamond_sword,1);
});
test('all spike tiers deal distinct damage, nets slow movement and firecrackers startle enemies',()=>{
 for(const [tier,damage]of [['wood',2],['stone',3],['iron',5],['gold',4],['diamond',8]]){const g=make();g.pos={x:100.5,y:60,z:100.5};g.grounded=true;g.world.set(100,59,100,'stone');g.world.set(100,60,100,tier+'_spikes');const m=g.spawnMob(100.5,100.5,'zombie',60),hp=m.hp;tickTraps(g,1);assert.equal(m.hp,hp-damage);assert.equal(g.state.hp,20-damage);assert.ok(ITEMS[tier+'_spikes'].place);}
 const g=make();g.pos={x:100.5,y:60,z:100.5};g.world.set(100,59,100,'stone');g.world.set(101,59,100,'stone');g.world.set(100,60,100,'net');const m=g.spawnMob(100.5,100.5,'zombie',60);g.moveMob(m,.5,0);assert.ok(m.x<100.7);g.add('firecracker');g.equip('firecracker');g.direction=()=>({x:0,y:0,z:1});g.useFirecracker();assert.equal(g.renderer.fired,true);assert.ok(m.stun>=2);
});
