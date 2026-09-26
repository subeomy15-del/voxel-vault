import {coordinateHash} from './coordinate-hash.js?v=38';
export const FRAME_OFFSETS=Object.freeze([-1,0,1].flatMap(n=>[[n,-2],[n,2],[-2,n],[2,n]]));
export function locateStronghold(world){
 let best=null;
 for(let i=0;i<128;i++){
  const angle=coordinateHash(i,1,world.seed)*Math.PI*2,radius=850+coordinateHash(i,2,world.seed)*700,x=Math.floor(Math.cos(angle)*radius),z=Math.floor(Math.sin(angle)*radius),h=world.height(x,z);
  if(h<8||h>62)continue;
  const approach=world.height(x,z+24),slope=Math.max(...[-20,0,20].flatMap(dx=>[-20,0,24].map(dz=>world.height(x+dx,z+dz))))-Math.min(...[-20,0,20].flatMap(dx=>[-20,0,24].map(dz=>world.height(x+dx,z+dz))));
  const site={id:`stronghold:${world.seed}`,x,y:approach-10,z,radius:27,score:slope};if(!best||slope<best.score)best=site;if(slope<=5)break;
 }
 return best;
}
export function strongholdLayout(site,seed){
 const cells=new Map(),put=(x,y,z,t)=>cells.set(`${x},${y},${z}`,t),floor=(x1,z1,x2,z2,y,t='stonebrick')=>{for(let x=x1;x<=x2;x++)for(let z=z1;z<=z2;z++)put(x,y,z,t);};
 const room=(x1,z1,x2,z2,y,h)=>{floor(x1,z1,x2,z2,y-1);floor(x1,z1,x2,z2,y+h);for(let x=x1;x<=x2;x++)for(let z=z1;z<=z2;z++)for(let k=0;k<h;k++)put(x,y+k,z,x===x1||x===x2||z===z1||z===z2?'stonebrick':null);};
 room(-5,-5,5,14,0,4);room(-8,-18,8,-5,0,5);room(5,-4,16,7,0,7);room(-16,-4,-5,7,0,4);
 for(const z of[-5,14])for(let x=-1;x<=1;x++)for(let y=0;y<3;y++)put(x,y,z,null);
 for(const x of[-5,5])for(let z=0;z<=2;z++)for(let y=0;y<3;y++)put(x,y,z,null);
 for(let i=0;i<=10;i++)for(let x=-2;x<=2;x++){
  const z=14+i;put(x,i-1,z,x===-2||x===2?'stonebrick':'stone_stairs_s');
  for(let y=i;y<=i+3;y++)put(x,y,z,Math.abs(x)===2?'stonebrick':null);
 }
 for(let z=-2;z<=5;z+=2)for(let y=0;y<3;y++)put(15,y,z,'bookshelf');
 floor(7,-3,14,5,4,'plank');for(let y=0;y<6;y++)put(7,y,4,'ladder');
 for(const [x,z] of[[-3,5],[3,-2],[6,3],[-6,3]])put(x,2,z,'lantern');
 const side=coordinateHash(1,3,seed)>.5?1:-1;put(-12,0,side>0?4:-2,'treasure_chest');
 const prefilled=Math.floor(coordinateHash(1,4,seed)*3);
 FRAME_OFFSETS.forEach(([dx,dz],i)=>put(dx,0,-11+dz,i<prefilled?'end_frame_filled':'end_frame'));
 for(let x=-1;x<=1;x++)for(let z=-12;z<=-10;z++)put(x,-1,z,'obsidian');
 return {cells,loot:{x:-12,y:0,z:side>0?4:-2}};
}
export function stampStronghold(world,cx,cz,put){
 const site=world.stronghold;if(!site||Math.abs(cx*16+8-site.x)>site.radius+8||Math.abs(cz*16+8-site.z)>site.radius+8)return;
 const layout=world.strongholdLayout??=strongholdLayout(site,world.seed);
 for(const[k,t]of layout.cells){const[x,y,z]=k.split(',').map(Number);put(site.x+x,site.y+y,site.z+z,t);}
 const p={x:site.x+layout.loot.x,y:site.y,z:site.z+layout.loot.z};
 if(Math.floor(p.x/16)===cx&&Math.floor(p.z/16)===cz&&!world.chests.some(c=>c.id===site.id))world.chests.push({...p,id:site.id,block:true,name:'Stronghold library cache',loot:{arrows:24,iron_ingot:5,golden_apple:2},generated:false});
}
export const endPortalPoint=site=>site&&({x:site.x,y:site.y,z:site.z-11,type:'stronghold_portal'});
export function framesComplete(world){const s=world.stronghold;return !!s&&FRAME_OFFSETS.every(([x,z])=>world.get(s.x+x,s.y,s.z-11+z)==='end_frame_filled');}
