import * as THREE from '../vendor/three.module.js';
import { BLOCKS, ITEMS, hash } from './data.js';
import { CHUNK, WORLD_LIMIT } from './world.js';
import { ENEMIES } from './combat.js';
const faces=[
  {n:[1,0,0],v:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]],shade:.83},
  {n:[-1,0,0],v:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]],shade:.7},
  {n:[0,1,0],v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],shade:1},
  {n:[0,-1,0],v:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],shade:.55},
  {n:[0,0,1],v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],shade:.9},
  {n:[0,0,-1],v:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]],shade:.76},
];
const types=Object.keys(BLOCKS), typeIds=Object.fromEntries(types.map((t,i)=>[t,i+1]));
export class Renderer {
  constructor(container,settings){
    this.settings=settings;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#b6cddd');this.scene.fog=new THREE.Fog('#b6cddd',62,125);
    this.camera=new THREE.PerspectiveCamera(74,innerWidth/innerHeight,.05,220);this.camera.rotation.order='YXZ';
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setSize(innerWidth,innerHeight);this.renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='high'?1.5:1));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;container.append(this.renderer.domElement);
    this.ambient=new THREE.HemisphereLight('#e1ecff','#525b48',1.3);this.scene.add(this.ambient);this.sun=new THREE.DirectionalLight('#fff6e4',1.8);this.sun.position.set(-40,75,35);this.scene.add(this.sun);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:170});this.sun.shadow.bias=-.0007;this.sun.shadow.normalBias=.04;this.renderer.shadowMap.enabled=settings.quality==='high';this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.scene.add(this.sun.target);
    this.material=new THREE.MeshLambertMaterial({map:this.atlas(),vertexColors:true});this.chunks=new Map();this.queue=[];this.center='';this.decor=new THREE.Group();this.scene.add(this.decor);this.effects=[];this.beacons=[];this.mobMeshes=new Map();this.chestMeshes=new Map();
    this.waterMaterial=new THREE.MeshStandardMaterial({color:'#4d819c',roughness:.2,metalness:.18,transparent:true,opacity:.7,vertexColors:true});
    this.glassMaterial=new THREE.MeshLambertMaterial({color:'#b1d0d6',transparent:true,opacity:.28,vertexColors:true});
    this.epoch=0;this.revision=0;this.chunkVersions=new Map();this.ready=[];this.inflight=false;this.underground=false;
    this.worker=new Worker(new URL('./terrain-worker.js',import.meta.url),{type:'module'});
    this.worker.onmessage=({data})=>{if(data.epoch!==this.epoch)return;this.inflight=false;if(data.revision<(this.chunkVersions.get(`${data.cx},${data.cz}`)||0))return;this.ready.push(data);};
    this.worker.onerror=e=>{console.error('Terrain worker failed',e);document.querySelector('#loading').hidden=false;document.querySelector('#loading').textContent='Terrain could not load. Reload the page to try again.';};
    this.projectileMeshes=new Map();
    this.clouds=new THREE.Group();const cloudMat=new THREE.MeshLambertMaterial({color:'#f3f6f4',transparent:true,opacity:.8});
    for(let i=0;i<22;i++){const cloud=new THREE.Mesh(new THREE.BoxGeometry(10+hash(i,4)*20,1.3,3+hash(i,8)*6),cloudMat);cloud.position.set(hash(i,9)*340-170,80+hash(i,3)*20,hash(i,6)*340-170);this.clouds.add(cloud);}this.scene.add(this.clouds);
    this.outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.012,1.012,1.012)),new THREE.LineBasicMaterial({color:'#f7edc5',transparent:true,opacity:.7}));this.outline.visible=false;this.scene.add(this.outline);
    this.hand=new THREE.Group();this.camera.add(this.hand);this.scene.add(this.camera);this.hand.position.set(.43,-.4,-.82);this.hand.scale.setScalar(.58);this.swing=0;this.heldName='';
    this.lantern=new THREE.PointLight('#ffdda1',0,12,1.3);this.camera.add(this.lantern);this.torchLights=Array.from({length:4},()=>{const light=new THREE.PointLight('#ffdda1',0,10,1.4);this.scene.add(light);return light;});this.torchTimer=0;
    this.telegraph=new THREE.Mesh(new THREE.RingGeometry(.92,1,64),new THREE.MeshBasicMaterial({color:'#ff856b',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));this.telegraph.rotation.x=-Math.PI/2;this.telegraph.visible=false;this.scene.add(this.telegraph);
    addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
  }
  atlas(){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');this.tiles={};let idx=0;
    for(const type of types){this.tiles[type]=[];for(let side=0;side<3;side++){
      const tx=idx%16*16,ty=Math.floor(idx/16)*16;this.tiles[type].push([tx/256,1-(ty+16)/256]);idx++;
      ctx.fillStyle=type==='grass'&&side!==0?BLOCKS.dirt.color:['iron','gold','copper','coal','diamond','crystal'].includes(type)?'#858a89':BLOCKS[type].color;ctx.fillRect(tx,ty,16,16);
      for(let j=0;j<34;j++){ctx.fillStyle=hash(j,idx)>.5?'#ffffff0b':'#0000000e';ctx.fillRect(tx+Math.floor(hash(j,7+idx)*15),ty+Math.floor(hash(j,90+idx)*15),1+Math.floor(hash(j,10)*3),1+Math.floor(hash(j,20)*2));}
      if(type==='grass'&&side===1){ctx.fillStyle=BLOCKS.grass.color;ctx.fillRect(tx,ty,16,4);for(let a=0;a<16;a+=3)ctx.fillRect(tx+a,ty+4,3,hash(a,3)*3);}
      if(['wood','birch','pinewood','plank','birch_plank','pine_plank','bench'].includes(type)){ctx.fillStyle='#382b242a';for(let a=3;a<16;a+=4)ctx.fillRect(tx+(type==='wood'?a:0),ty+(type==='wood'?0:a),type==='wood'?1:16,type==='wood'?16:1);}
      if(['iron','gold','crystal','copper','coal','diamond'].includes(type)){ctx.fillStyle=type==='crystal'?'#d1fff1':type==='gold'?'#e9c574':type==='copper'?'#c49979':type==='coal'?'#343a3c':type==='diamond'?'#85c9cb':'#cfb7a0';for(let j=0;j<6;j++)ctx.fillRect(tx+2+Math.floor(hash(j,idx)*10),ty+2+Math.floor(hash(idx,j)*10),3,3);}
      if(['ruin','stonebrick','brick','tile','furnace'].includes(type)){ctx.fillStyle='#354d362b';ctx.fillRect(tx,ty,16,1);ctx.fillRect(tx,ty+8,16,1);ctx.fillRect(tx+8,ty,1,8);ctx.fillRect(tx+3,ty+8,1,8);}
      if(type==='ladder'){ctx.fillStyle='#4b4431';ctx.fillRect(tx,ty,16,16);ctx.fillStyle='#c2a16a';ctx.fillRect(tx+2,ty,2,16);ctx.fillRect(tx+12,ty,2,16);for(let j=2;j<16;j+=5)ctx.fillRect(tx+2,ty+j,12,2);}if(type==='birch'){ctx.fillStyle='#4d514b';for(let j=2;j<16;j+=5)ctx.fillRect(tx+(j%3)*3,ty+j,5,1);}if(type==='torch'||type==='lantern'){ctx.fillStyle='#63472f';ctx.fillRect(tx,ty+7,16,9);ctx.fillStyle='#fff0bb';ctx.fillRect(tx+4,ty+1,8,5);}
    }}
    const tex=new THREE.CanvasTexture(canvas);tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestMipmapLinearFilter;tex.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());tex.colorSpace=THREE.SRGBColorSpace;return tex;
  }
  setWorld(world){
    for(const m of this.chunks.values()){this.scene.remove(m);m.traverse(o=>o.geometry?.dispose());}this.chunks.clear();this.queue=[];this.center='';this.ready=[];this.inflight=false;this.epoch++;this.chunkVersions.clear();this.worker.postMessage({type:'init',epoch:this.epoch,seed:world.seed,edits:[...world.edits]});
    this.disposeGroup(this.decor);this.decor.clear();this.scene.add(this.decor);this.beacons=[];this.chestMeshes.clear();for(const mesh of this.mobMeshes.values())this.disposeGroup(mesh);this.mobMeshes.clear();
    for(const e of this.effects)this.disposeGroup(e.mesh);this.effects=[];this.world=world;
    for(const c of world.chests){const g=new THREE.Group();g.position.set(c.x+.5,c.y,c.z+.5);g.add(this.part('#876344',.8,.5,.6,0,.25,0),this.part('#b88f51',.86,.16,.66,0,.57,0),this.part('#f7d483',.16,.25,.04,0,.4,.32));this.decor.add(g);this.chestMeshes.set(c.id,g);}
    // Wildflowers are instanced, keeping dense ground detail inexpensive.
    const flowerMat=new THREE.MeshLambertMaterial({color:'#e9d5a1'}),petals=new THREE.InstancedMesh(new THREE.BoxGeometry(.14,.12,.14),flowerMat,700);let count=0;const matrix=new THREE.Matrix4();
    for(let i=0;i<1500&&count<700;i++){const x=Math.floor(hash(i,31,world.seed)*120-60),z=Math.floor(hash(i,65,world.seed)*110-50),y=world.height(x,z)+1;if(world.biome(x,z)==='desert'||world.get(x,y,z)||world.get(x,y-1,z)!=='grass'||y<4)continue;matrix.makeTranslation(x+.5,y+.2,z+.5);petals.setMatrixAt(count++,matrix);}petals.count=count;this.decor.add(petals);
  }
  part(color,w,h,d,x=0,y=0,z=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color}));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;return mesh;}
  disposeGroup(group){group.traverse(o=>{o.geometry?.dispose();if(o.material&&!Array.isArray(o.material))o.material.dispose();});group.removeFromParent();}
  stream(pos){
    const cx=Math.floor(pos.x/16),cz=Math.floor(pos.z/16),underground=pos.y<3,range=underground?2:this.settings.quality==='high'?4:3;
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
    const k=`${data.cx},${data.cz}`,old=this.chunks.get(k);if(old){old.removeFromParent();old.traverse(o=>o.geometry?.dispose());}this.scene.add(group);this.chunks.set(k,group);
  }
  makeMob(mob){
    const g=new THREE.Group(),boss=mob.kind==='guardian',animal=mob.kind==='grazer';const scale=boss?2.3:1;g.scale.setScalar(scale);
    const info=ENEMIES[mob.kind]||ENEMIES.sentinel,base=info.color,light=info.glow;
    g.add(this.part(base,.72,.76,.45,0,.8,0),this.part(light,.55,.5,.48,0,1.42,0));
    g.add(this.part(base,.24,.5,.28,-.23,.25,0),this.part(base,.24,.5,.28,.23,.25,0));
    g.add(this.part(light,.22,.7,.3,-.5,.86,0),this.part(light,.22,.7,.3,.5,.86,0));
    for(const x of [-.16,.16])g.add(this.part(animal?'#2e3e34':'#c6fff1',.12,.09,.03,x,1.47,.25));
    if(!animal){g.add(this.part('#8adde0',.23,.3,.04,0,.9,.25));for(const x of [-.21,.21])g.add(this.part('#d5cda8',.14,.3,.14,x,1.78,0));}
    if(mob.kind==='brute')g.scale.set(1.4,1.3,1.3);if(mob.kind==='wisp')g.scale.set(.7,.8,.7);if(mob.kind==='stalker')g.scale.set(.85,.8,1.1);if(animal){g.scale.set(1,.65,1);g.add(this.part(light,.1,.3,.15,-.19,1.78,0),this.part(light,.1,.3,.15,.19,1.78,0));}
    this.scene.add(g);this.mobMeshes.set(mob.id,g);return g;
  }
  setHand(name){if(name===this.heldName)return;this.heldName=name;for(const c of [...this.hand.children])this.disposeGroup(c);const item=ITEMS[name];if(!item)return;
    const g=new THREE.Group();g.rotation.set(-.15,0,-.2);
    if(item.kind==='sword'){g.add(this.part('#745b3f',.09,.25,.09,0,-.18,0),this.part('#c4ad74',.32,.07,.11,0,-.04,0),this.part(item.color,.14,.68,.065,0,.31,0));}
    else if(['pickaxe','axe','shovel'].includes(item.kind)){g.add(this.part('#98744c',.08,.68,.08,0,.02,0),this.part(item.color,item.kind==='axe'?.32:.5,.16,.1,.05,.36,0));if(item.kind==='pickaxe')g.add(this.part(item.color,.1,.17,.1,-.23,.29,0));}
    else if(item.kind==='bow'){g.add(this.part(item.color,.07,.68,.08,.12,.1,0),this.part('#eee1c3',.015,.65,.015,-.07,.1,0),this.part(item.color,.22,.06,.06,.04,.42,0),this.part(item.color,.22,.06,.06,.04,-.21,0));}
    else g.add(this.part(item.color,.32,.32,.32,0,0,0));this.hand.add(g);
  }
  burst(x,y,z,color='#c3dfae',count=12){for(let i=0;i<count;i++){const mesh=this.part(color,.08+Math.random()*.09,.1,.1,x,y,z);this.scene.add(mesh);this.effects.push({mesh,life:.5+Math.random()*.4,v:new THREE.Vector3((Math.random()-.5)*5,Math.random()*4,(Math.random()-.5)*5)});}while(this.effects.length>160){const e=this.effects.shift();this.disposeGroup(e.mesh);}}
  update(game,dt){
    const t=game.state.time,light=.7+.3*Math.cos((t%600-150)/600*Math.PI*2);this.sun.intensity=light*1.8;this.scene.background.setRGB(.42+light*.16,.57+light*.18,.69+light*.17);const inCave=game.pos.y<3&&this.world.height(game.pos.x,game.pos.z)>game.pos.y+4&&game.screen!=='menu';if(inCave){this.scene.background.set('#131d25');this.sun.intensity=.06;}this.ambient.intensity=inCave?.4:1.3;this.scene.fog.near=inCave?18:62;this.scene.fog.far=inCave?42:125;this.scene.fog.color.copy(this.scene.background);this.clouds.position.set(game.pos.x+Math.sin(t*.003)*8,0,game.pos.z);this.sun.position.set(game.pos.x-35,game.pos.y+65,game.pos.z+28);this.sun.target.position.set(game.pos.x,game.pos.y,game.pos.z);
    const menu=game.screen==='menu';this.hand.visible=!game.screen;this.outline.visible=!game.screen&&!!game.target;this.lantern.intensity=!game.screen&&(['torch','lantern'].includes(game.held))?9:game.pos.y<2?2:0;
    if(menu){const a=performance.now()*.000012;this.camera.position.set(34+Math.sin(a)*4,32,40);this.camera.lookAt(-16,10,-9);}
    else{const bob=this.settings.bobbing&&game.moving&&game.grounded?Math.sin(game.walk*10)*.045:0;this.camera.position.set(game.pos.x,game.pos.y+(game.crouching?1.15:1.58)+bob+(game.cameraOffset||0),game.pos.z);this.camera.rotation.set(game.pitch,game.yaw,0,'YXZ');this.camera.fov+=((game.keys.has('KeyZ')?35:74+(game.sprinting?4:0))-this.camera.fov)*Math.min(1,dt*10);this.camera.updateProjectionMatrix();}
    if(game.target)this.outline.position.set(game.target.x+.5,game.target.y+.5,game.target.z+.5);
    this.torchTimer-=dt;if(this.torchTimer<=0){this.torchTimer=.5;const torches=[...this.world.edits].filter(([,t])=>t==='torch'||t==='lantern').map(([k])=>k.split(',').map(Number)).filter(p=>Math.hypot(p[0]-game.pos.x,p[1]-game.pos.y,p[2]-game.pos.z)<16).sort((a,b)=>Math.hypot(a[0]-game.pos.x,a[2]-game.pos.z)-Math.hypot(b[0]-game.pos.x,b[2]-game.pos.z));this.torchLights.forEach((light,i)=>{light.intensity=torches[i]?9:0;if(torches[i])light.position.set(torches[i][0]+.5,torches[i][1]+1,torches[i][2]+.5);});}this.setHand(game.held);this.swing=Math.max(0,this.swing-dt*4);this.hand.rotation.z=-Math.sin(this.swing*Math.PI)*.8;this.hand.rotation.x=-Math.sin(this.swing*Math.PI)*.6;this.hand.position.y=-.4+(game.moving?Math.sin(game.walk*10)*.018:0);
    for(const b of this.beacons){b.userData.stone.rotation.y+=dt*.6;b.userData.stone.position.y=Math.sin(t*2+b.position.x)*.13;b.userData.ring.rotation.z+=dt*.2;b.userData.beam.material.opacity=game.state.seals.includes(b.userData.l.id)?.07:.19;}
    for(const [id,mesh]of this.chestMeshes)mesh.children[1].rotation.x=game.state.opened.includes(id)?-.8:0;
    const alive=new Set();for(const mob of game.mobs){alive.add(mob.id);const g=this.mobMeshes.get(mob.id)||this.makeMob(mob);g.position.set(mob.x,mob.y+(mob.kind==='wisp'?.35+Math.sin(t*3)*.18:0),mob.z);g.rotation.y=mob.angle;g.children[2].rotation.x=Math.sin(mob.walk*7)*.5;g.children[3].rotation.x=-Math.sin(mob.walk*7)*.5;g.rotation.z=mob.flash>0?Math.sin(mob.flash*70)*.06:0;g.children[0].material.emissive.set(mob.flash>0?'#89463b':'#000000');}
    for(const [id,g]of this.mobMeshes)if(!alive.has(id)){this.disposeGroup(g);this.mobMeshes.delete(id);}
    for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.life-=dt;if(e.life<=0){this.disposeGroup(e.mesh);this.effects.splice(i,1);continue;}e.v.y-=dt*9;e.mesh.position.addScaledVector(e.v,dt);e.mesh.rotation.x+=dt*4;e.mesh.scale.setScalar(Math.min(1,e.life*3));}
    this.telegraph.visible=!!game.slam;if(game.slam){this.telegraph.position.set(game.slam.x,game.slam.y+.04,game.slam.z);this.telegraph.scale.setScalar(game.slam.radius);this.telegraph.material.opacity=.4+Math.sin(performance.now()*.02)*.3;}
    const bolts=new Set();for(const p of game.projectiles){bolts.add(p.id);let mesh=this.projectileMeshes.get(p.id);if(!mesh){mesh=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,p.hostile?.35:.6),new THREE.MeshBasicMaterial({color:p.hostile?'#a7cbe4':'#c9b38a'}));this.scene.add(mesh);this.projectileMeshes.set(p.id,mesh);}mesh.position.set(p.x,p.y,p.z);mesh.lookAt(p.x+p.vx,p.y+p.vy,p.z+p.vz);}for(const[id,mesh]of this.projectileMeshes)if(!bolts.has(id)){this.disposeGroup(mesh);this.projectileMeshes.delete(id);}
    this.renderer.render(this.scene,this.camera);
  }
}
export { THREE };
