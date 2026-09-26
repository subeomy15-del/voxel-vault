// Absolute anchors and a <= 3 block footprint make these stamps order-independent.
// Aquatic stems stay below the intact water surface; roots only grow in shallows.
export function wetlandPlants(world,put,x,z,c){
 const n=world.hash(x,z,world.seed+7301),wet=c.biome==='marsh',warm=c.climate?.temperature>.5;
 if(c.h<3&&c.h>-22&&!['snow','snow_cedar','snow_plains','frozen_badlands'].includes(c.biome)){
  const type=c.h<-7?'kelp':'seagrass',density=type==='kelp'?.12:.3;
  if(n<density){const length=type==='kelp'?Math.min(3-c.h,3+Math.floor(n*65)):Math.min(2,3-c.h);for(let y=1;y<=length;y++)put(x,c.h+y,z,type);}
 }
 if(wet&&c.h>=4&&c.h<=6&&n<.32){put(x,c.h+1,z,'reeds');if(n<.14)put(x,c.h+2,z,'reeds');}
 if(!(wet||warm&&['beach','river','jungle'].includes(c.biome))||c.h<1||c.h>4)return;
 const gx=Math.floor(x/9),gz=Math.floor(z/9);
 if(x!==gx*9+4||z!==gz*9+4||world.hash(gx,gz,world.seed+7307)>.5)return;
 const crown=8+Math.floor(n*3);
 for(let y=3;y<=crown;y++)put(x,y,z,'wood');
 for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){
  const bed=world.height(x+dx*2,z+dz*2);if(bed>5||bed<0)continue;
  for(let y=bed+1;y<=5;y++)put(x+dx*2,y,z+dz*2,'wood');
  put(x+dx,5,z+dz,'wood');put(x+dx,6,z+dz,'wood');
 }
 for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++)for(let dy=-1;dy<=1;dy++)if(dx*dx+dz*dz+dy*dy*3<=10&&(dx||dz||dy>0))put(x+dx,crown+dy,z+dz,'mangrove_leaf');
}
