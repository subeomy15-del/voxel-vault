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
  crystal: { name: 'Aether crystal', color: '#80d9cd', solid: true, hardness: 1.7 },
  ruin: { name: 'Ancient stone', color: '#9da990', solid: true, hardness: 1.5 },
  plank: { name: 'Timber planks', color: '#b18a59', solid: true, hardness: .7 },
  glass: { name: 'Sea glass', color: '#9cc7c3', solid: true, hardness: .5 },
  bedrock: { name: 'Worldstone', color: '#424d59', solid: true, hardness: Infinity },
  torch: { name: 'Lantern', color: '#ffd890', solid: false, hardness: .3 },
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
};
for(const[k,[name,color,hardness]]of Object.entries(extraBlocks))BLOCKS[k]={name,color,hardness,solid:!['water','ladder','lantern'].includes(k)};
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
});
export const RECIPES = [
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
  {item:'lantern',count:4,cost:{iron_ingot:1,coal:1},category:'Building'},
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
export const SMELTING=[
  {input:'copper',output:'copper_ingot',count:1},{input:'iron',output:'iron_ingot',count:1},{input:'gold',output:'gold_ingot',count:1},
  {input:'sand',output:'glass',count:2},{input:'clay',output:'brick',count:4},{input:'wheat',output:'bread',count:2},
];
export const LANDMARKS = [
  {id:'camp',name:'Base camp',subtitle:'A place to begin',x:0,z:14,color:'#c5b58a',type:'camp'},
  {id:'cave',name:'Hillside caves',subtitle:'A passage into the stone',x:22,z:8,color:'#aeb9b1',type:'cave'},
  {id:'river',name:'Willow river',subtitle:'Water, clay and open banks',x:-38,z:46,color:'#91bcc8',type:'landscape'},
  {id:'ridge',name:'Western ridge',subtitle:'Room to build above the trees',x:-135,z:-78,color:'#c5cbb6',type:'landscape'},
  {id:'reach',name:'Northern range',subtitle:'Pine forests and snowfields',x:24,z:-215,color:'#d3e1e2',type:'landscape'},
];
export const BIOMES={
  meadow:{name:'Meadows',color:'#76965e',top:'grass'},forest:{name:'Woodlands',color:'#59784b',top:'grass'},
  desert:{name:'Drylands',color:'#c9b489',top:'sand'},snow:{name:'Alpine forest',color:'#cfddda',top:'snow'},
  mountain:{name:'Highlands',color:'#8c9890',top:'stone'},
};
export function hash(x,z,seed=1) { let n = Math.imul(x ^ seed, 374761393) + Math.imul(z,668265263); n = Math.imul(n ^ n >>> 13,1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967295; }
export function dailySeed(date = new Date()) { return Number(date.toISOString().slice(0,10).replaceAll('-','')); }
export function canCraft(inv, recipe) { return !!recipe && Object.entries(recipe.cost).every(([k,n]) => (inv[k] || 0) >= n); }
export function craft(inv, item) { const recipe = RECIPES.find(r=>r.item===item); if (!canCraft(inv,recipe)) return false; for (const [k,n] of Object.entries(recipe.cost)) inv[k]-=n; inv[item]=(inv[item]||0)+(recipe.count||1); return true; }
export function starterInventory() { return { wood_sword:1, wood_pickaxe:1, wood_axe:1, grass:32, wood:0, stone:0, torch:12, apple:5, potion:2 }; }
export const STARTER_BAR = ['wood_sword','wood_pickaxe','wood_axe','grass','wood','stone','torch','apple','potion'];
