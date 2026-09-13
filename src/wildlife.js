import { hash } from './data.js?v=22';
import { findMobPath } from './navigation.js?v=22';
export const ANIMALS={
  deer:{name:'Deer',passive:true,hp:12,speed:1.15,flee:5.4,height:1.6,radius:.38,color:'#a88b68',glow:'#d9c6a4',food:['wheat','carrot'],drops:{raw_venison:[2,3],leather:[1,2]}},
  pig:{name:'Pig',passive:true,hp:12,speed:.95,flee:3.9,height:.9,radius:.4,color:'#c79f95',glow:'#dec0ac',food:['carrot','potato'],drops:{raw_pork:[2,3]}},
  cow:{name:'Cow',passive:true,hp:16,speed:.8,flee:3.5,height:1.45,radius:.47,color:'#b6aa8f',glow:'#e0d8bd',food:['wheat'],drops:{raw_beef:[2,3],leather:[1,2]}},
  sheep:{name:'Sheep',passive:true,hp:10,speed:.9,flee:3.7,height:1.2,radius:.4,color:'#d5d1bd',glow:'#eee7d2',food:['wheat'],drops:{raw_mutton:[1,2],white_wool:[1,2]}},
  chicken:{name:'Chicken',passive:true,hp:5,speed:1.1,flee:3.3,height:.65,radius:.23,color:'#e0d7bd',glow:'#caa664',food:['seeds','corn_seeds'],drops:{raw_chicken:[1,1],feather:[1,3]}},
  rabbit:{name:'Rabbit',passive:true,hp:5,speed:1.25,flee:5.7,height:.65,radius:.24,color:'#b3a38a',glow:'#d3c5ac',food:['carrot'],drops:{raw_rabbit:[1,1],rabbit_hide:[1,1]}},
};
export function animalKind(world,x,z,salt=0){
  const biome=world.biome(x,z),list=biome==='forest'?['deer','deer','pig','rabbit','chicken']:biome==='snow'?['deer','rabbit','sheep']:biome==='desert'?['rabbit']:biome==='mountain'?['sheep','rabbit']:['pig','cow','cow','sheep','chicken','rabbit'];
  return list[Math.min(list.length-1,Math.floor(hash(Math.floor(x)+salt,Math.floor(z),world.seed+482)*list.length))];
}
export function updateAnimal(game,m,dt){
  const info=ANIMALS[m.kind]||ANIMALS.deer,dx=game.pos.x-m.x,dz=game.pos.z-m.z,d=Math.hypot(dx,dz),invisible=game.effect('invisibility')&&game.revealTime<=0;
  m.panic=Math.max(0,(m.panic||0)-dt);m.slow=Math.max(0,(m.slow||0)-dt);m.brain=(m.brain||0)-dt;
  if(m.brain<=0){
    m.brain=1+hash(m.id,Math.floor(game.state.time),game.state.seed)*.7;let target=null;
    if(m.panic>0){const distance=Math.max(d,.1);target={x:m.x-dx/distance*8,z:m.z-dz/distance*8};m.walkSpeed=info.flee;}
    else if(!invisible&&info.food.includes(game.held)&&game.state.inv[game.held]>0&&d<10){if(d>1.9)target=game.pos;m.walkSpeed=target?info.speed*1.6:0;}
    else{
      const choice=hash(m.id,Math.floor(game.state.time/3),game.state.seed+7);m.walkSpeed=choice>.43?info.speed*.6:0;
      if(m.walkSpeed){const herd=game.mobs.find(other=>other!==m&&other.kind===m.kind&&Math.hypot(other.x-m.x,other.z-m.z)>5&&Math.hypot(other.x-m.x,other.z-m.z)<11);
        target=herd&&choice>.7?herd:{x:m.x+Math.sin(choice*18)*4,z:m.z+Math.cos(choice*18)*4};}
    }
    m.path=target?findMobPath(game.world,m,target,info):[];if(!m.path.length)m.walkSpeed=0;
  }
  if(m.stun>0)return;
  let point=m.path?.[0];if(point&&Math.hypot(point.x-m.x,point.z-m.z)<.18){m.path.shift();point=m.path[0];}
  const speed=(m.walkSpeed||0)*(m.slow>0?.35:1);m.grazing=!point&&m.panic<=0;
  if(point&&speed>0){
    const dx=point.x-m.x,dz=point.z-m.z,distance=Math.hypot(dx,dz),step=Math.min(distance,dt*speed),angle=Math.atan2(dx,dz),before={x:m.x,z:m.z,angle:m.angle};
    game.moveMob(m,dx/distance*step,dz/distance*step);
    m.angle=before.angle+Math.atan2(Math.sin(angle-before.angle),Math.cos(angle-before.angle))*Math.min(1,dt*9);
    if(Math.hypot(m.x-before.x,m.z-before.z)<step*.15){m.brain=Math.min(m.brain,.15);m.path=[];}
  }else m.walkSpeed=0;
}
