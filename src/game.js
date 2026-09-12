import { World,cellKey,WORLD_LIMIT,WORLD_BOTTOM,WORLD_TOP } from './world.js';
import { ITEMS,BLOCKS,SMELTING,CROPS,TIMBER,craft,hash,dailySeed } from './data.js';
import { freshState,loadState,saveState,importLegacy } from './save.js';
import { ENEMIES,launchBolt,updateEnemies } from './combat.js';
import { movePlayer,requestJump } from './movement.js';
import { overlapsBlock } from './shapes.js';

export class Game {
  constructor(renderer,audio,storage){this.renderer=renderer;this.audio=audio;this.storage=storage;this.keys=new Set();this.screen='menu';this.serial=0;this.touch={x:0,z:0};this.events=[];this.state=loadState(storage)||freshState();this.loadWorld();}
  resetRuntime(){
    this.pos={x:.5,y:7,z:20.5};this.yaw=0;this.pitch=0;this.velocity=0;this.vx=0;this.vz=0;this.grounded=false;this.coyote=0;this.jumpBuffer=0;this.cameraOffset=0;
    this.walk=0;this.moving=false;this.stamina=100;this.flying=false;this.sprinting=false;this.crouching=false;this.target=null;this.attackHeld=false;this.placeHeld=false;this.mineProgress=0;this.mineKey='';
    this.attackCooldown=0;this.hurtCooldown=0;this.dashCooldown=0;this.dashTime=0;this.saveTimer=0;this.stepTimer=0;this.spawnTimer=0;this.cropTimer=0;this.projectiles=[];this.mobs=[];this.keys.clear();this.boss=null;this.slam=null;this.containerKey=null;this.station=null;this.combo=0;this.buildRotation=0;this.placeTimer=0;
  }
  loadWorld(){
    this.resetRuntime();this.world=new World(this.state.seed,this.state.edits);
    if(this.state.pos)this.pos={...this.state.pos};
    else{this.pos=this.world.findSpawn();this.state.origin={...this.pos};this.state.spawn={...this.pos};this.state.yaw=hash(this.state.seed,55)*Math.PI*2;}
    this.yaw=this.state.yaw;this.pitch=this.state.pitch;
    if(this.world.intersects(this.pos.x,this.pos.y,this.pos.z))this.pos.y=this.world.ground(this.pos.x,this.pos.z);
    this.state.origin??={...(this.state.spawn||{x:.5,y:7,z:20.5})};this.syncHome();
    this.renderer.setWorld(this.world);this.spawnAmbient();
  }
  syncHome(){
    const p=this.state.spawn||this.state.origin,l={id:'home',name:'Your home',subtitle:'Your starting clearing or last bed',color:'#e3c994',type:'home',...p};
    const i=this.world.landmarks.findIndex(l=>l.id==='home');if(i<0)this.world.landmarks.push(l);else this.world.landmarks[i]=l;
  }
  get held(){return this.state.bar[this.state.selected];}
  get creative(){return this.state.mode==='creative';}
  get maxHp(){return 20;}
  emit(type,data={}){this.events.push({type,...data});}
  toast(title,text='',kind='normal'){this.emit('toast',{title,text,kind});}
  start(mode='adventure',reset=false){
    let state=reset?null:loadState(this.storage,mode);
    if(!state){state=freshState(mode==='daily'?dailySeed():Math.floor(Math.random()*2147483646)+1,mode);if(mode==='adventure'&&!reset)importLegacy(this.storage,state);}
    this.state=state;this.loadWorld();this.screen=null;this.save();this.toast(this.creative?'Creative world':'Make this place your own',this.creative?'Every material is available in your backpack.':'A new clearing, a new beginning. Gather timber, plant a garden, and build a place to return to.');
  }
  pause(screen='pause'){if(this.screen==='menu')return;this.audio.quiet?.();this.screen=screen;this.attackHeld=false;this.placeHeld=false;this.mineProgress=0;this.keys.clear();this.touch={x:0,z:0};this.save();globalThis.document?.exitPointerLock?.();}
  resume(){this.screen=null;this.keys.clear();this.attackHeld=false;this.placeHeld=false;}
  select(i){this.state.selected=(i+9)%9;this.mineProgress=0;this.audio.play('click');this.emit('hud');}
  equip(name){name=BLOCKS[name]?.drop||name;if(!ITEMS[name]||!this.state.inv[name])return;if(ITEMS[name].kind==='armor'){this.state.armor=name;this.toast('Armor equipped',ITEMS[name].description);}else{const i=this.state.bar.indexOf(name);if(i>=0)this.state.selected=i;else this.state.bar[this.state.selected]=name;}this.save();}
  craft(name){
    if(!craft(this.state.inv,name)){this.toast('More materials needed','The crafting book shows exactly what is missing.');return false;}
    this.state.stats.crafted++;this.audio.play('craft');this.toast(ITEMS[name].name+' crafted','Stored in your backpack.');
    const kind=ITEMS[name].kind;if(['sword','pickaxe','armor','axe','shovel','hoe','bow'].includes(kind)){const i=this.state.bar.findIndex(k=>ITEMS[k].kind===kind);if(i>=0)this.state.bar[i]=name;else if(kind==='armor')this.state.armor=name;}
    this.save();return true;
  }
  smelt(output){
    const recipe=SMELTING.find(r=>r.output===output);
    const station=this.station&&this.world.get(this.station.x,this.station.y,this.station.z);
    if(!recipe||!['furnace','campfire'].includes(station)||station==='campfire'&&ITEMS[recipe.output].kind!=='food'||Math.hypot(this.pos.x-this.station.x,this.pos.y-this.station.y,this.pos.z-this.station.z)>6)return false;
    const fuel=this.state.inv.coal>0?'coal':TIMBER.find(k=>this.state.inv[k]>0);
    if(!fuel||!this.state.inv[recipe.input]){this.toast('Add ore and fuel','A batch uses one ingredient and one coal or timber.');return false;}
    this.state.inv[recipe.input]--;this.state.inv[fuel]--;this.add(recipe.output,recipe.count);this.state.stats.smelted++;this.audio.play('craft');this.save();return true;
  }
  transfer(name,withdraw=false){
    if(!this.containerKey||!ITEMS[name])return false;
    const store=this.state.containers[this.containerKey]??={},source=withdraw?store:this.state.inv,target=withdraw?this.state.inv:store;
    const n=Math.min(64,source[name]||0);if(!n)return false;source[name]-=n;if(withdraw&&!source[name])delete source[name];target[name]=(target[name]||0)+n;this.save();return true;
  }
  add(name,n=1){this.state.inv[name]=(this.state.inv[name]||0)+n;}
  heal(item){if(this.state.hp>=20)return;if(!this.state.inv[item]){this.toast('No food left','Open your backpack or return to camp.');return;}this.state.inv[item]--;this.state.hp=Math.min(20,this.state.hp+(ITEMS[item]?.heal||4));this.audio.play('heal');this.save();}
  dash(){if(this.dashCooldown>0||this.stamina<25)return;this.dashTime=.2;this.dashCooldown=1.2;this.stamina-=25;}
  jump(){requestJump(this);}
  save(){this.state.pos={...this.pos};this.state.yaw=this.yaw;this.state.pitch=this.pitch;this.state.edits=[...this.world.edits];const ok=saveState(this.storage,this.state);this.emit('saved',{ok});return ok;}
  nearest(){
    const t=this.target;
    if(t&&['furnace','campfire','bench','chest','bed','wheat_crop','carrot_crop'].includes(t.type))return {...t,name:BLOCKS[t.type].name,placed:true};
    let best=null,dist=3;
    for(const c of this.world.chests){if(this.state.opened.includes(c.id))continue;const d=Math.hypot(c.x+.5-this.pos.x,c.z+.5-this.pos.z);if(d<dist&&Math.abs(c.y-this.pos.y)<3){best={...c,type:'supply',name:'Supply chest'};dist=d;}}
    const camp=this.world.landmarks[0];if(!best&&Math.hypot(camp.x-this.pos.x,camp.z-this.pos.z)<2.5)best=camp;return best;
  }
  interact(){
    if(this.keys.has('KeyX')&&ITEMS[this.held]?.place)return this.place();
    if(ITEMS[this.held]?.kind==='hoe'&&['grass','dirt','farmland'].includes(this.target?.type)){this.till();return;}
    if(ITEMS[this.held]?.crop&&this.target?.type==='farmland'){this.plant();return;}
    const n=this.nearest();
    if(n&&['wheat_crop','carrot_crop'].includes(n.type)){this.harvest(n);return;}
    if(n?.type==='supply'){this.state.opened.push(n.id);for(const[k,v]of Object.entries(n.loot))this.add(k,v);this.audio.play('craft');this.toast('Supplies collected','Timber, food and fuel for your first shelter.');this.save();return;}
    if(n?.type==='camp'){this.state.hp=20;this.save();this.toast('Rested at camp','Health restored.');return;}
    if(n?.type==='furnace'||n?.type==='campfire'){this.station=n;this.pause('furnace');this.emit('screen');return;}
    if(n?.type==='bench'){this.pause('craft');this.emit('screen');return;}
    if(n?.type==='chest'){this.containerKey=cellKey(n.x,n.y,n.z);this.state.containers[this.containerKey]??={};this.pause('storage');this.emit('screen');return;}
    if(n?.type==='bed'){this.state.spawn={x:n.x+.5,y:n.y+1,z:n.z+.5};this.syncHome();this.state.hp=20;this.state.time=Math.ceil(this.state.time/600)*600+70;this.toast('Spawn point set','You rested until morning.');this.save();return;}
    if(ITEMS[this.held]?.kind==='food'){this.heal(this.held);return;}if(this.held==='compass'){this.pause('map');this.emit('screen');return;}return this.place();
  }
  till(){
    const t=this.target;if(!t||!['grass','dirt','farmland'].includes(t.type))return false;
    const radius=this.held==='iron_hoe'?1:0;let changed=0;
    for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
      const x=t.x+dx,z=t.z+dz,above=this.world.get(x,t.y+1,z);
      if(!['grass','dirt'].includes(this.world.get(x,t.y,z))||above)continue;
      if(this.world.set(x,t.y,z,'farmland'))changed++;
    }
    if(changed){this.renderer.swing=1;this.audio.play('place');this.toast('Garden soil ready','Equip seeds or carrots and use them on the soil.');}return changed>0;
  }
  plant(){
    const t=this.target,kind=ITEMS[this.held]?.crop,crop=CROPS[kind];
    if(!crop||!t||this.world.get(t.x,t.y,t.z)!=='farmland'||this.world.get(t.x,t.y+1,t.z)||!this.state.inv[this.held])return false;
    if(!this.world.set(t.x,t.y+1,t.z,crop.sprout))return false;
    if(!this.creative)this.state.inv[this.held]--;
    this.state.crops[cellKey(t.x,t.y+1,t.z)]={kind,readyAt:this.state.elapsed+crop.seconds};
    this.audio.play('place');this.renderer.swing=1;this.emit('hud');return true;
  }
  growCrops(){
    for(const[key,c]of Object.entries(this.state.crops)){
      const[x,y,z]=key.split(',').map(Number),crop=CROPS[c.kind];
      if(!crop||this.world.get(x,y,z)!==crop.sprout){delete this.state.crops[key];continue;}
      if(this.world.get(x,y-1,z)!=='farmland'){this.world.set(x,y,z,null);delete this.state.crops[key];continue;}
      if(this.state.elapsed>=c.readyAt){this.world.set(x,y,z,crop.mature);delete this.state.crops[key];}
    }
  }
  harvest(t){
    const crop=Object.values(CROPS).find(c=>c.mature===t.type||c.sprout===t.type);if(!crop)return false;
    if(this.world.get(t.x,t.y,t.z)!==t.type||!this.world.set(t.x,t.y,t.z,null))return false;
    const mature=t.type===crop.mature,loot=mature?crop.loot:{[crop.seed]:1};
    for(const[k,n]of Object.entries(loot)){this.add(k,n);this.emit('pickup',{item:k,count:n});}
    delete this.state.crops[cellKey(t.x,t.y,t.z)];if(mature)this.state.stats.harvested++;
    this.renderer.burst(t.x+.5,t.y+.4,t.z+.5,BLOCKS[t.type].color,5);this.audio.play('mine');this.renderer.swing=1;return true;
  }
  placement(bridge=false){
    const held=this.held,item=ITEMS[held];if(!item?.place||!this.state.inv[held])return null;
    let type=held,x,y,z,merge=false;
    if(item.shape==='stairs'){const facing=((Math.round(-this.yaw/(Math.PI/2))+this.buildRotation)%4+4)%4;type=held+['','_e','_s','_w'][facing];}
    if(bridge){x=Math.floor(this.pos.x-Math.sin(this.yaw)*1.3);z=Math.floor(this.pos.z-Math.cos(this.yaw)*1.3);y=Math.floor(this.pos.y)-1;}
    else{
      const t=this.target;if(!t)return null;
      if(item.shape==='slab'&&t.type===held&&t.normal.y>0){x=t.x;y=t.y;z=t.z;type=item.texture;merge=true;}
      else{x=t.x+t.normal.x;y=t.y+t.normal.y;z=t.z+t.normal.z;}
    }
    let reason='';const occupied=this.world.get(x,y,z);
    if(Math.abs(x)>WORLD_LIMIT||Math.abs(z)>WORLD_LIMIT||y<=WORLD_BOTTOM||y>WORLD_TOP-1)reason='Outside build height';
    else if(occupied&&occupied!=='water'&&!merge)reason='Space occupied';
    else if(overlapsBlock(type,x,y,z,this.pos.x,this.pos.y,this.pos.z,this.crouching?1.3:1.75,.3))reason='Move back to place';
    return{x,y,z,type,held,valid:!reason,reason};
  }
  place(bridge=false){
    const p=this.placement(bridge);if(!p?.valid||!this.world.set(p.x,p.y,p.z,p.type))return false;
    if(!this.creative)this.state.inv[p.held]--;this.state.stats.built++;this.audio.play('place',p.type);this.renderer.swing=1;this.emit('hud');return true;
  }
  rotateBuilding(){if(ITEMS[this.held]?.shape!=='stairs')return;this.buildRotation=(this.buildRotation+1)%4;this.audio.play('click');}
  attack(){
    if(this.attackCooldown>0)return;const item=ITEMS[this.held];this.renderer.swing=1;
    if(item?.kind==='food'){this.heal(this.held);this.attackCooldown=.7;return;}
    const dir=this.direction();
    if(item?.kind==='bow'){if(!this.creative&&!this.state.inv.arrows){this.toast('No arrows','Craft arrows with timber and stone.');this.attackCooldown=.6;return;}if(!this.creative)this.state.inv.arrows--;launchBolt(this,{x:this.pos.x,y:this.pos.y+1.5,z:this.pos.z},dir,item.damage,false);this.attackCooldown=item.cooldown||.6;this.audio.play('shoot');return;}
    let nearest=null,dist=3.8;
    for(const m of this.mobs){if(m.kind==='grazer')continue;const dx=m.x-this.pos.x,dy=m.y+1-this.pos.y-1.58,dz=m.z-this.pos.z,along=dx*dir.x+dy*dir.y+dz*dir.z;if(along<0||along>dist||Math.hypot(dx-dir.x*along,dy-dir.y*along,dz-dir.z*along)>.75)continue;const wall=this.world.raycast({x:this.pos.x,y:this.pos.y+1.58,z:this.pos.z},dir,along);if(!wall||wall.distance>along-.6){nearest=m;dist=along;}}
    if(nearest){this.hit(nearest,item?.damage||2);this.attackCooldown=.36;}else if(item?.kind==='sword')this.attackCooldown=.36;
  }
  hit(m,power){if(!this.mobs.includes(m))return;m.hp-=power;m.flash=.18;m.stun=.2;this.audio.play('hit');this.renderer.burst(m.x,m.y+1,m.z,'#afbcb2',7);this.emit('damageNumber',{mob:m,power});if(m.hp<=0){this.mobs=this.mobs.filter(v=>v!==m);this.state.stats.kills++;this.add('coal',1);}}
  hurt(amount){if(this.creative||this.hurtCooldown>0||this.dashTime>0)return;const reduction=this.state.armor==='crystal_armor'?.45:this.state.armor==='armor'?.65:1;this.state.hp=Math.max(0,this.state.hp-amount*reduction);this.hurtCooldown=.7;this.audio.play('hurt');this.emit('hurt');if(this.state.hp<=0){this.state.stats.deaths++;this.pause('death');this.emit('screen');}}
  returnHome(){this.pos={...(this.state.spawn||this.state.origin||{x:.5,y:7,z:20.5})};if(this.world.intersects(this.pos.x,this.pos.y,this.pos.z))this.pos.y=this.world.ground(this.pos.x,this.pos.z);this.velocity=0;this.vx=this.vz=0;}
  respawn(){this.state.hp=20;this.returnHome();this.projectiles=[];this.mobs=this.mobs.filter(m=>m.kind==='grazer');this.hurtCooldown=3;this.resume();this.save();}
  spawnMob(x,z,kind='sentinel',y=null){const info=ENEMIES[kind]||ENEMIES.sentinel;const m={id:++this.serial,x,z,y:y??this.world.ground(x,z),kind,hp:info.hp,maxHp:info.hp,cooldown:1,flash:0,windup:0,stun:0,angle:0,walk:0,wander:hash(x|0,z|0,this.state.seed)*6};this.mobs.push(m);return m;}
  spawnAmbient(){for(const[dx,dz]of[[-12,4],[10,11],[-24,-12]]){const x=this.pos.x+dx,z=this.pos.z+dz,y=this.world.ground(x,z);if(y>5&&!this.world.waterAt(x,y,z))this.spawnMob(x,z,'grazer',y);}}
  direction(){return{x:-Math.sin(this.yaw)*Math.cos(this.pitch),y:Math.sin(this.pitch),z:-Math.cos(this.yaw)*Math.cos(this.pitch)};}
  update(dt){
    this.renderer.stream(this.pos);if(this.screen)return;
    this.state.time+=dt;this.state.elapsed+=dt;for(const k of['attackCooldown','hurtCooldown','dashCooldown','dashTime'])this[k]=Math.max(0,this[k]-dt);
    this.cropTimer+=dt;if(this.cropTimer>1){this.cropTimer=0;this.growCrops();}
    this.move(dt);this.updateMobs(dt);if(this.screen)return;
    this.target=this.world.raycast({x:this.pos.x,y:this.pos.y+(this.crouching?1.15:1.58),z:this.pos.z},this.direction(),6);
    if(this.placeHeld){this.placeTimer-=dt;if(this.placeTimer<=0){this.place();this.placeTimer=.16;}}
    if(this.attackHeld){if(['sword','bow','food'].includes(ITEMS[this.held]?.kind))this.attack();else this.mine(dt);}else{this.mineProgress=0;this.mineKey='';}
    for(const l of this.world.landmarks)if(Math.hypot(l.x-this.pos.x,l.z-this.pos.z)<14&&!this.state.discovered.includes(l.id)){this.state.discovered.push(l.id);this.toast(l.name,l.subtitle);}
    this.spawnTimer+=dt;if(this.spawnTimer>16){this.spawnTimer=0;this.mobs=this.mobs.filter(m=>Math.hypot(m.x-this.pos.x,m.z-this.pos.z)<72);const hostile=!this.creative&&(this.pos.y<-7||this.state.time%600>430);if(this.mobs.length<9){const a=hash(Math.floor(this.state.time),this.serial,this.state.seed)*Math.PI*2,x=this.pos.x+Math.sin(a)*18,z=this.pos.z+Math.cos(a)*18,y=this.world.ground(x,z,this.pos.y+3);if(Math.abs(y-this.pos.y)<4&&!this.world.intersects(x,y,z))this.spawnMob(x,z,hostile?this.pos.y<-25?'brute':'stalker':'grazer',y);}}
    this.saveTimer+=dt;if(this.saveTimer>15){this.saveTimer=0;this.save();}
  }
  mine(dt){
    const t=this.target;if(!t||!Number.isFinite(BLOCKS[t.type]?.hardness)){this.mineProgress=0;return;}const key=cellKey(t.x,t.y,t.z);if(key!==this.mineKey){this.mineKey=key;this.mineProgress=0;}
    const item=ITEMS[this.held],kind=item?.kind,wood=['wood','birch','pinewood','plank','birch_plank','pine_plank','leaf','pine','autumnleaf','bookshelf','hedge'].includes(BLOCKS[t.type].texture||t.type),soil=['grass','dirt','sand','clay','snow','gravel','farmland'].includes(t.type);
    const correct=kind==='axe'&&wood||kind==='shovel'&&soil||kind==='pickaxe'&&!wood&&!soil;
    this.mineProgress+=dt*(this.creative?40:correct?item.speed:1)/BLOCKS[t.type].hardness;
    if(this.mineProgress>=1){
      if(['wheat_crop','carrot_crop','wheat_sprout','carrot_sprout'].includes(t.type)){this.harvest(t);this.mineProgress=0;return;}
      if(t.type==='chest'){const store=this.state.containers[key]||{};for(const[k,n]of Object.entries(store))this.add(k,n);delete this.state.containers[key];}
      this.world.set(t.x,t.y,t.z,null);this.state.stats.mined++;
      if(['leaf','pine','autumnleaf'].includes(t.type)){this.add('leaf');this.add('fiber');if(hash(t.x+t.y,t.z,this.state.seed)<.22)this.add('apple');}else {this.add(BLOCKS[t.type].drop||t.type);if(t.type==='fern'){this.add('fiber',2);this.add('seeds');}}
      this.emit('pickup',{item:BLOCKS[t.type].drop||t.type,count:1});
      this.renderer.burst(t.x+.5,t.y+.5,t.z+.5,BLOCKS[t.type].color,8);this.renderer.swing=1;this.audio.play('mine',t.type);this.mineProgress=0;this.mineKey='';this.emit('hud');
    }
  }
  move(dt){movePlayer(this,dt);}
  updateMobs(dt){updateEnemies(this,dt);}
  moveMob(m,dx,dz){for(const[a,b]of[[dx,dz],[dx,0],[0,dz]]){const x=m.x+a,z=m.z+b,y=this.world.ground(x,z,m.y+1.1);if(Math.abs(y-m.y)<=1.2&&!this.world.intersects(x,y,z,1.7,.25)){m.x=x;m.z=z;m.y=y;m.angle=Math.atan2(a,b);m.walk+=Math.hypot(a,b);return;}}}
}
