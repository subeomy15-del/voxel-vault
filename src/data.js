import { RESOURCE_ALIASES,canonicalItem } from './resource-map.js?v=14';
export const VERSION = 2;
export const BLOCKS = {
  grass: { name: 'Grass block', color: '#6c944f', solid: true, hardness: .65 },
  dirt: { name: 'Earth', color: '#967451', solid: true, hardness: .6 },
  stone: { name: 'Stone', color: '#84918e', solid: true, hardness: 1.3 },
  sand: { name: 'Sunstone sand', color: '#d9bc7b', solid: true, hardness: .55 },
  snow: { name: 'Snow', color: '#d5e8e3', solid: true, hardness: .55 },
  wood: { name: 'Timber', color: '#8e6743', solid: true, hardness: 1.1 },
  leaf: { name: 'Oak leaves', color: '#507540', solid: true, hardness: .3 },
  autumnleaf: { name: 'Amber leaves', color: '#d2914b', solid: true, hardness: .3 },
  pine: { name: 'Pine needles', color: '#426e65', solid: true, hardness: .3 },
  iron: { name: 'Iron ore', color: '#b6a08b', solid: true, hardness: 1.6 },
  gold: { name: 'Gold ore', color: '#d6bb64', solid: true, hardness: 1.8 },
  // Keep the `crystal` id so existing saves and recipes continue to work,
  // while presenting the resource as the requested diamond material.
  crystal: { name: 'Diamond', color: '#9ed8d8', solid: true, hardness: 1.7 },
  ruin: { name: 'Ancient stone', color: '#9da990', solid: true, hardness: 1.5 },
  plank: { name: 'Timber planks', color: '#b18a59', solid: true, hardness: .7 },
  glass: { name: 'Sea glass', color: '#9cc7c3', solid: true, hardness: .5 },
  bedrock: { name: 'Worldstone', color: '#424d59', solid: true, hardness: Infinity },
  torch: { name: 'Torch', color: '#ffd890', solid: false, hardness: .3 },
  bench: { name: 'Workbench', color: '#ab7c4d', solid: true, hardness: 1 },
};
const extraBlocks = {
  copper:['Copper ore','#9c8c77',1.7],coal:['Coal ore','#6b7478',1.4],diamond:['Diamond ore','#799da2',2.5],
  granite:['Granite','#a7958b',1.6],limestone:['Limestone','#b4b5a4',1.3],slate:['Deepslate','#5d6570',2],
  birch:['Birch log','#c9c9b8',1],pinewood:['Pine log','#6d5742',1.1],birch_plank:['Birch planks','#c6b58b',.7],pine_plank:['Pine planks','#786650',.7],
  stonebrick:['Stone bricks','#85908d',1.5],brick:['Clay bricks','#a47562',1.3],clay:['Clay','#9aadae',.7],tile:['Terracotta tiles','#b37e60',1],
  polished_granite:['Polished granite','#ae9b91',1.5],polished_slate:['Polished deepslate','#626b78',1.7],moss:['Mossy stone','#748767',1.2],
  furnace:['Furnace','#687270',1.5],chest:['Storage chest','#a38150',1],bed:['Bed','#af8173',.7],lantern:['Iron lantern','#deb972',.5],ladder:['Ladder','#9e8356',.4],
  cactus:['Cactus','#759359',.6],water:['Water','#497f9c',1],
  gravel:['Gravel','#96958c',.6],cobblestone:['Cobblestone','#8a938e',1.4],sandstone:['Sandstone','#d6bf8f',1.2],
  marble:['Marble','#d3d7cc',1.6],polished_marble:['Polished marble','#e0e3d7',1.5],basalt:['Basalt','#505c62',1.9],
  copper_block:['Copper panels','#b98163',1.8],iron_block:['Iron panels','#b6c4c6',2],gold_block:['Gold panels','#d9b85e',2],
  white_wool:['Ivory fabric','#ece5d1',.5],blue_wool:['Indigo fabric','#627a99',.5],green_wool:['Sage fabric','#82977a',.5],red_wool:['Rust fabric','#b17563',.5],
  bookshelf:['Bookshelf','#927049',1],campfire:['Campfire','#d99750',.6],hedge:['Trimmed hedge','#597b4a',.4],
  farmland:['Garden soil','#68513d',.6],fern:['Fern','#789658',.15],flower_red:['Wild poppy','#ca7965',.15],flower_blue:['Cornflower','#899fc9',.15],
  mushroom:['Woodland mushroom','#b3977a',.2],wheat_crop:['Ripe wheat','#c9b273',.2],wheat_sprout:['Wheat seedling','#89a166',.15],
  carrot_crop:['Ripe carrots','#91a66a',.2],carrot_sprout:['Carrot seedling','#89a166',.15],
};
for(const[k,[name,color,hardness]]of Object.entries(extraBlocks))BLOCKS[k]={name,color,hardness,solid:!['water','ladder','lantern'].includes(k)};
export const PLANTS=['fern','flower_red','flower_blue','mushroom','wheat_crop','wheat_sprout','carrot_crop','carrot_sprout'];
for(const k of PLANTS)Object.assign(BLOCKS[k],{solid:false,plant:true});
BLOCKS.campfire.solid=false;
// Crop definitions drive planting, harvesting, save validation and the field guide.
const newCrops=[['cotton','Cotton','#d7dfc4'],['watermelon','Watermelon','#69914c'],['melon','Melon','#c4aa68'],['potato','Potato','#98a873'],['tomato','Tomato','#b87861'],['corn','Corn','#bbae64'],['berries','Berry','#708666']];
for(const[id,label,color]of newCrops){
  for(const stage of ['sprout','crop']){
    const fruit=['watermelon','melon'].includes(id)&&stage==='crop';
    BLOCKS[id+'_'+stage]={name:label+(stage==='sprout'?' seedling':' plant'),color,hardness:.25,solid:fruit,plant:!fruit,hidden:true};
    if(!fruit)PLANTS.push(id+'_'+stage);
  }
}
for(const[id,name,color]of [['watermelon','Watermelon','#6f9551'],['melon','Honey melon','#c9b575']])BLOCKS[id]={name,color,hardness:.5,solid:true};
for(const[id,name,color]of [['cane','Sugar cane','#97aa6c'],['lavender','Lavender','#a693b7'],['daisy','Daisy','#dedab9']]){BLOCKS[id]={name,color,hardness:.15,solid:false,plant:true};PLANTS.push(id);}
export const BUILD_MATERIALS=[['oak','Oak','plank'],['birch','Birch','birch_plank'],['pine','Pine','pine_plank'],['stone','Stone','stonebrick'],['marble','Marble','polished_marble'],['basalt','Basalt','basalt']];
for(const[id,label,texture]of BUILD_MATERIALS){
  const base={...BLOCKS[texture],texture,drop:id+'_stairs',shape:'stairs'};
  BLOCKS[id+'_slab']={...BLOCKS[texture],name:label+' slab',texture,shape:'slab',boxes:[[0,0,0,1,.5,1]]};
  const tops=[[0,.5,0,1,1,.5],[.5,.5,0,1,1,1],[0,.5,.5,1,1,1],[0,.5,0,.5,1,1]];
  for(let facing=0;facing<4;facing++)BLOCKS[id+'_stairs'+(['','_e','_s','_w'][facing])]={...base,name:label+' stairs',facing,hidden:facing>0,boxes:[[0,0,0,1,.5,1],tops[facing]]};
}
for(const[id,name,color,hardness]of [
 ['end_stone','End Stone','#cfc9a2',1.7],['end_bricks','End Stone Bricks','#b6ae8b',1.8],
 ['obsidian','Obsidian','#302a46',4],['moonstone','Moonstone','#c0b4ff',2.8],
 ['moonstone_block','Moonstone Block','#a694e4',2],['purple_wool','Purple Wool','#8459b5',.5],
 ['cyan_wool','Cyan Wool','#37b9c7',.5],['black_wool','Black Wool','#343745',.5],
 ['white_concrete','White Concrete','#e0e5ec',1.2],['blue_concrete','Blue Concrete','#3e74b6',1.2],
 ['purple_concrete','Purple Concrete','#7655a5',1.2],['moonstone_chest','Moonstone Chest','#8a75be',1.5],
 ['ender_gate','Ender Gate','#875ac8',2],['violet_crystal','Violet Crystal','#d78aff',1.8]
])BLOCKS[id]={name,color,hardness,solid:true};
BLOCKS.ender_gate.solid=false;
BLOCKS.launch_pad={name:'Launch Pad',color:'#4bcfd7',hardness:1.5,solid:true};
BLOCKS.dragon_altar={name:'Dragon Altar',color:'#686078',hardness:3,solid:true};
BLOCKS.dragon_crystal={name:'Healing Crystal',color:'#b59bd8',hardness:.8,solid:true,hidden:true,drop:'moonstone',renderOnly:true};
BLOCKS.dragon_egg={name:'Dragon Egg',color:'#494053',hardness:2,solid:true};
BLOCKS.diamond_block={name:'Diamond Block',color:'#8abcc6',hardness:3,solid:true};
for(const[id,name,color]of [
 ['ruby','Ruby Ore','#c34d65'],['sapphire','Sapphire Ore','#4f93d2'],['emerald','Emerald Ore','#48a67d'],
 ['ruby_block','Ruby Block','#b64162'],['sapphire_block','Sapphire Block','#437daf'],['emerald_block','Emerald Block','#398568'],
 ['treasure_chest','Relic Chest','#b39058'],['relic_forge','Relic Forge','#67738a'],
 ['dark_bricks','Dark Bricks','#4b5363'],['ivory_bricks','Ivory Bricks','#d5cfbb'],['copper_tiles','Copper Roof Tiles','#9c6854'],
 ['teal_tiles','Teal Roof Tiles','#487b7c'],['amber_glass','Amber Glass','#d7ad66'],['violet_glass','Violet Glass','#9f8cc0']
])BLOCKS[id]={name,color,solid:true,hardness:1.8};
export const ITEMS = {
  ...Object.fromEntries(Object.entries(BLOCKS).map(([k,v]) => [k,{ ...v, place: true }])),
  wood_sword: { name: 'Trail sword', color: '#c2a47a', kind: 'sword', damage: 3, tier: 1, description: 'A trusty start. Left click to attack.' },
  wood_pickaxe: { name: 'Trail pickaxe', color: '#c2a47a', kind: 'pickaxe', speed: 1.8, tier: 1, description: 'Hold left click to mine stone and ore.' },
  wood_axe: { name: 'Trail axe', color: '#c2a47a', kind: 'axe', speed: 2.5, damage: 2, tier: 1, description: 'Makes short work of trees.' },
  stone_sword: { name: 'Stone sword', color: '#a2b2ac', kind: 'sword', damage: 5, tier: 2, description: 'A dependable blade. 5 damage.' },
  stone_pickaxe: { name: 'Stone pickaxe', color: '#a2b2ac', kind: 'pickaxe', speed: 2.6, tier: 2, description: 'Mine stone and ore faster.' },
  iron_sword: { name: 'Iron broadsword', color: '#d4deda', kind: 'sword', damage: 8, tier: 3, description: 'Heavy hits. 8 damage.' },
  iron_pickaxe: { name: 'Iron pickaxe', color: '#d4deda', kind: 'pickaxe', speed: 4, tier: 3, description: 'An explorer’s best friend.' },
  crystal_sword: { name: 'Aetherblade', color: '#9affe6', kind: 'sword', damage: 12, tier: 4, description: 'Forged from the wilds. 12 damage.' },
  crystal_pickaxe: { name: 'Aether pickaxe', color: '#9affe6', kind: 'pickaxe', speed: 6, tier: 4, description: 'Carve through the world.' },
  bow: { name: 'Ranger bow', color: '#d5ad72', kind: 'bow', damage: 7, description: 'Fire arrows at distant enemies.' },
  arrows: { name: 'Arrows', color: '#d5cbb0', kind: 'ammo', description: 'Ammunition for the ranger bow.' },
  armor: { name: 'Iron armor', color: '#afc9c2', kind: 'armor', description: 'Equip to reduce damage by 35%.' },
  crystal_armor: { name: 'Aether armor', color: '#89e4d0', kind: 'armor', description: 'Equip to reduce damage by 55%.' },
  apple: { name: 'Wild apple', color: '#e88f72', kind: 'food', description: 'Restores 4 health. Press F to eat.' },
  potion: { name: 'Healing tonic', color: '#d4abe9', kind: 'food', description: 'Restores 10 health. Press Q to drink.' },
};
Object.assign(ITEMS, {
  copper_ingot:{name:'Copper ingot',color:'#c18f70',kind:'material',description:'Smelt copper ore in a furnace.'},
  iron_ingot:{name:'Iron ingot',color:'#b5c1bf',kind:'material',description:'Used for tools, armor and lanterns.'},
  gold_ingot:{name:'Gold ingot',color:'#d6b972',kind:'material',description:'Smelted gold for precision tools.'},
  copper_pickaxe:{name:'Copper pickaxe',color:'#c9987b',kind:'pickaxe',speed:3.2,tier:2,description:'A practical upgrade for underground mining.'},
  iron_axe:{name:'Iron axe',color:'#ccd5d0',kind:'axe',speed:5,damage:5,tier:3,description:'Harvest timber much faster.'},
  iron_shovel:{name:'Iron shovel',color:'#c6d1cc',kind:'shovel',speed:5,tier:3,description:'Dig soil, gravel, clay and sand quickly.'},
  stone_shovel:{name:'Stone shovel',color:'#a6b0ab',kind:'shovel',speed:3,tier:2,description:'Shape the terrain around your home.'},
  diamond_pickaxe:{name:'Diamond pickaxe',color:'#93cfcd',kind:'pickaxe',speed:7,tier:4,description:'Fast mining through deep rock.'},
  diamond_sword:{name:'Diamond sword',color:'#93cfcd',kind:'sword',damage:13,tier:4,description:'A durable blade for dangerous caves.'},
  wheat:{name:'Wheat',color:'#b6a071',kind:'material',description:'Bake grain in a furnace to make bread.'},
  bread:{name:'Bread',color:'#caa579',kind:'food',description:'Restores 6 health. Baked in a furnace.'},
  compass:{name:'Compass',color:'#c7b082',kind:'utility',description:'Shows your home direction and coordinates when held.'},
  fiber:{name:'Plant fiber',color:'#b6b58b',kind:'material',description:'Gather from ferns and leaves. Weave into fabric.'},
  cloth:{name:'Woven cloth',color:'#e0d6ba',kind:'material',description:'Woven from plant fiber for soft building materials.'},
  seeds:{name:'Wheat seeds',color:'#acb277',kind:'seed',crop:'wheat',description:'Use on garden soil. Wheat ripens after 90 seconds of play.'},
  carrot:{name:'Carrot',color:'#d79b61',kind:'food',heal:3,crop:'carrot',description:'Eat for 3 health, or plant on garden soil. Ripens in 75 seconds.'},
  roasted_mushroom:{name:'Roasted mushrooms',color:'#ad805a',kind:'food',heal:6,description:'Roasted over a campfire or in a furnace. Restores 6 health.'},
  vegetable_stew:{name:'Garden stew',color:'#d5aa77',kind:'food',heal:12,description:'Carrot, mushrooms and grain. Restores 12 health.'},
  fruit_bowl:{name:'Apple crumble',color:'#ce9a71',kind:'food',heal:9,description:'Apples and bread make a hearty snack. Restores 9 health.'},
  copper_sword:{name:'Copper saber',color:'#c9987b',kind:'sword',damage:6,tier:2,description:'A balanced copper blade. 6 damage.'},
  copper_axe:{name:'Copper axe',color:'#c9987b',kind:'axe',speed:3.8,damage:4,tier:2,description:'An affordable forestry tool.'},
  diamond_axe:{name:'Diamond axe',color:'#93cfcd',kind:'axe',speed:8,damage:8,tier:4,description:'Harvest timber and clear leaves quickly.'},
  diamond_shovel:{name:'Diamond shovel',color:'#93cfcd',kind:'shovel',speed:8,tier:4,description:'Excavate earth, sand and gravel with ease.'},
  stone_hoe:{name:'Stone hoe',color:'#a2b2ac',kind:'hoe',tier:2,description:'Use on grass or earth to prepare garden soil.'},
  iron_hoe:{name:'Iron hoe',color:'#c6d1cc',kind:'hoe',tier:3,description:'Prepare a 3 × 3 garden patch with one use.'},
  crossbow:{name:'Crossbow',color:'#a78b67',kind:'bow',damage:12,cooldown:1,tier:3,description:'A powerful, slower shot. Uses arrows; deals 12 damage.'},
});
Object.assign(ITEMS,{
  cotton:{name:'Raw cotton',color:'#e7e5cd',kind:'material',description:'Harvest ripe cotton. Weave it into cloth for gliders and building.'},
  cotton_cloth:{name:'Cotton cloth',color:'#e5dfc8',kind:'material',description:'Strong, light fabric. Works wherever a recipe needs cloth.'},
  leather:{name:'Leather',color:'#ad8059',kind:'material',description:'Deer and cows drop leather. Used for harnesses and equipment.'},
  feather:{name:'Feather',color:'#e7ddc1',kind:'material',description:'Dropped by chickens. Fletch arrows or prepare featherfall food.'},
  rabbit_hide:{name:'Rabbit hide',color:'#b5a28a',kind:'material',description:'Four hides can be stitched into leather.'},
  sugar:{name:'Sugar',color:'#f0e9d1',kind:'material',description:'Refine sugar cane for food recipes.'},
  cotton_seeds:{name:'Cotton seeds',color:'#d6d8ae',kind:'seed',crop:'cotton',description:'Plant in garden soil. Cotton ripens in 100 seconds.'},
  watermelon_seeds:{name:'Watermelon seeds',color:'#627051',kind:'seed',crop:'watermelon',description:'Plant in garden soil. Fruit ripens in 140 seconds.'},
  melon_seeds:{name:'Melon seeds',color:'#d9c5a0',kind:'seed',crop:'melon',description:'Plant in garden soil. Fruit ripens in 130 seconds.'},
  tomato_seeds:{name:'Tomato seeds',color:'#bb9e6e',kind:'seed',crop:'tomato',description:'Plant in garden soil. Tomatoes ripen in 90 seconds.'},
  corn_seeds:{name:'Corn kernels',color:'#d5bd71',kind:'seed',crop:'corn',description:'Plant in garden soil. Corn ripens in 110 seconds.'},
  berry_seeds:{name:'Berry seeds',color:'#9e8a8d',kind:'seed',crop:'berries',description:'Plant in garden soil. Berries ripen in 100 seconds.'},
  potato:{name:'Potato',color:'#bda270',kind:'food',nutrition:2,saturation:1,crop:'potato',description:'A small snack, or plant it in garden soil. Bakes well in a furnace.'},
  baked_potato:{name:'Baked potato',color:'#c69e68',kind:'food',nutrition:6,saturation:7,description:'A filling furnace-baked potato.'},
  tomato:{name:'Tomato',color:'#c57b64',kind:'food',nutrition:3,saturation:2,description:'A fresh garden snack. Used in salads and stews.'},
  corn:{name:'Corn cob',color:'#d2b969',kind:'food',nutrition:3,saturation:2,description:'Roast it in a furnace for a more filling meal.'},
  roasted_corn:{name:'Roasted corn',color:'#c8a45b',kind:'food',nutrition:6,saturation:7,description:'Warm roasted corn keeps you fed longer.'},
  berries:{name:'Wild berries',color:'#9294ba',kind:'food',nutrition:2,saturation:1,description:'Gather berry plants in woodland clearings or grow your own.'},
  watermelon_slice:{name:'Watermelon slice',color:'#d18b77',kind:'food',nutrition:3,saturation:1.5,description:'A refreshing snack. Cut a watermelon into six slices.'},
  melon_slice:{name:'Honey melon slice',color:'#d9bc7b',kind:'food',nutrition:4,saturation:3,description:'Sweet golden melon. Cut a melon into four slices.'},
  garden_salad:{name:'Garden salad',color:'#9bae77',kind:'food',nutrition:7,saturation:8,description:'Carrots, tomatoes and corn make a satisfying meal.'},
  venison_stew:{name:'Venison stew',color:'#b58e6b',kind:'food',nutrition:12,saturation:16,description:'A substantial cooked meal for long journeys.'},
  berry_pie:{name:'Berry pie',color:'#ab8c84',kind:'food',nutrition:8,saturation:10,description:'Berries, grain and sugar. A generous reserve of food.'},
  trail_mix:{name:'Trail mix',color:'#b8a478',kind:'food',nutrition:6,saturation:10,description:'Fruit and grain packed for a day outdoors.'},
  swift_smoothie:{name:'Swift melon smoothie',color:'#93ba96',kind:'food',nutrition:4,saturation:3,effect:'speed',duration:90,description:'Speed +50% for 90 seconds. Made with melon and sugar.'},
  spring_salad:{name:'Springroot salad',color:'#c0bc80',kind:'food',nutrition:6,saturation:5,effect:'jump',duration:90,description:'Higher jumps for 90 seconds. Made with carrots, corn and crystal.'},
  mist_stew:{name:'Mistberry stew',color:'#a6a8ba',kind:'food',nutrition:6,saturation:5,effect:'invisibility',duration:75,description:'Harder for animals and enemies to detect you for 75 seconds. Attacking briefly reveals you.'},
  prospector_pie:{name:'Prospector pie',color:'#91c4b9',kind:'food',nutrition:7,saturation:6,effect:'xray',duration:60,description:'See nearby ore through rock for 60 seconds, within 14 blocks.'},
  miners_lunch:{name:'Miner’s lunch',color:'#c9af79',kind:'food',nutrition:8,saturation:9,effect:'haste',duration:120,description:'Mine 60% faster for 120 seconds.'},
  moonberry_compote:{name:'Moonberry compote',color:'#a7a4c6',kind:'food',nutrition:4,saturation:4,effect:'nightvision',duration:120,description:'Brightens caves and the night for 120 seconds.'},
  feather_bread:{name:'Featherlight bread',color:'#ddd5b5',kind:'food',nutrition:5,saturation:5,effect:'slowfall',duration:90,description:'Gentle falling and no fall damage for 90 seconds.'},
  longbow:{name:'Ash longbow',color:'#ba996a',kind:'bow',damage:13,drawTime:1.05,boltSpeed:34,tier:3,description:'Hold attack to draw; release to shoot. Long range, up to 13 damage.'},
  recurve_bow:{name:'Recurve bow',color:'#ad9977',kind:'bow',damage:10,drawTime:.55,boltSpeed:29,tier:2,description:'A quick draw for hunting. Hold attack, then release.'},
  heavy_crossbow:{name:'Heavy crossbow',color:'#7e9292',kind:'bow',damage:19,cooldown:1.5,boltSpeed:38,tier:4,description:'A powerful single bolt with a slower reload.'},
  repeater_crossbow:{name:'Repeating crossbow',color:'#b8956f',kind:'bow',damage:8,cooldown:.36,boltSpeed:29,tier:3,description:'Fast follow-up shots. Every bolt consumes an arrow.'},
  iron_arrows:{name:'Iron arrows',color:'#b9c5bf',kind:'ammo',bonus:3,description:'Sharper tips add 3 damage. Select to use with any bow or crossbow.'},
  frost_arrows:{name:'Frost arrows',color:'#9acccc',kind:'ammo',bonus:1,slow:4,description:'Slow a target for four seconds. Select as ammunition.'},
  hang_glider:{name:'Canvas hang glider',color:'#d6c59e',kind:'glider',glideSpeed:11,sink:1.5,description:'Equip, jump from a height, then press G to glide. Look down to dive; up to slow your descent.'},
  sail_glider:{name:'Reinforced hang glider',color:'#96b6ac',kind:'glider',glideSpeed:14,sink:1.05,description:'A lighter reinforced wing for longer flights. Equip and press G while airborne.'},
});
for(const[animal,raw,cooked,nutrition,saturation]of [
  ['venison','Raw venison','Roast venison',8,12],['pork','Raw porkchop','Cooked porkchop',8,12],['beef','Raw beef','Steak',8,13],
  ['mutton','Raw mutton','Cooked mutton',7,10],['chicken','Raw chicken','Roast chicken',6,8],['rabbit','Raw rabbit','Roast rabbit',6,8],
]){
  ITEMS['raw_'+animal]={name:raw,color:animal==='chicken'?'#d1af95':'#bf8d7d',kind:'food',nutrition:2,saturation:.5,raw:true,description:'A small amount of food when raw. Cook it in a furnace for a much better meal.'};
  ITEMS['cooked_'+animal]={name:cooked,color:'#aa7d57',kind:'food',nutrition,saturation,meat:true,description:'Cooked in a furnace. Restores hunger and stores energy for healing.'};
}
export const EFFECTS={
  speed:{name:'Speed',color:'#a2c79a',duration:90},jump:{name:'Jump boost',color:'#d1c584',duration:90},
  invisibility:{name:'Invisibility',color:'#b3b9cc',duration:75},xray:{name:'Ore sight',color:'#9ed8cd',duration:60},
  haste:{name:'Haste',color:'#d3bb81',duration:120},nightvision:{name:'Night vision',color:'#aba6cf',duration:120},slowfall:{name:'Featherfall',color:'#e3dac1',duration:90},
};
export const ORE_GLIDERS=[
  ['coal','Coal','#667775',11.5,1.4],['copper','Copper','#c18e6b',12.5,1.25],
  ['iron','Iron','#bfcac5',14,1.1],['gold','Gold','#e2bf63',16,1.35],
 ['diamond','Diamond','#92d3d1',15,.8],['crystal','Diamond','#9ed8d8',16,.65],
];
for(const[id,name,color,glideSpeed,sink]of ORE_GLIDERS)ITEMS[id+'_glider']={name:name+' hang glider',color,kind:'glider',glideSpeed,sink,ore:id,description:`${glideSpeed} blocks/s cruise · ${sink} blocks/s descent. Equip, then press G in the air. Look down to dive; up to float.`};
for(const[kind,speed,damage]of [['pickaxe',5.8,3],['axe',6.5,6],['shovel',6.5,2],['hoe',1,2],['sword',1,7]])ITEMS['gold_'+kind]={name:'Gold '+kind,color:'#e2bf63',kind,speed,damage,tier:3,description:kind==='hoe'?'Prepare a clear 3 × 3 garden patch.':kind==='sword'?'A swift golden blade. 7 damage.':'Fast golden tools for your workshop.'};
ITEMS.gold_armor={name:'Gold armor',color:'#e2bf63',kind:'armor',reduction:.3,description:'Equip to reduce damage by 30%.'};
ITEMS.armor.reduction=.35;ITEMS.crystal_armor.reduction=.55;
ITEMS.gold_bow={name:'Gold recurve bow',color:'#e2bf63',kind:'bow',damage:11,drawTime:.5,boltSpeed:32,description:'A fast golden bow. Hold attack to draw, then release.'};
ITEMS.gold_crossbow={name:'Gold crossbow',color:'#e2bf63',kind:'bow',damage:14,cooldown:.8,boltSpeed:33,description:'A gold-fitted crossbow with a quick reload. Uses selected arrows.'};
for(const[k,n,sat]of [['apple',4,3],['carrot',3,3],['bread',5,6],['roasted_mushroom',5,6],['vegetable_stew',9,12],['fruit_bowl',7,8]]){
  Object.assign(ITEMS[k],{nutrition:n,saturation:sat,heal:0,description:`Restores ${n} food and stores energy for steady healing.`});
}
for(const k of ['wheat_crop','wheat_sprout','carrot_crop','carrot_sprout'])ITEMS[k].hidden=true;
Object.assign(ITEMS.potion,{heal:10});
export const CROPS={wheat:{seed:'seeds',sprout:'wheat_sprout',mature:'wheat_crop',seconds:90,loot:{wheat:3,seeds:2}},carrot:{seed:'carrot',sprout:'carrot_sprout',mature:'carrot_crop',seconds:75,loot:{carrot:3}}};
Object.assign(CROPS,{
  cotton:{seed:'cotton_seeds',sprout:'cotton_sprout',mature:'cotton_crop',seconds:100,loot:{cotton:3,cotton_seeds:2}},
  watermelon:{seed:'watermelon_seeds',sprout:'watermelon_sprout',mature:'watermelon_crop',seconds:140,loot:{watermelon:1,watermelon_seeds:2}},
  melon:{seed:'melon_seeds',sprout:'melon_sprout',mature:'melon_crop',seconds:130,loot:{melon:1,melon_seeds:2}},
  potato:{seed:'potato',sprout:'potato_sprout',mature:'potato_crop',seconds:90,loot:{potato:3}},
  tomato:{seed:'tomato_seeds',sprout:'tomato_sprout',mature:'tomato_crop',seconds:90,loot:{tomato:4,tomato_seeds:2}},
  corn:{seed:'corn_seeds',sprout:'corn_sprout',mature:'corn_crop',seconds:110,loot:{corn:3,corn_seeds:2}},
  berries:{seed:'berry_seeds',sprout:'berries_sprout',mature:'berries_crop',seconds:100,loot:{berries:4,berry_seeds:2}},
});
export const CROP_BLOCKS=Object.values(CROPS).flatMap(c=>[c.sprout,c.mature]);
export const MATURE_CROPS=Object.values(CROPS).map(c=>c.mature);
Object.assign(ITEMS,{
 moonstone_pickaxe:{name:'Moonstone Pickaxe',color:'#bdb1fb',kind:'pickaxe',speed:8.5,tier:5,description:'Fast mining. Harvests leaf blocks intact.'},
 moonstone_sword:{name:'Moonstone Sword',color:'#c8b7ff',kind:'sword',damage:15,tier:5,description:'A powerful blade forged from moonstone.'},
 moonstone_axe:{name:'Moonstone Axe',color:'#b9a2e9',kind:'axe',speed:8,damage:9,tier:5,description:'Quick timber harvesting and a heavy melee hit.'},
 moonstone_armor:{name:'Moonstone Armor',color:'#b1a0ea',kind:'armor',reduction:.6,description:'Reduces incoming damage by 60%.'},
 moonstone_orb:{name:'Moonstone Orb',color:'#b9a8ff',kind:'orb',description:'Use to blink up to 18 blocks toward your aim. Requires safe ground.'},
 moonstone_glider:{name:'Moonstone Glider',color:'#ae8bed',kind:'glider',ore:'moonstone',glideSpeed:16,sink:.7,description:'A light wing for crossing the Ender islands.'},
 diamond_bow:{...ITEMS.bow,name:'Diamond Bow',color:'#70dae2',damage:11,kind:'bow',drawTime:.8,description:'Hold attack to draw, release to fire. Uses arrows.'},
 ender_berry:{name:'Ender Berry',color:'#b478e0',kind:'food',nutrition:5,saturation:6,description:'An otherworldly fruit. Restores food and energy.'}
});
Object.assign(ITEMS,{
 relic_shard:{name:'Relic Shard',color:'#e7bb67',kind:'material',description:'Treasure from outposts and Rift anchors. Trade at a Relic Forge.'},
 grappling_hook:{name:'Grappling Hook',color:'#b5c3cb',kind:'grapple',description:'Aim at solid terrain and press E to pull yourself up. 24-block reach, 2-second cooldown.'},
 ruby_blade:{name:'Ruby Lifeblade',color:'#e26581',kind:'sword',damage:11,leech:1,tier:5,description:'Melee hits restore one health. A relic-forged ruby blade.'},
 sapphire_blade:{name:'Sapphire Frostblade',color:'#77c6ee',kind:'sword',damage:10,slow:2,tier:5,description:'Melee hits slow your target for two seconds.'},
 warhammer:{name:'Iron Warhammer',color:'#a5b9c8',kind:'sword',model:'hammer',damage:19,cooldown:.85,tier:5,description:'A heavy, slower hit. 19 damage with a 0.85-second recovery.'},
 ruby_pickaxe:{name:'Ruby Pickaxe',color:'#dc6f87',kind:'pickaxe',speed:9,tier:5,description:'A high-speed pickaxe made from ruby and iron.'},
 emerald_axe:{name:'Emerald Axe',color:'#67c999',kind:'axe',speed:9,damage:8,tier:5,description:'Rapid timber harvesting with an emerald cutting edge.'},
 sapphire_shovel:{name:'Sapphire Shovel',color:'#76b7e3',kind:'shovel',speed:9,tier:5,description:'Excavate dirt and sand quickly.'},
 vanguard_armor:{name:'Vanguard Armor',color:'#e4c783',kind:'armor',reduction:.65,description:'Relic-forged armor reduces incoming damage by 65%.'},
 storm_glider:{name:'Stormwing Glider',color:'#70cace',kind:'glider',ore:'sapphire',glideSpeed:18,sink:.65,description:'Fast, efficient flight. Redeem relic shards at a forge.'},
 starfall_bow:{...ITEMS.bow,name:'Starfall Bow',color:'#e4c189',kind:'bow',damage:14,drawTime:.75,boltSpeed:35,cooldown:.6,description:'A quick-drawing relic bow with fast arrows.'},
 golden_apple:{name:'Golden Apple',color:'#e8c35e',kind:'food',nutrition:8,saturation:12,heal:5,description:'Restores food, energy and five health.'},
 explorer_cookie:{name:'Explorer Cookie',color:'#b98655',kind:'food',nutrition:5,saturation:5,description:'A compact sweet snack for long journeys.'},
  crystal_carrot:{name:'Crystal Carrot',color:'#a9dbc8',kind:'food',nutrition:6,saturation:8,effect:'nightvision',duration:120,description:'Food and two minutes of night vision.'}
});
ITEMS.firecracker={name:'Firecracker',color:'#c96958',kind:'firecracker',description:'Coal and sunstone sand packed into a bright celebration. Press E to light it.'};
export const RECIPES = [
  { item:'firecracker', count:4, cost:{coal:1,sand:2}, category:'Supplies' },
  { item: 'stone_sword', cost: { stone: 6, wood: 2 }, category: 'Gear' },
  { item: 'stone_pickaxe', cost: { stone: 5, wood: 2 }, category: 'Gear' },
  { item: 'iron_sword', cost: { iron_ingot: 5, wood: 2 }, category: 'Gear' },
  { item: 'iron_pickaxe', cost: { iron_ingot: 4, wood: 2 }, category: 'Gear' },
  { item: 'crystal_sword', cost: { crystal: 10, iron: 4 }, category: 'Gear' },
  { item: 'crystal_pickaxe', cost: { crystal: 8, iron: 3 }, category: 'Gear' },
  { item: 'bow', cost: { wood: 8, iron: 2 }, category: 'Gear' },
  { item: 'arrows', count: 16, cost: { wood: 2, stone: 2 }, category: 'Supplies' },
  { item: 'armor', cost: { iron_ingot: 8, wood: 4 }, category: 'Gear' },
  { item: 'crystal_armor', cost: { crystal: 12, iron: 6 }, category: 'Gear' },
  { item: 'potion', count: 2, cost: { apple: 2, crystal: 1 }, category: 'Supplies' },
  { item: 'torch', count: 6, cost: { wood: 2, stone: 1 }, category: 'Building' },
  { item: 'plank', count: 4, cost: { wood: 1 }, category: 'Building' },
  { item: 'glass', count: 4, cost: { sand: 3, crystal: 1 }, category: 'Building' },
  { item: 'bench', cost: { wood: 6 }, category: 'Building' },
];
RECIPES.push(
  {item:'furnace',cost:{stone:8},category:'Building'},
  {item:'chest',cost:{wood:6},category:'Building'},
  {item:'bed',cost:{plank:6,leaf:8},category:'Building'},
  {item:'ladder',count:8,cost:{wood:3},category:'Building'},
  {item:'lantern',count:4,cost:{iron_ingot:1},category:'Building'},
  {item:'birch_plank',count:4,cost:{birch:1},category:'Building'},
  {item:'pine_plank',count:4,cost:{pinewood:1},category:'Building'},
  {item:'stonebrick',count:4,cost:{stone:4},category:'Building'},
  {item:'polished_granite',count:4,cost:{granite:4},category:'Building'},
  {item:'polished_slate',count:4,cost:{slate:4},category:'Building'},
  {item:'tile',count:4,cost:{brick:4},category:'Building'},
  {item:'copper_pickaxe',cost:{copper_ingot:3,wood:2},category:'Gear'},
  {item:'iron_axe',cost:{iron_ingot:3,wood:2},category:'Gear'},
  {item:'iron_shovel',cost:{iron_ingot:2,wood:2},category:'Gear'},
  {item:'stone_shovel',cost:{stone:2,wood:2},category:'Gear'},
  {item:'diamond_pickaxe',cost:{diamond:3,wood:2},category:'Gear'},
  {item:'diamond_sword',cost:{diamond:3,iron_ingot:2},category:'Gear'},
  {item:'compass',cost:{iron_ingot:2,copper_ingot:1},category:'Gear'}
);
RECIPES.push(
  {item:'copper_sword',cost:{copper_ingot:4,wood:2},category:'Gear'},
  {item:'copper_axe',cost:{copper_ingot:3,wood:2},category:'Gear'},
  {item:'diamond_axe',cost:{diamond:3,wood:2},category:'Gear'},
  {item:'diamond_shovel',cost:{diamond:2,wood:2},category:'Gear'},
  {item:'stone_hoe',cost:{stone:2,wood:2},category:'Gear'},
  {item:'iron_hoe',cost:{iron_ingot:2,wood:2},category:'Gear'},
  {item:'crossbow',cost:{iron_ingot:5,wood:6,fiber:4},category:'Gear'},
  {item:'cloth',count:2,cost:{fiber:4},category:'Supplies'},
  {item:'vegetable_stew',cost:{carrot:2,mushroom:2,wheat:1},category:'Supplies'},
  {item:'fruit_bowl',cost:{apple:2,bread:1},category:'Supplies'},
  {item:'campfire',cost:{wood:3,stone:4},category:'Building'},
  {item:'cobblestone',count:4,cost:{stone:4},category:'Building'},
  {item:'gravel',count:4,cost:{stone:4},category:'Building'},
  {item:'sandstone',count:4,cost:{sand:4},category:'Building'},
  {item:'polished_marble',count:4,cost:{marble:4},category:'Building'},
  {item:'bookshelf',cost:{plank:6,cloth:2},category:'Building'},
  {item:'hedge',count:4,cost:{leaf:8},category:'Building'},
  ...['copper','iron','gold'].map(m=>({item:m+'_block',count:4,cost:{[m+'_ingot']:4},category:'Building'})),
  {item:'white_wool',count:4,cost:{cloth:2},category:'Building'},
  {item:'blue_wool',count:4,cost:{cloth:2,flower_blue:1},category:'Building'},
  {item:'red_wool',count:4,cost:{cloth:2,flower_red:1},category:'Building'},
  {item:'green_wool',count:4,cost:{cloth:2,fern:1},category:'Building'},
);
for(const[id,,material]of BUILD_MATERIALS){RECIPES.push({item:id+'_slab',count:6,cost:{[material]:3},category:'Building'},{item:id+'_stairs',count:4,cost:{[material]:4},category:'Building'});}
RECIPES.push(
  {item:'cotton_seeds',count:3,cost:{cotton:1},category:'Supplies'},
  {item:'cotton_cloth',count:4,cost:{cotton:3},category:'Supplies'},
  {item:'leather',cost:{rabbit_hide:4},category:'Supplies'},
  {item:'sugar',count:2,cost:{cane:2},category:'Supplies'},
  {item:'watermelon_slice',count:6,cost:{watermelon:1},category:'Supplies'},
  {item:'melon_slice',count:4,cost:{melon:1},category:'Supplies'},
  {item:'watermelon_seeds',count:2,cost:{watermelon_slice:1},category:'Supplies'},
  {item:'melon_seeds',count:2,cost:{melon_slice:1},category:'Supplies'},
  {item:'garden_salad',cost:{tomato:2,carrot:1,corn:1},category:'Supplies'},
  {item:'venison_stew',cost:{cooked_venison:1,potato:1,tomato:1},category:'Supplies'},
  {item:'berry_pie',cost:{berries:3,wheat:2,sugar:1},category:'Supplies'},
  {item:'trail_mix',count:2,cost:{berries:2,wheat:2,apple:1},category:'Supplies'},
  {item:'swift_smoothie',cost:{melon_slice:2,sugar:1},category:'Supplies'},
  {item:'spring_salad',cost:{carrot:2,corn:1,crystal:1},category:'Supplies'},
  {item:'mist_stew',cost:{berries:3,mushroom:2,crystal:1},category:'Supplies'},
  {item:'prospector_pie',cost:{carrot:1,wheat:2,crystal:2,gold_ingot:1},category:'Supplies'},
  {item:'miners_lunch',cost:{baked_potato:1,cooked_beef:1,crystal:1},category:'Supplies'},
  {item:'moonberry_compote',cost:{berries:3,lavender:1,sugar:1},category:'Supplies'},
  {item:'feather_bread',cost:{bread:1,feather:2,crystal:1},category:'Supplies'},
  {item:'longbow',cost:{wood:8,cloth:2,iron_ingot:2},category:'Gear'},
  {item:'recurve_bow',cost:{wood:5,fiber:5,copper_ingot:2},category:'Gear'},
  {item:'heavy_crossbow',cost:{crossbow:1,iron_ingot:6,leather:2},category:'Gear'},
  {item:'repeater_crossbow',cost:{crossbow:1,copper_ingot:5,iron_ingot:2},category:'Gear'},
  {item:'iron_arrows',count:12,cost:{wood:2,iron_ingot:1,feather:1},category:'Supplies'},
  {item:'frost_arrows',count:8,cost:{arrows:8,crystal:1,snow:1},category:'Supplies'},
  {item:'hang_glider',cost:{cloth:6,wood:8,leather:2},category:'Gear'},
  {item:'sail_glider',cost:{hang_glider:1,cotton_cloth:4,iron_ingot:3},category:'Gear'},
);
export const SMELTING=[
  {input:'copper',output:'copper_ingot',count:1},{input:'iron',output:'iron_ingot',count:1},{input:'gold',output:'gold_ingot',count:1},
  {input:'sand',output:'glass',count:2},{input:'clay',output:'brick',count:4},{input:'wheat',output:'bread',count:2},
  {input:'mushroom',output:'roasted_mushroom',count:1},
];
for(const[id]of ORE_GLIDERS)RECIPES.push({item:id+'_glider',cost:{hang_glider:1,cloth:3,[['copper','iron','gold'].includes(id)?id+'_ingot':id]:4},category:'Gear'});
for(const kind of ['pickaxe','axe','shovel','hoe','sword'])RECIPES.push({item:'gold_'+kind,cost:{gold_ingot:kind==='shovel'?2:3,wood:2},category:'Gear'});
RECIPES.push({item:'gold_armor',cost:{gold_ingot:8,leather:3},category:'Gear'},{item:'gold_bow',cost:{gold_ingot:3,wood:5,cloth:2},category:'Gear'},{item:'gold_crossbow',cost:{gold_ingot:5,wood:6,fiber:4},category:'Gear'});
for(const meat of ['venison','pork','beef','mutton','chicken','rabbit'])SMELTING.push({input:'raw_'+meat,output:'cooked_'+meat,count:1,furnaceOnly:true});
SMELTING.push({input:'potato',output:'baked_potato',count:1},{input:'corn',output:'roasted_corn',count:1});
for(const kind of ['pickaxe','sword','axe'])RECIPES.push({item:'moonstone_'+kind,cost:{moonstone:3,wood:2},category:'Gear'});
RECIPES.push(
 {item:'moonstone_armor',cost:{moonstone:8,leather:3},category:'Gear'},
 {item:'moonstone_glider',cost:{hang_glider:1,moonstone:4,cloth:3},category:'Gear'},
 {item:'moonstone_orb',count:3,cost:{moonstone:1,violet_crystal:1},category:'Gear'},
 {item:'diamond_bow',cost:{diamond:3,wood:5,fiber:3},category:'Gear'},
 {item:'moonstone_chest',cost:{moonstone:2,plank:6},category:'Building'},
 {item:'end_bricks',count:4,cost:{end_stone:4},category:'Building'},
 {item:'moonstone_block',cost:{moonstone:4},category:'Building'},
 {item:'ender_gate',cost:{obsidian:6,moonstone:3},category:'Building'}
);
for(const material of ['purple_wool','cyan_wool','black_wool'])RECIPES.push({item:material,count:4,cost:{cotton_cloth:2,violet_crystal:1},category:'Building'});
for(const material of ['white_concrete','blue_concrete','purple_concrete'])RECIPES.push({item:material,count:8,cost:{sand:4,gravel:4},category:'Building'});
RECIPES.push(
 {item:'ruby_blade',cost:{ruby:3,iron_ingot:2,wood:2},category:'Gear'},
 {item:'sapphire_blade',cost:{sapphire:3,iron_ingot:2,wood:2},category:'Gear'},
 {item:'ruby_pickaxe',cost:{ruby:3,iron_ingot:2,wood:2},category:'Gear'},
 {item:'emerald_axe',cost:{emerald:3,iron_ingot:2,wood:2},category:'Gear'},
 {item:'sapphire_shovel',cost:{sapphire:2,wood:2},category:'Gear'},
 {item:'relic_forge',cost:{stonebrick:6,iron_ingot:3},category:'Building'},
 {item:'golden_apple',cost:{apple:1,gold_ingot:4},category:'Food'},
 {item:'explorer_cookie',count:4,cost:{wheat:2,sugar:1},category:'Food'},
 {item:'crystal_carrot',cost:{carrot:1,crystal:2},category:'Food'}
);
for(const ore of ['ruby','sapphire','emerald'])RECIPES.push({item:ore+'_block',cost:{[ore]:4},category:'Building'});
for(const material of ['dark_bricks','ivory_bricks','copper_tiles','teal_tiles','amber_glass','violet_glass'])RECIPES.push({item:material,count:8,cost:{stone:4,sand:2},category:'Building'});
// Five-resource progression, with compatibility aliases for older worlds.
ITEMS.diamond_armor={...ITEMS.crystal_armor,name:'Diamond Armor',color:'#8abcc6'};
ITEMS.diamond_axe={...ITEMS.emerald_axe,name:'Diamond Axe',color:'#8abcc6',description:'Rapid timber harvesting with a diamond cutting edge.'};
ITEMS.diamond_shovel={...ITEMS.sapphire_shovel,name:'Diamond Shovel',color:'#8abcc6'};
for(const name of Object.keys(RESOURCE_ALIASES))if(ITEMS[name])ITEMS[name].hidden=true;
Object.assign(ITEMS.coal,{name:'Coal',color:'#42474e',kind:'material',place:false,description:'Fuel for furnaces. Each batch uses one coal.'});
Object.assign(ITEMS.diamond,{name:'Diamond',color:'#8abcc6'});
Object.assign(ITEMS.ruby_blade,{name:'Moonstone Lifeblade',color:'#b2a6cf',description:'Melee hits restore one health. Forged with relic shards.'});
Object.assign(ITEMS.sapphire_blade,{name:'Moonstone Frostblade',color:'#91b5c8'});
ITEMS.copper_tiles.name=BLOCKS.copper_tiles.name='Weathered Roof Tiles';
ITEMS.spring_salad.description='Higher jumps for 90 seconds. Made with carrots, corn and diamond.';
for(const name of ['grass','leaf','pine','hedge']){const color={grass:'#738866',leaf:'#567259',pine:'#4e665f',hedge:'#60785f'}[name];BLOCKS[name].color=color;ITEMS[name].color=color;}
const retained=RECIPES.filter(r=>!RESOURCE_ALIASES[r.item]);
RECIPES.splice(0,RECIPES.length,...retained);
for(const r of RECIPES){const cost={};for(const[k,n]of Object.entries(r.cost)){const key=canonicalItem(k);cost[key]=(cost[key]||0)+n;}r.cost=cost;}
RECIPES.push({item:'diamond_armor',cost:{diamond:8,iron_ingot:4},category:'Gear'},{item:'diamond_block',cost:{diamond:4},category:'Building'});
SMELTING.splice(0,SMELTING.length,...SMELTING.filter(r=>r.input!=='copper'));
ORE_GLIDERS.splice(0,ORE_GLIDERS.length,...ORE_GLIDERS.filter(([id])=>['iron','gold','diamond'].includes(id)));
export const LANDMARKS = [
  {id:'camp',name:'Base camp',subtitle:'A place to begin',x:0,z:14,color:'#c5b58a',type:'camp'},
  {id:'cave',name:'Hillside caves',subtitle:'A passage into the stone',x:22,z:8,color:'#aeb9b1',type:'cave'},
  {id:'river',name:'Willow river',subtitle:'Water, clay and open banks',x:-38,z:46,color:'#91bcc8',type:'landscape'},
  {id:'ridge',name:'Western ridge',subtitle:'Room to build above the trees',x:-135,z:-78,color:'#c5cbb6',type:'landscape'},
  {id:'reach',name:'Northern range',subtitle:'Pine forests and snowfields',x:24,z:-215,color:'#d3e1e2',type:'landscape'},
];
export const BIOMES={
  ender:{name:'Ender Islands',color:'#9582bd',top:'end_stone'},
  meadow:{name:'Meadows',color:'#76965e',top:'grass'},forest:{name:'Woodlands',color:'#59784b',top:'grass'},
  desert:{name:'Drylands',color:'#c9b489',top:'sand'},snow:{name:'Alpine forest',color:'#cfddda',top:'snow'},
  mountain:{name:'Highlands',color:'#8c9890',top:'stone'},
};
export function hash(x,z,seed=1) { let n = Math.imul(x ^ seed, 374761393) + Math.imul(z,668265263); n = Math.imul(n ^ n >>> 13,1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967295; }
export function dailySeed(date = new Date()) { return Number(date.toISOString().slice(0,10).replaceAll('-','')); }
export const TIMBER=['wood','birch','pinewood'];
export const PLANKS=['plank','birch_plank','pine_plank'];
export function ingredientKeys(key,recipe){
  if(key==='cloth')return ['cloth','cotton_cloth'];
  if(key==='wood'&&recipe?.item!=='plank')return TIMBER;
  if(key==='plank'&&!['oak_slab','oak_stairs'].includes(recipe?.item))return PLANKS;
  return [key];
}
export function ingredientCount(inv,key,recipe){return ingredientKeys(key,recipe).reduce((sum,k)=>sum+(inv[k]||0),0);}
function craftingPlan(inv,recipe){
  if(!recipe)return null;const left={...inv},cost={};
  for(const[key,count]of Object.entries(recipe.cost)){
    let remaining=count;
    for(const k of ingredientKeys(key,recipe)){const take=Math.min(remaining,left[k]||0);if(take){left[k]-=take;cost[k]=(cost[k]||0)+take;remaining-=take;}}
    if(remaining)return null;
  }
  return cost;
}
export function canCraft(inv,recipe){return craftingPlan(inv,recipe)!==null;}
export function craft(inv,item){const recipe=RECIPES.find(r=>r.item===item),cost=craftingPlan(inv,recipe);if(!cost)return false;for(const[k,n]of Object.entries(cost))inv[k]-=n;inv[item]=(inv[item]||0)+(recipe.count||1);return true;}
export function starterInventory() { return { wood_sword:1, wood_pickaxe:1, wood_axe:1, grass:32, wood:0, stone:0, torch:12, apple:5, potion:2,seeds:6,carrot:2,cotton_seeds:3,watermelon_seeds:2 }; }
export const STARTER_BAR = ['wood_sword','wood_pickaxe','wood_axe','grass','wood','stone','torch','apple','potion'];
