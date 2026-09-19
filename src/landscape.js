import { hash } from './data.js?v=31';
import {BIOME_DEFINITIONS} from './biome-registry.js?v=31';
import {integerHash} from './climate.js?v=31';
const blend=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function terrainHeight(world,x,z){
  const noise=(a,b,s)=>world.noise(a,b,s),climate=noise(x+170,z-85,160);
  const wx=x+(noise(x-91,z+17,130)-.5)*34,wz=z+(noise(x+34,z-103,130)-.5)*34;
  const base=9+noise(wx,wz,110)*15+noise(wx+37,wz-51,38)*7+noise(wx-20,wz+14,12)*1.8;
  const ridge=(1-Math.abs(noise(wx-140,wz+95,60)*2-1))**2;
  const alpine=blend(.55,.88,climate)*blend(70,135,Math.hypot(x,z));
  const north=blend(-125,-215,z)*blend(.22,.48,climate);
  const hills=Math.max(alpine,north)*(10+ridge*36);
  const dry=blend(85,155,x)*blend(.35,.58,climate);
  return base+hills+dry*Math.sin(wx*.07+wz*.022)*2.2;
}
export function plantAt(world,x,z,biome){
  if(world.terrain>=7&&world.column(x,z).region>.5){
    const c=world.column(x,z);if(['ocean','beach','snow','snow_plains','mountain','desert','badlands'].includes(biome))return null;
    if(world.noise(x+312,z-119,34)<.59||hash(x,z,world.seed+218)<.92)return null;
    const plants=['forest','dense_forest','jungle'].includes(biome)?['fern','fern','mushroom','berries_crop']:biome==='autumn_forest'?['fern','mushroom','flower_red']:['daisy','flower_blue','lavender','cotton_crop','wheat_crop','carrot_crop'];
    return plants[Math.floor(hash(Math.floor(x/22),Math.floor(z/22),world.seed+371)*plants.length)];
  }
  if(['snow','mountain'].includes(biome)||world.noise(x+312,z-119,28)<.63||hash(x,z,world.seed+218)<.962)return null;
  const plants=biome==='forest'?['fern','fern','mushroom','berries_crop','daisy']:['flower_red','flower_blue','daisy','lavender','cotton_crop','wheat_crop','carrot_crop','potato_crop','corn_crop','tomato_crop','watermelon_crop','melon_crop'];
  return plants[Math.min(plants.length-1,Math.floor(hash(Math.floor(x/24),Math.floor(z/24),world.seed+371)*plants.length))];
}
export function treeAt(world,x,z,biome){
  if(world.terrain>=7&&world.column(x,z).region>.5){
    const def=BIOME_DEFINITIONS[biome],gx=Math.floor(x/8),gz=Math.floor(z/8);if(!def?.trees.length)return null;
    if(x!==gx*8+1+Math.floor(hash(gx,gz,world.seed+302)*6)||z!==gz*8+1+Math.floor(hash(gz,gx,world.seed+904)*6))return null;
    const cluster=.45+world.noise(x+217,z-49,75)*.8;if(hash(gx,gz,world.seed+93)>def.density*cluster)return null;
    return def.trees[Math.floor(hash(gx,gz,world.seed+4)*def.trees.length)];
  }
  const span=biome==='forest'?9:biome==='snow'?10:12,gx=Math.floor(x/span),gz=Math.floor(z/span);
  if(x!==gx*span+2+Math.floor(hash(gx,gz,world.seed+302)*4)||z!==gz*span+2+Math.floor(hash(gz,gx,world.seed+904)*4))return null;
  const n=hash(gx,gz,world.seed+93);if(n<(biome==='forest'?.2:biome==='snow'?.32:.67)||biome==='desert'||biome==='mountain')return null;
  return biome==='snow'?'pine':hash(x,z,world.seed+4)>.71?'birch':'oak';
}
export function growTree(world,put,x,y,z,species){
  if(['great_oak','jungle','amber','tall_pine','acacia'].includes(species))return growRegionalTree(world,put,x,y,z,species);
  const n=hash(x,z,world.seed+81),height=species==='pine'?7+Math.floor(n*4):species==='birch'?6+Math.floor(n*3):4+Math.floor(n*3);
  const wood=species==='pine'?'pinewood':species==='birch'?'birch':'wood',leaf=species==='pine'?'pine':'leaf';
  for(let h=1;h<=height;h++)put(x,y+h,z,wood);
  if(species==='pine'){
    for(let h=3;h<=height+1;h++){
      const radius=Math.max(0,Math.min(3,Math.floor((height+2-h)*.43)+(h%2)));
      for(let a=-radius;a<=radius;a++)for(let b=-radius;b<=radius;b++)if(Math.abs(a)+Math.abs(b)<=radius+1&&!(a===0&&b===0&&h<=height))put(x+a,y+h,z+b,leaf);
    }
    put(x,y+height+2,z,'snow');return;
  }
  const lean=species==='birch'?0:n>.5?1:-1,crownX=x+lean,crownZ=z+(n>.7?1:0);
  if(species==='oak')for(const side of [-1,1])put(x+side,y+height-1,z,wood);
  for(let h=-2;h<=2;h++){
    const radius=species==='birch'?(h===2?1:2):(h===2?1:h===1?2:3);
    for(let a=-radius;a<=radius;a++)for(let b=-radius;b<=radius;b++){
      if(a*a+b*b>radius*radius+1||a===x-crownX&&b===z-crownZ&&h<=0)continue;
      if(a*a+b*b>radius*radius-1&&hash(x+a+h*31,z+b,world.seed+18)<.22)continue;
      put(crownX+a,y+height+h,crownZ+b,leaf);
    }
  }
}
function growRegionalTree(world,put,x,y,z,species){
  const n=integerHash(x,z,world.seed+81),pine=species==='tall_pine',jungle=species==='jungle',height=pine?12+Math.floor(n*6):jungle?13+Math.floor(n*7):species==='great_oak'?9+Math.floor(n*5):5+Math.floor(n*4);
  const wood=pine?'pinewood':'wood',leaf=pine?'pine':species==='amber'?'autumnleaf':'leaf';
  for(let h=1;h<=height;h++){put(x,y+h,z,wood);if(jungle&&height>16){put(x+1,y+h,z,wood);put(x,y+h,z+1,wood);}}
  if(pine){for(let h=4;h<=height+1;h++){const radius=Math.max(1,Math.min(4,Math.floor((height+2-h)*.32)+(h%3===0?1:0)));for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++)if(Math.abs(dx)+Math.abs(dz)<=radius+1&&(dx||dz||h>height))put(x+dx,y+h,z+dz,leaf);}put(x,y+height+2,z,'snow');return;}
  const radius=species==='acacia'?4:jungle?5:4,crown=species==='acacia'?1:2;
  for(const side of[-1,1])for(let a=1;a<=3;a++)put(x+side*a,y+height-2+Math.floor(a/2),z,wood);
  for(let h=-2;h<=crown;h++)for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++){
    const r=radius-(h===crown?2:h===-2?1:0);if(dx*dx+dz*dz>r*r+2||!dx&&!dz&&h<=0)continue;
    if(integerHash(x+dx+h*19,z+dz,world.seed+57)>.12)put(x+dx,y+height+h,z+dz,leaf);
  }
  if(jungle)for(const[dx,dz]of[[4,0],[-4,1],[0,4]])for(let h=height-4;h<height;h++)if(integerHash(x+dx+h,z+dz,world.seed)>.3)put(x+dx,y+h,z+dz,'leaf');
}
