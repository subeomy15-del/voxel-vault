import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {World} from '../src/world.js?v=37';
import {CREATURES,NEW_ANIMALS,creatureSpawn} from '../src/creature-registry.js?v=37';
import {ENEMIES,warpCreature,updateEnemies} from '../src/combat.js?v=37';
import {creatureModel,animateCreature} from '../src/creature-model.js?v=37';
import {ITEMS,BLOCKS} from '../src/data.js?v=37';
import {ParticlePool} from '../src/particles.js?v=37';
import {freshState,saveState,loadState} from '../src/save.js?v=37';
import {transform} from '../src/structure-templates.js?v=37';
import {Game} from '../src/game.js?v=37';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const game=()=>new Game({setWorld(){},burst(){},stream(){},firework(){}},{play(){},quiet(){}},storage());
const cells=w=>[...w.structures].sort(([a],[b])=>a.localeCompare(b));
test('magma ruins spawn in natural caves, preserve terrain eight and regenerate identically',()=>{
 for(const seed of[7821,42,981]){
  const a=new World(seed,[],9),sites=a.ruins.find({radius:18,type:'magma_ruin'});assert.ok(sites.length>0);
  assert.equal(new World(seed,[],8).ruins.find({radius:18,type:'magma_ruin'}).length,0);
  for(const s of sites){assert.ok(s.y>=-46&&s.y<=-14);assert.ok(a.inCave(s.x,s.y,s.z));assert.ok(!a.inCave(s.x,s.y-1,s.z));assert.ok(Math.hypot(s.x,s.z)>520+s.radius);}
  const s=sites[0],chunks=[];for(let x=-1;x<=1;x++)for(let z=-1;z<=1;z++)chunks.push([Math.floor(s.x/16)+x,Math.floor(s.z/16)+z]);
  const b=new World(seed,[],9);for(const p of chunks)a.prepare(...p);for(const p of chunks.toReversed())b.prepare(...p);assert.deepEqual(cells(a),cells(b));
  const chest=a.chests.find(c=>c.id===s.id);assert.ok(chest);assert.equal(a.chests.filter(c=>c.id===s.id).length,1);assert.equal(a.edits.size,0);
  for(const[k,t]of a.ruins.layout(s).cells)assert.ok(t===null||BLOCKS[t],k);
  const before=cells(b);b.pruneCache(9999,9999,4);for(const p of chunks)b.prepare(...p);assert.deepEqual(cells(b),before);
  a.set(chest.x,chest.y,chest.z,null);assert.equal(new World(seed,[...a.edits],9).get(chest.x,chest.y,chest.z),null);
 }
});
test('magma cache opens once and stores mined blocks, defeated guards and world version',()=>{
 const g=game(),s=g.world.ruins.find({radius:18,type:'magma_ruin'})[0],l=g.world.ruins.layout(s),[dx,dz]=transform(l.loot.x,l.loot.z,s.rotation,s.mirror);
 const x=s.x+dx,y=s.y+l.loot.y,z=s.z+dz;g.world.prepare(Math.floor(x/16),Math.floor(z/16));g.pos={x:x+1.5,y,z:z+.5};g.screen=null;g.target={x,y,z,type:'treasure_chest'};
 g.interact();assert.ok(g.state.opened.includes(s.id));const inv={...g.state.inv};g.interact();assert.deepEqual(g.state.inv,inv);
 const st=storage();g.state.ruinDefeated=[s.id+':guard:0'];saveState(st,g.state);const loaded=loadState(st);assert.equal(loaded.terrain,10);assert.deepEqual(loaded.opened,g.state.opened);assert.deepEqual(loaded.ruinDefeated,g.state.ruinDefeated);
});
test('distant terrain remains seeded, editable and bounded in both directions',()=>{
 for(const x of [-1000000,1000000]){const a=new World(7821,[],9),b=new World(7821,[],9);assert.deepEqual(a.column(x,x),b.column(x,x));assert.ok(a.set(x,60,x,'plank'));const c=new World(7821,[...a.edits],9);assert.equal(c.get(x,60,x),'plank');a.prepare(Math.floor(x/16),Math.floor(x/16));a.pruneCache(0,0,3);assert.ok(a.columns.size<6000);}
});
test('all requested non-guardian creatures have working models, valid drops and bounded stats',()=>{
 const models=new Set(),r={part(color,w,h,d,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color}));m.position.set(x,y,z);return m;}};
 for(const[id,def]of Object.entries({...NEW_ANIMALS,...CREATURES})){
  assert.equal(ENEMIES[id],def);assert.ok(def.hp<50&&def.damage<=6);for(const item of Object.keys(def.drops))assert.ok(ITEMS[item],id+': '+item);
  const mob={kind:id,id:1,walk:1,windup:.3,windupMax:.7,flash:0},g=creatureModel(r,mob);animateCreature(g,mob,1);g.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(g);assert.ok(Number.isFinite(box.max.y));assert.ok(g.children.length<35,id);models.add(def.model);
  g.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 }
 assert.ok(models.size>=12);for(const id of ['iron_guardian','gold_guardian','diamond_guardian','moonstone_guardian'])assert.equal(ENEMIES[id],undefined);
});
test('spawn tables expose every hostile family without cross-realm leakage',()=>{
 const kinds=new Set();for(const biome of ['deep_cave','cave','snow','badlands','jungle','mountain','marsh','forest','conifer','meadow'])for(let n=0;n<300;n++)kinds.add(creatureSpawn({dimension:'overworld',biomeAtHeight:()=>biome},0,0,0,n,450));
 for(const id of Object.keys(CREATURES))assert.ok(kinds.has(id),id);
 for(let n=0;n<100;n++)assert.ok(['stalker','magma_golem','crone'].includes(creatureSpawn({dimension:'nether',biomeAtHeight:()=>''},0,0,0,n,100)));
});
test('new ranged enemies fire real projectiles; warps refuse overlap and obstruction',()=>{
 const g=game();g.pos={x:.5,y:60,z:8.5};g.mobs=[];for(let x=-5;x<6;x++)for(let z=-5;z<15;z++)g.world.set(x,59,z,'stone');
 for(const kind of ['draugr_huntress','frost_skeleton','crone']){g.projectiles=[];g.mobs=[];const m=g.spawnMob(.5,1.5,kind,60);m.windup=.01;m.windupMax=.65;updateEnemies(g,.02);assert.ok(g.projectiles.some(p=>p.hostile),kind);}
 const m=g.spawnMob(.5,1.5,'draugr_warper',60);m.angle=0;assert.ok(warpCreature(g,m));assert.ok(Math.hypot(m.x-g.pos.x,m.z-g.pos.z)>=2.5);const before={x:m.x,y:m.y,z:m.z};g.world.intersects=()=>true;assert.equal(warpCreature(g,m),false);assert.deepEqual({x:m.x,y:m.y,z:m.z},before);
});
test('new passive creatures persist through save/load',()=>{
 const s=freshState(),st=storage();s.animals=Object.keys(NEW_ANIMALS).map((kind,i)=>({kind,x:i,y:10,z:10,hp:10,angle:0}));saveState(st,s);assert.deepEqual(loadState(st).animals.map(a=>a.kind),Object.keys(NEW_ANIMALS));
});
test('larger fireworks travel farther, expire and cannot overflow their shared pool',()=>{
 const scene=new THREE.Scene(),p=new ParticlePool(scene);p.configure('high');p.firework(0,0,0,'#ffcc66');assert.equal(p.count,64);assert.ok(Math.max(...p.velocity)>9);p.fireworkRing(0,0,0,'#ffffff');assert.equal(p.count,96);
 for(let i=0;i<20;i++)p.firework(0,0,0,'#ffffff');assert.equal(p.count,p.limit);assert.equal(scene.children.length,1);for(let i=0;i<80;i++)p.update(.05);assert.equal(p.count,0);p.configure('high',10);assert.ok(p.limit<=p.capacity);p.configure('off');p.firework(0,0,0,'#ffffff');assert.equal(p.count,0);p.dispose();
});
test('generated lamps are indexed locally and mined lights stay dark after pruning',()=>{
 const w=new World(7821,[],9),site=w.ruins.find({radius:18,type:'magma_ruin'})[0];for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)w.prepare(Math.floor(site.x/16)+dx,Math.floor(site.z/16)+dz);
 const lights=w.structureLights.nearest(site);assert.ok(lights.length);const p=lights[0].point,key=`${p.x},${p.y},${p.z}`;w.set(p.x,p.y,p.z,null);
 assert.ok(!w.structureLights.nearest(site,16,4,p=>!w.edits.has(`${p.x},${p.y},${p.z}`)).some(l=>`${l.point.x},${l.point.y},${l.point.z}`===key));w.pruneCache(9999,9999,4);assert.equal(w.structureLights.cells.size,0);
 w.prepare(Math.floor(p.x/16),Math.floor(p.z/16));assert.equal(w.get(p.x,p.y,p.z),null);
});
test('buried landmarks are discovered at cave depth, not by walking over their surface',()=>{
 const g=game();g.start('creative',true);g.screen=null;g.flying=true;g.move=()=>{};g.updateMobs=()=>{};g.spawnTimer=0;
 const site=g.world.ruins.find({radius:18,type:'magma_ruin'})[0],l=g.world.ruins.layout(site),[dx,dz]=transform(l.loot.x,l.loot.z,site.rotation,site.mirror);g.world.prepare(Math.floor((site.x+dx)/16),Math.floor((site.z+dz)/16));
 g.pos={x:site.x+.5,y:g.world.height(site.x,site.z)+2,z:site.z+.5};g.update(.01);assert.ok(!g.state.discovered.includes(site.id));g.pos.y=site.y;g.update(.01);assert.ok(g.state.discovered.includes(site.id));
});
