import { ANIMALS,updateAnimal } from './wildlife.js?v=31';
import { visibleBetween,findMobPath } from './navigation.js?v=31';
import { updateDragon } from './dragon.js?v=31';
import { EntityIndex } from './entity-index.js?v=31';

export const ENEMIES = {
  zombie:{name:'Zombie',hp:22,speed:1.65,damage:4,color:'#667554',glow:'#8c9373',xp:20,drops:{coal:[1,2]}},
  husk:{name:'Husk',hp:28,speed:1.5,damage:5,color:'#948264',glow:'#b7a07a',xp:24,drops:{coal:[1,2]}},
  skeleton:{name:'Skeleton',hp:18,speed:1.8,damage:4,color:'#c9c2aa',glow:'#dfd8be',xp:24,drops:{arrows:[3,6]}},
  draugr_knight:{name:'Draugr Knight',hp:76,speed:1.7,damage:8,color:'#646e6a',glow:'#aaa184',xp:70,drops:{knight_heart:[1,2],iron_ingot:[1,2]}},
  spider:{name:'Marsh Spider',hp:16,speed:3.4,damage:3,color:'#4c5140',glow:'#87916d',height:.8,radius:.65,xp:20,drops:{fiber:[2,4]}},
  dragon: {name:'Ender Dragon',hp:420,speed:7,damage:5,color:'#383442',glow:'#c6a5ff',radius:3.6,height:2.7,xp:300},
  sentinel: { name:'Grove sentinel', hp:18, speed:1.8, damage:3, color:'#66817c', glow:'#c1e9b2', xp:18 },
  stalker: { name:'Ember prowler', hp:14, speed:3.2, damage:3, color:'#a06443', glow:'#ffd38a', xp:20 },
  wisp: { name:'Frost wisp', hp:14, speed:1.7, damage:3, color:'#82afc2', glow:'#cef5ff', xp:22 },
  brute: { name:'Ruinbreaker', hp:38, speed:1.1, damage:6, color:'#7e718e', glow:'#e2b4ff', xp:32 },
  enderling: { name:'Enderling', hp:24, speed:2.5, damage:4, color:'#624b77', glow:'#d5a4ee', xp:28 },
  void_archer: { name:'Void archer', hp:16, speed:1.45, damage:4, color:'#3e536c', glow:'#8dd5e6', xp:34 },
  frost_howler: { name:'Frost howler', hp:30, speed:1.3, damage:5, color:'#657a86', glow:'#c9e4f0', xp:40 },
  guardian: { name:'Vault guardian', hp:180, speed:1.6, damage:6, color:'#687b70', glow:'#a8efd9', xp:180 },
  grazer: { name:'Wild grazer', hp:5, speed:.45, damage:0, color:'#b9976e', glow:'#ead4a5', xp:0 },
};
Object.assign(ENEMIES,ANIMALS);
export function targetMob(game,reach=4){
  const origin={x:game.pos.x,y:game.pos.y+(game.crouching?1.15:1.58),z:game.pos.z},dir=game.direction();let best=null;
  for(const mob of game.mobs){
    const info=ENEMIES[mob.kind]||ENEMIES.sentinel,r=(info.radius||.35)+.15,h=info.height||1.8;
    let near=0,far=best?.distance??reach;
    for(const axis of ['x','y','z']){
      const low=axis==='y'?mob.y:mob[axis]-r,high=axis==='y'?mob.y+h+.12:mob[axis]+r;
      if(Math.abs(dir[axis])<1e-8){if(origin[axis]<low||origin[axis]>high){far=-1;break;}continue;}
      let a=(low-origin[axis])/dir[axis],b=(high-origin[axis])/dir[axis];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);
    }
    if(near>far||far<0)continue;
    const point={x:origin.x+dir.x*near,y:origin.y+dir.y*near,z:origin.z+dir.z*near};
    if(visibleBetween(game.world,origin,point))best={mob,distance:near,point};
  }return best;
}
export function launchBolt(game, origin, direction, damage=3, hostile=true,options={}) {
  if(game.projectiles.length>=50)return;
  const len=Math.hypot(direction.x,direction.y,direction.z)||1, speed=options.speed||(hostile?8:27);
  game.projectiles.push({id:++game.serial,x:origin.x,y:origin.y,z:origin.z,vx:direction.x/len*speed,vy:direction.y/len*speed,vz:direction.z/len*speed,damage,hostile,gravity:options.gravity||0,slow:options.slow||0,color:options.color||'#c9b38a',life:hostile?4:4});
}
function shootAtPlayer(game,m,spread=0) {
  const origin={x:m.x,y:m.y+(m.kind==='guardian'?2.4:(m.kind==='void_archer'||m.kind==='skeleton')?1.8:1.15),z:m.z};
  const dx=game.pos.x-origin.x,dz=game.pos.z-origin.z,a=Math.atan2(dx,dz)+spread;
  launchBolt(game,origin,{x:Math.sin(a),y:(game.pos.y+1-origin.y)/Math.max(1,Math.hypot(dx,dz)),z:Math.cos(a)},m.kind==='guardian'?4:3);
  game.audio.play('shoot');
}
export function updateProjectiles(game,dt) {
  const index=game.mobs.length>12?(game.entityIndex??=new EntityIndex()).rebuild(game.mobs):null;
  for(const p of game.projectiles) {
    p.life-=dt;p.vy-=(p.gravity||0)*dt;
    const distance=Math.hypot(p.vx,p.vy,p.vz)*dt,steps=Math.max(1,Math.ceil(distance/.18));
    for(let i=0;i<steps&&p.life>0;i++) {
      p.x+=p.vx*dt/steps;p.y+=p.vy*dt/steps;p.z+=p.vz*dt/steps;
      if(game.world.intersects(p.x,p.y,p.z,.02,.01)){
        const x=Math.floor(p.x),y=Math.floor(p.y),z=Math.floor(p.z);
        if(!p.hostile&&game.world.get(x,y,z)==='dragon_crystal'){game.world.set(x,y,z,null);game.renderer.burst(x+.5,y+.5,z+.5,'#b9a2e2',24);game.audio.play('break');game.toast('Healing crystal destroyed','The dragon recovers less health.');}
        p.life=0;break;
      }
      if(p.hostile&&Math.hypot(p.x-game.pos.x,p.z-game.pos.z)<.5&&p.y>game.pos.y&&p.y<game.pos.y+1.8){game.hurt(p.damage,true);p.life=0;}
      if(!p.hostile)for(const m of index?index.near(p.x,p.z,4):game.mobs)if(m.hp>0&&Math.hypot(m.x-p.x,m.z-p.z)<(m.kind==='guardian'?1.3:(ENEMIES[m.kind]?.radius||.35)+.2)&&p.y>m.y&&p.y<m.y+(m.kind==='guardian'?4:(ENEMIES[m.kind]?.height||1.7))){if(p.slow)m.slow=p.slow;game.hit(m,p.damage);p.life=0;break;}
    }
  }
  game.projectiles=game.projectiles.filter(p=>p.life>0);
}
export function updateEnemies(game,dt) {
  let sightBudget=3,pathBudget=1;const frameMobs=[...game.mobs],offset=(game.aiCursor||0)%Math.max(1,frameMobs.length);game.aiCursor=offset+1;
  for(let i=0;i<frameMobs.length;i++) {const m=frameMobs[(i+offset)%frameMobs.length];
    if(m.kind==='dragon'){m.flash=Math.max(0,m.flash-dt);updateDragon(game,m,dt,launchBolt);continue;}
    m.flash=Math.max(0,m.flash-dt);m.cooldown-=dt*(game.hardAdventure&&!ENEMIES[m.kind]?.passive?1.2:1);m.stun=Math.max(0,(m.stun||0)-dt);
    const d=Math.hypot(game.pos.x-m.x,game.pos.z-m.z), info=ENEMIES[m.kind]||ENEMIES.sentinel;
    if(d>75)continue;
    if(info.passive){updateAnimal(game,m,dt);continue;}
    m.slow=Math.max(0,(m.slow||0)-dt);
    if(game.effect('invisibility')&&game.revealTime<=0&&d>2){m.windup=0;m.lunge=0;continue;}
    if(game.creative||m.stun>0)continue;
    m.sightTimer=(m.sightTimer||0)-dt;
    if(m.sightTimer<=0&&sightBudget>0){sightBudget--;m.sightTimer=.22+(m.id%7)*.017;m.canSee=visibleBetween(game.world,{x:m.x,y:m.y+1.25,z:m.z},{x:game.pos.x,y:game.pos.y+1.3,z:game.pos.z});if(m.canSee){m.memory=5;m.lastSeen={...game.pos};}}
    m.memory=Math.max(0,(m.memory||0)-dt);
    if(!m.canSee){m.windup=0;m.lunge=0;if(m.memory>0&&m.lastSeen){m.pathTimer=(m.pathTimer||0)-dt;if(m.pathTimer<=0&&pathBudget>0){pathBudget--;m.pathTimer=1;m.path=findMobPath(game.world,m,m.lastSeen,info);}
      const next=m.path?.[0];if(next){const dx=next.x-m.x,dz=next.z-m.z,length=Math.hypot(dx,dz);if(length<.2)m.path.shift();else{const step=Math.min(length,dt*(info.speed*(game.hardAdventure?1.15:1)));game.moveMob(m,dx/length*step,dz/length*step);}}}continue;}

    m.angle=Math.atan2(game.pos.x-m.x,game.pos.z-m.z);
    if(m.kind==='guardian'){
      if(d>35){game.boss=null;game.slam=null;game.mobs=game.mobs.filter(e=>e!==m);game.toast('The guardian returns to the vault','Come closer when you’re ready.');continue;}
      m.phase=m.hp<m.maxHp/3?3:m.hp<m.maxHp*2/3?2:1;
      if(!game.slam&&m.cooldown<=0){
        m.pattern=(m.pattern||0)+1;
        if(m.pattern%2===0){for(let i=-2;i<=2;i++)shootAtPlayer(game,m,i*.22);game.emit('warning',{text:'SHARD VOLLEY — KEEP MOVING'});m.cooldown=2.8;}
        else{game.slam={x:game.pos.x,y:game.world.ground(game.pos.x,game.pos.z,game.pos.y),z:game.pos.z,radius:m.phase===3?5:4,time:m.phase===3?.95:1.25};m.cooldown=m.phase===3?2.7:3.5;game.audio.play('warning');game.emit('warning',{text:'SHOCKWAVE — DODGE!'});}
      }
      if(d>3&&!game.slam)game.moveMob(m,(game.pos.x-m.x)/d*dt*1.7,(game.pos.z-m.z)/d*dt*1.7);
      if(d<2.3&&m.cooldown<1)game.hurt(4,true);continue;
    }
    if((d>15&&!m.trial)||Math.abs(game.pos.y-m.y)>10)continue;
    if(m.windup>0){
      m.windup-=dt;
      if(m.windup<=0){
        if(m.kind==='wisp'||(m.kind==='void_archer'||m.kind==='skeleton'))shootAtPlayer(game,m);
        else if(m.kind==='stalker'){m.lunge=.35;m.lungeX=(game.pos.x-m.x)/Math.max(d,.1);m.lungeZ=(game.pos.z-m.z)/Math.max(d,.1);}
        else if(d<((m.kind==='brute'||m.kind==='draugr_knight')?2.8:2.1)&&Math.abs(game.pos.y-m.y)<2.5)game.hurt(info.damage,true);
        m.cooldown=(m.kind==='brute'||m.kind==='draugr_knight')?2:(m.kind==='wisp'||(m.kind==='void_archer'||m.kind==='skeleton'))?2.6:1.4;
      }
      continue;
    }
    if(m.lunge>0){m.lunge-=dt;game.moveMob(m,m.lungeX*dt*9,m.lungeZ*dt*9);if(d<1.6)game.hurt(info.damage,true);continue;}
    const range=m.kind==='wisp'?12:(m.kind==='void_archer'||m.kind==='skeleton')?14:m.kind==='stalker'?4:(m.kind==='brute'||m.kind==='draugr_knight')?2.6:1.9;
    if(d<range&&m.cooldown<=0){m.windup=(m.kind==='brute'||m.kind==='draugr_knight')?.85:(m.kind==='wisp'||(m.kind==='void_archer'||m.kind==='skeleton'))?.65:.5;m.windupMax=m.windup;continue;}
    if((m.kind==='wisp'&&d<5)||((m.kind==='void_archer'||m.kind==='skeleton')&&d<7)){game.moveMob(m,-Math.sin(m.angle)*dt*1.7,-Math.cos(m.angle)*dt*1.7);}
    else if(d>(m.kind==='wisp'?8:1.5))game.moveMob(m,(game.pos.x-m.x)/Math.max(d,.1)*dt*(info.speed*(game.hardAdventure?1.15:1))*(m.slow>0?.35:1),(game.pos.z-m.z)/Math.max(d,.1)*dt*(info.speed*(game.hardAdventure?1.15:1))*(m.slow>0?.35:1));
  }
  if(game.slam){game.slam.time-=dt;if(game.slam.time<=0){const s=game.slam;game.renderer.burst(s.x,s.y+.3,s.z,'#e2b0a0',40);if(Math.hypot(game.pos.x-s.x,game.pos.z-s.z)<s.radius&&game.pos.y-s.y<1.2)game.hurt(7,true);game.slam=null;}}
  updateProjectiles(game,dt);
}
