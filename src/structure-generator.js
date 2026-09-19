import {BIOME_DEFINITIONS} from './biome-registry.js?v=33';
import {integerHash} from './climate.js?v=33';
import {STRUCTURE_TYPES,buildStructure,transform} from './structure-templates.js?v=33';
export const STRUCTURE_RULES=Object.freeze({cellSize:144,jitter:76,occupancy:.62,spacing:22,protectedRadius:520,maxSlope:4});
const key=(x,y,z)=>`${x},${y},${z}`;
const overlaps=(a,b,pad=0)=>Math.abs(a.x-b.x)<a.radius+b.radius+pad&&Math.abs(a.z-b.z)<a.radius+b.radius+pad;
export function ruinLoot(type,seed){const tier=STRUCTURE_TYPES[type].tier,n=integerHash(1,2,seed);return tier===0?{wood:3+Math.floor(n*5),apple:2,coal:2}:tier===1?{iron_ingot:2+Math.floor(n*3),bread:3,arrows:8}:tier===2?{iron_ingot:5,gold_ingot:2,diamond:1,arrows:12}:{diamond:2,gold_ingot:4,iron_ingot:7,golden_apple:1};}
export class StructureGenerator {
 constructor(world,rules=STRUCTURE_RULES){this.world=world;this.rules=rules;this.regions=new Map();this.layouts=new Map();this.registered=new Map();}
 candidate(mx,mz){
  const tag=`${mx},${mz}`;if(this.regions.has(tag))return this.regions.get(tag);
  const {world:w,rules:r}=this,seed=w.seed;let site=null;
  if(integerHash(mx,mz,seed+2201)<r.occupancy){
   const x=mx*r.cellSize+Math.floor(r.cellSize/2+(integerHash(mx,mz,seed+91)-.5)*r.jitter),z=mz*r.cellSize+Math.floor(r.cellSize/2+(integerHash(mx,mz,seed+191)-.5)*r.jitter),c=w.column(x,z),pool=BIOME_DEFINITIONS[c.biome]?.structures||[];
   const rarity=integerHash(mx,mz,seed+3421);let type=pool[Math.floor(integerHash(mx,mz,seed+2731)*pool.length)];
   if(rarity>.96&&pool.length)type='observatory';else if(rarity>.88&&pool.length)type='fortress';
   if(type){const def=STRUCTURE_TYPES[type],radius=def.radius+2,heights=[];let wet=false;
    for(const dx of[-radius,0,radius])for(const dz of[-radius,0,radius]){const column=w.column(x+dx,z+dz);heights.push(column.h);if(column.h<6||column.biome==='ocean'||column.biome==='marsh'&&w.noise(x+dx+91,z+dz,12)>.58)wet=true;}
    const slope=Math.max(...heights)-Math.min(...heights),y=Math.floor(heights.toSorted((a,b)=>a-b)[4])+1;
    if(Math.hypot(x,z)>r.protectedRadius+radius&&!wet&&slope<=r.maxSlope&&y<74){
     site={id:`ruin:${w.seed}:7:${mx}:${mz}`,mx,mz,type,biome:c.biome,x,y,z,radius,rotation:Math.floor(integerHash(mx,mz,seed+409)*4),mirror:integerHash(mx,mz,seed+419)>.5,seed:(integerHash(mx,mz,seed+431)*2147483647)|0,priority:integerHash(mx,mz,seed+443),slope};
    }
   }
  }
  this.regions.set(tag,site);return site;
 }
 accepted(site){if(!site)return false;for(let mx=site.mx-1;mx<=site.mx+1;mx++)for(let mz=site.mz-1;mz<=site.mz+1;mz++){const other=this.candidate(mx,mz);if(other&&other.id!==site.id&&overlaps(site,other,this.rules.spacing)&&(other.priority>site.priority||other.priority===site.priority&&other.id<site.id))return false;}return true;}
 forChunk(cx,cz){
  const r=this.rules.cellSize,mx=Math.floor((cx*16+8)/r),mz=Math.floor((cz*16+8)/r),chunk={x:cx*16+7.5,z:cz*16+7.5,radius:8},sites=[];
  for(let x=mx-1;x<=mx+1;x++)for(let z=mz-1;z<=mz+1;z++){const site=this.candidate(x,z);if(site&&overlaps(site,chunk,6)&&this.accepted(site))sites.push(site);}return sites;
 }
 layout(site){let layout=this.layouts.get(site.id);if(!layout){layout=buildStructure(site.type,site.seed,site.biome);this.layouts.set(site.id,layout);}return layout;}
 reserved(x,z,sites,margin=0){return sites.some(s=>Math.abs(s.x-x)<=s.radius+margin&&Math.abs(s.z-z)<=s.radius+margin);}
 stamp(cx,cz,sites,put){
  for(const site of sites){
   const layout=this.layout(site),world=this.world;
   for(const[k,type]of layout.cells){const[x,y,z]=k.split(',').map(Number),[dx,dz]=transform(x,z,site.rotation,site.mirror);put(site.x+dx,site.y+y,site.z+dz,type);}
   for(const point of layout.footprint){const[x,z]=point.split(',').map(Number),[dx,dz]=transform(x,z,site.rotation,site.mirror),wx=site.x+dx,wz=site.z+dz;if(Math.floor(wx/16)!==cx||Math.floor(wz/16)!==cz)continue;const ground=world.height(wx,wz);for(let y=ground;y<site.y-1;y++)put(wx,y,wz,layout.palette.floor);}
   for(let i=0;i<18;i++){const a=integerHash(i,7,site.seed)*Math.PI*2,r=site.radius-1+integerHash(i,8,site.seed)*2,x=site.x+Math.round(Math.cos(a)*r),z=site.z+Math.round(Math.sin(a)*r);if(integerHash(i,9,site.seed)>.5)put(x,world.height(x,z)+1,z,layout.palette.floor);}
   const[lx,lz]=transform(layout.loot.x,layout.loot.z,site.rotation,site.mirror),chest={id:site.id,x:site.x+lx,y:site.y+layout.loot.y,z:site.z+lz,loot:ruinLoot(site.type,site.seed),block:true,generated:true,name:STRUCTURE_TYPES[site.type].name};
   if(Math.floor(chest.x/16)===cx&&Math.floor(chest.z/16)===cz&&!this.registered.has(site.id)){
    this.registered.set(site.id,site);world.chests.push(chest);world.landmarks.push({id:site.id,x:site.x,y:site.y,z:site.z,name:chest.name,subtitle:STRUCTURE_TYPES[site.type].tier>1?'Ancient chambers · approach prepared':'Weathered stone and forgotten supplies',type:'ruin',color:'#b8a47f',generated:true,hidden:true});
   }
  }
 }
 prune(cx,cz,radius){
  const mx=Math.floor(cx*16/this.rules.cellSize),mz=Math.floor(cz*16/this.rules.cellSize),keep=Math.ceil(radius*16/this.rules.cellSize)+2;
  for(const[tag,site]of this.regions){const[x,z]=tag.split(',').map(Number);if(Math.abs(x-mx)>keep||Math.abs(z-mz)>keep){this.regions.delete(tag);if(site)this.layouts.delete(site.id);}}
  for(const[id,site]of this.registered)if(Math.abs(site.x/16-cx)>radius+3||Math.abs(site.z/16-cz)>radius+3)this.registered.delete(id);
  this.world.chests=this.world.chests.filter(c=>!c.generated||this.registered.has(c.id));this.world.landmarks=this.world.landmarks.filter(l=>!l.generated||this.registered.has(l.id));
 }
 find({x=0,z=0,radius=6,type}={}){
  const mx=Math.floor(x/this.rules.cellSize),mz=Math.floor(z/this.rules.cellSize),found=[];radius=Math.min(24,Math.max(1,radius));
  for(let a=mx-radius;a<=mx+radius;a++)for(let b=mz-radius;b<=mz+radius;b++){const site=this.candidate(a,b);if(site&&(!type||site.type===type)&&this.accepted(site))found.push({...site});}
  return found.sort((a,b)=>(a.x-x)**2+(a.z-z)**2-((b.x-x)**2+(b.z-z)**2));
 }
}
