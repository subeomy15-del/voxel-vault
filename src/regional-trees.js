import {integerHash} from './climate.js?v=38';
// Each crown grows from connected branches. No per-leaf random deletion/floating scraps.
export function regionalTree(world,put,x,y,z,species){
 const n=world.terrain>=11?world.hash(x,z,world.seed+81):integerHash(x,z,world.seed+81),snowy=['snow','snow_plains','snow_cedar'].includes(world.biome(x,z));
 const pine=['pine','tall_pine','conifer','tall_conifer','snow_cedar'].includes(species),palm=species==='palm',jungle=species==='jungle';
 const tall=['tall_pine','tall_conifer','snow_cedar'].includes(species);
 const height=pine?(tall?12:8)+Math.floor(n*4):palm?7+Math.floor(n*3):jungle?13+Math.floor(n*5):species==='spectral'?20:species==='great_oak'?9+Math.floor(n*3):5+Math.floor(n*3);
 const wood=pine?'pinewood':species==='birch'?'birch':'wood',leaf=world.terrain>=11&&jungle?'jungle_leaf':pine?'pine':species==='amber'?'autumnleaf':species==='cherry'?'cherry_leaf':species==='plum'?'plum_leaf':species==='pear'?'pear_leaf':species==='spectral'?'spectral_leaf':'leaf';
 const block=(dx,h,dz,t)=>put(x+dx,y+h,z+dz,t);
 for(let h=1;h<=height;h++){block(0,h,0,wood);if(jungle&&height>15)block(1,h,0,wood);}
 if(pine){
  for(let h=3;h<=height+1;h++){
   const r=Math.max(0,Math.min(tall?3:2,Math.floor((height+1-h)*.32)+(h%3===0?0:1)));
   for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)if(Math.abs(dx)+Math.abs(dz)<=r+1&&(dx||dz||h>height))block(dx,h,dz,leaf);
  }
  if(species==='snow_cedar')for(const h of[5,9,13])for(const dx of[-1,1]){block(dx,h,0,wood);block(dx*2,h,0,leaf);block(dx*2,h+1,0,'snow');}if(snowy)block(0,height+2,0,'snow');return;
 }
 if(palm){
  for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]])for(let k=1;k<=4;k++){block(dx*k,height+1-Math.floor(k/3),dz*k,leaf);block(dx*k,height+1-Math.floor((k-1)/3),dz*k,leaf);if(dx&&dz)block(dx*(k-1),height+1-Math.floor((k-1)/3),dz*k,leaf);if(k<3)block(dx*k,height-Math.floor(k/3),dz*k,leaf);}
  block(0,height+1,0,leaf);return;
 }
 const lobes=species==='birch'?[[0,0,0,2,3]]:species==='acacia'?[[0,1,0,2,1],[-2,0,0,2,1],[2,1,1,2,1]]:jungle?[[0,0,0,3,2],[-2,1,1,3,2],[2,2,-1,3,2]]:species==='cherry'?[[0,0,0,2,2],[-2,-1,0,2,1],[2,0,1,2,1]]:[[0,0,0,2,2],[-2,-1,0,2,2],[1,1,1,2,2]];
 for(const[ox,oy,oz,r,ry]of lobes){
  const steps=Math.max(Math.abs(ox),Math.abs(oz),1);
  for(let i=1;i<=steps;i++)block(Math.round(ox*i/steps),height-2+Math.round((oy+2)*i/steps),Math.round(oz*i/steps),wood);
  for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)for(let h=-ry;h<=ry;h++)if((dx*dx+dz*dz)/(r*r+.6)+h*h/(ry*ry+.6)<=1.2)block(ox+dx,height+oy+h,oz+dz,leaf);
 }
 if(species==='pear'||species==='plum')for(const dx of[-1,1])block(dx,height-2,1,species==='pear'?'autumnleaf':'cherry_leaf');
 // Hanging foliage remains connected to the crown; it is not a separate floating vine.
 if(jungle){
  for(const[dx,dz]of[[-3,1],[3,-1]])for(let h=height-(world.terrain>=11?7:3);h<height;h++)block(dx,h,dz,world.terrain>=11?'vines':leaf);
  if(world.terrain>=11)for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){block(dx,1,dz,wood);block(dx,2,dz,wood);}
 }
}
