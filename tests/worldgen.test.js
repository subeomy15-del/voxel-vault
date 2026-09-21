import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/world.js?v=36';
import {Game} from '../src/game.js?v=36';
import {BLOCKS} from '../src/data.js?v=36';
import {freshState,loadState,saveState} from '../src/save.js?v=36';
import {climateAt} from '../src/climate.js?v=36';
import {BIOME_DEFINITIONS} from '../src/legacy-biomes.js?v=36';
import {STRUCTURE_TYPES,buildStructure,transform} from '../src/structure-templates.js?v=36';
import {meshChunk} from '../src/mesh.js?v=36';
const cells=w=>[...w.structures].sort(([a],[b])=>a.localeCompare(b));
test('climate biomes cover all families across a bounded map and form large continuous regions',()=>{
 const found=new Set(),runs=[];let last=null,length=0,maxStep=0;
 for(let x=-6000;x<=6000;x+=96)for(let z=-6000;z<=6000;z+=96)found.add(climateAt(7821,x,z).biome);
 assert.deepEqual([...found].sort(),Object.keys(BIOME_DEFINITIONS).sort());
 for(let x=-12000;x<=12000;x+=4){const c=climateAt(7821,x,1800);maxStep=Math.max(maxStep,Math.abs(c.h-climateAt(7821,x+1,1800).h));if(c.biome===last)length+=4;else{if(length)runs.push(length);length=4;last=c.biome;}}
 assert.ok(runs.toSorted((a,b)=>a-b)[Math.floor(runs.length/2)]>=80,JSON.stringify(runs));assert.ok(maxStep<5,'Climate transitions must not create vertical walls');
});
test('terrain versions 5 and 6 remain explicit and new worlds use version 9',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 for(const terrain of[5,6,7,8]){const state=freshState();state.terrain=terrain;saveState(storage,state);assert.equal(loadState(storage).terrain,terrain);}
 assert.equal(freshState().terrain,9);
 const a=new World(7821,[],6),b=new World(7821,[],7);for(const[x,z]of[[0,12],[23,-31],[90,20]])assert.equal(a.height(x,z),b.height(x,z));assert.notEqual(a.height(2100,1700),b.height(2100,1700));
});
test('deep ocean chunks retain a visible water surface above low seabeds',()=>{
 const w=new World(7821,[],7);assert.ok(w.height(1280,1760)<-10);const mesh=meshChunk(w,80,110);assert.ok(mesh.water.position.length>0);assert.ok(mesh.water.position.some((y,i)=>i%3===1&&y>4));
});
test('all original ruin templates appear across known seeds with spacing and dry supported sites',()=>{
 const found=new Set();for(const seed of[7821,42,981,151]){
  const w=new World(seed,[],7),sites=w.ruins.find({radius:18});for(const site of sites){found.add(site.type);assert.ok(site.slope<=4);assert.ok(site.y>=7&&site.y<74);assert.ok(Math.hypot(site.x,site.z)>520+site.radius);}
  for(let i=0;i<sites.length;i++)for(let j=i+1;j<sites.length;j++){const a=sites[i],b=sites[j];assert.ok(Math.abs(a.x-b.x)>=a.radius+b.radius+22||Math.abs(a.z-b.z)>=a.radius+b.radius+22);}
 }
 assert.deepEqual([...found].sort(),Object.keys(STRUCTURE_TYPES).filter(k=>!['mine','swamp_hut','outpost','magma_ruin'].includes(k)).sort());
});
test('templates rotate and mirror with valid original block palettes and intentional interiors',()=>{
 for(const type of Object.keys(STRUCTURE_TYPES)){const a=buildStructure(type,42,'forest'),b=buildStructure(type,42,'forest');assert.deepEqual(a.cells,b.cells);assert.ok(a.cells.size>20);
  for(const value of a.cells.values())assert.ok(value===null||Object.hasOwn(BLOCKS,value),`${type}: ${value}`);
  for(let r=0;r<4;r++){const p=transform(3,7,r,true);assert.equal(Math.abs(p[0])+Math.abs(p[1]),10);}
 }
});
test('multi-chunk ruins are independent of preparation order, retain player edits and register loot once',()=>{
 const a=new World(7821,[],7),site=a.ruins.find({radius:12,type:'fortress'})[0];assert.ok(site);const chunks=[];
 for(let x=Math.floor((site.x-site.radius-6)/16);x<=Math.floor((site.x+site.radius+6)/16);x++)for(let z=Math.floor((site.z-site.radius-6)/16);z<=Math.floor((site.z+site.radius+6)/16);z++)chunks.push([x,z]);
 for(const[x,z]of chunks)a.prepare(x,z);const b=new World(7821,[],7);for(const[x,z]of chunks.toReversed())b.prepare(x,z);assert.deepEqual(cells(a),cells(b));assert.equal(a.chests.filter(c=>c.id===site.id).length,1);assert.equal(a.edits.size,0);
 const chest=a.chests.find(c=>c.id===site.id);a.set(chest.x,chest.y,chest.z,null);const loaded=new World(a.seed,[...a.edits],7);assert.equal(loaded.get(chest.x,chest.y,chest.z),null);
 const before=cells(b);b.pruneCache(1000,1000,3);for(const[x,z]of chunks)b.prepare(x,z);assert.deepEqual(cells(b),before);assert.equal(b.chests.filter(c=>c.id===site.id).length,1);
 const mesh=meshChunk(a,Math.floor(site.x/16),Math.floor(site.z/16));assert.ok(mesh.solid.position.length);assert.ok(mesh.solid.position.every(Number.isFinite));assert.ok(mesh.solid.uv.every(v=>v>=0&&v<=1));
});
test('long-distance generation keeps caches bounded and unopened structures out of save edits',()=>{
 const w=new World(42,[],7);for(let i=0;i<140;i++){const cx=i*9,cz=-i*3;w.prepare(cx,cz);w.pruneCache(cx,cz,5);assert.ok(w.ruins.regions.size<120);assert.ok(w.ruins.layouts.size<20);assert.ok(w.chests.length<25);assert.ok(w.columns.size<6000);}
 assert.equal(w.edits.size,0);
});
test('generated ruin loot can be collected only once across reload and regeneration',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},renderer={setWorld(){},stream(){},burst(){}},audio={play(){},quiet(){}};
 const g=new Game(renderer,audio,storage),site=g.world.ruins.find({radius:8})[0],layout=g.world.ruins.layout(site),[dx,dz]=transform(layout.loot.x,layout.loot.z,site.rotation,site.mirror);
 const x=site.x+dx,y=site.y+layout.loot.y,z=site.z+dz;g.world.prepare(Math.floor(x/16),Math.floor(z/16));g.pos={x:x+1.5,y,z:z+.5};g.screen=null;g.target={x,y,z,type:'treasure_chest'};g.interact();assert.ok(g.state.opened.includes(site.id));g.save();
 const inventory={...g.state.inv},restored=new Game(renderer,audio,storage);restored.screen=null;restored.target={x,y,z,type:'treasure_chest'};restored.interact();assert.deepEqual(restored.state.inv,inventory);assert.equal(restored.state.opened.filter(id=>id===site.id).length,1);
});
