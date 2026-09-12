import { BLOCKS, BIOMES, LANDMARKS, hash } from './data.js?v=10';
import { terrainHeight,treeAt,growTree,plantAt } from './landscape.js?v=10';
import { boxesFor,overlapsBlock,rayShape } from './shapes.js?v=10';
export const CHUNK=16, WORLD_LIMIT=511, WORLD_BOTTOM=-64, WORLD_TOP=95, SEA_LEVEL=4;
export const cellKey=(x,y,z)=>`${x},${y},${z}`;
export class World {
  constructor(seed=7821,edits=[],terrain=6,dimension='overworld') {
    this.seed=seed;this.terrain=terrain;this.dimension=dimension;this.edits=new Map(edits);this.structures=new Map();this.columns=new Map();this.prepared=new Set();this.dirty=new Set();this.chests=[];this.changes=[];
    this.landmarks=LANDMARKS.map(l=>({...l,y:this.height(l.x,l.z)+1}));
    if(dimension==='ender')this.landmarks=[{id:'camp',name:'Arrival island',subtitle:'Ender Gate: use E to return to Survival',x:0,y:19,z:0,type:'landscape',color:'#b9a3ff'},{id:'spire',name:'Obsidian spires',subtitle:'Moonstone and violet crystal',x:48,y:24,z:0,type:'landscape',color:'#ac83e8'}];
    this.makeCamp();
  }
  noise(x,z,scale){const a=Math.floor(x/scale),b=Math.floor(z/scale);let u=x/scale-a,v=z/scale-b;u=u*u*(3-2*u);v=v*v*(3-2*v);return (hash(a,b,this.seed)*(1-u)+hash(a+1,b,this.seed)*u)*(1-v)+(hash(a,b+1,this.seed)*(1-u)+hash(a+1,b+1,this.seed)*u)*v;}
  biome(x,z){if(this.dimension==='ender')return 'ender';const n=this.noise(x+170,z-85,160);if(z<-155&&n>.32)return 'snow';if(x>115&&n>.46)return 'desert';if(n<.24||x<-55&&z>-135)return 'forest';if(n>.76&&Math.hypot(x,z)>95)return 'mountain';return 'meadow';}
  column(x,z){
    const key=`${x},${z}`;if(this.columns.has(key))return this.columns.get(key);
    if(this.dimension==='ender'){
      const gx=Math.round(x/48),gz=Math.round(z/48),dx=x-gx*48,dz=z-gz*48;
      const central=gx===0&&gz===0,radius=central?24:15+hash(gx,gz,this.seed)*5;
      const angle=Math.atan2(dz,dx),d=Math.hypot(dx,dz),edge=radius+(central?1.2:2.8)*Math.sin(angle*3+hash(gx,gz,this.seed)*6)+Math.sin(angle*5)*1.2,exists=d<edge;
      const h=exists?(central?18:18+Math.floor(hash(gz,gx,this.seed)*4))+(central?0:Math.floor(this.noise(x,z,12)*2))+Math.floor(Math.max(0,d-9)*.09):-64;
      const c={h,biome:'ender',bottom:h-Math.max(3,Math.floor((1-d/edge)*16+this.noise(x,z,9)*3)),dx,dz,central,exists,river:999};this.columns.set(key,c);return c;
    }
    const biome=this.biome(x,z),large=this.noise(x,z,78),detail=this.noise(x+37,z-51,22);
    let h=10+large*15+detail*5;
    if(this.terrain>=6)h=terrainHeight(this,x,z);else if(biome==='mountain'||biome==='snow')h+=Math.pow(this.noise(x-140,z+95,44),1.7)*38;
    const river=Math.abs(z-(66+Math.sin(x*.013)*21+Math.sin(x*.039)*5));
    if(river<17){const a=Math.min(1,(17-river)/12);h=h*(1-a)+(SEA_LEVEL-2)*a;}
    const coast=Math.hypot(x*.92,z*.87);if(coast>405)h-=(coast-405)*.65;
    const d=Math.hypot(x,z-12);if(d<42){const a=Math.max(0,Math.min(1,(42-d)/22));h=h*(1-a)+6*a;}
    h=Math.max(-7,Math.min(70,Math.floor(h)));
    const wrap=(n,span)=>((n+span/2)%span+span)%span-span/2,cx=Math.floor(x/52),cz=Math.floor(z/52),px=cx*52+20+hash(cx,cz,this.seed)*12,pz=cz*52+22;const v={h,biome,t1:-16+Math.sin(z*.047)*5,t2:-34+Math.sin(x*.039)*7,river,a2:(wrap(x-Math.sin(z*.033)*17,80)/3.2)**2,b2:(wrap(z-Math.sin(x*.035)*19,88)/4.4)**2,chamber:((x-px)/13)**2+((z-pz)/16)**2,cy:-22-hash(cz,cx,this.seed+7)*23,rock:this.noise(x+9,z-31,28)>.7?'granite':this.noise(x-67,z+84,34)>.64?'limestone':'stone'};this.columns.set(key,v);return v;
  }
  height(x,z){return this.column(Math.floor(x),Math.floor(z)).h;}
  findSpawn(){if(this.dimension==='ender')return{x:.5,y:19,z:8.5};
    // A seed gives one repeatable, dry clearing. Existing saves keep their position.
    for(let i=0;i<240;i++){
      const x=Math.floor((hash(i*7919,173,this.seed)-.5)*560),z=Math.floor((hash(i*104729,941,this.seed+47)-.5)*560),y=this.height(x,z)+1;
      if(Math.hypot(x,z)<65||y<SEA_LEVEL+3||y>65)continue;
      let safe=true;
      for(let dx=-1;dx<=1&&safe;dx++)for(let dz=-1;dz<=1;dz++){
        if(Math.abs(this.height(x+dx,z+dz)+1-y)>1||!this.solid(x+dx,y-1,z+dz)||this.waterAt(x+dx,y,z+dz)||this.intersects(x+dx+.5,y,z+dz+.5))safe=false;
      }
      if(safe)return{x:x+.5,y,z:z+.5};
    }
    return{x:.5,y:7,z:20.5};
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
    if(column.a2+((y-column.t1)/3.4)**2<1||column.b2+((y-column.t2)/4.5)**2<1||column.chamber+((y-column.cy)/8)**2<1)return true;
    // The nearby hillside entrance opens into a dry chamber and a natural tunnel.
    return ((x-23)/12)**2+((z+31)/16)**2+((y+16)/7)**2<1;
  }
  base(x,y,z){
    if(Math.abs(x)>WORLD_LIMIT||Math.abs(z)>WORLD_LIMIT||y<WORLD_BOTTOM||y>WORLD_TOP)return null;
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
      return hash(x+y*127,z,this.seed)<.085?'moonstone':y<c.bottom+2?'obsidian':'end_stone';
    }
    this.prepare(Math.floor(x/16),Math.floor(z/16));
    const key=cellKey(x,y,z);if(this.structures.has(key))return this.structures.get(key);
    const c=this.column(x,z),h=c.h;
    if(y===WORLD_BOTTOM)return 'bedrock';
    // Walk down a covered, five-block-wide slope into the cave, rather than a flooded shaft.
    if(x>=20&&x<=24&&z<=10&&z>=-32){const floor=this.height(22,10)-Math.floor((10-z)*.65);if(y>floor&&y<floor+6)return null;}
    if(y>h)return h<SEA_LEVEL&&y<=SEA_LEVEL?'water':null;
    if(this.inCave(x,y,z,c))return null;
    if(y===h)return h<=SEA_LEVEL+1?'sand':h>48?'snow':BIOMES[c.biome].top;
    if(y>h-4)return c.biome==='desert'?'sand':y===h-3&&c.river<22?'clay':'dirt';
    const rock=y<-49?'basalt':y<-38?'slate':c.rock==='limestone'&&y<-5?'marble':c.rock;
    if(y>h-8)return rock;
    // Veins occur only beneath a substantial layer of soil/rock.
    const vein=hash(Math.floor(x/3)+Math.floor(y/3)*127,Math.floor(z/3),this.seed+93),fleck=hash(x+y*117,z-y*43,this.seed);
    if(fleck<.72){if(vein>.24&&vein<.255&&y<-30)return 'ruby';if(vein>.255&&vein<.27&&y<-30)return 'sapphire';if(vein>.27&&vein<.285&&y<-30)return 'emerald';if(vein<.027&&y<-35)return 'diamond';if(vein<.045&&y<-22)return 'gold';if(vein<.075&&y<-12)return 'crystal';if(vein<.12)return 'iron';if(vein<.175&&y>-30)return 'copper';if(vein<.235)return 'coal';}
    return rock;
  }
  get(x,y,z){const k=cellKey(x,y,z);return this.edits.has(k)?this.edits.get(k):this.base(x,y,z);}
  solid(x,y,z){return !!BLOCKS[this.get(x,y,z)]?.solid;}
  hydrated(x,y,z){for(let a=-4;a<=4;a++)for(let b=-4;b<=4;b++)if(this.waterAt(x+a,y,z+b)||this.waterAt(x+a,y-1,z+b))return true;return false;}
  waterAt(x,y,z){return this.get(Math.floor(x),Math.floor(y),Math.floor(z))==='water';}
  set(x,y,z,type){
    if(![x,y,z].every(Number.isInteger)||Math.abs(x)>WORLD_LIMIT||Math.abs(z)>WORLD_LIMIT||y<=WORLD_BOTTOM||y>WORLD_TOP-1||type&&!BLOCKS[type])return false;
    if(this.get(x,y,z)==='bedrock')return false;this.edits.set(cellKey(x,y,z),type);this.changes.push([cellKey(x,y,z),type]);
    for(const[a,b]of[[x,z],[x-1,z],[x+1,z],[x,z-1],[x,z+1]])this.dirty.add(`${Math.floor(a/16)},${Math.floor(b/16)}`);return true;
  }
  ground(x,z,from=WORLD_TOP){const bx=Math.floor(x),bz=Math.floor(z),fx=x-bx,fz=z-bz;for(let y=Math.min(WORLD_TOP,Math.floor(from));y>=WORLD_BOTTOM;y--){const type=this.get(bx,y,bz);if(!BLOCKS[type]?.solid)continue;const tops=boxesFor(type).filter(b=>fx>=b[0]&&fx<=b[3]&&fz>=b[2]&&fz<=b[5]).map(b=>b[4]);if(tops.length)return y+Math.max(...tops);}return WORLD_BOTTOM-1;}
  prepare(cx,cz){if(this.dimension==='ender')return;
    if(this.terrain<6)return this.prepareLegacy(cx,cz);
    const tag=`${cx},${cz}`;if(this.prepared.has(tag))return;this.prepared.add(tag);
    const put=(x,y,z,type)=>{if(Math.floor(x/16)!==cx||Math.floor(z/16)!==cz)return;const key=cellKey(x,y,z),old=this.structures.get(key);if(!old||['leaf','pine','autumnleaf'].includes(old))this.structures.set(key,type);};
    for(let x=cx*16-4;x<cx*16+20;x++)for(let z=cz*16-4;z<cz*16+20;z++){
      const c=this.column(x,z),safe=Math.hypot(x,z-14)<9||x>16&&x<29&&z>-38&&z<16;
      if(safe||c.h<SEA_LEVEL||c.h>58)continue;
      if(c.h<=SEA_LEVEL+2&&c.river<14){if(hash(x,z,this.seed+32)>.982)put(x,c.h+1,z,'cane');continue;}
      if(c.biome==='desert'){if(hash(x,z,this.seed+32)>.999)for(let y=1;y<=2+Math.floor(hash(z,x,this.seed)*2);y++)put(x,c.h+y,z,'cactus');continue;}
      const tree=treeAt(this,x,z,c.biome);
      if(tree){growTree(this,put,x,c.h,z,tree);continue;}
      const plant=plantAt(this,x,z,c.biome);if(plant)put(x,c.h+1,z,plant);
    }
  }
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
  makeCamp(){if(this.dimension==='ender')return;
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
