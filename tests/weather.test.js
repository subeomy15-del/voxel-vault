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

test('weather fronts cross period boundaries without jumps in wind or cloud',()=>{
 for(let t=480;t<4800;t+=480){const a=weatherAt(7821,t-.001,'forest'),b=weatherAt(7821,t+.001,'forest');for(const key of ['wind','windX','windZ','cloud','intensity'])assert.ok(Math.abs(a[key]-b[key])<.001,key);}
});

test('clock, daylight and morning mist match the solar cycle',async()=>{
 const {localConditions}=await import('../src/weather.js');
 assert.equal(localConditions(0,'forest').clock,'06:00');
 assert.equal(localConditions(150,'forest').clock,'12:00');
 assert.equal(localConditions(450,'forest').clock,'00:00');
 assert.equal(localConditions(150,'forest').daylight,1);
 assert.equal(localConditions(450,'forest').daylight,0);
 assert.ok(localConditions(20,'marsh').mist>localConditions(150,'marsh').mist);
 assert.equal(localConditions(150,'snow',20,{kind:'snow',intensity:.3}).label,'Snowfall');
});

test('sky life reuses its buffer and respects caves, night, weather and particle settings',async()=>{
 const {SkyLife}=await import('../src/sky-life.js');
 const owner={scene:new THREE.Scene(),options:{quality:'medium',particles:'high',renderDistance:5}},view=new SkyLife(owner);
 const game={state:{dimension:'overworld',time:150,seed:41},pos:{x:0,y:20,z:0},world:{waterAt:()=>false,height:()=>19}};
 const buffer=view.positions,conditions={daylight:1},weather={intensity:0};
 view.update(game,conditions,weather,false);assert.equal(view.mesh.visible,true);assert.equal(view.mesh.geometry.drawRange.count,108);assert.equal(view.positions,buffer);assert.ok([...buffer].every(Number.isFinite));
 for(const [day,rain,cave] of [[0,0,false],[1,.3,false],[1,0,true]]){view.update(game,{daylight:day},{intensity:rain},cave);assert.equal(view.mesh.visible,false);}
 owner.options.particles='off';view.update(game,conditions,weather,false);assert.equal(view.mesh.visible,false);
 owner.options.particles='high';game.state.dimension='nether';view.update(game,conditions,weather,false);assert.equal(view.mesh.visible,false);
 view.mesh.geometry.dispose();view.mesh.material.dispose();
});
