import * as THREE from '../vendor/three.module.js';
export class TerrainLighting{
 constructor(material){
  this.time={value:0};this.wet={value:0};this.underwater={value:0};this.cloud={value:0};this.offset={value:new THREE.Vector2()};
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,{uNaturalTime:this.time,uWetness:this.wet,uSubmerged:this.underwater,uCloudShade:this.cloud,uOriginPhase:this.offset});
   shader.vertexShader='varying vec3 vNaturalWorld;varying float vNaturalUp;uniform vec2 uOriginPhase;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vNaturalWorld=(modelMatrix*vec4(position,1.)).xyz;vNaturalWorld.xz+=uOriginPhase;vNaturalUp=normal.y;`);
   shader.fragmentShader='varying vec3 vNaturalWorld;varying float vNaturalUp;uniform float uNaturalTime,uWetness,uSubmerged,uCloudShade;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=mix(roughnessFactor,.48,uWetness*max(0.,vNaturalUp));`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   float cloud=sin(vNaturalWorld.x*.02454369+uNaturalTime*.012)*sin(vNaturalWorld.z*.02454369-uNaturalTime*.008);
   outgoingLight*=1.-smoothstep(.05,.65,cloud)*uCloudShade*.16;
   float wave=sin(vNaturalWorld.x*1.5707963+vNaturalWorld.z*.785398+uNaturalTime*.65)*sin(vNaturalWorld.z*1.5707963-vNaturalWorld.x*.392699-uNaturalTime*.53);
   float caustic=pow(max(0.,wave),7.);
   outgoingLight+=vec3(.13,.22,.20)*caustic*uSubmerged*max(0.,vNaturalUp);
   #include <opaque_fragment>`);
  };
 }
 update(game,renderer,dt){
  this.time.value=game.state.time;const weather=game.weather,overworld=game.state.dimension==='overworld';
  const target=overworld&&weather?.kind==='rain'?weather.intensity:0;
  this.wet.value+=(target-this.wet.value)*(1-Math.exp(-dt*.35));this.cloud.value=overworld?(weather?.cloud||0):0;
  this.underwater.value=overworld&&game.world.waterAt(renderer.camera.position.x,renderer.camera.position.y,renderer.camera.position.z)?1:0;
  this.offset.value.set(((renderer.renderOrigin.x%8192)+8192)%8192,((renderer.renderOrigin.z%8192)+8192)%8192);
 }
}
