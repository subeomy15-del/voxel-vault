import * as THREE from '../vendor/three.module.js';
import { ITEMS } from './data.js?v=22';
import { icon } from './icons.js?v=22';
import { gliderModel } from './models.js?v=22';
const ORES={moonstone:'#baa1f2',coal:'#a0a6a0',iron:'#dfd8c6',gold:'#f5d67c',diamond:'#9bc8d0'};
const cells=[];for(let x=-14;x<=14;x++)for(let y=-14;y<=14;y++)for(let z=-14;z<=14;z++)if(x*x+y*y+z*z<=196)cells.push([x,y,z]);cells.sort((a,b)=>a[0]**2+a[1]**2+a[2]**2-b[0]**2-b[1]**2-b[2]**2);
export class ViewEffects {
  constructor(r){
    this.r=r;this.textures=new Map();this.drops=new Map();this.scan=null;this.scanKey='';this.scanTime=0;this.wing=null;this.wingName='';
    const oreMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:.65,depthTest:false,depthWrite:false,fog:false});
    oreMaterial.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 vOrePosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOrePosition=position;');
      shader.fragmentShader='varying vec3 vOrePosition;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nvec3 edges=step(vec3(.404),abs(vOrePosition));if(edges.x+edges.y+edges.z<1.5)discard;');
    };
    this.ores=new THREE.InstancedMesh(new THREE.BoxGeometry(.83,.83,.83),oreMaterial,256);this.ores.count=0;this.ores.frustumCulled=false;this.ores.renderOrder=12;r.scene.add(this.ores);this.matrix=new THREE.Matrix4();this.color=new THREE.Color();
  }
  texture(name){
    if(!this.textures.has(name)){const tex=new THREE.TextureLoader().load(new URL('../assets/items/'+name+'.png'+new URL(import.meta.url).search,import.meta.url).href);tex.colorSpace=THREE.SRGBColorSpace;this.textures.set(name,tex);}return this.textures.get(name);
  }
  food(name){return new THREE.Mesh(new THREE.PlaneGeometry(.51,.51),new THREE.MeshLambertMaterial({map:this.texture(name),transparent:true,alphaTest:.12,side:THREE.DoubleSide}));}
  reset(){for(const mesh of this.drops.values())this.r.disposeGroup(mesh);this.drops.clear();this.ores.count=0;this.scan=null;this.scanKey='';this.scanTime=0;}
  update(game,dt){
    const r=this.r,t=game.state.time,ids=new Set();
    for(const d of game.state.drops){ids.add(d.id);let mesh=this.drops.get(d.id);if(!mesh){mesh=new THREE.Sprite(new THREE.SpriteMaterial({map:this.texture(d.item),color:'#ffffff',alphaTest:.1}));mesh.scale.setScalar(.48);r.scene.add(mesh);this.drops.set(d.id,mesh);}mesh.position.set(d.x,d.y+.16+Math.sin(t*2.5+d.id)*.06,d.z);}
    for(const[id,mesh]of this.drops)if(!ids.has(id)){r.disposeGroup(mesh);this.drops.delete(id);}
    if(game.state.glider!==this.wingName){if(this.wing)r.disposeGroup(this.wing);this.wingName=game.state.glider;this.wing=ITEMS[this.wingName]?gliderModel(r,ITEMS[this.wingName]):null;if(this.wing)r.camera.add(this.wing);}
    if(this.wing){const third=Number(r.settings.perspective)>0;if(third){r.player.group.add(this.wing);this.wing.position.set(0,1.5,.8);}else{r.camera.add(this.wing);this.wing.position.set(0,0,0);}this.wing.visible=game.gliding&&!game.screen;this.wing.rotation.z=r.settings.bobbing?Math.sin(t*1.7)*.012+(game.keys.has('KeyA')?.035:game.keys.has('KeyD')?-.035:0):0;}
    this.ores.visible=game.effect('xray')&&!game.screen;this.scanTime-=dt;
    if(!this.ores.visible){this.ores.count=0;this.scan=null;this.scanKey='';return;}
    const p=game.pos,key=[Math.floor(p.x/4),Math.floor(p.y/4),Math.floor(p.z/4),r.epoch,r.revision].join(',');
    if(!this.scan&&(key!==this.scanKey||this.scanTime<=0)){this.scan={x:Math.floor(p.x),y:Math.floor(p.y+1),z:Math.floor(p.z),index:0,found:[]};this.scanKey=key;this.scanTime=1.5;}
    if(this.scan){const s=this.scan,end=Math.min(cells.length,s.index+768);for(;s.index<end;s.index++){const[a,b,c]=cells[s.index],x=s.x+a,y=s.y+b,z=s.z+c,type=game.world.get(x,y,z);if(ORES[type]&&s.found.length<256)s.found.push({x,y,z,type});}
      if(s.index===cells.length){this.ores.count=s.found.length;s.found.forEach((p,i)=>{this.matrix.makeTranslation(p.x+.5,p.y+.5,p.z+.5);this.ores.setMatrixAt(i,this.matrix);this.ores.setColorAt(i,this.color.set(ORES[p.type]));});this.ores.instanceMatrix.needsUpdate=true;if(this.ores.instanceColor)this.ores.instanceColor.needsUpdate=true;this.scan=null;}
    }
  }
}
