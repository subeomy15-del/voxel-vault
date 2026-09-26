import {coordinateHash} from './coordinate-hash.js?v=38';
const cell=(x,y,z)=>`${x},${y},${z}`;
export function wreckAnchor(world,rx,rz){
 const x=rx*192+32+Math.floor(coordinateHash(rx,rz,world.seed+9511)*128),z=rz*192+32+Math.floor(coordinateHash(rz,rx,world.seed+9517)*128);
 if(!['ocean','beach','river'].includes(world.biome(x,z)))return null;
 const heights=[];for(const dx of[-10,0,10])for(const dz of[-10,0,10])heights.push(world.height(x+dx,z+dz));
 const high=Math.max(...heights),low=Math.min(...heights);if(high> -6||low< -25||high-low>3)return null;
 return {id:`wreck:${world.seed}:${rx}:${rz}`,x,y:high+1,z,rotation:coordinateHash(rx,rz,world.seed+9521)>.5?1:0};
}
export function wreckLayout(w,site){
 const blocks=new Map(),rotate=(x,z)=>site.rotation?[z,-x]:[x,z],put=(x,y,z,t)=>{const[a,b]=rotate(x,z);blocks.set(cell(site.x+a,site.y+y,site.z+b),t);};
 for(let z=-9;z<=9;z++){
  const width=Math.abs(z)>7?1:Math.abs(z)>5?2:3;
  for(let x=-width;x<=width;x++){
   put(x,0,z,'pine_plank');
   if(Math.abs(x)===width)for(let y=1;y<=3;y++)if(!(x>0&&z>=-3&&z<=0&&y<3))put(x,y,z,y===3?'wood':'pine_plank');
   if(z>2||z< -4||x===-width)put(x,3,z,'plank');
  }
  const[a,b]=rotate(0,z),bed=w.height(site.x+a,site.z+b);for(let y=bed+1;y<site.y;y++)blocks.set(cell(site.x+a,y,site.z+b),'wood');
 }
 // Raised stern cabin with an open doorway and a damaged roof.
 for(let z=4;z<=7;z++)for(let x=-2;x<=2;x++){
  for(let y=4;y<=5;y++)if((Math.abs(x)===2||z===7)&&!(x===2&&z===5))put(x,y,z,'plank');
  if(z>=6&&x<2)put(x,6,z,'pine_plank');
 }
 // Broad breaches expose ribs; the stern roof survives on just one side.
 for(let z=-8;z<=7;z++)for(let x=-3;x<=3;x++)for(let y=1;y<=6;y++){
  const [a,b]=rotate(x,z),k=cell(site.x+a,site.y+y,site.z+b);
  if((x===-3&&z>=-6&&z<=2&&z%3!==0)||(x===3&&z>=-5&&z<=1)||(y===3&&z>=-6&&z<=2&&x>-3)||(y>=5&&(x>=0||z<6)))blocks.delete(k);
 }
 // Splintered bow: remove planking but retain the seabed-supported keel.
 for(let z=-9;z<=-6;z++)for(let x=-3;x<=3;x++)for(let y=1;y<=3;y++){const[a,b]=rotate(x,z);if(x!==0||z< -7)blocks.delete(cell(site.x+a,site.y+y,site.z+b));}
 for(let y=1;y<=5;y++)put(0,y,-4,'wood');
 // Fallen mast lies across the torn deck, with a snapped yard below it.
 for(let x=0;x<=5;x++)put(x,Math.max(1,4-Math.floor(x/2)),-4,'wood');
 for(let z=-6;z<=-2;z++)put(4,1,z,'wood');
 // Loose ribs and cargo timber lie on the seabed, never suspended in water.
 for(const[dx,dz,len]of[[-5,-2,3],[5,4,2],[-4,7,2]])for(let i=0;i<len;i++){const[a,b]=rotate(dx,dz+i),bed=w.height(site.x+a,site.z+b);blocks.set(cell(site.x+a,bed+1,site.z+b),'pinewood');}
 for(let y=1;y<=4;y++)put(-1,y,3,'ladder');
 put(-2,1,5,'plank');put(-2,2,5,'plank');put(2,1,6,'plank');
 put(0,1,5,'treasure_chest');const[a,b]=rotate(0,5);
 return {blocks,chest:{x:site.x+a,y:site.y+1,z:site.z+b}};
}
export function registerWreck(g,site){
 const {chest}=wreckLayout(g.world,site);
 if(!g.world.chests.some(c=>c.id===site.id))g.world.chests.push({...chest,id:site.id,loot:{iron_ingot:3,gold_ingot:2,arrows:12,water_breathing_potion:1},block:true,name:'Saltwake wreck · salvage hold'});
 if(!g.world.landmarks.some(l=>l.id===site.id))g.world.landmarks.push({...site,type:'ruin',name:'Saltwake wreck',subtitle:'Broken deck · flooded cargo hold',color:'#80b6bc',hidden:true});
}
export function installWreck(g,site){
 const records=g.state.exploration.wrecks;if(records.some(s=>s.id===site.id)){registerWreck(g,site);return false;}if(records.length>=512)return false;
 const layout=wreckLayout(g.world,site),w=g.world;
 // Reject the whole site if any prior edit/build intersects its footprint.
 for(let cx=Math.floor((site.x-11)/16);cx<=Math.floor((site.x+11)/16);cx++)for(let cz=Math.floor((site.z-11)/16);cz<=Math.floor((site.z+11)/16);cz++)for(const[k]of w.edits.chunkEntries(cx,cz)){const[x,,z]=k.split(',').map(Number);if(Math.abs(x-site.x)<=11&&Math.abs(z-site.z)<=11)return false;}
 for(const[k]of layout.blocks){const[x,y,z]=k.split(',').map(Number),t=w.get(x,y,z);if(!['water','kelp','seagrass',null].includes(t)||y>=4)return false;}
 for(const[k,t]of layout.blocks){const[x,y,z]=k.split(',').map(Number);w.set(x,y,z,t);}
 records.push({...site});registerWreck(g,site);g.save();return true;
}
export function tickShipwrecks(g,dt){
 if(g.state.dimension!=='overworld'||g.multiplayer?.active||g.state.mode==='parkour')return;
 g.wreckTimer=(g.wreckTimer||0)-dt;if(g.wreckTimer>0)return;g.wreckTimer=3;
 for(const site of g.state.exploration.wrecks)if(Math.hypot(site.x-g.pos.x,site.z-g.pos.z)<100)registerWreck(g,site);
 if(g.pos.y>15)return;
 const rx=Math.floor(g.pos.x/192),rz=Math.floor(g.pos.z/192);
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const site=wreckAnchor(g.world,rx+dx,rz+dz);if(site&&Math.hypot(site.x-g.pos.x,site.z-g.pos.z)<85&&installWreck(g,site))return;}
}
