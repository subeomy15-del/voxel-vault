// Balancing lives here; the renderer, recipes, saves and HUD share these definitions.
export const POTION_FAMILIES = {
 healing: {name:'Healing',color:'#d96c80',shape:0,ingredient:'apple',amount:2,power:8,duration:0,unit:'health',symbol:'cross'},
 regeneration: {name:'Regeneration',color:'#e994b5',shape:1,ingredient:'lavender',amount:2,power:.3,duration:50,unit:'health / second',symbol:'cross'},
 speed: {name:'Speed',color:'#8ebd75',shape:2,ingredient:'sugar',amount:2,power:.18,duration:90,unit:'movement speed',symbol:'chevron'},
 strength: {name:'Strength',color:'#d18256',shape:3,ingredient:'iron_ingot',amount:1,power:.12,duration:90,unit:'melee damage',symbol:'blade'},
 defense: {name:'Defense',color:'#739fce',shape:0,ingredient:'slate',amount:2,power:.12,duration:90,unit:'damage reduction',symbol:'shield'},
 mining: {name:'Mining',color:'#d4bc72',shape:1,ingredient:'gold_ingot',amount:1,power:.25,duration:120,unit:'mining speed',symbol:'pick'},
 nightvision: {name:'Night vision',color:'#a5a1d8',shape:2,ingredient:'mushroom',amount:2,power:1,duration:150,unit:'cave visibility',symbol:'eye'},
 fire_resistance: {name:'Fire resistance',color:'#e6a951',shape:3,ingredient:'cactus',amount:2,power:.45,duration:90,unit:'fire damage reduction',symbol:'flame'},
 jump: {name:'Jump',color:'#b4c9a0',shape:0,ingredient:'rabbit_hide',amount:1,power:.14,duration:90,unit:'jump impulse',symbol:'chevron'},
 water_breathing: {name:'Water breathing',color:'#63b9c2',shape:1,ingredient:'cane',amount:2,power:.6,duration:120,unit:'slower breath loss',symbol:'bubbles'},
 ash_resistance: {name:'Ash resistance',color:'#c58f71',shape:2,ingredient:'netherrack',amount:3,power:.4,duration:120,unit:'Ashen heat reduction',symbol:'shield'},
 void_resistance: {name:'Void resistance',color:'#b88cdb',shape:3,ingredient:'moonstone',amount:1,power:.4,duration:90,unit:'void fall / energy reduction',symbol:'star'},
};
export const POTION_VARIANTS = {normal:{power:1,time:1},strong:{power:1.5,time:.55},extended:{power:1,time:2}};
export const POTIONS = {};
for (const [family,definition] of Object.entries(POTION_FAMILIES)) for (const [variant,multiplier] of Object.entries(POTION_VARIANTS)) {
 const id=`${family}_potion${variant==='normal'?'':'_'+variant}`;
 const power=definition.power*multiplier.power,duration=Math.round(definition.duration*multiplier.time);
 POTIONS[id]={...definition,id,family,variant,power,duration,name:`${definition.name}${variant==='strong'?' II':variant==='extended'?' · Extended':' I'}`};
}
// Extended healing spreads part of its recovery over time instead of inventing an instant duration.
Object.assign(POTIONS.healing_potion_extended,{power:6,duration:18,recovery:1/3});
export function potionDescription(p){
 const value=['healing','regeneration'].includes(p.family)?Number(p.power.toFixed(2)):Math.round(p.power*100)+'%';
 return `${p.family==='healing'?'Restores ':p.family==='nightvision'?'':'+'}${value} ${p.unit}${p.recovery?' + 6 health over 18s':p.duration?' · '+p.duration+'s':''}. Instant drink; 3s shared cooldown.`;
}
export function installPotions(blocks,items,recipes){
 blocks.brewing_station={name:'Brewing station',color:'#658e85',solid:true,hardness:1.4};
 items.brewing_station={...blocks.brewing_station,place:true,description:'Infuse water and gathered ingredients. Place nearby and interact to brew.'};
 items.empty_flask={name:'Empty flask',color:'#b4ccce',kind:'material',description:'Fill near water using the recipe book. Drinking returns the flask.'};
 items.water_flask={name:'Springwater flask',color:'#76b3cc',kind:'material',description:'Clean water for brewing. Fill an empty flask within three blocks of water.'};
 recipes.push({item:'brewing_station',cost:{stonebrick:4,iron_ingot:2,glass:2},station:'bench',category:'Building'},
  {item:'empty_flask',count:3,cost:{glass:1},station:'bench',category:'Brewing'},
  {item:'water_flask',cost:{empty_flask:1},station:'water',category:'Brewing'});
 for(const [id,p]of Object.entries(POTIONS)){
  items[id]={name:p.name,color:p.color,kind:'potion',potion:id,description:potionDescription(p)};
  const cost={water_flask:1,[p.ingredient]:p.amount};
  if(p.variant==='strong')cost.diamond=1;
  if(p.variant==='extended')cost.lavender=(cost.lavender||0)+2;
  recipes.push({item:id,cost,station:'brewing_station',category:'Brewing'});
 }
}
