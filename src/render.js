import * as THREE from '../vendor/three.module.js';
import { BLOCKS, ITEMS, hash } from './data.js?v=19';
import { CHUNK, WORLD_LIMIT } from './world.js?v=19';
import { ENEMIES } from './combat.js?v=19';
import { textureCanvas,TILE,ATLAS_COLS,ATLAS_WIDTH,ATLAS_HEIGHT } from './textures.js?v=19';
import { Scenery } from './scenery.js?v=19';
import { boxesFor } from './shapes.js?v=19';
import { animalModel,bowModel,arrowModel,toolModel } from './models.js?v=19';
import { itemModel } from './item-model.js?v=19';
import { dragonModel,animateDragon } from './dragon-model.js?v=19';
import { RiftEffects } from './rift-effects.js?v=19';
import { PostProcess } from './post-process.js?v=19';
import { PlayerModel } from './player-model.js?v=19';
import { cameraPosition } from './perspective.js?v=19';
import { ViewEffects } from './view-effects.js?v=19';
export class Renderer {
  constructor(container,settings){
    this.settings=settings;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#b6cddd');this.scene.fog=new THREE.Fog('#b6cddd',62,125);
    this.camera=new THREE.PerspectiveCamera(74,innerWidth/innerHeight,.05,220);this.camera.rotation.order='YXZ';
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setSize(innerWidth,innerHeight);this.renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='high'?1.5:1));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;container.append(this.renderer.domElement);
    this.ambient=new THREE.HemisphereLight('#e1ecff','#525b48',1.3);this.scene.add(this.ambient);this.sun=new THREE.DirectionalLight('#fff6e4',1.8);this.sun.position.set(-40,75,35);this.scene.add(this.sun);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:170});this.sun.shadow.bias=-.0007;this.sun.shadow.normalBias=.04;this.renderer.shadowMap.enabled=settings.quality==='high';this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.scene.add(this.sun.target);
    this.material=new THREE.MeshLambertMaterial({map:this.atlas(),vertexColors:true,alphaTest:.45});this.chunks=new Map();this.queue=[];this.center='';this.decor=new THREE.Group();this.scene.add(this.decor);this.effects=[];this.beacons=[];this.mobMeshes=new Map();this.chestMeshes=new Map();
    this.waterMaterial=new THREE.MeshStandardMaterial({color:'#42a7dd',roughness:.6,metalness:0,transparent:true,opacity:.78,vertexColors:true});
    this.glassMaterial=new THREE.MeshLambertMaterial({color:'#ffffff',transparent:true,opacity:.28,vertexColors:true});
    this.epoch=0;this.revision=0;this.chunkVersions=new Map();this.ready=[];this.inflight=false;this.underground=false;
    this.worker=new Worker(new URL('./terrain-worker.js?v=19',import.meta.url),{type:'module'});
    this.worker.onmessage=({data})=>{if(data.epoch!==this.epoch)return;this.inflight=false;if(data.revision<(this.chunkVersions.get(`${data.cx},${data.cz}`)||0))return;this.ready.push(data);};
    this.worker.onerror=e=>{console.error('Terrain worker failed',e);document.querySelector('#loading').hidden=false;document.querySelector('#loading').textContent='Terrain could not load. Reload the page to try again.';};
    this.projectileMeshes=new Map();
    this.riftEffects=new RiftEffects(this);this.postProcess=new PostProcess(this);this.player=new PlayerModel(this);this.scenery=new Scenery(this);this.viewEffects=new ViewEffects(this);
    this.outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.012,1.012,1.012)),new THREE.LineBasicMaterial({color:'#f7edc5',transparent:true,opacity:.7}));this.outline.visible=false;this.scene.add(this.outline);
    this.cracks=new THREE.Mesh(new THREE.BoxGeometry(1.006,1.006,1.006),new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,opacity:.75}));this.cracks.visible=false;this.scene.add(this.cracks);this.crackStage=-1;this.ghost=null;this.ghostType='';
    this.hand=new THREE.Group();this.camera.add(this.hand);this.scene.add(this.camera);this.hand.position.set(.43,-.4,-.82);this.hand.scale.setScalar(.58);this.swing=0;this.heldName='';
    this.lantern=new THREE.PointLight('#ffdda1',0,12,1.3);this.camera.add(this.lantern);this.torchLights=Array.from({length:4},()=>{const light=new THREE.PointLight('#ffdda1',0,10,1.4);this.scene.add(light);return light;});this.torchTimer=0;
    this.telegraph=new THREE.Mesh(new THREE.RingGeometry(.92,1,64),new THREE.MeshBasicMaterial({color:'#ff856b',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));this.telegraph.rotation.x=-Math.PI/2;this.telegraph.visible=false;this.scene.add(this.telegraph);
    addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
  }
  atlas(){
    const tex=new THREE.CanvasTexture(textureCanvas());tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestMipmapLinearFilter;tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());tex.colorSpace=THREE.SRGBColorSpace;return tex;
  }
  updateCracks(progress){
    const stage=Math.min(5,Math.floor(progress*6));if(stage===this.crackStage)return;this.crackStage=stage;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');c.strokeStyle='#213330';c.lineWidth=1.4;
    for(let i=0;i<3+stage*2;i++){c.beginPath();let x=32,y=31;c.moveTo(x,y);const a=i*2.4;for(let j=0;j<stage+2;j++){x+=Math.cos(a+j*.35)*5;y+=Math.sin(a-j*.3)*5;c.lineTo(x,y);}c.stroke();}
    this.cracks.material.map?.dispose();this.cracks.material.map=new THREE.CanvasTexture(canvas);this.cracks.material.needsUpdate=true;
  }
  setWorld(world){
    this.viewEffects.reset();for(const mesh of this.projectileMeshes.values())this.disposeGroup(mesh);this.projectileMeshes.clear();
    for(const m of this.chunks.values()){this.scene.remove(m);m.traverse(o=>o.geometry?.dispose());}this.chunks.clear();this.queue=[];this.center='';this.ready=[];this.inflight=false;this.epoch++;this.chunkVersions.clear();this.worker.postMessage({type:'init',epoch:this.epoch,seed:world.seed,terrain:world.terrain,dimension:world.dimension,edits:[...world.edits]});
    this.disposeGroup(this.decor);this.decor.clear();this.scene.add(this.decor);this.beacons=[];this.chestMeshes.clear();for(const mesh of this.mobMeshes.values())this.disposeGroup(mesh);this.mobMeshes.clear();
    for(const e of this.effects)this.disposeGroup(e.mesh);this.effects=[];this.world=world;
    for(const c of world.chests){if(c.block)continue;const g=new THREE.Group();g.position.set(c.x+.5,c.y,c.z+.5);g.add(this.part('#876344',.8,.5,.6,0,.25,0),this.part('#b88f51',.86,.16,.66,0,.57,0),this.part('#f7d483',.16,.25,.04,0,.4,.32));this.decor.add(g);this.chestMeshes.set(c.id,g);}

  }
  part(color,w,h,d,x=0,y=0,z=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color}));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;return mesh;}
  blockModel(type,size=1,ghost=false){
    const group=new THREE.Group(),texture=BLOCKS[type].texture||type,id=Object.keys(BLOCKS).indexOf(texture);
    for(const b of boxesFor(type)){
      const geometry=new THREE.BoxGeometry((b[3]-b[0])*size,(b[4]-b[1])*size,(b[5]-b[2])*size),uv=geometry.attributes.uv;
      for(let f=0;f<6;f++){const tile=id*3+(f===2?0:f===3?2:1),u=tile%ATLAS_COLS*TILE/ATLAS_WIDTH,v=1-(Math.floor(tile/ATLAS_COLS)+1)*TILE/ATLAS_HEIGHT;for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,u+(.4+uv.getX(i)*(TILE-.8))/ATLAS_WIDTH,v+(.4+uv.getY(i)*(TILE-.8))/ATLAS_HEIGHT);}}
      const material=ghost?new THREE.MeshBasicMaterial({color:'#a6d1a2',transparent:true,opacity:.22,depthWrite:false}):new THREE.MeshLambertMaterial({map:this.material.map,alphaTest:.4});
      const mesh=new THREE.Mesh(geometry,material);mesh.position.set((b[0]+b[3]-1)*size/2,(b[1]+b[4]-1)*size/2,(b[2]+b[5]-1)*size/2);group.add(mesh);
      if(ghost){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:'#bedca8',transparent:true,opacity:.78}));edges.position.copy(mesh.position);group.add(edges);}
    }
    return group;
  }
  updatePlacement(game){
    const p=!game.screen&&(!game.nearest()||game.keys.has('KeyX'))?game.placement():null;game.preview=p;
    if(!p){if(this.ghost)this.ghost.visible=false;return;}
    if(this.ghostType!==p.type){if(this.ghost)this.disposeGroup(this.ghost);this.ghost=this.blockModel(p.type,1.005,true);this.ghostType=p.type;this.scene.add(this.ghost);}
    this.ghost.visible=true;this.ghost.position.set(p.x+.5,p.y+.5,p.z+.5);this.ghost.traverse(o=>{if(o.material)o.material.color.set(p.valid?'#b6daaa':'#df8d77');});
  }
  disposeGroup(group){group.traverse(o=>{o.geometry?.dispose();if(o.material&&!Array.isArray(o.material))o.material.dispose();});group.removeFromParent();}
  stream(pos){
    const cx=Math.floor(pos.x/16),cz=Math.floor(pos.z/16),underground=pos.y<3,range=underground?2:this.settings.quality==='high'?5:3;
    const enqueue=(x,z,front=false)=>{const k=`${x},${z}`;if(!this.queue.some(q=>q[0]===x&&q[1]===z)){front?this.queue.unshift([x,z]):this.queue.push([x,z]);}};
    if(underground!==this.underground){this.underground=underground;this.center='';this.revision++;for(const k of this.chunks.keys()){this.chunkVersions.set(k,this.revision);enqueue(...k.split(',').map(Number));}}
    const key=cx+','+cz+','+range;
    if(key!==this.center){this.center=key;this.queue=this.queue.filter(([x,z])=>Math.abs(x-cx)<=range&&Math.abs(z-cz)<=range);for(let x=cx-range;x<=cx+range;x++)for(let z=cz-range;z<=cz+range;z++){if(x<-32||x>31||z<-32||z>31)continue;if(!this.chunks.has(`${x},${z}`))enqueue(x,z);}this.queue.sort((a,b)=>(a[0]-cx)**2+(a[1]-cz)**2-(b[0]-cx)**2-(b[1]-cz)**2);for(const[k,m]of this.chunks){const[x,z]=k.split(',').map(Number);if(Math.abs(x-cx)>range+1||Math.abs(z-cz)>range+1){this.scene.remove(m);m.traverse(o=>o.geometry?.dispose());this.chunks.delete(k);}}}
    if(this.world.changes.length){this.worker.postMessage({type:'edits',edits:this.world.changes.splice(0)});this.revision++;}
    for(const k of this.world.dirty){this.chunkVersions.set(k,this.revision);const[x,z]=k.split(',').map(Number);if(Math.abs(x-cx)<=range&&Math.abs(z-cz)<=range)enqueue(x,z,true);}this.world.dirty.clear();
    if(this.ready.length){const data=this.ready.shift(),k=`${data.cx},${data.cz}`;if(data.revision>=(this.chunkVersions.get(k)||0)&&Math.abs(data.cx-cx)<=range+1&&Math.abs(data.cz-cz)<=range+1)this.installChunk(data);}
    if(!this.inflight&&this.queue.length){const[x,z]=this.queue.shift();this.inflight=true;this.worker.postMessage({type:'mesh',epoch:this.epoch,revision:this.revision,cx:x,cz:z,underground:this.underground});}
    if(this.world.columns.size>40000){this.world.columns.clear();this.world.structures.clear();this.world.prepared.clear();this.world.makeCamp();}
  }
  installChunk(data){
    const group=new THREE.Group(),materials={solid:this.material,water:this.waterMaterial,glass:this.glassMaterial};
    for(const[name,attributes]of Object.entries(data.geometry)){if(!attributes.index.length)continue;const geometry=new THREE.BufferGeometry();for(const k of['position','normal','uv','color'])geometry.setAttribute(k,new THREE.BufferAttribute(attributes[k],k==='uv'?2:3));geometry.setIndex(new THREE.BufferAttribute(attributes.index,1));geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,materials[name]);mesh.receiveShadow=true;mesh.castShadow=name==='solid';group.add(mesh);}
    this.scenery.addGroundDetail(group,data.cx,data.cz,this.world);
    const k=`${data.cx},${data.cz}`,old=this.chunks.get(k);if(old){old.removeFromParent();old.traverse(o=>o.geometry?.dispose());}this.scene.add(group);this.chunks.set(k,group);
  }
  makeMob(mob){
    if(mob.kind==='dragon'){const g=dragonModel(this);this.scene.add(g);this.mobMeshes.set(mob.id,g);return g;}
    if(ENEMIES[mob.kind]?.passive){const g=animalModel(this,mob);this.scene.add(g);this.mobMeshes.set(mob.id,g);return g;}
    const g=new THREE.Group(),boss=mob.kind==='guardian',animal=mob.kind==='grazer';const scale=boss?2.3:1;g.scale.setScalar(scale);
    const info=ENEMIES[mob.kind]||ENEMIES.sentinel,base=info.color,light=info.glow;
    g.add(this.part(base,.72,.76,.45,0,.8,0),this.part(light,.55,.5,.48,0,1.42,0));
    g.add(this.part(base,.24,.5,.28,-.23,.25,0),this.part(base,.24,.5,.28,.23,.25,0));
    g.add(this.part(light,.22,.7,.3,-.5,.86,0),this.part(light,.22,.7,.3,.5,.86,0));
    for(const x of [-.16,.16])g.add(this.part(animal?'#2e3e34':'#c6fff1',.12,.09,.03,x,1.47,.25));
    if(!animal){g.add(this.part('#8adde0',.23,.3,.04,0,.9,.25));for(const x of [-.21,.21])g.add(this.part('#d5cda8',.14,.3,.14,x,1.78,0));}
    if(mob.kind==='brute')g.scale.set(1.4,1.3,1.3);if(mob.kind==='wisp')g.scale.set(.7,.8,.7);if(mob.kind==='stalker')g.scale.set(.85,.8,1.1);
    if(mob.kind==='enderling'){g.scale.set(.9,1.15,.9);g.add(this.part(light,.12,.34,.12,-.22,1.93,0),this.part(light,.12,.34,.12,.22,1.93,0));}
    if(mob.kind==='void_archer'){g.scale.set(.86,1.12,.86);g.add(this.part('#b9d1cf',.62,.08,.08,0,1.08,.28),this.part(light,.08,.3,.08,-.32,1.56,-.18),this.part(light,.08,.3,.08,.32,1.56,-.18));}
    if(mob.kind==='frost_howler'){g.scale.set(1.25,1.05,1.2);g.add(this.part(light,.92,.18,.62,0,1.55,-.05),this.part('#f4e9d5',.12,.18,.08,-.18,1.28,.27),this.part('#f4e9d5',.12,.18,.08,.18,1.28,.27));}
    if(animal){g.scale.set(1,.65,1);g.add(this.part(light,.1,.3,.15,-.19,1.78,0),this.part(light,.1,.3,.15,.19,1.78,0));}
    this.scene.add(g);this.mobMeshes.set(mob.id,g);return g;
  }
  setHand(name){if(name===this.heldName)return;this.heldName=name;for(const c of [...this.hand.children])this.disposeGroup(c);const item=ITEMS[name];if(!item)return;
    const g=new THREE.Group();g.rotation.set(-.15,0,-.2);
    if(item.kind==='grapple')g.add(itemModel(this,name));
    else if(['sword','pickaxe','axe','shovel','hoe'].includes(item.kind))g.add(toolModel(this,item,name));
    else if(item.kind==='orb'){const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.2,1),new THREE.MeshStandardMaterial({color:item.color,emissive:item.color,emissiveIntensity:.6,metalness:.3,roughness:.2}));g.add(orb);}
    else if(item.kind==='bow')g.add(bowModel(this,name,item));
    else if(name==='lantern'||name==='torch'){g.add(this.part('#68706a',.25,.04,.21,0,.26,0),this.part('#edc783',.19,.27,.17,0,.1,0),this.part('#68706a',.25,.04,.21,0,-.05,0));for(const x of[-.11,.11])g.add(this.part('#68706a',.025,.3,.025,x,.1,.09));}
    else if(BLOCKS[name]&&!BLOCKS[name].plant)g.add(this.blockModel(name,.38));
    else if(name==='carrot'){g.add(this.part(item.color,.14,.38,.14,0,.08,0),this.part('#7b9958',.22,.17,.05,0,.33,0));g.rotation.z=-.4;}
    else if(item.kind==='food'){const food=itemModel(this,name);food.scale.setScalar(.6);g.add(food);}
    else if(name==='compass'){const dial=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.045,16),new THREE.MeshLambertMaterial({color:'#d8c493'}));dial.rotation.x=Math.PI/2;g.add(dial,this.part('#ac7062',.035,.24,.018,0,0,.03));}
    else g.add(this.part(item.color,.25,.25,.16,0,0,0));
    this.hand.add(g);
  }
  screenPoint(x,y,z){const p=new THREE.Vector3(x,y,z).project(this.camera);return p.z<1?{x:(p.x+1)/2,y:(1-p.y)/2}:null;}
  burst(x,y,z,color='#c3dfae',count=12){for(let i=0;i<count;i++){const mesh=this.part(color,.08+Math.random()*.09,.1,.1,x,y,z);this.scene.add(mesh);this.effects.push({mesh,life:.5+Math.random()*.4,v:new THREE.Vector3((Math.random()-.5)*5,Math.random()*4,(Math.random()-.5)*5)});}while(this.effects.length>160){const e=this.effects.shift();this.disposeGroup(e.mesh);}}
  update(game,dt){
    const t=game.state.time,inCave=game.pos.y<3&&this.world.height(game.pos.x,game.pos.z)>game.pos.y+4&&game.screen!=='menu';
    const menu=game.screen==='menu',perspective=Number(this.settings.perspective)||0;this.hand.visible=!game.screen&&perspective===0;this.outline.visible=!game.screen&&!!(game.mobTarget||game.target);this.lantern.intensity=!game.screen&&(['torch','lantern'].includes(game.held))?9:game.pos.y<2?2:0;
    if(menu){const a=performance.now()*.000012;this.camera.position.set(game.pos.x+34+Math.sin(a)*4,game.pos.y+26,game.pos.z+36);this.camera.lookAt(game.pos.x-9,game.pos.y+1,game.pos.z-12);}
    else{const bob=this.settings.bobbing&&game.moving&&game.grounded?Math.sin(game.walk*10)*.045:0;this.camera.position.set(game.pos.x,game.pos.y+(game.crouching?1.15:1.58)+bob+(game.cameraOffset||0),game.pos.z);const bank=this.settings.bobbing&&game.gliding?Math.max(-.07,Math.min(.07,(game.vx*Math.cos(game.yaw)-game.vz*Math.sin(game.yaw))*.006)):0;this.camera.rotation.set(game.pitch,game.yaw,bank,'YXZ');this.camera.fov+=((game.keys.has('KeyZ')?35:74+(game.gliding?8:game.sprinting?4:0))-this.camera.fov)*Math.min(1,dt*10);this.camera.updateProjectionMatrix();}
    if(!menu&&perspective){
      const eye={x:game.pos.x,y:game.pos.y+(game.crouching?1.15:1.58),z:game.pos.z},forward=game.direction(),sign=perspective===1?-1:1;
      const camera=cameraPosition(game.world,eye,{x:forward.x*sign,y:forward.y*sign,z:forward.z*sign});
      this.camera.position.set(camera.x,camera.y,camera.z);this.camera.lookAt(eye.x,eye.y,eye.z);
      this.player.update(game,camera.distance>.6);
    }else this.player.update(game,false);
    const crosshair=document.querySelector('#crosshair');
    if(perspective===1&&!menu){const d=game.direction(),distance=game.target?.distance||6,p=new THREE.Vector3(game.pos.x+d.x*distance,game.pos.y+1.58+d.y*distance,game.pos.z+d.z*distance).project(this.camera);crosshair.style.left=(p.x+1)*50+'%';crosshair.style.top=(1-p.y)*50+'%';}else{crosshair.style.left='50%';crosshair.style.top='50%';}
    crosshair.style.visibility=perspective===2?'hidden':'visible';
    this.scenery.update(game,inCave);this.updatePlacement(game);this.cracks.visible=!game.screen&&!!game.target&&game.mineProgress>0&&!BLOCKS[game.target.type].plant;if(this.cracks.visible){this.updateCracks(game.mineProgress);this.cracks.position.set(game.target.x+.5,game.target.y+.5,game.target.z+.5);}
    this.outline.scale.set(1,1,1);this.outline.material.color.set(game.mobTarget?'#f2d495':'#f7edc5');
    if(game.mobTarget){const m=game.mobTarget.mob,info=ENEMIES[m.kind],radius=(info.radius||.35)+.15,height=(info.height||1.8)+.12;this.outline.scale.set(radius*2,height,radius*2);this.outline.position.set(m.x,m.y+height/2,m.z);}
    else if(game.target){const height=BLOCKS[game.target.type].shape==='slab'?.5:1;this.outline.scale.y=height;this.outline.position.set(game.target.x+.5,game.target.y+height/2,game.target.z+.5);this.cracks.scale.y=height;this.cracks.position.y=game.target.y+height/2;}
    this.torchTimer-=dt;if(this.torchTimer<=0){this.torchTimer=.5;const torches=[...this.world.edits].filter(([,t])=>t==='torch'||t==='lantern'||t==='campfire').map(([k])=>k.split(',').map(Number)).filter(p=>Math.hypot(p[0]-game.pos.x,p[1]-game.pos.y,p[2]-game.pos.z)<16).sort((a,b)=>Math.hypot(a[0]-game.pos.x,a[2]-game.pos.z)-Math.hypot(b[0]-game.pos.x,b[2]-game.pos.z));this.torchLights.forEach((light,i)=>{light.intensity=torches[i]?8.5+Math.sin(t*7+i)*.4:0;if(torches[i])light.position.set(torches[i][0]+.5,torches[i][1]+1,torches[i][2]+.5);});}this.setHand(game.eating?.item||game.held);this.swing=Math.max(0,this.swing-dt*4);this.hand.rotation.z=-Math.sin(this.swing*Math.PI)*.8;this.hand.rotation.x=-Math.sin(this.swing*Math.PI)*.6-(game.mineProgress>0?Math.sin(performance.now()*.02)*.12:0);this.hand.position.y=-.4+(game.moving?Math.sin(game.walk*10)*.018:0);
    for(const b of this.beacons){b.userData.stone.rotation.y+=dt*.6;b.userData.stone.position.y=Math.sin(t*2+b.position.x)*.13;b.userData.ring.rotation.z+=dt*.2;b.userData.beam.material.opacity=game.state.seals.includes(b.userData.l.id)?.07:.19;}
    for(const [id,mesh]of this.chestMeshes)mesh.children[1].rotation.x=game.state.opened.includes(id)?-.8:0;
    const alive=new Set();for(const mob of game.mobs){
      if(Math.hypot(mob.x-game.pos.x,mob.z-game.pos.z)>82)continue;alive.add(mob.id);const g=this.mobMeshes.get(mob.id)||this.makeMob(mob),animal=g.userData.animal;
      const hop=mob.kind==='rabbit'&&mob.walkSpeed>0?Math.abs(Math.sin(mob.walk*10))*.1:0;
      g.position.set(mob.x,mob.y+hop+(mob.kind==='wisp'?.35+Math.sin(t*3)*.18:0),mob.z);g.rotation.y=mob.angle;
      if(mob.kind==='dragon'){animateDragon(g,mob,t);continue;}
      if(animal){g.userData.legs.forEach((leg,i)=>leg.rotation.x=mob.walkSpeed>0?Math.sin(mob.walk*8+(i%2)*Math.PI)*.45:0);g.userData.head.rotation.x=mob.grazing?.22+Math.sin(t*1.5+mob.id)*.09:0;}
      else{g.children[2].rotation.x=Math.sin(mob.walk*7)*.5;g.children[3].rotation.x=-Math.sin(mob.walk*7)*.5;}
      g.rotation.z=mob.flash>0?Math.sin(mob.flash*70)*.06:0;(animal?g.userData.body:g.children[0])?.material.emissive.set(mob.flash>0?'#89463b':'#000000');
    }
    for(const [id,g]of this.mobMeshes)if(!alive.has(id)){this.disposeGroup(g);this.mobMeshes.delete(id);}
    for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;if(e.life<=0){this.disposeGroup(e.mesh);this.effects.splice(i,1);continue;}e.v.y-=dt*9;e.mesh.position.addScaledVector(e.v,dt);e.mesh.rotation.x+=dt*4;e.mesh.scale.setScalar(Math.min(1,e.life*3));}
    this.telegraph.visible=!!game.slam;if(game.slam){this.telegraph.position.set(game.slam.x,game.slam.y+.04,game.slam.z);this.telegraph.scale.setScalar(game.slam.radius);this.telegraph.material.opacity=.4+Math.sin(performance.now()*.02)*.3;}
    const bolts=new Set();for(const p of game.projectiles){bolts.add(p.id);let mesh=this.projectileMeshes.get(p.id);if(!mesh){mesh=p.hostile?new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.35),new THREE.MeshBasicMaterial({color:'#a7cbe4'})):arrowModel(this,p.color);this.scene.add(mesh);this.projectileMeshes.set(p.id,mesh);}mesh.position.set(p.x,p.y,p.z);mesh.lookAt(p.x+p.vx,p.y+p.vy,p.z+p.vz);}for(const[id,mesh]of this.projectileMeshes)if(!bolts.has(id)){this.disposeGroup(mesh);this.projectileMeshes.delete(id);}
    const draw=game.drawState?Math.min(1,game.drawState.time/ITEMS[game.held].drawTime):0;
    this.hand.position.x=.43-draw*.1;this.hand.position.z=-.82+draw*.16;
    if(game.eating){this.hand.position.set(.16,-.28+Math.sin(game.eating.time*22)*.035,-.53);this.hand.rotation.z=.45;}
    this.hand.visible=!game.screen&&!game.gliding&&perspective===0;
    this.hand.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=game.effect('invisibility')&&game.revealTime<=0?.22:1;}if(o.userData.string){o.userData.string.scale.x=1+draw*1.5;o.userData.arrow.position.x=o.userData.crossbow?0:-.03-draw*.11;o.userData.arrow.visible=game.creative||(game.state.inv[game.state.ammo]||game.state.inv.arrows||0)>0;}});
    this.viewEffects.update(game,dt);
    this.riftEffects.update(game,dt);this.postProcess.render(this.scene,this.camera,game.state.dimension==='ender');
  }
}
export { THREE };
