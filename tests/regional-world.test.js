import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/world.js?v=36';
import {regionalClimate} from '../src/regional-climate.js?v=36';
import {BIOME_DEFINITIONS} from '../src/biome-registry.js?v=36';
import {STRUCTURE_TYPES,buildStructure} from '../src/structure-templates.js?v=36';
import {BLOCKS,ITEMS} from '../src/data.js?v=36';
import {regionalTree} from '../src/regional-trees.js?v=36';
import {freshState,saveState,loadState} from '../src/save.js?v=36';
import {ruinEquipment,defeatRuinGuard,tickRuinEncounters} from '../src/ruin-encounters.js?v=36';
import {normalizeRoll} from '../src/infusions.js?v=36';
import {integerHash} from '../src/climate.js?v=36';
const store=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};};
test('all 18 surface regions exist, climate is deterministic and terrain borders are continuous',()=>{
 const found=new Set();for(const seed of [7821,42])for(let x=-6000;x<=6000;x+=96)for(let z=-6000;z<=6000;z+=96)found.add(regionalClimate(seed,x,z).biome);
 assert.deepEqual([...found].sort(),Object.keys(BIOME_DEFINITIONS).sort());
 const runs=[];let last='',length=0,max=0;for(let x=-9000;x<9000;x+=2){const c=regionalClimate(7821,x,1700);assert.deepEqual(c,regionalClimate(7821,x,1700));max=Math.max(max,Math.abs(c.h-regionalClimate(7821,x+1,1700).h));if(c.biome===last)length+=2;else{if(length)runs.push(length);last=c.biome;length=2;}}
 assert.ok(max<3,'no quantized mesa cliffs: '+max);assert.ok(runs.toSorted((a,b)=>a-b)[Math.floor(runs.length/2)]>70);
});
test('Badlands surface is red and its mesas have meaningful relief',()=>{
 const w=new World(7821,[],8);let count=0,min=100,max=-100;
 for(let x=-6000;x<6000;x+=80)for(let z=-6000;z<6000;z+=80){const c=w.column(x,z);if(c.biome!=='badlands'||c.h<6||c.region<1)continue;count++;min=Math.min(min,c.h);max=Math.max(max,c.h);const surface=w.base(x,c.h,z);if(!w.structures.has(`${x},${c.h},${z}`))assert.equal(surface,'red_sand');}
 assert.ok(count>100);assert.ok(max-min>25);assert.equal(w.biomeAtHeight(0,-35,0),'deep_cave');
});
test('new tree families use connected geometry and distinctive silhouettes without touching old generators',()=>{
 const signatures=new Set();for(const species of ['oak','birch','amber','cherry','jungle','acacia','palm','conifer','tall_conifer']){
  const cells=new Map(),w=new World(42,[],8);regionalTree(w,(x,y,z,t)=>{const k=`${x},${y},${z}`;if(!cells.has(k)||['leaf','pine','cherry_leaf','autumnleaf'].includes(cells.get(k)))cells.set(k,t);},1000,20,1000,species);
  for(const t of cells.values())assert.ok(BLOCKS[t]);signatures.add(JSON.stringify([...cells]));
  const visited=new Set(),queue=['1000,21,1000'];visited.add(queue[0]);for(let i=0;i<queue.length;i++){const[x,y,z]=queue[i].split(',').map(Number);for(const[dx,dy,dz]of[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const k=`${x+dx},${y+dy},${z+dz}`;if(cells.has(k)&&!visited.has(k)){visited.add(k);queue.push(k);}}}
  assert.equal(visited.size,cells.size,species+' floating leaves');
 }assert.equal(signatures.size,9);
});
test('all ruin families spawn and their layouts vary while materials and footprint remain valid',()=>{
 const found=new Set();for(const seed of[7821,42,981,151]){const w=new World(seed,[],8);for(const s of w.ruins.find({radius:24})){
  found.add(s.type);assert.ok(s.slope<=4);const a=w.ruins.layout(s);for(const[k,t]of a.cells){assert.ok(t===null||BLOCKS[t]);const[x,,z]=k.split(',').map(Number);assert.ok(Math.abs(x)<=s.radius&&Math.abs(z)<=s.radius, s.type+' footprint');}assert.ok(s.y>6);
 }}assert.deepEqual([...found].sort(),Object.keys(STRUCTURE_TYPES).filter(t=>t!=='magma_ruin').sort());
 for(const type of found)assert.notDeepEqual(buildStructure(type,42,'forest',8).cells,buildStructure(type,991,'forest',8).cells,type+' variation');
});
test('version-eight structures agree across chunk order, edits survive and caches stay bounded',()=>{
 const a=new World(42,[],8),site=a.ruins.find({radius:20,type:'mine'})[0];assert.ok(site);const chunks=[];for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)chunks.push([Math.floor(site.x/16)+x,Math.floor(site.z/16)+z]);
 const b=new World(42,[],8);for(const c of chunks)a.prepare(...c);for(const c of chunks.toReversed())b.prepare(...c);
 const sorted=w=>[...w.structures].sort(([a],[b])=>a.localeCompare(b));assert.deepEqual(sorted(a),sorted(b));assert.equal(a.chests.filter(c=>c.id===site.id).length,1);
 const chest=a.chests.find(c=>c.id===site.id);a.set(chest.x,chest.y,chest.z,null);const loaded=new World(42,[...a.edits],8);assert.equal(loaded.get(chest.x,chest.y,chest.z),null);
 const before=sorted(b);b.pruneCache(999,999,4);for(const c of chunks)b.prepare(...c);assert.deepEqual(sorted(b),before);assert.equal(b.edits.size,0);
 for(let i=0;i<100;i++){b.prepare(i*8,-i*5);b.pruneCache(i*8,-i*5,5);assert.ok(b.ruins.regions.size<150);assert.ok(b.columns.size<8000);}
});
test('guardian defeats and enchanted loot survive saves; existing equipment rolls are not overwritten',()=>{
 const storage=store(),state=freshState(42),g={state,world:new World(42,[],8),save(){saveState(storage,state);},add(k,n){state.inv[k]=(state.inv[k]||0)+n;}};
 defeatRuinGuard(g,{ruinGuard:'ruin:42:8:5:7:guard:0'});assert.deepEqual(loadState(storage).ruinDefeated,['ruin:42:8:5:7:guard:0']);
 let seed=0;while(integerHash(seed,13,42)>.3)seed++;ruinEquipment(g,{generated:true,tier:2,siteSeed:seed});assert.ok(normalizeRoll('iron_pickaxe',state.infusions.iron_pickaxe));
 state.infusions.iron_pickaxe={tier:3,altar:3,enchants:{haste:3}};ruinEquipment(g,{generated:true,tier:3,siteSeed:seed});assert.equal(state.infusions.iron_pickaxe.tier,3);g.save();assert.equal(loadState(storage).infusions.iron_pickaxe.tier,3);
});
test('new blocks have item entries and terrain versions survive import with inventory and explicit air',()=>{
 for(const type of['cherry_leaf','ice'])assert.ok(BLOCKS[type]&&ITEMS[type]);
 for(const terrain of[5,6,7,8]){const s=freshState();s.terrain=terrain;s.edits=[['100,12,100',null],['101,12,100','cherry_leaf']];s.inv.diamond=7;s.containers={'3,8,7':{apple:4}};const storage=store();saveState(storage,s);const loaded=loadState(storage);assert.equal(loaded.terrain,terrain);assert.deepEqual(loaded.edits,s.edits);assert.deepEqual(loaded.containers,s.containers);assert.equal(loaded.inv.diamond,7);}
});

test('pre-upgrade terrain fixtures remain byte-identical in all retained generator versions',async()=>{
 const {readFile}=await import('node:fs/promises'),{createHash}=await import('node:crypto');const fixtures=JSON.parse(await readFile(new URL('./legacy-regions.json',import.meta.url),'utf8'));
 for(const {seed,terrain,sha256} of fixtures){const w=new World(seed,[],terrain),digest=createHash('sha256');for(const[cx,cz]of[[0,0],[15,11],[81,91],[-143,155]])for(let x=cx*16;x<cx*16+16;x+=2)for(let z=cz*16;z<cz*16+16;z+=2)for(let y=-40;y<90;y+=2)digest.update(String(w.get(x,y,z))+';');assert.equal(digest.digest('hex'),sha256,`seed ${seed}, version ${terrain}`);}
});

test('nearby Badlands gain mesa relief only in new worlds',()=>{
 const old=new World(7821,[],7),next=new World(7821,[],8);let raised=0;
 for(let x=200;x<300;x+=8)for(let z=160;z<260;z+=8)if(next.height(x,z)-old.height(x,z)>8)raised++;
 assert.ok(raised>15);assert.equal(next.height(0,12),old.height(0,12));
});

test('mine guards spawn underground, never duplicate and stay defeated after reload',()=>{
 const world=new World(7821,[],8),site=world.ruins.find({radius:24,type:'mine'})[0];for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)world.prepare(Math.floor(site.x/16)+dx,Math.floor(site.z/16)+dz);
 const state=freshState(7821),g={world,state,pos:{x:site.x+25,y:site.y,z:site.z},mobs:[],save(){},spawnMob(x,z,kind,y){const m={x,y,z,kind};this.mobs.push(m);return m;}};
 tickRuinEncounters(g,1);const guards=g.mobs.filter(m=>m.ruinGuard.startsWith(site.id));assert.ok(guards.length>0);for(const m of guards){assert.ok(m.y<site.y-3);assert.equal(world.intersects(m.x,m.y,m.z,1.9,.5),false);}
 const count=g.mobs.length;tickRuinEncounters(g,2);assert.equal(g.mobs.length,count);
 for(const m of guards)defeatRuinGuard(g,m);g.mobs=[];g.ruinDefeated=undefined;tickRuinEncounters(g,2);assert.equal(g.mobs.filter(m=>m.ruinGuard.startsWith(site.id)).length,0);
});
