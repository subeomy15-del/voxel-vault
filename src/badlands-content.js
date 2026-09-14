export const ARMOR_SLOTS=['helm','chestplate','gauntlets','leggings','boots'];
export const RETIRED_FORGE=['relic_forge','relic_shard','forge_seal','grappling_hook','ruby_blade','sapphire_blade','warhammer','vanguard_armor','storm_glider','starfall_bow','dawnblade','aegis_armor','seraph_glider','sacred_orb'];
export function installContent(BLOCKS,ITEMS,RECIPES,BIOMES){
 const block=(id,name,color,extra={})=>{BLOCKS[id]={name,color,hardness:1.1,solid:true,...extra};ITEMS[id]={...BLOCKS[id],place:true};};
 block('red_sand','Red Sand','#b77745',{hardness:.55});
 block('red_terracotta','Red Terracotta','#965038');block('ochre_terracotta','Ochre Terracotta','#c08f55');block('chalk','Chalk','#d7c6a2');block('mud','Mud','#586048',{hardness:.7});block('dry_grass','Dry Grass','#a2a063',{hardness:.6});
 Object.assign(BIOMES,{badlands:{name:'Badlands',color:'#b77745',top:'red_sand'},savanna:{name:'Savanna',color:'#a2a063',top:'dry_grass'},marsh:{name:'Marsh',color:'#586048',top:'mud'}});
 ITEMS.knight_heart={name:'Knight Heart',color:'#974d38',kind:'material',description:'Dropped by Draugr Knights in the Badlands. Used to forge the Knight Sword.'};
 ITEMS.knight_sword={name:'Knight Sword',color:'#a5afb0',kind:'sword',damage:21,tier:5,cooldown:.5,description:'A heavy knight blade. Crafted from 4 Knight Hearts and 1 Diamond Sword.'};
 RECIPES.push({item:'knight_sword',cost:{knight_heart:4,diamond_sword:1},category:'Gear',station:'bench'});
 for(const [tier,color,cost,total]of [['wood','#95764d','wood',.15],['stone','#89938e','stone',.25],['iron','#bac5c4','iron_ingot',.4],['gold','#c9aa60','gold_ingot',.3],['diamond','#8abcc6','diamond',.6],['moonstone','#b5accc','moonstone',.65]]){
  ARMOR_SLOTS.forEach((slot,i)=>{
   const id=tier+'_'+slot,reduction=total*[.15,.35,.1,.25,.15][i];
   ITEMS[id]={name:tier[0].toUpperCase()+tier.slice(1)+' '+slot[0].toUpperCase()+slot.slice(1),color,kind:'armor',slot,reduction,tier:['wood','stone','iron','gold','diamond','moonstone'].indexOf(tier)+1,description:`Equip in the ${slot} slot. Adds ${Math.round(reduction*100)}% protection. Enchant with aura for more defense.`};
   RECIPES.push({item:id,cost:{[cost]:[3,5,2,4,2][i]},category:'Gear',station:'bench'});
  });
  if(tier==='moonstone')continue;
  const id=tier+'_spikes',trapDamage={wood:2,stone:3,iron:5,gold:4,diamond:8}[tier];
  const boxes=[[0,0,0,1,.08,1]];for(const x of [.25,.75])for(const z of [.25,.75])for(let i=0;i<4;i++){const r=.15-i*.035;boxes.push([x-r,.08+i*.13,z-r,x+r,.21+i*.13,z+r]);}
  block(id,tier[0].toUpperCase()+tier.slice(1)+' Spikes',color,{solid:false,trapDamage,shape:'spikes',boxes,description:`Place on solid ground. Deals ${trapDamage} damage each second to creatures crossing it, including you.`});
  RECIPES.push({item:id,count:3,cost:{[cost]:3,plank:1},category:'Building',station:'bench'});
 }
 const ropes=[];for(let i=0;i<=5;i++){const p=i*.19;ropes.push([p,.02,0,p+.035,.065,1],[0,.025,p,1,.07,p+.035]);}
 block('net','Trap Net','#c5b899',{solid:false,shape:'net',boxes:ropes,snare:true,hardness:.4,description:'Place on solid ground to snare mobs. Slows players too. Mine to recover it.'});
 RECIPES.push({item:'net',count:2,cost:{fiber:6,wood:2},category:'Building',station:'bench'});
 for(const id of RETIRED_FORGE)if(ITEMS[id])ITEMS[id].hidden=true;
 for(const item of Object.values(ITEMS))if(item.kind==='armor'&&!item.slot)item.hidden=true;
 RECIPES.splice(0,RECIPES.length,...RECIPES.filter(r=>!RETIRED_FORGE.includes(r.item)&&!(ITEMS[r.item]?.kind==='armor'&&!ITEMS[r.item].slot)));
 ITEMS.firecracker.description='Launches a layered aerial firework. Startles nearby enemies and gives a stronger boost while gliding.';
}
