import {REGIONAL_STRUCTURES,buildRegionalRoom,embellishRuin} from './regional-structures.js?v=35';
import {integerHash} from './climate.js?v=35';
const key=(x,y,z)=>`${x},${y},${z}`;
export class StructureTemplate {
 constructor(seed){this.seed=seed;this.cells=new Map();this.protected=new Set();this.footprint=new Set();}
 block(x,y,z,type,keep=false){const k=key(x,y,z);this.cells.set(k,type);if(keep)this.protected.add(k);return this;}
 floor(x1,z1,x2,z2,y,type){for(let x=x1;x<=x2;x++)for(let z=z1;z<=z2;z++){this.block(x,y,z,type,true);this.footprint.add(`${x},${z}`);}return this;}
 wall(x1,z1,x2,z2,y,height,type){for(let x=x1;x<=x2;x++)for(let z=z1;z<=z2;z++)for(let h=0;h<height;h++)this.block(x,y+h,z,type);return this;}
 pillar(x,z,y,height,type){return this.wall(x,z,x,z,y,height,type);}
 room(x1,z1,x2,z2,y,height,type){
  this.floor(x1,z1,x2,z2,y-1,type);
  for(let x=x1;x<=x2;x++)for(let z=z1;z<=z2;z++)for(let h=0;h<height;h++)this.block(x,y+h,z,x===x1||x===x2||z===z1||z===z2?type:null);
  for(let h=0;h<3;h++)this.block(Math.floor((x1+x2)/2),y+h,z2,null,true);return this;
 }
 ladder(x,z,y,height){for(let h=0;h<height;h++)this.block(x,y+h,z,'ladder',true);return this;}
 decay(amount,moss){
  for(const[k,type]of this.cells){if(!type||this.protected.has(k))continue;const[x,y,z]=k.split(',').map(Number),n=integerHash(x+y*179,z,this.seed);
   if(y>0&&n<amount*(.4+Math.min(y,16)/9))this.cells.set(k,null);
   else if(moss&&['stonebrick','cobblestone','stone'].includes(type)&&integerHash(x-y*113,z,this.seed+51)<moss)this.cells.set(k,'moss');
  }
  // Keep roof/wall fragments connected to the surviving building, not levitating.
  const connected=new Set(),queue=[];for(const[k,type]of this.cells)if(type&&Number(k.split(',')[1])<=0){connected.add(k);queue.push(k);}
  for(let i=0;i<queue.length;i++){const[x,y,z]=queue[i].split(',').map(Number);for(const[dx,dy,dz]of[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const n=key(x+dx,y+dy,z+dz);if(this.cells.get(n)&&!connected.has(n)){connected.add(n);queue.push(n);}}}
  for(const[k,type]of this.cells)if(type&&!connected.has(k)&&!this.protected.has(k))this.cells.set(k,null);
 }
}
export const STRUCTURE_TYPES=Object.freeze({...REGIONAL_STRUCTURES,
 camp:{name:'Wayfarer Remains',radius:5,tier:0},wall:{name:'Fallen Rampart',radius:9,tier:0},shrine:{name:'Listening Stones',radius:5,tier:0},bridge:{name:'Broken Causeway',radius:9,tier:0},
 house:{name:'Forgotten Homestead',radius:7,tier:1},tower:{name:'Hollow Tower',radius:6,tier:1},watchtower:{name:'Last Watch',radius:6,tier:1},buried:{name:'Buried Hall',radius:8,tier:1},dungeon:{name:'Deep Archive',radius:12,tier:2},temple:{name:'Sunken Colonnade',radius:10,tier:2},
 fortress:{name:'Crownfall Keep',radius:19,tier:3},gate:{name:'Broken Meridian',radius:11,tier:2},observatory:{name:'Starless Observatory',radius:15,tier:3}
});
export function structurePalette(biome){
 if(['desert','savanna','beach'].includes(biome))return {stone:'sandstone',floor:'limestone',wood:'plank',moss:0};
 if(biome==='badlands')return {stone:'red_terracotta',floor:'ochre_terracotta',wood:'pine_plank',moss:0};
 if(['snow','snow_plains','mountain','frozen_badlands'].includes(biome))return {stone:'stonebrick',floor:'cobblestone',wood:'pine_plank',moss:.08};
 return {stone:'stonebrick',floor:'cobblestone',wood:'plank',moss:['jungle','dense_forest','marsh'].includes(biome)?.5:.23};
}
export function buildStructure(type,seed,biome,version=7){
 const t=new StructureTemplate(seed),p=structurePalette(biome),roll=integerHash(7,11,seed),height=6+Math.floor(roll*5);let loot={x:1,y:0,z:1};
 if(REGIONAL_STRUCTURES[type]){loot=buildRegionalRoom(t,type,p,roll);
 }else if(type==='camp'){
  t.floor(-3,-2,3,2,-1,'gravel');t.pillar(-3,-2,0,3,'wood');t.pillar(3,-2,0,2,'wood');t.wall(-3,-2,3,-2,2,1,p.wood);t.block(-1,0,0,'campfire',true);t.block(2,0,-1,'wood');
 }else if(type==='wall'){
  t.floor(-8,-1,8,1,-1,p.floor);t.wall(-8,0,8,0,0,3,p.stone);t.pillar(-6,0,0,5,p.stone);t.pillar(6,0,0,6,p.stone);loot={x:-5,y:0,z:1};
 }else if(type==='shrine'){
  t.floor(-3,-3,3,3,-1,p.floor);for(const x of[-3,3])for(const z of[-3,3])t.pillar(x,z,0,x===z?5:3,p.stone);t.wall(-3,-3,3,-3,4,1,p.stone);t.block(0,0,-1,'moss',true);t.block(0,1,-1,'lantern',true);
 }else if(type==='bridge'){
  t.floor(-8,-2,8,2,-1,p.floor);for(let x=-8;x<=8;x++)if(Math.abs(x)>2){t.block(x,0,-2,p.stone);t.block(x,0,2,p.stone);}for(const x of[-7,7])for(const z of[-2,2])t.pillar(x,z,0,3,p.stone);loot={x:6,y:0,z:0};
 }else if(type==='house'){
  const length=roll>.5?5:4;t.room(-4,-length,4,length,0,4,p.stone);for(const x of[-4,4])for(const z of[-length,length])t.pillar(x,z,0,5,'wood');
  for(let x=-5;x<=5;x++)for(let z=-length-1;z<=length+1;z++)t.block(x,4+Math.floor((5-Math.abs(x))/2),z,p.wood);
  t.block(-3,0,-length+1,'furnace',true);t.block(3,0,-length+1,'bench',true);
 }else if(type==='tower'||type==='watchtower'){
  t.room(-3,-3,3,3,0,height,p.stone);t.floor(-3,-3,3,3,height-2,p.wood);t.ladder(-2,0,0,height-1);t.block(-2,height-2,0,'ladder',true);
  for(const x of[-3,3])for(const z of[-3,3])t.pillar(x,z,height,2,p.stone);loot={x:1,y:height-1,z:1};
 }else if(type==='buried'||type==='dungeon'){
  const floor=-5;t.room(-5,-5,5,5,floor,4,p.stone);t.floor(-5,-5,5,5,-1,p.stone);
  for(let y=floor;y<=2;y++){t.block(0,y,3,null,true);t.block(1,y,3,'ladder',true);}t.wall(-2,4,2,4,0,3,p.stone);t.block(0,0,4,null,true);t.block(0,1,4,null,true);
  if(type==='dungeon'){t.room(5,-3,10,3,floor,4,p.stone);t.block(5,floor,0,null,true);t.block(5,floor+1,0,null,true);t.block(5,floor+2,0,null,true);t.floor(5,-3,10,3,-1,p.stone);t.block(8,floor,1,'stone_spikes',true);loot={x:9,y:floor,z:-1};}else loot={x:-3,y:floor,z:-3};
 }else if(type==='temple'){
  t.floor(-8,-7,8,7,-1,p.floor);t.room(-5,-6,5,0,0,5,p.stone);
  for(const x of[-7,7])for(const z of[-5,0,5])t.pillar(x,z,0,5+Math.floor(integerHash(x,z,seed)*3),p.stone);
  t.wall(-7,-5,7,-5,5,1,p.stone);t.wall(-7,0,7,0,5,1,p.stone);t.block(0,0,-4,'moss',true);loot={x:1,y:0,z:-4};
 }else if(type==='fortress'){
  t.floor(-16,-13,16,13,-1,p.floor);t.room(-15,-12,15,12,0,5,p.stone);
  for(const x of[-12,12])for(const z of[-9,9]){t.room(x-3,z-3,x+3,z+3,0,height+3,p.stone);t.floor(x-3,z-3,x+3,z+3,height+1,p.wood);t.ladder(x-2,z,0,height+2);}
  t.room(-5,-10,5,-2,0,8,p.stone);t.floor(-5,-10,5,-2,7,p.wood);t.ladder(-4,-5,0,8);loot={x:1,y:8,z:-5};
 }else if(type==='gate'){
  t.floor(-8,-6,8,6,-1,p.floor);for(const x of[-5,5]){t.pillar(x,0,0,8,p.stone);t.pillar(x+Math.sign(x),0,0,5,p.stone);}t.wall(-5,0,5,0,8,1,p.stone);t.block(0,0,-3,'lantern',true);loot={x:4,y:0,z:2};
 }else if(type==='observatory'){
  t.floor(-11,-11,11,11,-1,p.floor);t.room(-8,-8,8,8,0,4,p.stone);for(const x of[-10,10])for(const z of[-10,10])t.pillar(x,z,0,9,p.stone);
  t.room(-4,-4,4,4,0,12,p.stone);t.floor(-4,-4,4,4,10,p.wood);t.ladder(-3,0,0,11);t.block(-3,10,0,'ladder',true);t.block(0,11,0,'lantern',true);loot={x:1,y:11,z:1};
 }
 if(version>=8)embellishRuin(t,type,p,seed,roll);
 t.block(loot.x,loot.y-1,loot.z,p.floor,true);t.block(loot.x,loot.y,loot.z,'treasure_chest',true);
 t.decay(version>=8?.1+roll*.09:.13+roll*.13,p.moss);
 if(version>=8&&['snow','snow_plains','frozen_badlands'].includes(biome)){const tops=new Map();for(const[k,v]of t.cells)if(v){const[x,y,z]=k.split(',').map(Number),key=x+','+z;if(!tops.has(key)||y>tops.get(key))tops.set(key,y);}for(const[k,y]of tops){const[x,z]=k.split(',').map(Number);if(y>0&&integerHash(x,z,seed+71)>.45)t.block(x,y+1,z,'snow');}}
 // Rubble belongs to the terrain-adaptation pass, which places it on real ground.
 return {cells:t.cells,footprint:t.footprint,loot,height:Math.max(...[...t.cells.keys()].map(k=>Number(k.split(',')[1]))),palette:p};
}
export function transform(x,z,rotation,mirror=false){if(mirror)x=-x;return rotation===1?[-z,x]:rotation===2?[-x,-z]:rotation===3?[z,-x]:[x,z];}
