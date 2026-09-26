import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/world.js';
import {BIOME_DEFINITIONS} from '../src/biome-registry.js';
import {BIOME_DETAIL} from '../src/biome-detail.js';
import {BLOCKS} from '../src/data.js';
import {freshState,saveState,loadState} from '../src/save.js';
test('all surface biomes have implemented habitat profiles with real registered resources',()=>{
 assert.deepEqual(Object.keys(BIOME_DETAIL).sort(),Object.keys(BIOME_DEFINITIONS).sort());
 for(const p of Object.values(BIOME_DETAIL)){for(const type of [...p.cover,p.rock])assert.ok(BLOCKS[type],type);assert.ok(p.density>=0&&p.density<.5);}
});
test('real generated terrain includes each new ground layer and preserves old generation',()=>{
 const w=new World(7821,[],12),found=new Map();
 for(let x=-6000;x<=6000;x+=96)for(let z=-6000;z<=6000;z+=96){const c=w.column(x,z);if(c.h>=7&&c.h<60&&!found.has(c.biome))found.set(c.biome,{x,z});}
 const types=new Set();for(const p of found.values()){w.prepare(Math.floor(p.x/16),Math.floor(p.z/16));for(const type of w.structures.values())types.add(type);}
 for(const type of ['leaf_litter','blossom_litter','forest_moss','pebbles','dry_shrub','dry_grass_tuft','snow_layer'])assert.ok(types.has(type),type);
 const legacy=new World(7821,[],11);legacy.prepare(-313,-199);assert.ok(![...legacy.structures.values()].some(t=>['leaf_litter','pebbles','dry_shrub'].includes(t)));
 const store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};for(const terrain of [11,12]){const s=freshState();s.terrain=terrain;saveState(storage,s);assert.equal(loadState(storage).terrain,terrain);}
});
test('habitat detail across negative chunk borders is order independent and edits survive eviction',()=>{
 const a=new World(7821,[],12),b=new World(7821,[],12),chunks=[[-313,-199],[-312,-199],[-313,-198],[-312,-198]];
 for(const p of chunks)a.prepare(...p);for(const p of [...chunks].reverse())b.prepare(...p);
 const sorted=w=>[...w.structures].sort(([a],[b])=>a.localeCompare(b));assert.deepEqual(sorted(a),sorted(b));
 const entry=[...a.structures].find(([,t])=>t==='leaf_litter'||t==='forest_moss');assert.ok(entry);const p=entry[0].split(',').map(Number);a.set(...p,null);a.pruneCache(0,0,3);assert.equal(a.get(...p),null);
});
