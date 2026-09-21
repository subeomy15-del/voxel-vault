import {BLOCKS,hash} from './data.js?v=36';
import {TRADE_OFFERS} from './exploration-content.js?v=36';
const key=p=>`${p.x},${p.y},${p.z}`;
const validPosition=p=>p&&['x','y','z'].every(k=>Number.isInteger(p[k])&&Math.abs(p[k])<1000000)&&p.y>-64&&p.y<94;
export function readExploration(raw={}){
 if(!raw||typeof raw!=='object')raw={};
 const n={catches:Number.isSafeInteger(raw.catches)?Math.max(0,Math.min(10000000,raw.catches)):0,casts:Number.isSafeInteger(raw.casts)?Math.max(0,Math.min(10000000,raw.casts)):0,stones:[],caches:[],trades:{}};
 for(const p of (Array.isArray(raw.stones)?raw.stones:[]).slice(0,32))if(validPosition(p)&&['overworld','nether','ender'].includes(p.dimension)){const id=p.dimension+':'+key(p);if(!n.stones.some(s=>s.id===id))n.stones.push({id,x:p.x,y:p.y,z:p.z,dimension:p.dimension});}
 for(const p of (Array.isArray(raw.caches)?raw.caches:[]).slice(-32))if(validPosition(p)&&typeof p.id==='string'&&/^sea-\d+$/.test(p.id)&&!n.caches.some(c=>c.id===p.id))n.caches.push({id:p.id,x:p.x,y:p.y,z:p.z,claimed:p.claimed===true});
 for(const[id,record]of Object.entries(raw.trades||{}))if(['lodge','tower','ruins'].includes(id)&&Number.isSafeInteger(record?.day)&&record.day>=0){n.trades[id]={day:record.day,bought:{}};for(const offer of TRADE_OFFERS)n.trades[id].bought[offer.id]=Math.max(0,Math.min(offer.stock,Math.floor(Number.isFinite(record.bought?.[offer.id])?record.bought[offer.id]:0)));}
 return n;
}
const allowed=g=>!g.multiplayer?.active&&g.state.mode!=='parkour';
export function useRod(g){
 if(!allowed(g)||g.screen||!(g.state.inv.fishing_rod>0))return false;
 const state=g.state.exploration;
 if(g.fishing){const cast=g.fishing;g.fishing=null;
  if(cast.time<cast.bite||cast.time>cast.bite+2.2){g.toast('The line comes back empty','Wait for the splash, then reel in quickly.');return false;}
  if(Math.hypot(g.pos.x-cast.x,g.pos.z-cast.z)>12||!g.world.waterAt(cast.x,cast.y,cast.z))return false;
  state.catches++;const sea=['ocean','beach'].includes(g.world.biome(cast.x,cast.z)),item=sea?'sea_fish':'river_fish';g.add(item);g.audio.play('reward');g.renderer.burst(cast.x,cast.y+1,cast.z,'#9ac8c6',8);
  if(sea&&(state.catches%5===0||hash(state.catches,g.state.seed,741)>.88))recoverChart(g,cast);
  g.save();return true;
 }
 const dir=g.direction();let target;
 for(let d=.7;d<=10;d+=.2){const p={x:Math.floor(g.pos.x+dir.x*d),y:Math.floor(g.pos.y+1.5+dir.y*d),z:Math.floor(g.pos.z+dir.z*d)},block=g.world.get(p.x,p.y,p.z);if(block==='water'){target=p;break;}if(BLOCKS[block]?.solid)break;}
 if(!target){g.toast('Aim into the water','Stand near a river or shore and look at the water.');return false;}
 state.casts++;g.fishing={...target,time:0,bite:3.5+hash(state.casts,g.state.seed,281)*3.5,announced:false};g.audio.play('place');g.renderer.burst(target.x+.5,target.y+1,target.z+.5,'#a9ced0',4);g.toast('Line cast','Watch for the splash. Press E to reel in.');return true;
}
function recoverChart(g,cast){
 const s=g.state.exploration;if(s.caches.filter(c=>!c.claimed).length>=16)return;
 for(let i=0;i<24;i++){const angle=hash(s.catches,i,g.state.seed)*Math.PI*2,r=12+i,x=Math.floor(cast.x+Math.cos(angle)*r),z=Math.floor(cast.z+Math.sin(angle)*r),y=g.world.height(x,z)+1;
  if(y>=4||y< -20||g.world.edits.has(`${x},${y},${z}`)||!g.world.waterAt(x,y,z)||!g.world.solid(x,y-1,z))continue;
  const cache={id:'sea-'+s.catches,x,y,z,claimed:false};if(!g.world.set(x,y,z,'treasure_chest'))continue;
  s.caches=s.caches.filter(c=>!c.claimed).slice(-31);s.caches.push(cache);g.add('sea_chart');g.toast('A waterlogged chart!','A submerged cache is marked. Use the chart to read it.','reward');return;
 }
}
export function claimSeaCache(g,p){
 const cache=g.state.dimension==='overworld'&&g.state.exploration.caches.find(c=>!c.claimed&&c.x===p.x&&c.y===p.y&&c.z===p.z);
 if(!cache||!allowed(g)||Math.hypot(g.pos.x-p.x,g.pos.y-p.y,g.pos.z-p.z)>5||g.world.get(p.x,p.y,p.z)!=='treasure_chest')return false;
 cache.claimed=true;g.world.set(p.x,p.y,p.z,'chest');g.add('gold_ingot',2);g.add('diamond');g.add('water_breathing_potion');g.audio.play('reward');g.renderer.burst(p.x+.5,p.y+.7,p.z+.5,'#d9c38a',18);g.toast('Mariner’s cache recovered','2 gold, a diamond and a breathing potion.','reward');g.save();return true;
}
export function activateWaystone(g,p){
 if(!allowed(g)||!p||g.world.get(p.x,p.y,p.z)!=='waystone'||Math.hypot(g.pos.x-p.x,g.pos.y-p.y,g.pos.z-p.z)>5)return false;
 const stones=g.state.exploration.stones,id=g.state.dimension+':'+key(p);
 if(!stones.some(s=>s.id===id)){if(stones.length>=32){g.toast('Waystone network full','Remove a saved destination before adding another.');return false;}stones.push({id,x:p.x,y:p.y,z:p.z,dimension:g.state.dimension});g.audio.play('checkpoint');g.save();}
 g.waystoneSource=id;g.pause('waystones');g.emit('screen');return true;
}
export function travelWaystone(g,id){
 if(!allowed(g)||g.screen!=='waystones')return false;
 const stones=g.state.exploration.stones,source=stones.find(s=>s.id===g.waystoneSource),dest=stones.find(s=>s.id===id&&s.dimension===g.state.dimension);
 if(!source||!dest||source.dimension!==g.state.dimension||Math.hypot(g.pos.x-source.x,g.pos.y-source.y,g.pos.z-source.z)>5||g.world.get(source.x,source.y,source.z)!=='waystone'||g.world.get(dest.x,dest.y,dest.z)!=='waystone')return false;
 for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[0,0]]){const x=dest.x+dx+.5,z=dest.z+dz+.5,y=g.world.ground(x,z,dest.y+3),floor=g.world.get(Math.floor(x),Math.floor(y-.05),Math.floor(z));
  if(Math.abs(y-dest.y)>3||!BLOCKS[floor]?.solid||['magma','lava','cactus'].includes(floor)||g.world.intersects(x,y,z)||g.world.waterAt(x,y+1,z))continue;
  g.pos={x,y,z};g.vx=g.vz=g.velocity=0;g.gliding=false;g.mantle=null;g.grapple=null;g.fishing=null;g.resume();g.portalCooldown=3;g.save();g.audio.play('portal');g.emit('screen');return true;
 }
 g.toast('Destination obstructed','Clear a safe landing beside that waystone.');return false;
}
export function trade(g,offerId){
 const merchant=g.mobs.find(m=>m.kind==='trader'&&m.site===g.tradingSite),offer=TRADE_OFFERS.find(o=>o.id===offerId);
 if(!allowed(g)||g.screen!=='trading'||!merchant||!offer||Math.hypot(g.pos.x-merchant.x,g.pos.y-merchant.y,g.pos.z-merchant.z)>5)return false;
 const day=Math.floor(g.state.time/600),e=g.state.exploration,record=e.trades[merchant.site];if(!record||record.day!==day)e.trades[merchant.site]={day,bought:{}};
 const bought=e.trades[merchant.site].bought;if((bought[offer.id]||0)>=offer.stock||Object.entries(offer.cost).some(([id,n])=>(g.state.inv[id]||0)<n))return false;
 for(const[id,n]of Object.entries(offer.cost))g.state.inv[id]-=n;bought[offer.id]=(bought[offer.id]||0)+1;g.add(offer.item,offer.count);g.audio.play('craft');g.save();g.emit('hud');return true;
}
export function tickExploration(g,dt){
 if(!allowed(g))return;
 if(g.fishing){const f=g.fishing;f.time+=dt;if(g.held!=='fishing_rod'||Math.hypot(g.pos.x-f.x,g.pos.z-f.z)>12||f.time>f.bite+2.2){g.fishing=null;g.toast('The fish slipped away','Cast again when you are ready.');}
  else if(!f.announced&&f.time>=f.bite){f.announced=true;g.audio.play('checkpoint');g.renderer.burst(f.x+.5,f.y+1,f.z+.5,'#d7e7c7',12);g.toast('Bite! Reel in now','Press E or tap Use.');}}
 g.traderTimer=(g.traderTimer||0)-dt;if(g.traderTimer>0)return;g.traderTimer=2;
 g.mobs=g.mobs.filter(m=>m.kind!=='trader'||g.state.dimension==='overworld'&&Math.hypot(m.x-g.pos.x,m.z-g.pos.z)<90);
 if(g.state.dimension!=='overworld')return;
 for(const site of g.state.outposts||[])if(Math.hypot(site.x-g.pos.x,site.z-g.pos.z)<52&&!g.mobs.some(m=>m.kind==='trader'&&m.site===site.id)){
  for(const[dx,dz]of [[0,0],[2,1],[-2,1],[0,4]]){const x=site.x+dx+.5,z=site.z+dz+.5,y=g.world.ground(x,z,site.y+1);if(Math.abs(y-site.y)>2||g.world.intersects(x,y,z)||g.world.waterAt(x,y,z))continue;const m=g.spawnMob(x,z,'trader',y);m.site=site.id;break;}
 }
}
