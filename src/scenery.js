import {habitatInstances} from './visual-habitat.js?v=38';
import {BIOME_DEFINITIONS} from './biome-registry.js?v=38';
import {BIOME_DETAIL} from './biome-detail.js?v=38';
import {ATMOSPHERES} from './atmosphere-profiles.js?v=38';
import * as THREE from '../vendor/three.module.js';
import { hash } from './data.js?v=38';
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
    this.aquaticMaterial=new THREE.MeshLambertMaterial({color:'#ffffff',side:THREE.DoubleSide});
    this.aquaticMaterial.onBeforeCompile=shader=>{
      shader.uniforms.uCurrentTime=this.time;shader.vertexShader='uniform float uCurrentTime;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 root=instanceMatrix[3].xyz;float sway=sin(uCurrentTime*.7+root.x*.3+root.z*.4)*.12;
      transformed.x+=sway*position.y*position.y;transformed.z+=cos(uCurrentTime*.5+root.x*.2)*.07*position.y;`);
    };
    this.aquaticMaterial.userData.shared=true;
    this.scratch=new THREE.Matrix4();this.rotation=new THREE.Quaternion();this.tint=new THREE.Color();
    renderer.waterMaterial.onBeforeCompile=shader=>{
      shader.uniforms.uWaterTime=this.time;shader.vertexShader='attribute float waterDepth;varying float vWaterDepth;varying vec3 vWaterPos;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWaterPos=(modelMatrix*vec4(position,1.)).xyz;vWaterDepth=waterDepth;');
      shader.fragmentShader='uniform float uWaterTime;varying float vWaterDepth;varying vec3 vWaterPos;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float pi=3.14159265;
      vec3 rippleNormal=vec3(sin(vWaterPos.x*pi/8.+vWaterPos.z*pi/16.+uWaterTime*.7)*.085,0.,cos(vWaterPos.z*pi/8.-vWaterPos.x*pi/32.-uWaterTime*.6)*.085);
      normal=normalize(normal+mat3(viewMatrix)*rippleNormal);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      float depthMix=smoothstep(1.,18.,vWaterDepth);
      vec3 depthTint=mix(vec3(.33,.75,.65),vec3(.055,.29,.41),depthMix);
      outgoingLight=mix(outgoingLight,outgoingLight*depthTint*1.7,.55);
      float fresnel=pow(1.-max(dot(normal,normalize(vViewPosition)),0.),4.);
      outgoingLight=mix(outgoingLight,vec3(.46,.66,.72),fresnel*.36);
      float shallow=1.-smoothstep(.4,2.4,vWaterDepth);
      float foam=smoothstep(.68,.94,sin(vWaterPos.x*.785398+vWaterPos.z*.392699+uWaterTime*.6));
      outgoingLight+=vec3(.5,.62,.58)*shallow*foam*.2;
      diffuseColor.a=mix(.3,.72,depthMix)+fresnel*.15;
      #include <opaque_fragment>`);
    };
  }
  addGroundDetail(group,cx,cz,world){
    if(this.owner.underground||world.dimension!=='overworld')return;
    const {ground,water}=habitatInstances(world,cx,cz,this.owner.options.quality);
    const up=new THREE.Vector3(0,1,0);
    for(const [aquatic,points,tall]of[[false,ground,false],[true,water.filter(p=>!p.tall),false],[true,water.filter(p=>p.tall),true]]){
      if(!points.length)continue;
      // Tapered leaf ribbons, with several bends rather than a tall rectangular card.
      const positions=[];
      for(let blade=0;blade<3;blade++)for(let step=0;step<4;step++){
        const angle=blade*Math.PI*2/3,point=(s,side)=>{const t=s/4,w=(1-t)* (aquatic?.09:.055),bend=Math.sin(t*1.8)* (aquatic?.22:.15);return [Math.cos(angle)*bend+Math.sin(angle)*w*side,t*(aquatic?1:.52),Math.sin(angle)*bend-Math.cos(angle)*w*side];};
        const a=point(step,-1),b=point(step,1),c=point(step+1,1),d=point(step+1,-1);positions.push(...a,...b,...c,...a,...c,...d);
      }
      if(tall){
        positions.length=0;
        // Original alternating kelp fronds on a narrow flexible stem.
        for(let s=0;s<10;s++){
          const y=s/10,next=(s+1)/10,x=Math.sin(y*3)*.045,nx=Math.sin(next*3)*.045;
          positions.push(x-.012,y,0,x+.012,y,0,nx+.012,next,0,x-.012,y,0,nx+.012,next,0,nx-.012,next,0);
          const side=s%2?1:-1,tip=x+side*(.14+(s%3)*.025),z=(s%3-1)*.045;
          positions.push(x,y,0,tip,y+.025,z,tip-side*.04,y+.075,z,x,y,0,tip-side*.04,y+.075,z,x,y+.05,0);
        }
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
      const mesh=new THREE.InstancedMesh(geometry,aquatic?this.aquaticMaterial:this.grassMaterial,points.length);
      points.forEach((p,i)=>{this.rotation.setFromAxisAngle(up,p.angle);this.scratch.compose(new THREE.Vector3(p.x-cx*16,p.y,p.z-cz*16),this.rotation,new THREE.Vector3(tall?Math.min(2,p.scale):p.scale,p.scale,tall?Math.min(2,p.scale):p.scale));mesh.setMatrixAt(i,this.scratch);this.tint.set(p.color);mesh.setColorAt(i,this.tint);});
      mesh.position.set(cx*16,0,cz*16);mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.userData.visualHabitat=true;mesh.userData.aquatic=aquatic;group.add(mesh);
    }
  }
  update(game,inCave,dt=1/60){
    const t=game.state.time,phase=t/600*Math.PI*2,elevation=Math.sin(phase),day=THREE.MathUtils.smoothstep(elevation,-.22,.35),dusk=(1-Math.abs(elevation))**5;
    this.time.value=t;this.wind.value=this.owner.settings.bobbing?1:0;
    const uniforms=this.skyUniforms;uniforms.sunDirection.value.set(-Math.cos(phase)*.8,elevation,.25).normalize();uniforms.night.value=1-day;uniforms.rift.value=game.state.dimension==='ender'?1:0;
    const biome=game.world.biome(game.pos.x,game.pos.z),profile=this.atmospheres[biome]||this.atmospheres[BIOME_DEFINITIONS[biome]?.parent]||this.atmospheres.meadow,blend=1-Math.exp(-dt*1.4);
    this.targetZenith.set('#16283e').lerp(profile.day,day);this.targetHorizon.set('#354654').lerp(profile.horizon,day).lerp(this.palette.dusk,dusk*.35);
    uniforms.zenith.value.lerp(this.targetZenith,blend);uniforms.horizon.value.lerp(this.targetHorizon,blend);
    this.sky.visible=!inCave;this.sky.position.copy(this.owner.camera.position);
    this.clouds.visible=!inCave;this.clouds.position.set(game.pos.x+Math.sin(t*.002)*10,0,game.pos.z);this.clouds.material.color.set('#8b9ba5').lerp(profile.cloud,day);this.clouds.material.opacity=.7*day+.22;
    const r=this.owner;r.scene.background.copy(inCave?this.palette.cave:uniforms.horizon.value);r.scene.fog.color.copy(r.scene.background);
    this.clouds.count=r.options.quality==='low'?40:r.options.quality==='medium'?80:120;
    const distance=r.options.renderDistance*16*(BIOME_DETAIL[biome]?.fog||1);r.scene.fog.near=inCave?20:distance*.7;r.scene.fog.far=inCave?45:distance+16;
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
    if(game.state.dimension==='overworld'){
      const wetland=game.world.biome(game.pos.x,game.pos.z)==='marsh';
      r.waterMaterial.color.set(wetland?'#84946d':'#7ec8d0');
      if(game.world.waterAt(r.camera.position.x,r.camera.position.y,r.camera.position.z)){
        this.sky.visible=false;this.clouds.visible=false;
        r.scene.background.set(wetland?'#405e48':'#17567e');r.scene.fog.color.copy(r.scene.background);
        r.scene.fog.near=wetland?2:7;r.scene.fog.far=wetland?17:44;
        r.sun.intensity*=.65;r.ambient.color.set('#aed8d4');
      }
    }
    const direction=uniforms.sunDirection.value;r.sun.position.set(game.pos.x+direction.x*50,game.pos.y+Math.max(.3,Math.abs(direction.y))*70,game.pos.z+direction.z*60);r.sun.target.position.set(game.pos.x,game.pos.y,game.pos.z);
  }
}
