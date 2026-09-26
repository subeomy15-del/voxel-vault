import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/world.js';
import {BLOCKS} from '../src/data.js';
import {ANIMALS,tickAquaticLife} from '../src/wildlife.js';
import {creatureModel,animateCreature} from '../src/creature-model.js';
import * as THREE from '../vendor/three.module.js';
function patch(w,x,z){for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)w.prepare(Math.floor(x/16)+dx,Math.floor(z/16)+dz);return [...w.structures].filter(([k])=>{const[a,,b]=k.split(',').map(Number);return Math.abs(a-x)<24&&Math.abs(b-z)<24;});}
test('real generated jungle, marsh and seabed have distinct grounded ecology',()=>{
 const w=new World(7821,[],11),j=patch(w,-5000,-3176),m=patch(w,-4840,1144),o=patch(w,-5000,1112);
 for(const type of ['jungle_leaf','vines','fern'])assert.ok(j.filter(([,t])=>t===type).length>100,type);
 for(const type of ['reeds','mangrove_leaf'])assert.ok(m.some(([,t])=>t===type),type);
 let water=0,mud=0;for(let x=-4850;x<-4830;x++)for(let z=1134;z<1154;z++){if(w.waterAt(x,4,z))water++;if(w.get(x,w.height(x,z),z)==='mud')mud++;}assert.ok(water>40);assert.ok(mud>40);
 for(const type of ['kelp','seagrass'])assert.ok(o.some(([,t])=>t===type),type);
 for(const[k,t]of o)if(BLOCKS[t]?.waterlogged){const[x,y,z]=k.split(',').map(Number);assert.ok(y<4);assert.ok(w.waterAt(x,y,z));assert.equal(w.solid(x,y,z),false);}
});
test('wetland generation is seam and load-order independent',()=>{
 const a=new World(7821,[],11),b=new World(7821,[],11),chunks=[[-304,71],[-303,71],[-304,72],[-303,72]];
 for(const[cx,cz]of chunks)a.prepare(cx,cz);for(const[cx,cz]of [...chunks].reverse())b.prepare(cx,cz);
 const entries=w=>[...w.structures].sort(([a],[b])=>a.localeCompare(b));assert.deepEqual(entries(a),entries(b));
});
test('all three fish render and articulate their tails',()=>{
 const renderer={part(c,w,h,d,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:c}));mesh.position.set(x,y,z);return mesh;}};
 for(const kind of ['river_fish','tropical_fish','pufferfish']){const mob={kind,id:1,walk:1},g=creatureModel(renderer,mob,ANIMALS[kind]);g.updateMatrixWorld(true);const size=new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());assert.ok(size.y<.65&&size.x<.8&&size.z<1,'fish remains inside its species proportions');animateCreature(g,mob,1);const before=g.userData.creature.tail.rotation.y;animateCreature(g,mob,2);assert.notEqual(before,g.userData.creature.tail.rotation.y);g.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
});
test('local schools remain bounded and cannot spawn on dry land',()=>{
 const g={state:{dimension:'overworld',time:10,seed:7821},pos:{x:0,y:5,z:0},serial:1,mobs:[],world:{waterAt:()=>true,intersects:()=>false,biome:()=> 'marsh'},spawnMob(x,z,kind,y){this.mobs.push({x,y,z,kind,id:this.serial++});}};
 for(let i=0;i<20;i++)tickAquaticLife(g,3);assert.equal(g.mobs.length,12);assert.ok(g.mobs.every(m=>m.kind==='river_fish'));
 g.pos.x=200;g.world.waterAt=()=>false;tickAquaticLife(g,3);assert.equal(g.mobs.length,0);
});
