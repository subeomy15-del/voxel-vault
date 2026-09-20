import {GeometryCache,ModelPool} from './model-cache.js?v=34';
import {AutoQuality} from './auto-quality.js?v=34';
import * as THREE from '../vendor/three.module.js';
import { BLOCKS, ITEMS, hash } from './data.js?v=34';
import { ENEMIES } from './combat.js?v=34';
import { textureCanvas,TILE,ATLAS_COLS,ATLAS_WIDTH,ATLAS_HEIGHT } from './textures.js?v=34';
import { Scenery } from './scenery.js?v=34';
import { boxesFor } from './shapes.js?v=34';
import { animalModel,bowModel,arrowModel,toolModel } from './models.js?v=34';
import { itemModel } from './item-model.js?v=34';
import { dragonModel,animateDragon } from './dragon-model.js?v=34';
import { RiftEffects } from './rift-effects.js?v=34';
import { PostProcess } from './post-process.js?v=34';
import { PlayerModel } from './player-model.js?v=34';
import { cameraPosition } from './perspective.js?v=34';
import { ViewEffects } from './view-effects.js?v=34';
import { undeadModel } from './undead-model.js?v=34';
import { ParticlePool } from './particles.js?v=34';
import { CameraMotion } from './camera-motion.js?v=34';
import { FrameBudget,renderOptions } from './render-performance.js?v=34';
import { Diagnostics } from './diagnostics.js?v=34';
import { MovementEffects } from './movement-effects.js?v=34';
export class Renderer {
  constructor(container,settings){
    this.geometryCache=new GeometryCache();this.mobPool=new ModelPool(g=>this.disposeGroup(g));this.projectilePool=new ModelPool(g=>this.disposeGroup(g),50);this.autoQuality=new AutoQuality();this.crosshair=document.querySelector('#crosshair');this.projectedPoint=new THREE.Vector3();this.handMaterials=[];this.bowBindings=[];this.shadowTimer=0;this.diagnostics=new Diagnostics();this.settings=settings;this.options=renderOptions(settings,this.autoQuality.level);this.performance=new FrameBudget();this.cameraMotion=new CameraMotion();this.telemetry={fps:60,frameMs:16.7,drawCalls:0,triangles:0,chunks:0,queued:0,particles:0,pixelRatio:1,quality:this.options.quality,workerMs:0};this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#b6cddd');this.scene.fog=new THREE.Fog('#b6cddd',62,125);
    this.camera=new THREE.PerspectiveCamera(74,innerWidth/innerHeight,.05,220);this.camera.rotation.order='YXZ';
    this.renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});this.renderer.setSize(innerWidth,innerHeight);this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.options.maxPixelRatio));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;this.renderer.info.autoReset=false;container.append(this.renderer.domElement);
    this.ambient=new THREE.HemisphereLight('#e1ecff','#525b48',1.3);this.scene.add(this.ambient);this.sun=new THREE.DirectionalLight('#fff6e4',1.8);this.sun.position.set(-40,75,35);this.scene.add(this.sun);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:170});this.sun.shadow.bias=-.0007;this.sun.shadow.normalBias=.04;this.sun.shadow.autoUpdate=false;this.renderer.shadowMap.enabled=settings.quality==='high';this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.scene.add(this.sun.target);
    this.material=new THREE.MeshStandardMaterial({map:this.atlas(),vertexColors:true,alphaTest:.45,roughness:.94,metalness:.02});this.chunks=new Map();this.queue=[];this.center='';this.decor=new THREE.Group();this.scene.add(this.decor);this.particles=new ParticlePool(this.scene);this.movementEffects=new MovementEffects(this.camera,this.particles);this.effects=this.particles;this.beacons=[];this.mobMeshes=new Map();this.chestMeshes=new Map();
    this.waterMaterial=new THREE.MeshStandardMaterial({color:'#42a7dd',roughness:.6,metalness:0,transparent:true,opacity:.78,vertexColors:true});
    this.glassMaterial=new THREE.MeshLambertMaterial({color:'#ffffff',transparent:true,opacity:.28,vertexColors:true});
    this.epoch=0;this.revision=0;this.chunkVersions=new Map();this.ready=[];this.inflight=false;this.underground=false;
    this.worker=new Worker(new URL('./terrain-worker.js?v=34',import.meta.url),{type:'module'});
    this.worker.onmessage=({data})=>{if(data.epoch!==this.epoch)return;this.inflight=false;this.telemetry.workerMs=data.buildMs||0;if(data.ambientOcclusion!==this.options.ambientOcclusion){if(!this.queue.some(([x,z])=>x===data.cx&&z===data.cz))this.queue.push([data.cx,data.cz]);return;}if(data.revision<(this.chunkVersions.get(`${data.cx},${data.cz}`)||0))return;this.ready.push(data);};
    this.worker.onerror=e=>{console.error('Terrain worker failed',e);document.querySelector('#loading').hidden=false;document.querySelector('#loading').textContent='Terrain could not load. Reload the page to try again.';};
    this.projectileMeshes=new Map();
    this.riftEffects=new RiftEffects(this);this.postProcess=new PostProcess(this);this.player=new PlayerModel(this);this.scenery=new Scenery(this);this.viewEffects=new ViewEffects(this);
    this.outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.012,1.012,1.012)),new THREE.LineBasicMaterial({color:'#f7edc5',transparent:true,opacity:.7}));this.outline.visible=false;this.scene.add(this.outline);
    this.cracks=new THREE.Mesh(new THREE.BoxGeometry(1.006,1.006,1.006),new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,opacity:.75}));this.cracks.visible=false;this.scene.add(this.cracks);this.crackStage=-1;this.ghost=null;this.ghostType='';
    this.hand=new THREE.Group();this.camera.add(this.hand);this.scene.add(this.camera);this.hand.position.set(.43,-.4,-.82);this.hand.scale.setScalar(.58);this.swing=0;this.heldName='';
    this.lantern=new THREE.PointLight('#ffdda1',0,12,1.3);this.camera.add(this.lantern);this.torchLights=Array.from({length:4},()=>{const light=new THREE.PointLight('#ffdda1',0,10,1.4);this.scene.add(light);return light;});this.torchTimer=0;
    this.telegraph=new THREE.Mesh(new THREE.RingGeometry(.92,1,64),new THREE.MeshBasicMaterial({color:'#ff856b',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));this.telegraph.rotation.x=-Math.PI/2;this.telegraph.visible=false;this.scene.add(this.telegraph);
    this.debugElement=document.createElement('output');this.debugElement.id='render-telemetry';this.debugElement.setAttribute('aria-label','Rendering performance');Object.assign(this.debugElement.style,{position:'fixed',top:'72px',left:'12px',zIndex:'50',padding:'9px 12px',border:'1px solid #ffffff26',borderRadius:'9px',color:'#e4faf2',background:'#102126db',font:'11px/1.7 ui-monospace,monospace',whiteSpace:'pre',pointerEvents:'none'});document.body.append(this.debugElement);this.debugTimer=0;this.applySettings(settings);
    addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
  }
  applySettings(settings=this.settings){
    this.settings=settings;const previous=this.options;this.options=renderOptions(settings,this.autoQuality.level);this.center='';
    this.renderer.shadowMap.enabled=!!this.options.shadows;this.postProcess?.setEnabled(this.options.antialias);
    if(previous&&previous.shadows!==this.options.shadows)this.scene.traverse(object=>{for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[])material.needsUpdate=true;});
    const span=this.options.quality==='high'?32:24;Object.assign(this.sun.shadow.camera,{left:-span,right:span,top:span,bottom:-span});this.sun.shadow.camera.updateProjectionMatrix();this.sun.shadow.needsUpdate=true;
    const mapSize=this.options.quality==='low'||this.options.quality==='medium'||this.performance.scale<.9?1024:2048;
    if(this.sun.shadow.mapSize.x!==mapSize){this.sun.shadow.map?.dispose();this.sun.shadow.map=null;this.sun.shadow.mapSize.set(mapSize,mapSize);this.renderer.shadowMap.needsUpdate=true;}
    const pixelRatio=Math.max(.65,Math.min(devicePixelRatio||1,this.options.maxPixelRatio)*this.performance.scale);
    if(Math.abs(this.renderer.getPixelRatio()-pixelRatio)>.02)this.renderer.setPixelRatio(pixelRatio);
    this.particles.configure(this.options.particles,this.performance.scale<.9?.8:1);
    if(this.debugElement)this.debugElement.hidden=!this.options.debugFPS;
    if(previous&&previous.ambientOcclusion!==this.options.ambientOcclusion){this.revision++;const keys=new Set([...this.chunks.keys(),...this.ready.map(data=>`${data.cx},${data.cz}`)]);this.ready=[];for(const key of keys){this.chunkVersions.set(key,this.revision);const[x,z]=key.split(',').map(Number);if(!this.queue.some(entry=>entry[0]===x&&entry[1]===z))this.queue.push([x,z]);}}
    this.settingsSignature=JSON.stringify([settings.quality,settings.renderDistance,settings.shadows,settings.ambientOcclusion,settings.particles,settings.antialias,settings.fov,settings.bobbing,settings.cameraEffects,settings.debugFPS]);
  }
  recordFrame(seconds){this.recordedFrame=seconds;}
  cameraImpulse(kind,strength=1){this.cameraMotion.impulse(kind,strength);}
  atlas(){
    const tex=new THREE.CanvasTexture(textureCanvas());tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestMipmapLinearFilter;tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());tex.colorSpace=THREE.SRGBColorSpace;return tex;
  }
  updateCracks(progress){
    const stage=Math.min(9,Math.floor(progress*10));if(stage===this.crackStage)return;this.crackStage=stage;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');c.strokeStyle='#172027';c.lineWidth=1.2+stage*.16;c.lineJoin='round';c.shadowColor='#e4e5d8';c.shadowBlur=0;c.shadowOffsetX=1;c.shadowOffsetY=1;
    for(let i=0;i<3+stage*2;i++){c.beginPath();let x=32,y=31;c.moveTo(x,y);const a=i*2.4;for(let j=0;j<stage+3;j++){x+=Math.cos(a+j*.35)*5;y+=Math.sin(a-j*.3)*5;c.lineTo(x,y);}c.stroke();}
    this.cracks.material.map?.dispose();this.cracks.material.map=new THREE.CanvasTexture(canvas);this.cracks.material.needsUpdate=true;
  }
  setWorld(world){
    this.viewEffects.reset();this.cameraMotion.reset();this.movementEffects.reset();for(const mesh of this.projectileMeshes.values())this.disposeGroup(mesh);this.projectileMeshes.clear();
    for(const m of this.chunks.values()){this.scene.remove(m);m.traverse(o=>o.geometry?.dispose());}this.chunks.clear();this.queue=[];this.center='';this.ready=[];this.inflight=false;this.epoch++;this.chunkVersions.clear();this.worker.postMessage({type:'init',epoch:this.epoch,seed:world.seed,terrain:world.terrain,dimension:world.dimension,edits:[...world.edits]});
    this.disposeGroup(this.decor);this.decor.clear();this.scene.add(this.decor);this.beacons=[];this.chestMeshes.clear();for(const mesh of this.mobMeshes.values())this.disposeGroup(mesh);this.mobMeshes.clear();
    this.particles.clear();this.fireworks=[];this.world=world;this.torchRevision=-1;
    for(const c of world.chests){if(c.block)continue;const g=new THREE.Group();g.position.set(c.x+.5,c.y,c.z+.5);g.add(this.part('#876344',.8,.5,.6,0,.25,0),this.part('#b88f51',.86,.16,.66,0,.57,0),this.part('#f7d483',.16,.25,.04,0,.4,.32));this.decor.add(g);this.chestMeshes.set(c.id,g);}

  }
  part(color,w,h,d,x=0,y=0,z=0){const geometry=this.geometryCache.acquire(`${w},${h},${d}`,()=>new THREE.BoxGeometry(w,h,d));let material=this.partMaterials?.get(color);if(!material){material=new THREE.MeshLambertMaterial({color});this.partMaterials?.set(color,material);}const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;return mesh;}
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
    const pulse=this.options.cameraEffects?.5+.5*Math.sin(performance.now()*.004):.5;this.ghost.visible=true;this.ghost.position.set(p.x+.5,p.y+.5,p.z+.5);this.ghost.traverse(o=>{if(o.material){o.material.color.set(p.valid?'#b6daaa':'#df8d77');o.material.opacity=o.isLineSegments?.54+pulse*.18:.14+pulse*.07;}});
  }
  disposeGroup(group){const materials=new Set();group.traverse(o=>{if(o.geometry)this.geometryCache.release(o.geometry);for(const material of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(material);});for(const material of materials)material.dispose();group.removeFromParent();}
  stream(pos){
    const cx=Math.floor(pos.x/16),cz=Math.floor(pos.z/16),underground=this.world.dimension==='overworld'&&pos.y<3,range=underground?2:this.options.renderDistance;
    const enqueue=(x,z,front=false)=>{const k=`${x},${z}`;if(!this.queue.some(q=>q[0]===x&&q[1]===z)){front?this.queue.unshift([x,z]):this.queue.push([x,z]);}};
    if(underground!==this.underground){this.underground=underground;this.center='';this.revision++;for(const k of this.chunks.keys()){this.chunkVersions.set(k,this.revision);enqueue(...k.split(',').map(Number));}}
    const key=cx+','+cz+','+range;
    if(key!==this.center){this.center=key;this.queue=this.queue.filter(([x,z])=>Math.abs(x-cx)<=range&&Math.abs(z-cz)<=range);for(let x=cx-range;x<=cx+range;x++)for(let z=cz-range;z<=cz+range;z++){if(!this.chunks.has(`${x},${z}`))enqueue(x,z);}this.queue.sort((a,b)=>(a[0]-cx)**2+(a[1]-cz)**2-(b[0]-cx)**2-(b[1]-cz)**2);for(const[k,m]of this.chunks){const[x,z]=k.split(',').map(Number);if(Math.abs(x-cx)>range+1||Math.abs(z-cz)>range+1){this.scene.remove(m);m.traverse(o=>o.geometry?.dispose());this.chunks.delete(k);}}}
    if(this.world.changes.length){this.worker.postMessage({type:'edits',edits:this.world.changes.splice(0)});this.revision++;}
    for(const k of this.world.dirty){this.chunkVersions.set(k,this.revision);const[x,z]=k.split(',').map(Number);if(Math.abs(x-cx)<=range&&Math.abs(z-cz)<=range)enqueue(x,z,true);}this.world.dirty.clear();
    if(this.ready.length){const data=this.ready.shift(),k=`${data.cx},${data.cz}`;if(data.revision>=(this.chunkVersions.get(k)||0)&&Math.abs(data.cx-cx)<=range+1&&Math.abs(data.cz-cz)<=range+1)this.installChunk(data);}
    if(!this.inflight&&this.queue.length){const[x,z]=this.queue.shift();this.inflight=true;this.worker.postMessage({type:'mesh',epoch:this.epoch,revision:this.revision,cx:x,cz:z,underground:this.underground,ambientOcclusion:this.options.ambientOcclusion});}
    if(this.world.columns.size>80000){this.world.pruneCache(cx,cz,7);}
  }
  installChunk(data){
    const installedAt=performance.now();
    const group=new THREE.Group(),materials={solid:this.material,water:this.waterMaterial,glass:this.glassMaterial};
    for(const[name,attributes]of Object.entries(data.geometry)){if(!attributes.index.length)continue;const geometry=new THREE.BufferGeometry();for(const k of['position','normal','uv','color'])geometry.setAttribute(k,new THREE.BufferAttribute(attributes[k],k==='uv'?2:3));geometry.setIndex(new THREE.BufferAttribute(attributes.index,1));geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,materials[name]);mesh.receiveShadow=true;mesh.userData.terrainCaster=name==='solid';mesh.castShadow=false;group.add(mesh);}
    this.scenery.addGroundDetail(group,data.cx,data.cz,this.world);
    const k=`${data.cx},${data.cz}`,old=this.chunks.get(k);if(old){old.removeFromParent();old.traverse(o=>o.geometry?.dispose());}this.scene.add(group);this.chunks.set(k,group);this.diagnostics.lastChunkInstallMs=performance.now()-installedAt;
  }
  makeMob(mob){
    let group=this.mobPool.take(mob.kind);
    if(group){this.scene.add(group);this.mobMeshes.set(mob.id,group);return group;}
    this.partMaterials=new Map();try{group=this.buildMob(mob);group.userData.poolKey=mob.kind;return group;}finally{this.partMaterials=null;}
  }
  buildMob(mob){
    if(['zombie','husk','skeleton','draugr_knight','spider'].includes(mob.kind)){const g=undeadModel(this,mob);this.scene.add(g);this.mobMeshes.set(mob.id,g);return g;}
    if(mob.kind==='dragon'){const g=dragonModel(this);this.scene.add(g);this.mobMeshes.set(mob.id,g);return g;}
    if(mob.kind==='trader'){const g=new THREE.Group();g.add(this.part('#487c7a',.58,.7,.38,0,.84,0),this.part('#d6b492',.42,.43,.4,0,1.41,0),this.part('#525747',.22,.48,.25,-.16,.28,0),this.part('#525747',.22,.48,.25,.16,.28,0),this.part('#d4b58f',.18,.62,.2,-.38,.82,0),this.part('#d4b58f',.18,.62,.2,.38,.82,0),this.part('#b59962',.67,.12,.58,0,1.65,0),this.part('#bba474',.42,.23,.4,0,1.8,0),this.part('#84674c',.46,.5,.24,0,.87,-.3),this.part('#dec799',.38,.44,.025,0,.78,.205));for(const x of [-.11,.11])g.add(this.part('#34494c',.065,.07,.018,x,1.45,.21));this.scene.add(g);this.mobMeshes.set(mob.id,g);return g;}
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
    if(['grapple','fishing','potion','chart'].includes(item.kind))g.add(itemModel(this,name));
    else if(['sword','pickaxe','axe','shovel','hoe'].includes(item.kind))g.add(toolModel(this,item,name));
    else if(item.kind==='orb'){const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.2,1),new THREE.MeshStandardMaterial({color:item.color,emissive:item.color,emissiveIntensity:.6,metalness:.3,roughness:.2}));g.add(orb);}
    else if(item.kind==='bow')g.add(bowModel(this,name,item));
    else if(name==='lantern'||name==='torch'){g.add(this.part('#68706a',.25,.04,.21,0,.26,0),this.part('#edc783',.19,.27,.17,0,.1,0),this.part('#68706a',.25,.04,.21,0,-.05,0));for(const x of[-.11,.11])g.add(this.part('#68706a',.025,.3,.025,x,.1,.09));}
    else if(BLOCKS[name]&&!BLOCKS[name].plant)g.add(this.blockModel(name,.38));
    else if(name==='carrot'){g.add(this.part(item.color,.14,.38,.14,0,.08,0),this.part('#7b9958',.22,.17,.05,0,.33,0));g.rotation.z=-.4;}
    else if(item.kind==='food'){const food=itemModel(this,name);food.scale.setScalar(.6);g.add(food);}
    else if(name==='compass'){const dial=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.045,16),new THREE.MeshLambertMaterial({color:'#d8c493'}));dial.rotation.x=Math.PI/2;g.add(dial,this.part('#ac7062',.035,.24,.018,0,0,.03));}
    else g.add(this.part(item.color,.25,.25,.16,0,0,0));
    this.hand.add(g);this.handMaterials=[];this.bowBindings=[];this.hand.traverse(o=>{if(o.material){o.material.transparent=true;this.handMaterials.push(o.material);}if(o.userData.string)this.bowBindings.push(o.userData);});this.handOpacity=null;
  }
  screenPoint(x,y,z){const p=new THREE.Vector3(x,y,z).project(this.camera);return p.z<1?{x:(p.x+1)/2,y:(1-p.y)/2}:null;}
  burst(x,y,z,color='#c3dfae',count=12){this.particles.burst(x,y,z,color,count);}
  firework(x,y,z){
    this.fireworks??=[];for(let i=0;i<3;i++)this.fireworks.push({x,y:y+i*.6,z,time:.12+i*.22,color:['#e9bd72','#c88152','#eee0b5'][i]});
  }
  updateShadows(game,dt){
    if(!this.options.shadows)return;
    this.shadowTimer-=dt;if(this.shadowTimer>0)return;this.shadowTimer=this.options.quality==='high'?1/30:1/15;
    const distance=this.options.quality==='high'?38:28;
    for(const[tag,group]of this.chunks){const[cx,cz]=tag.split(',').map(Number);const near=Math.hypot(cx*16+8-game.pos.x,cz*16+8-game.pos.z)<distance;for(const mesh of group.children)if(mesh.userData.terrainCaster)mesh.castShadow=near;}
    this.sun.shadow.needsUpdate=true;
  }
  updateTorches(game,dt){
    this.torchTimer-=dt;if(this.torchTimer>0)return;this.torchTimer=.5;
    const nearest=this.world.edits.lights.nearest(game.pos);
    this.torchLights.forEach((light,index)=>{const point=nearest[index]?.point;light.intensity=point?8.5+Math.sin(game.state.time*7+index)*.4:0;if(point)light.position.set(point.x+.5,point.y+1,point.z+.5);});
  }
  update(game,dt){
    const wallNow=performance.now(),wallDt=this.recordedFrame??(this.lastFrameTime?(wallNow-this.lastFrameTime)/1000:dt);this.recordedFrame=undefined;this.lastFrameTime=wallNow;this.diagnostics.record(wallDt);
    const signature=JSON.stringify([this.settings.quality,this.settings.renderDistance,this.settings.shadows,this.settings.ambientOcclusion,this.settings.particles,this.settings.antialias,this.settings.fov,this.settings.bobbing,this.settings.cameraEffects,this.settings.debugFPS]);
    const adaptive=this.performance.record(wallDt),autoChanged=this.settings.quality==='auto'&&this.autoQuality.record(wallDt,!game.screen&&!this.queue.length);
    if(adaptive||autoChanged||signature!==this.settingsSignature)this.applySettings();
    this.movementEffects.update(game,dt,this.options);const cameraMotion=this.cameraMotion.update(game,dt,this.options);
    const t=game.state.time,inCave=this.world.dimension==='overworld'&&game.pos.y<3&&this.world.height(game.pos.x,game.pos.z)>game.pos.y+4&&game.screen!=='menu';
    const menu=game.screen==='menu',perspective=Number(this.settings.perspective)||0;this.hand.visible=!game.screen&&perspective===0;this.outline.visible=!game.screen&&!!(game.mobTarget||game.target);this.lantern.intensity=!game.screen&&(['torch','lantern'].includes(game.held))?9:game.pos.y<2?2:0;
    if(menu){const a=performance.now()*.000012;this.camera.position.set(game.pos.x+34+Math.sin(a)*4,game.pos.y+26,game.pos.z+36);this.camera.lookAt(game.pos.x-9,game.pos.y+1,game.pos.z-12);}
    else{this.camera.position.set(game.pos.x,game.pos.y+cameraMotion.eyeHeight+cameraMotion.y+(game.cameraOffset||0),game.pos.z);this.camera.rotation.set(game.pitch+cameraMotion.pitch,game.yaw,cameraMotion.roll,'YXZ');if(Math.abs(this.camera.fov-cameraMotion.fov)>.015){this.camera.fov=cameraMotion.fov;this.camera.updateProjectionMatrix();}}
    if(!menu&&perspective){
      const eye={x:game.pos.x,y:game.pos.y+cameraMotion.eyeHeight,z:game.pos.z},forward=game.direction(),sign=perspective===1?-1:1;
      const camera=cameraPosition(game.world,eye,{x:forward.x*sign,y:forward.y*sign,z:forward.z*sign});
      this.camera.position.set(camera.x,camera.y,camera.z);this.camera.lookAt(eye.x,eye.y,eye.z);
      this.player.update(game,camera.distance>.6);
    }else this.player.update(game,false);
    const crosshair=this.crosshair;
    if(perspective===1&&!menu){const d=game.direction(),distance=game.target?.distance||6,p=this.projectedPoint.set(game.pos.x+d.x*distance,game.pos.y+1.58+d.y*distance,game.pos.z+d.z*distance).project(this.camera);crosshair.style.left=(p.x+1)*50+'%';crosshair.style.top=(1-p.y)*50+'%';}else{crosshair.style.left='50%';crosshair.style.top='50%';}
    crosshair.style.visibility=perspective===2?'hidden':'visible';
    this.scenery.update(game,inCave,dt);this.updateShadows(game,dt);this.updatePlacement(game);this.cracks.visible=!game.screen&&!!game.target&&game.mineProgress>0&&!BLOCKS[game.target.type].plant;if(this.cracks.visible){this.updateCracks(game.mineProgress);this.cracks.position.set(game.target.x+.5,game.target.y+.5,game.target.z+.5);}
    this.outline.scale.set(1,1,1);this.outline.material.color.set(game.mobTarget?'#f2d495':'#f7edc5');this.outline.material.opacity=.48+(this.options.cameraEffects?Math.sin(t*3)*.07:0);
    if(game.mobTarget){const m=game.mobTarget.mob,info=ENEMIES[m.kind],radius=(info.radius||.35)+.15,height=(info.height||1.8)+.12;this.outline.scale.set(radius*2,height,radius*2);this.outline.position.set(m.x,m.y+height/2,m.z);}
    else if(game.target){const height=BLOCKS[game.target.type].shape==='slab'?.5:1;this.outline.scale.y=height;this.outline.position.set(game.target.x+.5,game.target.y+height/2,game.target.z+.5);this.cracks.scale.y=height;this.cracks.position.y=game.target.y+height/2;}
    this.updateTorches(game,dt);this.setHand(game.eating?.item||game.held);this.swing=Math.max(0,this.swing-dt*4);this.hand.rotation.z=-Math.sin(this.swing*Math.PI)*.8;this.hand.rotation.x=-Math.sin(this.swing*Math.PI)*.6-(game.mineProgress>0?Math.sin(performance.now()*.02)*.12:0);this.hand.position.y=-.4+(this.options.bobbing&&this.options.cameraEffects&&game.moving?Math.sin(game.walk*10)*.018:0);
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
    for(const [id,g]of this.mobMeshes)if(!alive.has(id)){this.mobPool.release(g.userData.poolKey,g);this.mobMeshes.delete(id);}
    for(const f of this.fireworks||[]){f.time-=dt;if(f.time<=0&&!f.done){f.done=true;this.particles.firework(f.x,f.y,f.z,f.color);}}
    this.fireworks=(this.fireworks||[]).filter(f=>!f.done);this.particles.update(dt);
    this.telegraph.visible=!!game.slam;if(game.slam){this.telegraph.position.set(game.slam.x,game.slam.y+.04,game.slam.z);this.telegraph.scale.setScalar(game.slam.radius);this.telegraph.material.opacity=.4+Math.sin(performance.now()*.02)*.3;}
    const bolts=new Set();for(const p of game.projectiles){bolts.add(p.id);let mesh=this.projectileMeshes.get(p.id);if(!mesh){const key=p.hostile?'hostile':p.color;mesh=this.projectilePool.take(key)||(p.hostile?new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.35),new THREE.MeshBasicMaterial({color:'#a7cbe4'})):arrowModel(this,p.color));mesh.userData.poolKey=key;this.scene.add(mesh);this.projectileMeshes.set(p.id,mesh);}mesh.position.set(p.x,p.y,p.z);mesh.lookAt(p.x+p.vx,p.y+p.vy,p.z+p.vz);}for(const[id,mesh]of this.projectileMeshes)if(!bolts.has(id)){this.projectilePool.release(mesh.userData.poolKey,mesh);this.projectileMeshes.delete(id);}
    const draw=game.drawState?Math.min(1,game.drawState.time/game.drawDuration()):0;
    this.hand.position.x=.43-draw*.1;this.hand.position.z=-.82+draw*.16;
    if(game.eating){this.hand.position.set(.16,-.28+Math.sin(game.eating.time*22)*.035,-.53);this.hand.rotation.z=.45;}
    this.hand.visible=!game.screen&&!game.gliding&&perspective===0&&game.state.dimension!=='parkour';
    const opacity=game.effect('invisibility')&&game.revealTime<=0?.22:1;if(opacity!==this.handOpacity){for(const material of this.handMaterials)material.opacity=opacity;this.handOpacity=opacity;}for(const binding of this.bowBindings){binding.string.scale.x=1+draw*1.5;binding.arrow.position.x=binding.crossbow?0:-.03-draw*.11;binding.arrow.visible=game.creative||(game.state.inv[game.state.ammo]||game.state.inv.arrows||0)>0;}
    this.viewEffects.update(game,dt);
    this.riftEffects.update(game,dt);this.renderer.info.reset();this.postProcess.render(this.scene,this.camera,game.state.dimension==='ender');
    Object.assign(this.telemetry,{fps:this.performance.fps,frameMs:this.performance.frameMs,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,chunks:this.chunks.size,queued:this.queue.length+(this.inflight?1:0),particles:this.particles.count,pixelRatio:this.renderer.getPixelRatio(),quality:this.options.quality,adaptive:this.performance.scale<1});
    this.debugTimer-=dt;if(this.options.debugFPS&&this.debugTimer<=0){this.debugTimer=.25;const stats=this.telemetry;this.debugElement.textContent=`${Math.round(stats.fps)} FPS · ${stats.frameMs.toFixed(1)} ms\n${stats.drawCalls} draws · ${(stats.triangles/1000).toFixed(1)}k triangles\n${stats.chunks} chunks · ${stats.queued} queued · worker ${stats.workerMs.toFixed(1)} ms\n${stats.particles} particles · ${stats.pixelRatio.toFixed(2)}× resolution${stats.adaptive?' · adaptive':''}\nF3 · hide performance`;if(this.diagnostics.development){const d=this.diagnostics.snapshot(this,game);this.debugElement.textContent+=`\np95 ${d.p95Ms.toFixed(1)} ms · install ${d.chunkInstallMs.toFixed(2)} ms\n${d.entities} entities · ${d.meshes} meshes · ${d.materials} materials\n${d.geometries} geometries · ${d.textures} textures · heap ${d.heapBytes?(d.heapBytes/1048576).toFixed(1)+' MB':'unavailable'}\nSave ${d.save.status} · ${(d.save.durationMs||0).toFixed(2)} ms · ${((d.save.bytes||0)/1024).toFixed(0)} KB`;}}
  }
}
export { THREE };
