import { World,cellKey,WORLD_LIMIT,WORLD_BOTTOM,WORLD_TOP } from './world.js';
import { ITEMS,BLOCKS,SMELTING,CROPS,CROP_BLOCKS,MATURE_CROPS,TIMBER,craft,hash,dailySeed } from './data.js';
import { freshState,loadState,saveState,importLegacy } from './save.js';
import { ENEMIES,launchBolt,updateEnemies } from './combat.js';
import { movePlayer,requestJump } from './movement.js';
import { overlapsBlock } from './shapes.js';
import { activeEffect,canEat,consumeFood,tickSurvival } from './survival.js';
import { ANIMALS,animalKind } from './wildlife.js';

export class Game {
  constructor(renderer,audio,storage){this.renderer=renderer;this.audio=audio;this.storage=storage;this.keys=new Set();this.screen='menu';this.serial=0;this.touch={x:0,z:0};this.events=[];this.state=loadState(storage)||freshState();this.loadWorld();}
  resetRuntime(){
    this.pos={x:.5,y:7,z:20.5};this.yaw=0;this.pitch=0;this.velocity=0;this.vx=0;this.vz=0;this.grounded=false;this.coyote=0;this.jumpBuffer=0;this.cameraOffset=0;
    this.walk=0;this.moving=false;this.stamina=100;this.flying=false;this.sprinting=false;this.crouching=false;this.target=null;this.attackHeld=false;this.placeHeld=false;this.mineProgress=0;this.mineKey='';
    this.attackCooldown=0;this.hurtCooldown=0;this.dashCooldown=0;this.dashTime=0;this.saveTimer=0;this.stepTimer=0;this.spawnTimer=0;this.cropTimer=0;this.projectiles=[];this.mobs=[];this.keys.clear();this.boss=null;this.slam=null;this.containerKey=null;this.station=null;this.combo=0;this.buildRotation=0;this.placeTimer=0;this.eating=null;this.drawState=null;this.revealTime=0;this.gliding=false;this.regenTimer=0;this.hungerTimer=0;
  }
  loadWorld(){
    this.resetRuntime();this.world=new World(this.state.seed,this.state.edits);
    if(this.state.pos)this.pos={...this.state.pos};
    else{this.pos=this.world.findSpawn();this.state.origin={...this.pos};this.state.spawn={...this.pos};this.state.yaw=hash(this.state.seed,55)*Math.PI*2;}
    this.yaw=this.state.yaw;this.pitch=this.state.pitch;
    if(this.world.intersects(this.pos.x,this.pos.y,this.pos.z))this.pos.y=this.world.ground(this.pos.x,this.pos.z);
    this.state.origin??={...(this.state.spawn||{x:.5,y:7,z:20.5})};this.syncHome();
    this.renderer.setWorld(this.world);for(const drop of this.state.drops)drop.id=++this.serial;this.spawnAmbient();
  }
  syncHome(){
    const p=this.state.spawn||this.state.origin,l={id:'home',name:'Your home',subtitle:'Your starting clearing or last bed',color:'#e3c994',type:'home',...p};
    const i=this.world.landmarks.findIndex(l=>l.id==='home');if(i<0)this.world.landmarks.push(l);else this.world.landmarks[i]=l;
  }
  get held(){return this.state.bar[this.state.selected];}
  get creative(){return this.state.mode==='creative';}
  get maxHp(){return 20;}
  effect(name){return activeEffect(this,name);}
  emit(type,data={}){this.events.push({type,...data});}
  toast(title,text='',kind='normal'){this.emit('toast',{title,text,kind});}
  start(mode='adventure',reset=false){
    let state=reset?null:loadState(this.storage,mode);
    if(!state){state=freshState(mode==='daily'?dailySeed():Math.floor(Math.random()*2147483646)+1,mode);if(mode==='adventure'&&!reset)importLegacy(this.storage,state);}
    this.state=state;this.loadWorld();this.screen=null;this.save();this.toast(this.creative?'Creative world':'Make this place your own',this.creative?'Every material is available in your backpack.':'A new clearing, a new beginning. Gather timber, plant a garden, and build a place to return to.');
  }
  pause(screen='pause'){if(this.screen==='menu')return;this.audio.quiet?.();this.screen=screen;this.drawState=null;this.eating=null;this.attackHeld=false;this.placeHeld=false;this.mineProgress=0;this.keys.clear();this.touch={x:0,z:0};this.save();globalThis.document?.exitPointerLock?.();}
  resume(){this.screen=null;this.keys.clear();this.attackHeld=false;this.placeHeld=false;}
  select(i){this.drawState=null;this.eating=null;this.state.selected=(i+9)%9;this.mineProgress=0;this.audio.play('click');this.emit('hud');}
  equip(name){name=BLOCKS[name]?.drop||name;if(!ITEMS[name]||!this.state.inv[name])return;this.drawState=null;this.eating=null;if(ITEMS[name].kind==='glider'){this.state.glider=name;this.toast('Glider equipped','Press G while airborne. Look down to dive, up to slow your descent.');this.save();return;}if(ITEMS[name].kind==='ammo'){this.state.ammo=name;this.toast(ITEMS[name].name+' selected','Used by your bows and crossbows.');this.save();return;}if(ITEMS[name].kind==='armor'){this.state.armor=name;this.toast('Armor equipped',ITEMS[name].description);}else{const i=this.state.bar.indexOf(name);if(i>=0)this.state.selected=i;else this.state.bar[this.state.selected]=name;}this.save();}
  craft(name){
    if(!craft(this.state.inv,name)){this.toast('More materials needed','The crafting book shows exactly what is missing.');return false;}
    this.state.stats.crafted++;this.audio.play('craft');this.toast(ITEMS[name].name+' crafted','Stored in your backpack.');
    const kind=ITEMS[name].kind;if(['sword','pickaxe','armor','axe','shovel','hoe','bow'].includes(kind)){const i=this.state.bar.findIndex(k=>ITEMS[k].kind===kind);if(i>=0)this.state.bar[i]=name;else if(kind==='armor')this.state.armor=name;}
    this.save();return true;
  }
  smelt(output){
    const recipe=SMELTING.find(r=>r.output===output);
    const station=this.station&&this.world.get(this.station.x,this.station.y,this.station.z);
    if(!recipe||!['furnace','campfire'].includes(station)||station==='campfire'&&(ITEMS[recipe.output].kind!=='food'||recipe.furnaceOnly)||Math.hypot(this.pos.x-this.station.x,this.pos.y-this.station.y,this.pos.z-this.station.z)>6)return false;
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
  heal(item){const ok=consumeFood(this,item);if(ok)this.save();return ok;}
  eat(item=this.held){
    if(this.eating)return false;
    if(!canEat(this,item)){if(!this.state.inv[item])this.toast('No food left','Gather, farm, or cook something in your furnace.');return false;}
    this.drawState=null;this.eating={item,time:.85,total:.85};return true;
  }
  eatAvailable(){
    const held=ITEMS[this.held];if(held?.kind==='food'&&this.state.inv[this.held]>0)return this.eat(this.held);
    const food=Object.keys(this.state.inv).filter(k=>ITEMS[k]?.nutrition&&!ITEMS[k].effect&&canEat(this,k)).sort((a,b)=>Number(!!ITEMS[a].raw)-Number(!!ITEMS[b].raw)||ITEMS[b].saturation-ITEMS[a].saturation)[0];
    if(food)return this.eat(food);this.toast('Equip some food','Select a meal in your backpack, then press F to eat.');return false;
  }
  toggleGlide(){
    if(this.gliding){this.gliding=false;return true;}
    if(!this.state.glider||!this.state.inv[this.state.glider]){this.toast('Equip a hang glider','Craft one with cloth, timber and leather.');return false;}
    if(this.grounded||this.world.waterAt(this.pos.x,this.pos.y+.5,this.pos.z)){this.toast('Find some height','Jump from a hill and press G while airborne.');return false;}
    this.gliding=true;this.flying=false;this.velocity=Math.min(0,this.velocity);this.audio.play('jump');return true;
  }
  releaseAttack(){
    const draw=this.drawState;this.drawState=null;this.attackHeld=false;
    if(draw&&draw.item===this.held&&draw.time>.08)this.attack({release:true,charge:Math.min(1,draw.time/ITEMS[draw.item].drawTime)});
  }
  dropItem(item,count,x,y,z){
    const nearby=this.state.drops.find(d=>d.item===item&&Math.hypot(d.x-x,d.y-y,d.z-z)<1.5);
    if(nearby){nearby.count+=count;nearby.age=0;return;}
    if(this.state.drops.length>=128)this.state.drops.shift();
    this.state.drops.push({id:++this.serial,item,count,x,y:Math.max(-63,this.world.ground(x,z,y+1)+.2),z,age:0});
  }
  updateDrops(dt){
    this.state.drops=this.state.drops.filter(d=>{
      d.age+=dt;if(d.age>600)return false;
      if(d.age>.45&&Math.hypot(d.x-this.pos.x,d.y-this.pos.y,d.z-this.pos.z)<1.8){this.add(d.item,d.count);this.emit('pickup',{item:d.item,count:d.count});return false;}
      return true;
    });
  }
  dash(){if(this.dashCooldown>0||this.stamina<25)return;this.dashTime=.2;this.dashCooldown=1.2;this.stamina-=25;}
  jump(){requestJump(this);}
  save(){this.state.pos={...this.pos};this.state.yaw=this.yaw;this.state.pitch=this.pitch;this.state.edits=[...this.world.edits];const ok=saveState(this.storage,this.state);this.emit('saved',{ok});return ok;}
  nearest(){
    const t=this.target;
    if(t&&['furnace','campfire','bench','chest','bed',...MATURE_CROPS].includes(t.type))return {...t,name:BLOCKS[t.type].name,placed:true};
    let best=null,dist=3;
    for(const c of this.world.chests){if(this.state.opened.includes(c.id))continue;const d=Math.hypot(c.x+.5-this.pos.x,c.z+.5-this.pos.z);if(d<dist&&Math.abs(c.y-this.pos.y)<3){best={...c,type:'supply',name:'Supply chest'};dist=d;}}
    const camp=this.world.landmarks[0];if(!best&&Math.hypot(camp.x-this.pos.x,camp.z-this.pos.z)<2.5)best=camp;return best;
  }
  interact(){
    if(this.keys.has('KeyX')&&ITEMS[this.held]?.place)return this.place();
    if(ITEMS[this.held]?.kind==='hoe'&&['grass','dirt','farmland'].includes(this.target?.type)){this.till();return;}
    if(ITEMS[this.held]?.crop&&this.target?.type==='farmland'){this.plant();return;}
    const n=this.nearest();
    if(n&&MATURE_CROPS.includes(n.type)){this.harvest(n);return;}
    if(n?.type==='supply'){this.state.opened.push(n.id);for(const[k,v]of Object.entries(n.loot))this.add(k,v);this.audio.play('craft');this.toast('Supplies collected','Timber, food and fuel for your first shelter.');this.save();return;}
    if(n?.type==='camp'){this.state.hp=20;this.save();this.toast('Rested at camp','Health restored.');return;}
    if(n?.type==='furnace'||n?.type==='campfire'){this.station=n;this.pause('furnace');this.emit('screen');return;}
    if(n?.type==='bench'){this.pause('craft');this.emit('screen');return;}
    if(n?.type==='chest'){this.containerKey=cellKey(n.x,n.y,n.z);this.state.containers[this.containerKey]??={};this.pause('storage');this.emit('screen');return;}
    if(n?.type==='bed'){this.state.spawn={x:n.x+.5,y:n.y+1,z:n.z+.5};this.syncHome();this.state.hp=20;this.state.time=Math.ceil(this.state.time/600)*600+70;this.toast('Spawn point set','You rested until morning.');this.save();return;}
    if(ITEMS[this.held]?.kind==='food'){this.eat(this.held);return;}if(this.held==='compass'){this.pause('map');this.emit('screen');return;}return this.place();
  }
  till(){
    const t=this.target;if(!t||!['grass','dirt','farmland'].includes(t.type))return false;
    const radius=['iron_hoe','gold_hoe'].includes(this.held)?1:0;let changed=0;
    for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
      const x=t.x+dx,z=t.z+dz,above=this.world.get(x,t.y+1,z);
      if(!['grass','dirt'].includes(this.world.get(x,t.y,z))||above)continue;
      if(this.world.set(x,t.y,z,'farmland'))changed++;
    }
    if(changed){this.renderer.swing=1;this.audio.play('place');this.toast('Garden soil ready','Plant seeds, carrots or potatoes on the soil. Nearby water speeds growth.');}return changed>0;
  }
  plant(){
    const t=this.target,kind=ITEMS[this.held]?.crop,crop=CROPS[kind];
    if(!crop||!t||this.world.get(t.x,t.y,t.z)!=='farmland'||this.world.get(t.x,t.y+1,t.z)||!this.state.inv[this.held])return false;
    if(!this.world.set(t.x,t.y+1,t.z,crop.sprout))return false;
    if(!this.creative)this.state.inv[this.held]--;
    this.state.crops[cellKey(t.x,t.y+1,t.z)]={kind,readyAt:this.state.elapsed+crop.seconds*(this.world.hydrated(t.x,t.y,t.z)?.75:1)};
    this.audio.play('place');this.renderer.swing=1;this.emit('hud');return true;
  }
  growCrops(){
    for(const[key,c]of Object.entries(this.state.crops)){
      const[x,y,z]=key.split(',').map(Number),crop=CROPS[c.kind];
      if(!crop||this.world.get(x,y,z)!==crop.sprout){delete this.state.crops[key];continue;}
      if(this.world.get(x,y-1,z)!=='farmland'){this.world.set(x,y,z,null);delete this.state.crops[key];continue;}
      if(this.state.elapsed>=c.readyAt){if(BLOCKS[crop.mature].solid&&overlapsBlock(crop.mature,x,y,z,this.pos.x,this.pos.y,this.pos.z,1.75,.3))continue;this.world.set(x,y,z,crop.mature);delete this.state.crops[key];}
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
    else if(type==='cane'&&(!['sand','grass','dirt','clay'].includes(this.world.get(x,y-1,z))||!this.world.hydrated(x,y-1,z)))reason='Plant cane on soil near water';
    else if(overlapsBlock(type,x,y,z,this.pos.x,this.pos.y,this.pos.z,this.crouching?1.3:1.75,.3))reason='Move back to place';
    return{x,y,z,type,held,valid:!reason,reason};
  }
  place(bridge=false){
    const p=this.placement(bridge);if(!p?.valid||!this.world.set(p.x,p.y,p.z,p.type))return false;
    if(!this.creative)this.state.inv[p.held]--;this.state.stats.built++;this.audio.play('place',p.type);this.renderer.swing=1;this.emit('hud');return true;
  }
  rotateBuilding(){if(ITEMS[this.held]?.shape!=='stairs')return;this.buildRotation=(this.buildRotation+1)%4;this.audio.play('click');}
  attack({release=false,charge=1}={}){
    if(this.attackCooldown>0||this.eating)return;const item=ITEMS[this.held];
    if(item?.drawTime&&!release){this.drawState??={item:this.held,time:0};return;}
    this.renderer.swing=1;
    if(item?.kind==='food'){this.eat(this.held);this.attackCooldown=.7;return;}
    const dir=this.direction();
    if(item?.kind==='bow'){
      const ammo=(this.state.inv[this.state.ammo]>0||this.creative)?this.state.ammo:this.state.inv.arrows>0?'arrows':null;
      if(!ammo){this.toast('No arrows','Craft arrows and select a stack in your backpack.');this.attackCooldown=.6;return;}
      if(!this.creative)this.state.inv[ammo]--;this.revealTime=4;
      const power=Math.max(1,Math.round(item.damage*(.25+.75*charge*charge)))+(ITEMS[ammo].bonus||0);
      launchBolt(this,{x:this.pos.x,y:this.pos.y+1.5,z:this.pos.z},dir,power,false,{speed:(item.boltSpeed||27)*(.45+.55*charge),gravity:4,slow:ITEMS[ammo].slow||0,color:ITEMS[ammo].color});
      this.attackCooldown=item.cooldown||.45;this.audio.play('shoot');return;
    }
    let nearest=null,dist=3.8;
    for(const m of this.mobs){const info=ENEMIES[m.kind]||ENEMIES.sentinel;const dx=m.x-this.pos.x,dy=m.y+(info.height||1.7)*.6-this.pos.y-1.58,dz=m.z-this.pos.z,along=dx*dir.x+dy*dir.y+dz*dir.z;if(along<0||along>dist||Math.hypot(dx-dir.x*along,dy-dir.y*along,dz-dir.z*along)>.75)continue;const wall=this.world.raycast({x:this.pos.x,y:this.pos.y+1.58,z:this.pos.z},dir,along);if(!wall||wall.distance>along-.6){nearest=m;dist=along;}}
    this.revealTime=4;
    if(nearest){this.hit(nearest,item?.damage||2);this.attackCooldown=.36;}else if(item?.kind==='sword')this.attackCooldown=.36;
  }
  hit(m,power){
    if(!this.mobs.includes(m))return;m.hp-=power;m.flash=.18;m.stun=.18;m.panic=6;m.brain=0;this.revealTime=4;
    this.audio.play('hit');this.renderer.burst(m.x,m.y+(ENEMIES[m.kind]?.height||1.5)*.5,m.z,'#bdb89e',5);this.emit('damageNumber',{mob:m,power});
    if(m.hp<=0){
      this.mobs=this.mobs.filter(v=>v!==m);this.state.stats.kills++;
      const drops=ANIMALS[m.kind]?.drops||{coal:[1,1]};let offset=0;
      for(const[item,[low,high]]of Object.entries(drops)){const count=low+Math.min(high-low,Math.floor(hash(m.id+offset,Math.floor(this.state.elapsed),this.state.seed)*(high-low+1)));this.dropItem(item,count,m.x+offset*.25,m.y,m.z);offset++;}
    }
  }
  hurt(amount){if(this.creative||this.hurtCooldown>0||this.dashTime>0)return;const reduction=1-(ITEMS[this.state.armor]?.reduction||0);this.state.hp=Math.max(0,this.state.hp-amount*reduction);this.hurtCooldown=.7;this.audio.play('hurt');this.emit('hurt');if(this.state.hp<=0){this.state.stats.deaths++;this.pause('death');this.emit('screen');}}
  returnHome(){this.pos={...(this.state.spawn||this.state.origin||{x:.5,y:7,z:20.5})};if(this.world.intersects(this.pos.x,this.pos.y,this.pos.z))this.pos.y=this.world.ground(this.pos.x,this.pos.z);this.velocity=0;this.vx=this.vz=0;this.gliding=false;}
  respawn(){this.state.hp=20;this.state.food=20;this.state.saturation=5;this.state.effects={};this.returnHome();this.projectiles=[];this.mobs=this.mobs.filter(m=>ENEMIES[m.kind]?.passive);this.hurtCooldown=3;this.resume();this.save();}
  spawnMob(x,z,kind='sentinel',y=null){if(kind==='grazer')kind='deer';const info=ENEMIES[kind]||ENEMIES.sentinel;const m={id:++this.serial,x,z,y:y??this.world.ground(x,z),kind,hp:info.hp,maxHp:info.hp,cooldown:1,flash:0,windup:0,stun:0,angle:0,walk:0,wander:hash(x|0,z|0,this.state.seed)*6};this.mobs.push(m);return m;}
  spawnAmbient(){
    for(const[dx,dz]of[[-12,4],[10,11],[-24,-12],[17,-15],[-9,-18],[22,8]]){
      const x=this.pos.x+dx,z=this.pos.z+dz,y=this.world.ground(x,z,this.world.height(x,z)+1);
      if(y>5&&!this.world.waterAt(x,y,z)&&!this.world.intersects(x,y,z,1.6,.4))this.spawnMob(x,z,animalKind(this.world,x,z),y);
    }
  }
  direction(){return{x:-Math.sin(this.yaw)*Math.cos(this.pitch),y:Math.sin(this.pitch),z:-Math.cos(this.yaw)*Math.cos(this.pitch)};}
  update(dt){
    this.renderer.stream(this.pos);if(this.screen)return;
    this.state.time+=dt;this.state.elapsed+=dt;tickSurvival(this,dt);this.updateDrops(dt);for(const k of['attackCooldown','hurtCooldown','dashCooldown','dashTime'])this[k]=Math.max(0,this[k]-dt);
    this.cropTimer+=dt;if(this.cropTimer>1){this.cropTimer=0;this.growCrops();}
    this.move(dt);this.updateMobs(dt);if(this.screen)return;
    this.target=this.world.raycast({x:this.pos.x,y:this.pos.y+(this.crouching?1.15:1.58),z:this.pos.z},this.direction(),6);
    if(this.placeHeld){this.placeTimer-=dt;if(this.placeTimer<=0){this.place();this.placeTimer=.16;}}
    if(this.drawState){if(this.drawState.item!==this.held)this.drawState=null;else this.drawState.time+=dt;}
    if(this.attackHeld){if(['sword','bow','food'].includes(ITEMS[this.held]?.kind))this.attack();else this.mine(dt);}else{this.mineProgress=0;this.mineKey='';}
    for(const l of this.world.landmarks)if(Math.hypot(l.x-this.pos.x,l.z-this.pos.z)<14&&!this.state.discovered.includes(l.id)){this.state.discovered.push(l.id);this.toast(l.name,l.subtitle);}
    this.spawnTimer+=dt;if(this.spawnTimer>14){
      this.spawnTimer=0;this.mobs=this.mobs.filter(m=>Math.hypot(m.x-this.pos.x,m.z-this.pos.z)<85);
      const hostile=!this.creative&&(this.pos.y<-7||this.state.time%600>420),cap=hostile?5:10,group=this.mobs.filter(m=>!!ENEMIES[m.kind]?.passive!==hostile);
      if(group.length<cap&&this.mobs.length<18){const a=hash(Math.floor(this.state.time),this.serial,this.state.seed)*Math.PI*2,x=this.pos.x+Math.sin(a)*22,z=this.pos.z+Math.cos(a)*22,y=this.world.ground(x,z,hostile?this.pos.y+3:this.world.height(x,z)+1);if(Math.abs(y-this.pos.y)<10&&y>-60&&!this.world.waterAt(x,y,z)&&!this.world.intersects(x,y,z,1.7,.4))this.spawnMob(x,z,hostile?(this.pos.y<-25?'brute':'stalker'):animalKind(this.world,x,z,this.serial),y);}
    }
    this.saveTimer+=dt;if(this.saveTimer>15){this.saveTimer=0;this.save();}
  }
  mine(dt){
    const t=this.target;if(!t||!Number.isFinite(BLOCKS[t.type]?.hardness)){this.mineProgress=0;return;}const key=cellKey(t.x,t.y,t.z);if(key!==this.mineKey){this.mineKey=key;this.mineProgress=0;}
    const item=ITEMS[this.held],kind=item?.kind,wood=['wood','birch','pinewood','plank','birch_plank','pine_plank','leaf','pine','autumnleaf','bookshelf','hedge'].includes(BLOCKS[t.type].texture||t.type),soil=['grass','dirt','sand','clay','snow','gravel','farmland'].includes(t.type);
    const correct=kind==='axe'&&wood||kind==='shovel'&&soil||kind==='pickaxe'&&!wood&&!soil;
    this.mineProgress+=dt*(this.creative?40:(correct?item.speed:1)*(this.effect('haste')?1.6:1))/BLOCKS[t.type].hardness;
    if(this.mineProgress>=1){
      if(CROP_BLOCKS.includes(t.type)){this.harvest(t);this.mineProgress=0;return;}
      if(t.type==='chest'){const store=this.state.containers[key]||{};for(const[k,n]of Object.entries(store))this.add(k,n);delete this.state.containers[key];}
      this.world.set(t.x,t.y,t.z,null);this.state.stats.mined++;this.state.exhaustion+=.025;
      if(['leaf','pine','autumnleaf'].includes(t.type)){this.add('leaf');this.add('fiber');if(hash(t.x+t.y,t.z,this.state.seed)<.22)this.add('apple');}else {this.add(BLOCKS[t.type].drop||t.type);if(t.type==='fern'){this.add('fiber',2);this.add('seeds');}}
      this.emit('pickup',{item:BLOCKS[t.type].drop||t.type,count:1});
      this.renderer.burst(t.x+.5,t.y+.5,t.z+.5,BLOCKS[t.type].color,8);this.renderer.swing=1;this.audio.play('mine',t.type);this.mineProgress=0;this.mineKey='';this.emit('hud');
    }
  }
  move(dt){movePlayer(this,dt);}
  updateMobs(dt){updateEnemies(this,dt);}
  moveMob(m,dx,dz){
    const info=ENEMIES[m.kind]||{},height=info.height||1.7,radius=info.radius||.25;
    for(const[a,b]of[[dx,dz],[dx,0],[0,dz]]){
      const x=m.x+a,z=m.z+b,y=this.world.ground(x,z,m.y+1.1);
      if(Math.abs(x)>WORLD_LIMIT-1||Math.abs(z)>WORLD_LIMIT-1||info.passive&&this.world.waterAt(x,y,z))continue;
      if(Math.abs(y-m.y)<=1.2&&!this.world.intersects(x,y,z,height,radius)){m.x=x;m.z=z;m.y=y;m.angle=Math.atan2(a,b);m.walk+=Math.hypot(a,b);return;}
    }
  }
}
