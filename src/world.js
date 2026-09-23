import {SpatialLights} from './spatial-lights.js?v=37';
import {expandedClimate,regionalClimate,regionalSurface} from './regional-climate.js?v=37';
import {StructureGenerator} from './structure-generator.js?v=37';
import {climateAt,blendedSurface,smooth} from './climate.js?v=37';
import {BIOME_DEFINITIONS} from './biome-registry.js?v=37';
import {EditMap} from './edit-map.js?v=37';
import { netherHeight,netherBlock } from './nether.js?v=37';
import { BLOCKS, BIOMES, LANDMARKS, hash } from './data.js?v=37';
import { canonicalItem } from './resource-map.js?v=37';
import { terrainHeight,treeAt,growTree,plantAt } from './landscape.js?v=37';
import { boxesFor,overlapsBlock,rayShape } from './shapes.js?v=37';
import { CLOUDSTEP,courseGeometry } from './parkour-course.js?v=37';
export const CHUNK=16, WORLD_LIMIT=Infinity, WORLD_BOTTOM=-64, WORLD_TOP=95, SEA_LEVEL=4;
export const cellKey=(x,y,z)=>`${x},${y},${z}`;
export class World {
  constructor(seed=7821,edits=[],terrain=6,dimension='overworld') {
    this.seed=seed;this.terrain=terrain;this.dimension=dimension;this.edits=new EditMap(edits);this.structures=new Map();this.structureLights=new SpatialLights();this.columns=new Map();this.prepared=new Set();this.dirty=new Set();this.chests=[];this.changes=[];
    this.course=dimension==='parkour'?courseGeometry():null;
    this.landmarks=LANDMARKS.map(l=>({...l,y:this.height(l.x,l.z)+1}));
    if(this.course)this.landmarks=CLOUDSTEP.checkpoints.map((cp,i)=>({...cp,id:'course-'+i,type:'landscape',subtitle:'Cloudstep checkpoint',color:'#a9e8ce'}));
    if(dimension==='overworld')for(const [id,name,x,z,color]of [['badlands','Badlands · Draugr Knights',240,180,'#b77745'],['savanna','Savanna',220,-60,'#a2a063'],['marsh','Marsh',-240,200,'#75815a']])this.landmarks.push({id,name,x,z,y:this.height(x,z)+1,color,type:'landscape',subtitle:id==='badlands'?'Hunt knights for Knight Hearts':'Explore a new biome'});
    if(dimension==='ender')this.landmarks=[{id:'camp',name:'Arrival island',subtitle:'Ender Gate: use E to return to Survival',x:0,y:19,z:0,type:'landscape',color:'#b9a3ff'},{id:'spire',name:'Obsidian spires',subtitle:'Moonstone and violet crystal',x:48,y:24,z:0,type:'landscape',color:'#ac83e8'}];
    if(dimension==='nether')this.landmarks=[{id:'nether-camp',name:'Nether Gate',subtitle:'Find the gateway to the Ender world',x:0,y:20,z:0,type:'landscape',color:'#e77d5d'},{id:'nether-fortress',name:'Ashen Fortress',subtitle:'A dangerous route lies beyond',x:72,y:25,z:-48,type:'landscape',color:'#d59a70'}];
    this.makeCamp();this.chunkTops=new Map();this.ruins=this.terrain>=7&&dimension==='overworld'?new StructureGenerator(this):null;
  }
  noise(x,z,scale){const a=Math.floor(x/scale),b=Math.floor(z/scale);let u=x/scale-a,v=z/scale-b;u=u*u*(3-2*u);v=v*v*(3-2*v);return (hash(a,b,this.seed)*(1-u)+hash(a+1,b,this.seed)*u)*(1-v)+(hash(a,b+1,this.seed)*(1-u)+hash(a+1,b+1,this.seed)*u)*v;}
  biome(x,z){return this.terrain>=7&&this.dimension==='overworld'?this.column(Math.floor(x),Math.floor(z)).biome:this.legacyBiome(x,z);}
  legacyBiome(x,z){if(this.dimension==='ender')return 'ender';if(this.dimension==='nether')return 'nether';const n=this.noise(x+170,z-85,160);if(x>145+n*25&&z>115)return 'badlands';if(x<-170&&z>145+n*25)return 'marsh';if(x>150&&z>-135&&z<15)return 'savanna';if(z<-155&&n>.32)return 'snow';if(x>115&&n>.46)return 'desert';if(n<.24||x<-55&&z>-135)return 'forest';if(n>.76&&Math.hypot(x,z)>95)return 'mountain';return 'meadow';}
  column(x,z){
    const key=`${x},${z}`;if(this.columns.has(key))return this.columns.get(key);
    if(this.course){const c={h:this.course.heights.get(key)??-64,biome:'meadow',bottom:5,river:999};this.columns.set(key,c);return c;}
    if(this.dimension==='nether'){const h=netherHeight(this,x,z),c={h,biome:'nether',bottom:-18};this.columns.set(key,c);return c;}
    if(this.dimension==='ender'){
      const gx=Math.round(x/48),gz=Math.round(z/48),dx=x-gx*48,dz=z-gz*48;
      const central=gx===0&&gz===0,radius=central?24:15+hash(gx,gz,this.seed)*5;
      const angle=Math.atan2(dz,dx),d=Math.hypot(dx,dz),edge=radius+(central?1.2:2.8)*Math.sin(angle*3+hash(gx,gz,this.seed)*6)+Math.sin(angle*5)*1.2,exists=d<edge;
      const h=exists?(central?18:18+Math.floor(hash(gz,gx,this.seed)*4))+(central?0:Math.floor(this.noise(x,z,12)*2))+Math.floor(Math.max(0,d-9)*.09):-64;
      const c={h,biome:'ender',bottom:h-Math.max(3,Math.floor((1-d/edge)*16+this.noise(x,z,9)*3)),dx,dz,central,exists,river:999};this.columns.set(key,c);return c;
    }
    let biome=this.legacyBiome(x,z);const large=this.noise(x,z,78),detail=this.noise(x+37,z-51,22);
    let h=10+large*15+detail*5;
    if(this.terrain>=6)h=terrainHeight(this,x,z);else if(biome==='mountain'||biome==='snow')h+=Math.pow(this.noise(x-140,z+95,44),1.7)*38;
    const river=Math.abs(z-(66+Math.sin(x*.013)*21+Math.sin(x*.039)*5));
    if(river<17){const a=Math.min(1,(17-river)/12);h=h*(1-a)+(SEA_LEVEL-2)*a;}
    // Preserve the original island, then blend into new continents past its ocean.
    const coast=Math.hypot(x*.92,z*.87);
    if(this.terrain<7&&coast>405){const returnToLand=Math.max(0,Math.min(1,(coast-690)/160));h-=(coast-405)*.65*(1-returnToLand);}
    const region=this.terrain>=7?smooth(280,540,Math.hypot(x,z)):0,climate=region>0?(this.terrain>=10?expandedClimate:this.terrain>=8?regionalClimate:climateAt)(this.seed,x,z):null;
    if(this.terrain>=8){const mesa=smooth(145,210,x)*smooth(115,175,z);h+=mesa*smooth(.28,.64,this.noise(x+57,z-93,90))*24;}
    if(climate){h=h*(1-region)+climate.h*region;if(region>.5)biome=climate.biome;}
    const d=Math.hypot(x,z-12);if(d<42){const a=Math.max(0,Math.min(1,(42-d)/22));h=h*(1-a)+6*a;}
    h=Math.max(this.terrain>=7?-36:-7,Math.min(this.terrain>=7?78:70,Math.floor(h)));
    const wrap=(n,span)=>((n+span/2)%span+span)%span-span/2,cx=Math.floor(x/52),cz=Math.floor(z/52),px=cx*52+20+hash(cx,cz,this.seed)*12,pz=cz*52+22;const v={h,biome,climate,region,t1:-16+Math.sin(z*.047)*5,t2:-34+Math.sin(x*.039)*7,river,a2:(wrap(x-Math.sin(z*.033)*17,80)/3.2)**2,b2:(wrap(z-Math.sin(x*.035)*19,88)/4.4)**2,chamber:((x-px)/13)**2+((z-pz)/16)**2,cy:-22-hash(cz,cx,this.seed+7)*23,rock:this.noise(x+9,z-31,28)>.7?'granite':this.noise(x-67,z+84,34)>.64?'limestone':'stone'};this.columns.set(key,v);return v;
  }
  pruneCache(cx,cz,radius=8){
    // Retain nearby terrain so travel does not periodically regenerate the entire view.
    const outside=(x,z)=>Math.abs(Math.floor(x/16)-cx)>radius||Math.abs(Math.floor(z/16)-cz)>radius;
    for(const key of this.columns.keys()){const [x,z]=key.split(',').map(Number);if(outside(x,z))this.columns.delete(key);}
    for(const key of this.structures.keys()){const [x,,z]=key.split(',').map(Number);if(outside(x,z)){this.structureLights.update(key,null,this.structures.get(key));this.structures.delete(key);}}
    for(const key of this.prepared){const [x,z]=key.split(',').map(Number);if(Math.abs(x-cx)>radius||Math.abs(z-cz)>radius)this.prepared.delete(key);}
    for(const tag of this.chunkTops.keys()){const[x,z]=tag.split(',').map(Number);if(Math.abs(x-cx)>radius||Math.abs(z-cz)>radius)this.chunkTops.delete(tag);}
    this.ruins?.prune(cx,cz,radius);this.makeCamp();
  }
  height(x,z){return this.column(Math.floor(x),Math.floor(z)).h;}
  findSpawn(){if(this.course)return {...CLOUDSTEP.spawn};if(this.dimension==='ender')return{x:.5,y:19,z:8.5};if(this.dimension==='nether')return{x:.5,y:25,z:8.5};
    // A seed gives one repeatable, dry clearing. Existing saves keep their position.
    for(let i=0;i<240;i++){
      const x=Math.floor((hash(i*7919,173,this.seed)-.5)*560),z=Math.floor((hash(i*104729,941,this.seed+47)-.5)*560),y=this.height(x,z)+1;
      if(Math.hypot(x,z)<65||y<SEA_LEVEL+3||y>65||this.biome(x,z)==='badlands')continue;
      let safe=true;
      for(let dx=-1;dx<=1&&safe;dx++)for(let dz=-1;dz<=1;dz++){
        if(Math.abs(this.height(x+dx,z+dz)+1-y)>1||!this.solid(x+dx,y-1,z+dz)||this.waterAt(x+dx,y,z+dz)||this.intersects(x+dx+.5,y,z+dz+.5))safe=false;
      }
      if(safe)return{x:x+.5,y,z:z+.5};
    }
    return{x:.5,y:7,z:20.5};
  }
  caveNode(cx,cz){
    const ox=(hash(cx,cz,this.seed+701)-.5)*22,oz=(hash(cz,cx,this.seed+709)-.5)*22;
    return {x:cx*64+32+ox,z:cz*64+32+oz,y:-20-Math.floor(hash(cx,cz,this.seed+719)*30)};
  }
  caveNetwork(x,y,z){
    // A jittered grid makes rooms and tunnels that stay connected as far as the player explores.
    const cx=Math.floor(x/64),cz=Math.floor(z/64), point={x,y,z};
    const near=(a,b,r)=>{
      const vx=b.x-a.x,vy=b.y-a.y,vz=b.z-a.z,wx=point.x-a.x,wy=point.y-a.y,wz=point.z-a.z;
      const length=vx*vx+vy*vy+vz*vz, t=length?Math.max(0,Math.min(1,(wx*vx+wy*vy+wz*vz)/length)):0;
      const dx=point.x-(a.x+vx*t),dy=point.y-(a.y+vy*t),dz=point.z-(a.z+vz*t);
      return dx*dx+dy*dy+dz*dz<r*r;
    };
    for(let ix=cx-1;ix<=cx+1;ix++)for(let iz=cz-1;iz<=cz+1;iz++){
      const node=this.caveNode(ix,iz),dx=x-node.x,dz=z-node.z;
      if((dx*dx)/144+(dz*dz)/169+((y-node.y)*(y-node.y))/81<1)return true;
      if(near(node,this.caveNode(ix+1,iz),3.2)||near(node,this.caveNode(ix,iz+1),3.2))return true;
    }
    return false;
  }
  spawnFacing(p){
    let best=0,score=-Infinity;
    for(let i=0;i<16;i++){const yaw=i*Math.PI/8;let open=0;
      for(const offset of [-.35,0,.35]){const dir={x:-Math.sin(yaw+offset),y:0,z:-Math.cos(yaw+offset)},hit=this.raycast({x:p.x,y:p.y+1.6,z:p.z},dir,22);open+=hit?.distance??22;}
      if(open>score){score=open;best=yaw;}
    }return best;
  }
  inCave(x,y,z,column=this.column(x,z)){
    if(y>=column.h-4||y<WORLD_BOTTOM+5)return false;
    if(this.terrain>=10&&this.caveNetwork(x,y,z))return true;
    if(column.a2+((y-column.t1)/3.4)**2<1||column.b2+((y-column.t2)/4.5)**2<1||column.chamber+((y-column.cy)/8)**2<1)return true;
    // The nearby hillside entrance opens into a dry chamber and a natural tunnel.
    return ((x-23)/12)**2+((z+31)/16)**2+((y+16)/7)**2<1;
  }
  base(x,y,z,column=null){
    if((!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z))||y<WORLD_BOTTOM||y>WORLD_TOP)return null;
    if(this.course)return this.course.blocks.get(cellKey(x,y,z))??null;
    if(this.dimension==='nether')return netherBlock(this,x,y,z);
    if(this.dimension==='ender'){
      const c=this.column(x,z);if(!c.exists)return null;
      if(x===0&&z===0&&y===19)return 'ender_gate';
      if(c.central&&z===0&&y>=19&&y<=23&&(Math.abs(x)===2||y===23&&Math.abs(x)<2))return 'obsidian';
      if(y===c.h&&((Math.abs(c.dx)<=1&&Math.abs(c.dz)===10)||(Math.abs(c.dz)<=1&&Math.abs(c.dx)===10)))return 'launch_pad';
      const spireHeight=c.central?8:6+Math.floor(hash(Math.round(x/48),Math.round(z/48),this.seed)*6);
      if(Math.abs(c.dx-5)<=1&&Math.abs(c.dz+4)<=1&&y>c.h&&y<=c.h+spireHeight)return y===c.h+spireHeight?'violet_crystal':'obsidian';
      if(!c.central&&c.dz===4&&y>c.h&&y<=c.h+4&&(Math.abs(c.dx)===4||y===c.h+4&&Math.abs(c.dx)<4))return 'end_bricks';
      if(y>c.h||y<c.bottom)return null;
      if(y===c.h)return 'end_stone';
      return hash(Math.floor(x/3)+Math.floor(y/3)*127,Math.floor(z/3),this.seed+52)>.6&&hash(x+y*127,z,this.seed)<.07?'moonstone':y<c.bottom+2?'obsidian':'end_stone';
    }
    if(!column)this.prepare(Math.floor(x/16),Math.floor(z/16));
    const key=cellKey(x,y,z);if(this.structures.has(key))return this.structures.get(key);
    const c=column||this.column(x,z),h=c.h;
    if(y===WORLD_BOTTOM)return 'bedrock';
    // Walk down a covered, five-block-wide slope into the cave, rather than a flooded shaft.
    if(x>=20&&x<=24&&z<=10&&z>=-32){const floor=this.height(22,10)-Math.floor((10-z)*.65);if(y>floor&&y<floor+6)return null;}
    if(y>h)return h<SEA_LEVEL&&y<=SEA_LEVEL?(this.terrain>=8&&y===SEA_LEVEL&&(['snow','snow_plains','frozen_badlands'].includes(c.biome)||c.climate?.cold>.65)?'ice':'water'):null;
    if(this.inCave(x,y,z,c))return y<-52?'lava':null;
    if((c.biome==='badlands'||c.biome==='frozen_badlands')&&y<=h&&y>h-15)return y===h?(c.biome==='frozen_badlands'?'snow':'red_sand'):['red_terracotta','ochre_terracotta','red_terracotta','chalk'][Math.floor((y+96)/3)%4];
    if(c.biome==='marsh'&&y===h&&this.noise(x+91,z,12)>.58)return 'water';
    if(y===h&&c.region>.5&&this.terrain>=8)return regionalSurface({...c.climate,h,biome:c.biome},x,z,this.seed);
    if(y===h&&c.region>.5)return blendedSurface({...c.climate,h},x,z,this.seed);
    if(y>h-4&&c.region>.5)return y===h-3&&c.climate.river<22?'clay':BIOME_DEFINITIONS[c.biome].subsurface;
    if(y===h)return h<=SEA_LEVEL+1?'sand':h>48&&!['savanna','marsh'].includes(c.biome)?'snow':BIOMES[c.biome].top;
    if(y>h-4)return c.biome==='desert'?'sand':y===h-3&&c.river<22?'clay':'dirt';
    const rock=y<-49?'basalt':y<-38?'slate':c.rock==='limestone'&&y<-5?'marble':c.rock;
    if(y>h-8)return rock;
    // Veins occur only beneath a substantial layer of soil/rock.
    const vein=hash(Math.floor(x/3)+Math.floor(y/3)*127,Math.floor(z/3),this.seed+93),fleck=hash(x+y*117,z-y*43,this.seed);
    // Broad barren patches separate smaller, broken veins. The seed keeps them stable.
    const region=hash(Math.floor(x/24)+Math.floor(y/18)*73,Math.floor(z/24),this.seed+517);
    if(region>.35&&fleck<.55){if(vein<.025&&y<-30)return 'diamond';if(vein<.05&&y<-18)return 'gold';if(vein<.125)return 'iron';if(vein<.19)return 'coal';}
    return rock;
  }
  get(x,y,z){const k=cellKey(x,y,z),type=this.edits.has(k)?this.edits.get(k):this.base(x,y,z);return canonicalItem(type);}
  getPrepared(x,y,z,column){const k=cellKey(x,y,z);return canonicalItem(this.edits.has(k)?this.edits.get(k):this.base(x,y,z,column));}
  solid(x,y,z){return !!BLOCKS[this.get(x,y,z)]?.solid;}
  hydrated(x,y,z){for(let a=-4;a<=4;a++)for(let b=-4;b<=4;b++)if(this.waterAt(x+a,y,z+b)||this.waterAt(x+a,y-1,z+b))return true;return false;}
  waterAt(x,y,z){return this.get(Math.floor(x),Math.floor(y),Math.floor(z))==='water';}
  set(x,y,z,type){
    if(this.course)return false;
    if(![x,y,z].every(Number.isInteger)||Math.abs(x)>WORLD_LIMIT||Math.abs(z)>WORLD_LIMIT||y<=WORLD_BOTTOM||y>WORLD_TOP-1||type&&!BLOCKS[type])return false;
    if(this.get(x,y,z)==='bedrock')return false;this.edits.set(cellKey(x,y,z),type);this.changes.push([cellKey(x,y,z),type]);
    for(const[a,b]of[[x,z],[x-1,z],[x+1,z],[x,z-1],[x,z+1]])this.dirty.add(`${Math.floor(a/16)},${Math.floor(b/16)}`);return true;
  }
  ground(x,z,from=WORLD_TOP){const bx=Math.floor(x),bz=Math.floor(z),fx=x-bx,fz=z-bz;for(let y=Math.min(WORLD_TOP,Math.floor(from));y>=WORLD_BOTTOM;y--){const type=this.get(bx,y,bz);if(!BLOCKS[type]?.solid)continue;const tops=boxesFor(type).filter(b=>fx>=b[0]&&fx<=b[3]&&fz>=b[2]&&fz<=b[5]).map(b=>b[4]);if(tops.length)return y+Math.max(...tops);}return WORLD_BOTTOM-1;}
  prepare(cx,cz){if(this.dimension!=='overworld')return;
    if(this.terrain<6)return this.prepareLegacy(cx,cz);
    const tag=`${cx},${cz}`;if(this.prepared.has(tag))return;this.prepared.add(tag);
    const sites=this.ruins?.forChunk(cx,cz)||[],reserved=new Set();
    const stamp=(x,y,z,type)=>{if(Math.floor(x/16)!==cx||Math.floor(z/16)!==cz||y>WORLD_TOP||y<=WORLD_BOTTOM)return;const k=cellKey(x,y,z);this.structureLights.update(k,type,this.structures.get(k));this.structures.set(k,type);reserved.add(k);if(type)this.chunkTops.set(tag,Math.max(this.chunkTops.get(tag)||0,y+2));};
    this.ruins?.stamp(cx,cz,sites,stamp);
    const put=(x,y,z,type)=>{if(Math.floor(x/16)!==cx||Math.floor(z/16)!==cz)return;const key=cellKey(x,y,z),old=this.structures.get(key);if(reserved.has(key))return;if(!this.structures.has(key)||['leaf','pine','autumnleaf','cherry_leaf'].includes(old)){this.structures.set(key,type);this.chunkTops.set(tag,Math.max(this.chunkTops.get(tag)||0,y+2));}};
    const margin=this.terrain>=7?6:4;
    for(let x=cx*16-margin;x<cx*16+16+margin;x++)for(let z=cz*16-margin;z<cz*16+16+margin;z++){
      const c=this.column(x,z),safe=Math.hypot(x,z-14)<9||x>16&&x<29&&z>-38&&z<16;
      if(safe||c.h<(this.terrain>=8?SEA_LEVEL+1:SEA_LEVEL)||c.h>(this.terrain>=7?70:58)||this.ruins?.reserved(x,z,sites,3))continue;
      if(c.h<=SEA_LEVEL+2&&c.river<14){if(hash(x,z,this.seed+32)>.982)put(x,c.h+1,z,'cane');continue;}
      if(c.biome==='desert'||c.biome==='badlands'){if(hash(x,z,this.seed+32)>.997)for(let y=1;y<=2+Math.floor(hash(z,x,this.seed)*2);y++)put(x,c.h+y,z,'cactus');continue;}
      if(c.biome==='marsh'&&this.noise(x+91,z,12)>.58){if(hash(x,z,this.seed+32)>.97)put(x,c.h+1,z,'cane');continue;}
      const tree=treeAt(this,x,z,c.biome);
      if(tree&&!(this.terrain>=8&&['water','ice'].includes(this.baseSurface(x,z)))){growTree(this,put,x,c.h,z,tree);continue;}
      const plant=plantAt(this,x,z,c.biome);if(plant)put(x,c.h+1,z,plant);
    }
  }
  baseSurface(x,z){const c=this.column(x,z);return c.biome==='marsh'&&this.noise(x+91,z,12)>.58?'water':c.h<SEA_LEVEL?'water':'land';}
  biomeAtHeight(x,y,z){return this.dimension==='overworld'&&y<this.height(x,z)-6?(y<-28?'deep_cave':'cave'):this.biome(x,z);}
  prepareLegacy(cx,cz){
    const tag=`${cx},${cz}`;if(this.prepared.has(tag))return;this.prepared.add(tag);
    const put=(x,y,z,t)=>{if(Math.floor(x/16)===cx&&Math.floor(z/16)===cz){const k=cellKey(x,y,z);if(!this.structures.has(k)||this.structures.get(k)==='leaf'||this.structures.get(k)==='pine')this.structures.set(k,t);}};
    for(let x=cx*16-3;x<cx*16+19;x++)for(let z=cz*16-3;z<cz*16+19;z++){
      const c=this.column(x,z),n=hash(x,z,this.seed+32),camp=Math.hypot(x,z-14)<9,entrance=x>16&&x<29&&z>-38&&z<16;
      if(!camp&&!entrance&&c.h>=SEA_LEVEL&&c.h<=SEA_LEVEL+2&&c.river<14&&n>.982){put(x,c.h+1,z,'cane');continue;}
      if(camp||entrance||c.h<SEA_LEVEL+2||c.h>48)continue;
      const threshold=c.biome==='forest'?.988:c.biome==='snow'?.991:.996;
      if(c.biome==='desert'){if(n>.9985)for(let a=1;a<4;a++)put(x,c.h+a,z,'cactus');continue;}
      if(n<threshold){
        const flora=hash(x,z,this.seed+218),patch=this.noise(x+312,z-119,28);
        if(c.biome!=='snow'&&c.biome!=='mountain'&&patch>.63&&flora>.952){
          const plants=c.biome==='forest'?['fern','fern','mushroom','berries_crop','daisy']:['flower_red','flower_blue','daisy','lavender','cotton_crop','wheat_crop','carrot_crop','potato_crop','corn_crop','tomato_crop','watermelon_crop','melon_crop'];
          const pick=hash(Math.floor(x/24),Math.floor(z/24),this.seed+371),type=plants[Math.min(plants.length-1,Math.floor(pick*plants.length))];
          put(x,c.h+1,z,type);
        }
        continue;
      }
      const birch=hash(z,x,this.seed+4)>.65,wood=c.biome==='snow'?'pinewood':birch?'birch':'wood',leaf=c.biome==='snow'?'pine':'leaf',tall=5+Math.floor(hash(x,z,this.seed+65)*3);
      for(let y=1;y<=tall;y++)put(x,c.h+y,z,wood);
      for(let a=-3;a<=3;a++)for(let b=-3;b<=3;b++)for(let dy=-1;dy<=3;dy++){
        const radius=c.biome==='snow'?Math.max(0,3-Math.floor((dy+1)*.65)):dy===3?1:dy===-1?2:3;
        if(Math.abs(a)+Math.abs(b)>radius+1||Math.max(Math.abs(a),Math.abs(b))>radius||a===0&&b===0&&dy<=0)continue;
        put(x+a,c.h+tall+dy,z+b,leaf);
      }
    }
  }
  makeCamp(){if(this.dimension!=='overworld')return;
    // One modest starter shelter. The landscape is for the player to build on.
    const l=this.landmarks[0],y=l.y;
    for(let x=-3;x<=3;x++)for(let z=-2;z<=2;z++)this.structures.set(cellKey(l.x+x,y-1,l.z+z),'plank');
    for(const x of[-3,3])for(const z of[-2,2])for(let h=0;h<4;h++)this.structures.set(cellKey(l.x+x,y+h,l.z+z),'wood');
    for(let x=-4;x<=4;x++)for(let z=-3;z<=3;z++)this.structures.set(cellKey(l.x+x,y+4+Math.floor((4-Math.abs(x))*.5),l.z+z),'pine_plank');
    if(!this.chests.some(c=>c.id==='starter'))this.chests.push({id:'starter',x:1,y,z:15,loot:{wood:6,apple:4,coal:4,wheat:6}});
  }
  intersects(x,y,z,height=1.75,radius=.28){for(let a=Math.floor(x-radius);a<=Math.floor(x+radius);a++)for(let b=Math.floor(y+.001);b<=Math.floor(y+height-.001);b++)for(let c=Math.floor(z-radius);c<=Math.floor(z+radius);c++)if(overlapsBlock(this.get(a,b,c),a,b,c,x,y,z,height,radius))return true;return false;}
  raycast(origin,direction,max=6){
    let x=Math.floor(origin.x),y=Math.floor(origin.y),z=Math.floor(origin.z),distance=0,normal={x:0,y:0,z:0};
    const sx=Math.sign(direction.x),sy=Math.sign(direction.y),sz=Math.sign(direction.z),dx=Math.abs(1/direction.x),dy=Math.abs(1/direction.y),dz=Math.abs(1/direction.z);
    let tx=sx?(sx>0?x+1-origin.x:origin.x-x)*dx:Infinity,ty=sy?(sy>0?y+1-origin.y:origin.y-y)*dy:Infinity,tz=sz?(sz>0?z+1-origin.z:origin.z-z)*dz:Infinity;
    for(let i=0;i<256&&distance<=max;i++){const type=this.get(x,y,z);if(type&&type!=='water'){if(!BLOCKS[type].boxes)return{x,y,z,type,distance,normal};const hit=rayShape(origin,direction,x,y,z,type,max);if(hit)return{x,y,z,type,...hit};}if(tx<ty&&tx<tz){x+=sx;distance=tx;tx+=dx;normal={x:-sx,y:0,z:0};}else if(ty<tz){y+=sy;distance=ty;ty+=dy;normal={x:0,y:-sy,z:0};}else{z+=sz;distance=tz;tz+=dz;normal={x:0,y:0,z:-sz};}}return null;
  }
}
