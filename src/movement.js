import { ITEMS } from './data.js?v=11';
import { WORLD_LIMIT,WORLD_BOTTOM,WORLD_TOP } from './world.js?v=11';
const approach=(current,target,amount)=>current<target?Math.min(target,current+amount):Math.max(target,current-amount);
export function requestJump(game){game.jumpBuffer=.14;tryJump(game);}
function tryJump(g){
  if(g.creative&&g.flying)return;
  if(g.jumpBuffer>0&&(g.grounded||g.coyote>0)){g.velocity=g.effect('jump')?12.7:8.8;g.state.exhaustion+=.18;g.grounded=false;g.coyote=0;g.jumpBuffer=0;g.audio.play('jump');}
}
export function movePlayer(g,dt){
  g.jumpBuffer=Math.max(0,g.jumpBuffer-dt);g.coyote=g.grounded?.11:Math.max(0,g.coyote-dt);
  let f=(g.keys.has('KeyW')||g.keys.has('ArrowUp')?1:0)-(g.keys.has('KeyS')||g.keys.has('ArrowDown')?1:0)-g.touch.z;
  let s=(g.keys.has('KeyD')||g.keys.has('ArrowRight')?1:0)-(g.keys.has('KeyA')||g.keys.has('ArrowLeft')?1:0)+g.touch.x;
  if(g.gliding){f=1;s*=.45;}
  const len=Math.hypot(f,s);if(len>1){f/=len;s/=len;}
  g.moving=len>.05;g.crouching=g.keys.has('KeyX')||g.world.intersects(g.pos.x,g.pos.y,g.pos.z,1.75);
  const inWater=g.world.waterAt(g.pos.x,g.pos.y+.8,g.pos.z);
  if(inWater||g.grounded||!g.state.inv[g.state.glider])g.gliding=false;
  g.sprinting=g.moving&&!g.crouching&&!inWater&&!g.gliding&&!g.eating&&(g.creative||g.state.food>=6)&&g.stamina>3&&(g.keys.has('ShiftLeft')||g.keys.has('ShiftRight'));
  g.stamina=Math.max(0,Math.min(100,g.stamina+dt*(g.sprinting?-9:22)));
  const wing=ITEMS[g.state.glider];
  const boost=g.effect('speed')?1.5:1;
  const speed=g.gliding?Math.max(7,wing.glideSpeed+Math.max(0,-g.pitch)*7-Math.max(0,g.pitch)*4):(inWater?3.1:g.dashTime>0?15:g.crouching?2.1:g.sprinting?7.4:4.8)*boost*(g.eating?.5:g.drawState?.75:1);
  if(g.dashTime>0&&!g.moving){f=1;g.moving=true;}
  const acceleration=g.gliding?9:g.grounded?42:inWater?18:22;
  g.vx=approach(g.vx,(-Math.sin(g.yaw)*f+Math.cos(g.yaw)*s)*speed,acceleration*dt);
  g.vz=approach(g.vz,(-Math.cos(g.yaw)*f-Math.sin(g.yaw)*s)*speed,acceleration*dt);
  if(g.grapple){
    g.grapple.time-=dt;const dx=g.grapple.x-g.pos.x,dy=g.grapple.y-g.pos.y,dz=g.grapple.z-g.pos.z,d=Math.hypot(dx,dy,dz);
    if(g.grapple.time<=0||d<.8)g.grapple=null;
    else{g.vx=dx/Math.max(1,d)*16;g.vz=dz/Math.max(1,d)*16;g.velocity=Math.max(-8,Math.min(13,dy*5));g.grounded=false;}
  }
  const height=g.crouching?1.3:1.75;
  for(const[key,amount]of[['x',g.vx*dt],['z',g.vz*dt]]){
    const steps=Math.max(1,Math.ceil(Math.abs(amount)/.15));
    for(let i=0;i<steps;i++){
      const p={...g.pos,[key]:g.pos[key]+amount/steps};
      if(g.world.intersects(p.x,p.y,p.z,height)){
        if(g.grounded&&!g.crouching&&!g.flying&&!g.world.intersects(p.x,p.y+.5,p.z,height)&&g.world.intersects(p.x,p.y+.45,p.z,.05)){g.pos.y+=.5;g.cameraOffset-=.5;g.pos[key]=p[key];continue;}
        if(key==='x')g.vx=0;else g.vz=0;break;
      }
      if(g.crouching&&g.grounded&&!g.flying&&!g.world.intersects(p.x,p.y-.12,p.z,.12))break;
      g.pos[key]=p[key];
    }
  }
  if(g.grounded&&g.keys.has('Space'))g.jumpBuffer=.1;
  tryJump(g);
  const ladder=[0,.5,1].some(y=>g.world.get(Math.floor(g.pos.x),Math.floor(g.pos.y+y),Math.floor(g.pos.z))==='ladder');
  if(g.creative&&g.flying){
    const dy=(g.keys.has('Space')?1:0)-(g.keys.has('KeyX')?1:0);const y=Math.min(WORLD_TOP-2,g.pos.y+dy*8*dt);if(!g.world.intersects(g.pos.x,y,g.pos.z,height))g.pos.y=y;g.velocity=0;
  }else{
    if(g.gliding){const target=-Math.max(.65,wing.sink+Math.max(0,-g.pitch)*7-Math.max(0,g.pitch)*.7);g.velocity=approach(g.velocity,target,dt*6);}
    else{g.velocity-=dt*(inWater?7:g.effect('slowfall')?6:24);if(g.effect('slowfall'))g.velocity=Math.max(-2.4,g.velocity);}
    if(inWater&&g.keys.has('Space'))g.velocity=4.4;
    if(ladder){g.velocity=g.keys.has('Space')||f>0?3.5:g.keys.has('KeyX')?-3:Math.max(-1,g.velocity);}
    const delta=g.velocity*dt,steps=Math.max(1,Math.ceil(Math.abs(delta)/.12));g.grounded=false;
    for(let i=0;i<steps;i++){
      const y=g.pos.y+delta/steps;
      if(g.world.intersects(g.pos.x,y,g.pos.z,height)){
        if(g.velocity<0){g.grounded=true;g.gliding=false;g.pos.y=Math.round(g.pos.y*1000)/1000;if(g.velocity<-17&&!inWater&&!ladder&&!g.effect('slowfall'))g.hurt(Math.floor((-g.velocity-15)*.5));}
        g.velocity=0;break;
      }
      g.pos.y=y;
    }
    tryJump(g);
  }
  g.pos.x=Math.max(-WORLD_LIMIT+.5,Math.min(WORLD_LIMIT-.5,g.pos.x));g.pos.z=Math.max(-WORLD_LIMIT+.5,Math.min(WORLD_LIMIT-.5,g.pos.z));
  if(g.pos.y<WORLD_BOTTOM-3){g.returnHome();g.hurt(3);}
  g.cameraOffset*=Math.exp(-dt*14);
  if(g.moving){g.walk+=dt*(g.sprinting?1.35:1);g.stepTimer+=dt;if(g.stepTimer>.42&&g.grounded){g.stepTimer=0;g.audio.play('step',g.world.get(Math.floor(g.pos.x),Math.floor(g.pos.y-.03),Math.floor(g.pos.z))||'stone');}}
}
