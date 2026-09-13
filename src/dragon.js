export const DRAGON_HP=260;
export const DRAGON_ALTAR={x:0,y:19,z:-7};
export const DRAGON_TOWERS=[[-8,-8],[8,-8],[-8,8],[8,8]];
export function installDragonArena(g){
 g.state.dragon??={active:false,hp:DRAGON_HP,defeated:false,wins:0,kit:false,arena:false};
 if(g.state.dimension!=='ender')return;
 const w=g.world,s=g.state.dragon;
 if(!s.arena){
  const put=(x,y,z,type)=>{if(!w.edits.has(`${x},${y},${z}`))w.set(x,y,z,type);};
  for(const[x,z]of DRAGON_TOWERS){for(let y=19;y<25;y++)put(x,y,z,'obsidian');put(x,25,z,'dragon_crystal');}
  put(0,19,-7,'dragon_altar');s.arena=true;
 }
 w.landmarks.push({id:'dragon',name:'Dragon Altar',subtitle:'Press E at the altar to challenge the dragon',...DRAGON_ALTAR,type:'landscape',color:'#b5a3df'});
 if(s.active&&!g.mobs.some(m=>m.kind==='dragon'))spawnDragon(g);
}
function spawnDragon(g){
 const m=g.spawnMob(0,-12,'dragon',29);m.hp=g.state.dragon.hp;m.stage='circle';m.stageTime=0;m.flight=0;m.cooldown=2;g.boss=m;return m;
}
export function summonDragon(g){
 const s=g.state.dragon,a=DRAGON_ALTAR;
 if(g.state.dimension!=='ender'||s.active||Math.hypot(g.pos.x-a.x-.5,g.pos.y-a.y,g.pos.z-a.z-.5)>4||g.world.get(a.x,a.y,a.z)!=='dragon_altar')return false;
 s.active=true;s.hp=DRAGON_HP;
 if(!s.kit){s.kit=true;g.add('longbow');g.add('arrows',64);g.state.bar[1]='longbow';g.state.ammo='arrows';}
 spawnDragon(g);g.audio.play('warning');g.toast('ENDER DRAGON AWAKENED','Destroy the four healing crystals. Use your bow in flight and your sword when it lands.','reward');g.save();return true;
}
export function defeatDragon(g,m){
 const s=g.state.dragon;s.active=false;s.hp=0;s.wins++;g.boss=null;g.slam=null;g.projectiles=g.projectiles.filter(p=>!p.hostile);
 if(!s.defeated){s.defeated=true;g.add('dragon_egg');g.add('moonstone',16);g.add('relic_shard',10);}
 g.renderer.burst(m.x,m.y+2,m.z,'#bda6ed',70);g.audio.play('reward');g.toast('ENDER DRAGON DEFEATED',s.wins===1?'Dragon Egg +16 Moonstone +10 Relic Shards. Take your trophy home!':'Dragon defeated again. Your first victory trophy is saved.','reward');g.emit('dragonDefeated');g.save();
}
export function updateDragon(g,m,dt,launchBolt){
 if(g.creative)return;
 if(Math.hypot(g.pos.x,g.pos.z)>34){m.stageTime=0;m.stage='circle';return;}
 m.stageTime+=dt;m.flight+=dt;m.cooldown-=dt;m.phase=m.hp<DRAGON_HP*.4?2:1;
 const duration={circle:7,breath:4,swoop:4,perch:8},next={circle:'breath',breath:'swoop',swoop:'perch',perch:'circle'};
 if(m.stageTime>=duration[m.stage]){m.stage=next[m.stage];m.stageTime=0;m.cooldown=1;
  if(m.stage==='swoop'){m.from={x:m.x,z:m.z};const d=Math.hypot(g.pos.x,g.pos.z);m.to={x:g.pos.x/Math.max(1,d/11),z:g.pos.z/Math.max(1,d/11)};}
  if(m.stage==='breath')g.emit('warning',{text:'DRAGON BREATH — KEEP MOVING'});
  if(m.stage==='swoop')g.emit('warning',{text:'SWOOP — DODGE TO THE SIDE'});
  if(m.stage==='perch')g.emit('warning',{text:'DRAGON LANDED — STRIKE NOW'});
 }
 let x=m.x,y=m.y,z=m.z;
 if(m.stage==='circle'){const a=m.flight*.28;x=Math.sin(a)*13;z=Math.cos(a)*13;y=29+Math.sin(a*2)*1.5;}
 if(m.stage==='breath'){y=27;m.angle=Math.atan2(g.pos.x-m.x,g.pos.z-m.z);
  if(m.cooldown<=0){const origin={x:m.x,y:m.y+1.5,z:m.z};launchBolt(g,origin,{x:g.pos.x-m.x,y:g.pos.y+.8-origin.y,z:g.pos.z-m.z},3,true,{speed:13,color:'#b68ae5'});m.cooldown=m.phase===2?.45:.75;g.audio.play('shoot');}
 }
 if(m.stage==='swoop'){const f=m.stageTime/4;x=m.from.x+(m.to.x-m.from.x)*f;z=m.from.z+(m.to.z-m.from.z)*f;y=26-Math.sin(f*Math.PI)*6;}
 if(m.stage==='perch'){x=0;z=5;y=19;m.angle=Math.atan2(g.pos.x-m.x,g.pos.z-m.z);
  if(m.cooldown<=0){g.slam={x:m.x,y:19,z:m.z,radius:4,time:1.4};m.cooldown=3.3;g.emit('warning',{text:'TAIL SLAM — STEP BACK'});}
 }
 const blend=Math.min(1,dt*(m.stage==='perch'?2:4));
 const nx=m.x+(x-m.x)*blend,ny=m.y+(y-m.y)*blend,nz=m.z+(z-m.z)*blend;
 if(!g.world.intersects(nx,ny,nz,2.3,1.5)){if(m.stage==='circle'||m.stage==='swoop')m.angle=Math.atan2(nx-m.x,nz-m.z);m.x=nx;m.y=ny;m.z=nz;}
 if(m.stage==='swoop'&&Math.hypot(g.pos.x-m.x,g.pos.z-m.z)<2.5&&Math.abs(g.pos.y-m.y)<3)g.hurt(5);
 const crystals=DRAGON_TOWERS.filter(([x,z])=>g.world.get(x,25,z)==='dragon_crystal').length;m.crystals=crystals;
 m.hp=Math.min(DRAGON_HP,m.hp+crystals*.35*dt);g.state.dragon.hp=m.hp;
}
