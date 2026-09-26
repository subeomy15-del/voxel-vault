import { NETHER_END } from './nether.js?v=38';
import * as THREE from '../vendor/three.module.js';
import { OUTPOSTS } from './expeditions.js?v=38';
import { RIFT_ANCHORS } from './realms.js?v=38';
import { hash } from './data.js?v=38';
import { DRAGON_TOWERS } from './dragon.js?v=38';
export class RiftEffects {
  constructor(r){
    this.r=r;this.root=new THREE.Group();r.scene.add(this.root);this.epoch=-1;this.time={value:0};this.markers=[];
    this.rope=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#d5b97c'}));this.rope.frustumCulled=false;r.scene.add(this.rope);
    this.markerRoot=document.createElement('div');this.markerRoot.id='rift-markers';document.querySelector('#hud').append(this.markerRoot);
    this.portalMaterial=new THREE.ShaderMaterial({uniforms:{time:this.time},transparent:true,side:THREE.DoubleSide,depthWrite:false,blending:THREE.NormalBlending,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 vUv;uniform float time;void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);float swirl=sin(a*5.-r*17.+time*2.6)*.5+.5;float ring=pow(max(0.,1.-abs(r-.85)*7.),2.);float filaments=pow(swirl,7.)*.6;vec3 col=mix(vec3(.19,.22,.24),vec3(.48,.51,.46),swirl*.65+ring*.3);float alpha=(.35+filaments+ring)*smoothstep(1.,.8,r);gl_FragColor=vec4(col,alpha);}`});
  }
  rebuild(g){
    for(const child of [...this.root.children]){child.traverse(o=>{if(o.geometry)this.r.geometryCache.release(o.geometry);if(o.material&&o.material!==this.portalMaterial)o.material.dispose();});child.removeFromParent();}
    this.markerRoot.replaceChildren();this.markers=[];this.anchors=[];this.dragonCrystals=[];this.epoch=this.r.epoch;
    const marker=(label,pos,color)=>{const el=document.createElement('div');el.className='world-marker';el.style.setProperty('--marker-color',color);this.markerRoot.append(el);this.markers.push({label,pos,el});return el;};
    const gate=g.state.gate;
    if(gate&&g.world.get(gate.x,gate.y,gate.z)==='ender_gate'){
      this.portal=new THREE.Mesh(new THREE.PlaneGeometry(2.9,3.75),this.portalMaterial);this.portal.position.set(gate.x+.5,gate.y+2,gate.z+.51);this.root.add(this.portal);
      // Keep portal color on its surface so nearby trees stay green.
      marker(g.state.dimension==='overworld'?'ENTER THE NETHER':g.state.dimension==='ender'?'RETURN TO NETHER':'RETURN HOME',{x:gate.x+.5,y:gate.y+5,z:gate.z+.5},'#c0a6ff');
    }
    if(g.state.dimension==='nether'){const p=NETHER_END;const portal=new THREE.Mesh(new THREE.PlaneGeometry(2.9,3.75),this.portalMaterial);portal.position.set(p.x+.5,p.y+2,p.z+.51);this.root.add(portal);marker('ASHEN FORTRESS · ENDER PORTAL',{x:p.x+.5,y:p.y+8,z:p.z+.5},'#d2aecc');}
    if(g.state.dimension==='overworld')for(const p of g.state.outposts||[]){const def=OUTPOSTS.find(d=>d.id===p.id);if(def&&!g.state.opened.includes('outpost-'+p.id))marker(def.name.toUpperCase(),{x:p.x,y:p.y+10,z:p.z},def.color);}
    if(g.state.dimension==='ender'){
      marker('DRAGON ALTAR',{x:.5,y:22,z:-6.5},'#b6a4ce');
      for(const[x,z]of DRAGON_TOWERS){
        const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.6),new THREE.MeshStandardMaterial({color:'#baa5d4',emissive:'#9470b8',emissiveIntensity:.15,roughness:.5}));crystal.position.set(x+.5,25.5,z+.5);this.root.add(crystal);
        const beam=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#b395d4',transparent:true,opacity:.55}));beam.frustumCulled=false;this.root.add(beam);this.dragonCrystals.push({x,z,crystal,beam});
      }
      for(const a of RIFT_ANCHORS){
        const group=new THREE.Group(),y=g.world.height(a.x,a.z)+1;group.position.set(a.x+.5,y,a.z+.5);
        const pedestal=this.r.part('#494062',1.6,.45,1.6,0,.22,0);group.add(pedestal);
        const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.7),new THREE.MeshStandardMaterial({color:a.color,emissive:a.color,emissiveIntensity:.15,metalness:.25,roughness:.22}));crystal.position.y=2;crystal.scale.y=1.7;group.add(crystal);
        const ring=new THREE.Mesh(new THREE.TorusGeometry(1.1,.035,6,48),new THREE.MeshBasicMaterial({color:a.color,transparent:true,opacity:.8}));ring.rotation.x=Math.PI/2;ring.position.y=1;group.add(ring);
        const beam=new THREE.Mesh(new THREE.CylinderGeometry(.1,.32,28,12,1,true),new THREE.MeshBasicMaterial({color:a.color,transparent:true,opacity:.12,depthWrite:false,blending:THREE.NormalBlending}));beam.position.y=15;group.add(beam);
        const light=new THREE.PointLight(a.color,4,8,1.5);light.position.y=2;group.add(light);this.root.add(group);
        this.anchors.push({id:a.id,group,crystal,ring,beam,light,marker:marker(a.name.toUpperCase(),{x:a.x+.5,y:y+4,z:a.z+.5},a.color)});
      }
      // A distant ringed world sits within the sky sphere, beyond playable terrain.
      this.planet=new THREE.Group();const globe=new THREE.Mesh(new THREE.SphereGeometry(17,40,24),new THREE.MeshStandardMaterial({color:'#635085',emissive:'#33224f',emissiveIntensity:.5,roughness:1,fog:false}));globe.material.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vPlanet;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPlanet=position;');shader.fragmentShader='varying vec3 vPlanet;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat band=sin(vPlanet.y*.7+sin(vPlanet.x*.24)*.7)+sin(vPlanet.y*2.3)*.2;diffuseColor.rgb*=.8+band*.16;');};this.planet.userData.globe=globe;this.planet.add(globe);
      const ring=new THREE.Mesh(new THREE.RingGeometry(22,31,96),new THREE.MeshBasicMaterial({color:'#ad8dd7',side:THREE.DoubleSide,transparent:true,opacity:.2,depthWrite:false,fog:false}));ring.rotation.x=1.48;ring.rotation.y=.08;ring.rotation.z=.25;this.planet.add(ring);this.root.add(this.planet);
    }else this.planet=null;
    const geometry=new THREE.BufferGeometry(),positions=new Float32Array(150*3),colors=new Float32Array(150*3);for(let i=0;i<150;i++){positions[i*3]=(hash(i,3)-.5)*70;positions[i*3+1]=hash(i,5)*22;positions[i*3+2]=(hash(i,7)-.5)*70;const c=new THREE.Color(g.state.dimension==='ender'?(i%3?'#c7a4ff':'#7edee8'):'#e9d7a2');c.toArray(colors,i*3);}geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    this.particles=new THREE.Points(geometry,new THREE.PointsMaterial({size:.085,vertexColors:true,transparent:true,opacity:.65,depthWrite:false,blending:THREE.NormalBlending}));this.root.add(this.particles);
  }
  update(g,dt){
    this.time.value+=dt;if(this.epoch!==this.r.epoch)this.rebuild(g);
    this.root.visible=!g.multiplayer?.competitive&&g.state.mode!=='parkour';if(g.multiplayer?.competitive||g.state.mode==='parkour'){this.rope.visible=false;this.markerRoot.hidden=true;return;}
    this.rope.visible=!!g.grapple&&!g.screen;if(g.grapple){const points=this.rope.geometry.attributes.position;this.rope.position.set(g.pos.x,0,g.pos.z);points.setXYZ(0,.25,g.pos.y+1,0);points.setXYZ(1,g.grapple.x-g.pos.x,g.grapple.y-.4,g.grapple.z-g.pos.z);points.needsUpdate=true;}
    const t=this.time.value;this.markerRoot.hidden=!!g.screen;const high=this.r.options.quality==='high'&&this.r.options.particles!=='off';this.particles.visible=high&&['ender','nether'].includes(g.state.dimension);this.particles.position.set(g.pos.x,g.pos.y-3,g.pos.z);this.particles.rotation.y=t*.012;
    for(const c of this.dragonCrystals){c.crystal.visible=g.world.get(c.x,25,c.z)==='dragon_crystal';c.crystal.rotation.y=t*.6;c.beam.visible=c.crystal.visible&&g.boss?.kind==='dragon';if(c.beam.visible){const p=c.beam.geometry.attributes.position;p.setXYZ(0,c.x+.5,25.5,c.z+.5);p.setXYZ(1,g.boss.x,g.boss.y+1.5,g.boss.z);p.needsUpdate=true;}}
    if(this.planet){this.planet.visible=high;this.planet.position.set(this.r.camera.position.x-63,this.r.camera.position.y+64,this.r.camera.position.z-126);this.planet.userData.globe.rotation.y=t*.006;}
    for(const a of this.anchors){const collected=g.state.rift.collected.includes(a.id);a.crystal.rotation.y=t*.8;a.crystal.position.y=2+Math.sin(t*2)*.15;a.crystal.material.emissiveIntensity=collected?.05:.15;a.ring.rotation.z=t*.3;a.beam.visible=high&&!collected;a.light.intensity=high&&!collected&&Math.hypot(a.group.position.x-g.pos.x,a.group.position.z-g.pos.z)<8?3:0;a.marker.hidden=collected;}
    for(const m of this.markers){const p=this.r.screenPoint(m.pos.x,m.pos.y,m.pos.z),distance=Math.round(Math.hypot(m.pos.x-g.pos.x,m.pos.z-g.pos.z));if(!p||p.x<0||p.x>1||p.y<0||p.y>1){m.el.style.display='none';continue;}m.el.style.display='';m.el.style.left=p.x*100+'%';m.el.style.top=p.y*100+'%';m.el.textContent=m.label+' · '+distance+'m';}
  }
}
