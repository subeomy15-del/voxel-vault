import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {FloatingOrigin} from '../src/floating-origin.js?v=38';
import {ParticlePool} from '../src/particles.js?v=38';
import {World} from '../src/world.js?v=38';
import {meshChunk} from '../src/mesh.js?v=38';

test('render rebasing keeps hierarchy, shadows and camera relative while restoring logical positions even on failure',()=>{
 const scene=new THREE.Scene(),origin=new FloatingOrigin(),camera=new THREE.PerspectiveCamera(),mob=new THREE.Group(),wing=new THREE.Object3D();
 camera.position.set(2**28+.25,24,-(2**28)+.75);mob.position.set(camera.position.x+3,22,camera.position.z+1);wing.position.x=.125;mob.add(wing);scene.add(camera,mob);
 const before=camera.position.clone();origin.update(camera.position);
 assert.throws(()=>origin.render(scene,()=>{scene.updateMatrixWorld(true);assert.equal(camera.position.x,.25);assert.equal(mob.position.x,3.25);assert.equal(wing.getWorldPosition(new THREE.Vector3()).x,3.375);throw Error('GPU failure');}),/GPU failure/);
 assert.deepEqual(camera.position,before);assert.equal(mob.position.x-before.x,3);
 origin.update({x:-.1,z:-256.1});assert.equal(origin.x,-256);assert.equal(origin.z,-512);
});
test('chunk-local meshes preserve sub-block shapes beyond Float32 integer precision',()=>{
 const cx=2**24/16,cz=-cx,w=new World(7821,[],6,'nether');
 w.set(cx*16+2,75,cz*16+2,'torch');
 const mesh=meshChunk(w,cx,cz,false,{localCoordinates:true});
 assert.ok(mesh.solid.position.some((v,i)=>i%3===0&&Math.abs(v-2.35)<.00001));
 for(const group of Object.values(mesh))for(let i=0;i<group.position.length;i+=3){assert.ok(group.position[i]>=0&&group.position[i]<=16);assert.ok(group.position[i+2]>=0&&group.position[i+2]<=16);}
});
test('particles retain fractional logical positions across render-origin changes',()=>{
 const pool=new ParticlePool(new THREE.Scene()),x=2**28+.125,z=-(2**28)+.375;
 pool.add(x,20,z,0,0,0,2,.1);pool.setOrigin(2**28,-(2**28));pool.update(0);
 assert.equal(pool.mesh.instanceMatrix.array[12],.125);assert.equal(pool.mesh.instanceMatrix.array[14],.375);
 pool.setOrigin(2**28+256,-(2**28));pool.update(0);assert.equal(pool.mesh.instanceMatrix.array[12],-255.875);assert.equal(pool.position[0],x);pool.dispose();
});
