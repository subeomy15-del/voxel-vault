import {ENEMIES} from './combat.js?v=35';
import {integerHash} from './climate.js?v=35';
import {STRUCTURE_TYPES,transform} from './structure-templates.js?v=35';
import {biomeEnemy} from './biome-ecology.js?v=35';
export function tickRuinEncounters(g,dt){
 if(g.world.terrain<8||g.state.dimension!=='overworld'||g.creative||g.multiplayer?.active)return;
 g.ruinTimer=(g.ruinTimer||0)-dt;if(g.ruinTimer>0)return;g.ruinTimer=1;
 const defeated=g.ruinDefeated??=new Set(g.state.ruinDefeated||[]);
 if(g.mobs.filter(m=>m.ruinGuard).length>=6)return;
 for(const site of g.world.ruins.registered.values()){
  const distance=Math.hypot(site.x-g.pos.x,site.z-g.pos.z),tier=STRUCTURE_TYPES[site.type].tier;
  if(distance>42||distance<8||Math.abs(site.y-g.pos.y)>12||!tier||g.state.opened.includes(site.id))continue;
  const count=Math.min(3,tier+1);
  for(let i=0;i<count;i++){
   const id=site.id+':guard:'+i;if(defeated.has(id)||g.mobs.some(m=>m.ruinGuard===id))continue;
   const a=integerHash(i,7,site.seed)*Math.PI*2,underground=['mine','dungeon','buried','magma_ruin'].includes(site.type),[dx,dz]=transform(i%2?2:-2,-2-i,site.rotation,site.mirror),x=underground?site.x+dx+.5:site.x+Math.sin(a)*(site.radius+2),z=underground?site.z+dz+.5:site.z+Math.cos(a)*(site.radius+2),floor=site.y+(site.type==='magma_ruin'?0:site.type==='mine'?-7:-5),y=g.world.ground(x,z,underground?floor+1:undefined);
   if(Math.hypot(x-g.pos.x,z-g.pos.z)<10||Math.abs(y-(underground?floor:site.y))>5||g.world.waterAt(x,y,z)||g.world.intersects(x,y,z,1.9,.5))continue;
   const kind=site.type==='magma_ruin'?(i===0?'magma_golem':'stalker'):i===0&&tier>=2?'brute':biomeEnemy(g.world,x,y,z,i),info=ENEMIES[kind];if(g.world.intersects(x,y,z,info.height||1.8,info.radius||.4))continue;const m=g.spawnMob(x,z,kind,y);m.ruinGuard=id;
   if(g.mobs.filter(m=>m.ruinGuard).length>=6)return;
  }
 }
}
export function defeatRuinGuard(g,m){if(!m.ruinGuard)return;g.ruinDefeated??=new Set(g.state.ruinDefeated||[]);g.ruinDefeated.add(m.ruinGuard);g.state.ruinDefeated=[...g.ruinDefeated];g.save();}
export function ruinEquipment(g,chest){
 if(g.world.terrain<8||!chest.generated||chest.tier<2||integerHash(chest.siteSeed,13,g.state.seed)>.3)return;
 const item=chest.biome==='badlands'?'iron_sword':'iron_pickaxe';g.add(item,1);
 // Existing rolls are never replaced by loot. Current inventory stores modifiers per item type.
 if(!g.state.infusions[item]&&!g.state.enchants[item]){
  const id=item==='iron_sword'?'edge':'haste';g.state.infusions[item]={tier:1,altar:1,enchants:{[id]:1}};
  if(!g.state.enchantCodex.includes(id))g.state.enchantCodex.push(id);
 }
}
