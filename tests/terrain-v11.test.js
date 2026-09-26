import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinateHash} from '../src/coordinate-hash.js?v=38';
import {continentalClimate,CAVE_REGIONS} from '../src/terrain-v11.js?v=38';
import {World} from '../src/world.js?v=38';
import {BIOME_DEFINITIONS,normalizeBiomeId} from '../src/biome-registry.js?v=38';
import {BLOCKS} from '../src/data.js?v=38';
import {regionalTree} from '../src/regional-trees.js?v=38';

test('coordinate hashes use high words, seed and signs instead of repeating every 2^32',()=>{
 const samples=[];for(const x of[-(2**40),-(2**32),-1,0,1,2**32,2**40])for(const z of[-(2**32),0,2**32])samples.push(coordinateHash(x,z,42));
 assert.equal(new Set(samples).size,samples.length);assert.notEqual(coordinateHash(1,2,42),coordinateHash(1,2,43));
 assert.equal(coordinateHash(-(2**40)+7,2**40-3,42),coordinateHash(-(2**40)+7,2**40-3,42));
});
test('all surface biomes and all four real cave materials are reachable on multiple new-world seeds',()=>{
 for(const seed of[7821,42,981]){
  const w=new World(seed,[],11),surface=new Set(),caves=new Set();
  for(let x=-6000;x<=6000;x+=96)for(let z=-6000;z<=6000;z+=96){surface.add(continentalClimate(seed,x,z).biome);const c=w.column(x,z);caves.add(c.cave.id);}
  assert.deepEqual([...surface].sort(),Object.keys(BIOME_DEFINITIONS).sort(),'surface seed '+seed);
  assert.deepEqual([...caves].sort(),Object.keys(CAVE_REGIONS).sort());
  const visible=new Set();for(let x=-900;x<900;x+=19)for(let z=-900;z<900;z+=19){const c=w.column(x,z);for(let y=-45;y<-10;y++){if(w.inCave(x,y,z,c)&&!w.inCave(x,y-1,z,c)&&w.getPrepared(x,y-1,z,c)===c.cave.rock){visible.add(c.cave.id);break;}}}
  assert.deepEqual([...visible].sort(),Object.keys(CAVE_REGIONS).sort(),'actual cave floor materials');
 }
 assert.equal(normalizeBiomeId('Cactus Fields'),normalizeBiomeId('Many Cactus Desert'));assert.equal(normalizeBiomeId('Red Desert'),normalizeBiomeId('Red Sand Desert'));
});
test('new chunk borders regenerate independently of preparation order and retain explicit air',()=>{
 const chunks=[[-1,-1],[0,-1],[-1,0],[0,0]],a=new World(42,[],11),b=new World(42,[],11);
 for(const c of chunks)a.prepare(...c);for(const c of chunks.toReversed())b.prepare(...c);
 for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)for(let y=-50;y<40;y++)assert.equal(a.get(x,y,z),b.get(x,y,z));
 a.set(-1,75,-1,null);a.pruneCache(100,100,3);assert.equal(a.get(-1,75,-1),null);
});
test('snowy cedars have connected lateral boughs and snow caps',()=>{
 const w=new World(42,[],11),cells=new Map();regionalTree(w,(x,y,z,t)=>cells.set(`${x},${y},${z}`,t),0,0,0,'snow_cedar');
 assert.ok([...cells.values()].includes('snow'));assert.equal(cells.get('2,6,0'),'snow');
 for(const value of cells.values())assert.ok(BLOCKS[value]);
});
