import {ATMOSPHERES} from './atmosphere-profiles.js?v=35';
import * as THREE from '../vendor/three.module.js';
import { hash } from './data.js?v=35';
export class Scenery {
  constructor(renderer){
    this.atmospheres=Object.fromEntries(Object.entries(ATMOSPHERES).map(([id,p])=>[id,Object.fromEntries(Object.entries(p).map(([k,color])=>[k,new THREE.Color(color)]))]));this.targetZenith=new THREE.Color();this.targetHorizon=new THREE.Color();
    this.owner=renderer;this.time={value:0};this.wind={value:1};
    this.palette=Object.fromEntries(Object.entries({day:'#6aa6cf',horizon:'#c4d8df',dusk:'#c8b598',cloud:'#f6f0dd',cave:'#162128',sun:'#edf1f3',sunset:'#dfbfab'}).map(([key,color])=>[key,new THREE.Color(color)]));
    this.skyUniforms={sunDirection:{value:new THREE.Vector3(-.5,.8,.3)},zenith:{value:new THREE.Color('#6eabcb')},horizon:{value:new THREE.Color('#d6dbca')},night:{value:0},rift:{value:0},time:this.time};
    const skyMaterial=new THREE.ShaderMaterial({uniforms:this.skyUniforms,side:THREE.BackSide,depthWrite:false,
      vertexShader:'varying vec3 vSky;void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`varying vec3 vSky;uniform vec3 sunDirection,zenith,horizon;uniform float night,rift,time;
      float rand(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      void main(){vec3 d=normalize(vSky);float h=max(d.y,0.0);vec3 col=mix(horizon,zenith,pow(h,.58));
      float sun=max(dot(d,sunDirection),0.0);col+=vec3(1.0,.74,.37)*pow(sun,26.)*.22*(1.-night);
      col+=vec3(1.,.88,.59)*smoothstep(.9992,.9996,sun)*(1.-night)*1.1;
      float moon=max(dot(d,-sunDirection),0.0);col+=vec3(.62,.75,.86)*smoothstep(.9993,.9996,moon)*night;
      vec3 cell=floor(d*370.);float star=step(.9988,rand(cell))*pow(max(0.,1.-length(fract(d*370.)-.5)*1.6),3.);
      col+=vec3(.77,.88,1.)*star*night*smoothstep(.05,.4,h);
      float ribbon=sin(d.x*5.+sin(d.z*4.+time*.015)*1.3+d.y*9.);float nebula=pow(max(0.,1.-abs(ribbon)),3.)*pow(max(0.,d.y),.4);
      col+=rift*(vec3(.09,.035,.16)*nebula+vec3(.02,.065,.08)*pow(max(0.,1.-abs(ribbon-.4)),4.)*h);gl_FragColor=vec4(col,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    this.sky=new THREE.Mesh(new THREE.SphereGeometry(190,24,14),skyMaterial);this.sky.frustumCulled=false;this.sky.renderOrder=-10;renderer.scene.add(this.sky);
    const material=new THREE.MeshLambertMaterial({color:'#f7f0de',transparent:true,opacity:.82,depthWrite:false});
    this.clouds=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,120);this.clouds.frustumCulled=false;
    const m=new THREE.Matrix4(),q=new THREE.Quaternion();let count=0;
    for(let i=0;i<24;i++){
      const x=hash(i,114)*340-170,z=hash(i,73)*340-170,y=82+hash(i,24)*18;
      for(let j=0;j<5;j++){m.compose(new THREE.Vector3(x+(j-2)*5,y+hash(i,j)*2,z+(hash(i,j+3)-.5)*6),q,new THREE.Vector3(6+hash(i,j+4)*7,1.5+hash(i,j+8)*2,5+hash(i,j+5)*6));this.clouds.setMatrixAt(count++,m);}
    }
    renderer.scene.add(this.clouds);
    this.grassMaterial=new THREE.MeshLambertMaterial({color:'#ffffff',side:THREE.DoubleSide});
    this.grassMaterial.onBeforeCompile=shader=>{
      shader.uniforms.uWindTime=this.time;shader.uniforms.uWind=this.wind;
      shader.vertexShader='uniform float uWindTime;uniform float uWind;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 root=instanceMatrix[3].xyz;float sway=sin(uWindTime*1.5+root.x*.31+root.z*.23)*.065+sin(uWindTime*2.3+root.z*.71)*.025;
      transformed.x+=sway*position.y*uWind;transformed.z+=sway*.5*position.y*uWind;`);
    };
    this.grassMaterial.userData.shared=true;
    this.scratch=new THREE.Matrix4();this.rotation=new THREE.Quaternion();this.tint=new THREE.Color();
    renderer.waterMaterial.onBeforeCompile=shader=>{
      shader.uniforms.uWaterTime=this.time;shader.vertexShader='varying vec3 vWaterPos;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWaterPos=position;');
      shader.fragmentShader='uniform float uWaterTime;varying vec3 vWaterPos;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
      if(abs(vNormal.y)>.7){vec2 wave=vec2(sin(vWaterPos.x*1.8+vWaterPos.z*.8+uWaterTime*.9),cos(vWaterPos.z*2.-vWaterPos.x*.6-uWaterTime*.7));normal=normalize(normal+vec3(wave.x,0.,wave.y)*.1);}`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`float crest=pow(max(0.,sin(vWaterPos.x*2.+vWaterPos.z*1.7+uWaterTime)*cos(vWaterPos.z*1.4-uWaterTime*.65)),12.);
      outgoingLight+=vec3(.32,.46,.42)*crest*.12;
      #include <opaque_fragment>`);
    };
  }
  addGroundDetail(group,cx,cz,world){
    const underground=this.owner.underground;if(underground||world.dimension!=='overworld'||this.owner.options.quality==='low')return;
    const instances=[],high=this.owner.options.quality==='high'||this.owner.options.quality==='custom';
    for(let a=0;a<16;a++)for(let b=0;b<16;b++){
      const x=cx*16+a,z=cz*16+b,n=hash(x,z,world.seed+718);const patch=world.noise(x+94,z-37,22);if(n<(high?(patch>.58?.86:.965):.975))continue;
      const y=world.height(x,z)+1;if(world.get(x,y-1,z)!=='grass'||world.get(x,y,z))continue;
      instances.push({x:x+.18+hash(x,z,91)*.64,y,z:z+.18+hash(z,x,52)*.64,n});
    }
    if(!instances.length)return;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.055,0,0,.015,0,0,.04,.28,0, .01,0,-.055,.01,0,.045,.01,.24,.015, -.09,0,.04,-.035,0,.025,-.12,.2,.035],3));geometry.computeVertexNormals();
    const mesh=new THREE.InstancedMesh(geometry,this.grassMaterial,instances.length),up=new THREE.Vector3(0,1,0);
    instances.forEach((p,i)=>{
      this.rotation.setFromAxisAngle(up,hash(p.x|0,p.z|0)*Math.PI*2);
      this.scratch.compose(new THREE.Vector3(p.x,p.y,p.z),this.rotation,new THREE.Vector3(1,.55+(p.n-.5)*.9,1));mesh.setMatrixAt(i,this.scratch);
      this.tint.set(p.n>.86?'#9aa17b':p.n>.73?'#7d916e':'#6d825f');mesh.setColorAt(i,this.tint);
    });
    mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
  }
  update(game,inCave,dt=1/60){
    const t=game.state.time,phase=t/600*Math.PI*2,elevation=Math.sin(phase),day=THREE.MathUtils.smoothstep(elevation,-.22,.35),dusk=(1-Math.abs(elevation))**5;
    this.time.value=t;this.wind.value=this.owner.settings.bobbing?1:0;
    const uniforms=this.skyUniforms;uniforms.sunDirection.value.set(-Math.cos(phase)*.8,elevation,.25).normalize();uniforms.night.value=1-day;uniforms.rift.value=game.state.dimension==='ender'?1:0;
    const profile=this.atmospheres[game.world.biome(game.pos.x,game.pos.z)]||this.atmospheres.meadow,blend=1-Math.exp(-dt*1.4);
    this.targetZenith.set('#16283e').lerp(profile.day,day);this.targetHorizon.set('#354654').lerp(profile.horizon,day).lerp(this.palette.dusk,dusk*.35);
    uniforms.zenith.value.lerp(this.targetZenith,blend);uniforms.horizon.value.lerp(this.targetHorizon,blend);
    this.sky.visible=!inCave;this.sky.position.copy(this.owner.camera.position);
    this.clouds.visible=!inCave;this.clouds.position.set(game.pos.x+Math.sin(t*.002)*10,0,game.pos.z);this.clouds.material.color.set('#8b9ba5').lerp(profile.cloud,day);this.clouds.material.opacity=.7*day+.22;
    const r=this.owner;r.scene.background.copy(inCave?this.palette.cave:uniforms.horizon.value);r.scene.fog.color.copy(r.scene.background);
    this.clouds.count=r.options.quality==='low'?40:r.options.quality==='medium'?80:120;
    const distance=r.options.renderDistance*16;r.scene.fog.near=inCave?20:distance*.7;r.scene.fog.far=inCave?45:distance+16;
    r.sun.intensity=inCave?.06:.14+day*1.45;r.sun.color.set('#b7cee7').lerp(this.palette.sun,day).lerp(this.palette.sunset,dusk*.3);
    r.ambient.intensity=game.effect('nightvision')?Math.max(2.3,2.3+(game.potionPower('nightvision')-1)*.45):inCave?.38:.45+day*.68;r.ambient.color.set('#e1e8e5');r.ambient.groundColor.lerp(profile.ground,blend);
    if(game.effect('nightvision')){r.scene.fog.near=45;r.scene.fog.far=95;r.lantern.intensity=Math.max(r.lantern.intensity,5);}
    if(game.state.dimension==='ender'){
      uniforms.zenith.value.set('#100d29');uniforms.horizon.value.set('#51416c');uniforms.night.value=.65;
      this.sky.visible=true;this.clouds.visible=false;r.scene.background.set('#30233f');r.scene.fog.color.set('#51416c');r.scene.fog.near=distance*.42;r.scene.fog.far=distance+20;
      r.ambient.intensity=1.6;r.ambient.color.set('#c4b6ed');r.ambient.groundColor.set('#756894');r.sun.intensity=1.4;r.sun.color.set('#e5d9ff');
    }
    if(game.state.dimension==='nether'){
      uniforms.zenith.value.set('#211b22');uniforms.horizon.value.set('#875248');uniforms.night.value=.4;
      this.sky.visible=true;this.clouds.visible=false;r.scene.background.set('#583b3b');r.scene.fog.color.set('#875248');r.scene.fog.near=distance*.34;r.scene.fog.far=distance+12;
      r.ambient.intensity=1.5;r.ambient.color.set('#e2b29a');r.ambient.groundColor.set('#754849');r.sun.intensity=1.2;r.sun.color.set('#f6b686');
    }
    if(game.state.dimension==='parkour'){
      uniforms.zenith.value.set('#629cdb');uniforms.horizon.value.set('#d5e8f1');uniforms.night.value=0;uniforms.rift.value=0;uniforms.sunDirection.value.set(-.45,.78,.35).normalize();
      this.sky.visible=true;this.clouds.visible=true;this.clouds.position.y=-78;this.clouds.material.color.set('#f2f7ff');this.clouds.material.opacity=.48;
      r.scene.background.copy(uniforms.horizon.value);r.scene.fog.color.copy(uniforms.horizon.value);r.scene.fog.near=distance*.65;r.scene.fog.far=distance+22;
      r.ambient.intensity=1.45;r.ambient.color.set('#e6f2ff');r.ambient.groundColor.set('#899cc2');r.sun.intensity=1.65;r.sun.color.set('#fff0d6');
    }
    const direction=uniforms.sunDirection.value;r.sun.position.set(game.pos.x+direction.x*50,game.pos.y+Math.max(.3,Math.abs(direction.y))*70,game.pos.z+direction.z*60);r.sun.target.position.set(game.pos.x,game.pos.y,game.pos.z);
  }
}
