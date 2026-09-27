import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherAt} from '../src/weather.js';
import {BIOME_DEFINITIONS} from '../src/biome-registry.js';
import {WeatherView} from '../src/weather-view.js';
import * as THREE from '../vendor/three.module.js';
test('climate weather is deterministic, bounded and dry in arid biomes',()=>{
 let rain=false,snow=false;
 for(const biome of Object.keys(BIOME_DEFINITIONS))for(let t=0;t<4800;t+=40){const a=weatherAt(7821,t,biome);assert.deepEqual(a,weatherAt(7821,t,biome));assert.ok(a.intensity>=0&&a.intensity<=.55);assert.ok(a.cloud>=0&&a.cloud<=1);if(a.intensity){if(a.kind==='snow')snow=true;else rain=true;}if(['desert','red_sand_desert','many_cactus_desert'].includes(biome))assert.equal(a.intensity,0);}
 assert.ok(rain&&snow);assert.ok(weatherAt(7821,0,'forest').intensity===0);
});
test('precipitation uses one bounded buffer and stays out of roofs and underwater',()=>{
 const owner={scene:new THREE.Scene(),options:{quality:'medium',particles:'low'}},view=new WeatherView(owner),g={state:{dimension:'overworld',time:250},pos:{x:0,y:20,z:0},screen:null,world:{solid:()=>false,height:()=>19,waterAt:()=>false}};
 const buffer=view.positions;view.update(g,.1,{intensity:.5,kind:'rain'});assert.ok(view.mesh.visible);assert.ok(view.mesh.geometry.drawRange.count<=512);assert.equal(view.positions,buffer);
 g.world.waterAt=()=>true;view.update(g,.1,{intensity:.5,kind:'rain'});assert.equal(view.mesh.visible,false);
 g.world.waterAt=()=>false;g.world.solid=()=>true;view.update(g,1,{intensity:.5,kind:'snow'});assert.equal(view.mesh.visible,false);
 owner.options.particles='off';view.update(g,1,{intensity:.5,kind:'rain'});assert.equal(view.mesh.visible,false);
 view.mesh.geometry.dispose();view.mesh.material.dispose();
});
