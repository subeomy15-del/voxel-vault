import { VERSION, ITEMS, STARTER_BAR, starterInventory, dailySeed, BLOCKS } from './data.js';
const prefix='voxel-vault-v2-';
export const defaultSettings={volume:.45,sensitivity:1,quality:'high',bobbing:true};
export function freshState(seed=7821,mode='adventure') {
  const inv=starterInventory();if(mode==='creative')for(const k of Object.keys(ITEMS))inv[k]=999;
  return {version:VERSION,seed,mode,inv,bar:[...STARTER_BAR],selected:0,hp:20,armor:null,pos:null,yaw:0,pitch:0,time:70,elapsed:0,seals:[],opened:[],discovered:['camp'],edits:[],victory:false,stats:{mined:0,built:0,kills:0,crafted:0,deaths:0,smelted:0},waypoint:'camp',spawn:null,containers:{},terrain:3};
}
export function slotKey(mode){return prefix+mode+(mode==='daily'?'-'+dailySeed():'');}
export function loadState(storage,mode='adventure') {
  try {
    const raw=JSON.parse(storage.getItem(slotKey(mode))||'null');if(!raw||raw.version!==VERSION)return null;
    const s=freshState(Number.isFinite(raw.seed)?raw.seed:7821,mode);
    for(const [k,n]of Object.entries(raw.inv||{}))if(ITEMS[k]&&Number.isFinite(n))s.inv[k]=Math.max(0,Math.min(999999,Math.floor(n)));
    if(Array.isArray(raw.bar)&&raw.bar.length===9)s.bar=raw.bar.map((k,i)=>ITEMS[k]?k:STARTER_BAR[i]);
    s.selected=Math.max(0,Math.min(8,raw.selected|0));s.hp=Math.max(1,Math.min(20,Number(raw.hp)||20));s.armor=['armor','crystal_armor'].includes(raw.armor)&&s.inv[raw.armor]?raw.armor:null;
    for(const k of ['yaw','pitch','time','elapsed'])if(Number.isFinite(raw[k]))s[k]=raw[k];
    if(raw.pos&&['x','y','z'].every(k=>Number.isFinite(raw.pos[k])))s.pos={x:Math.max(-510,Math.min(510,raw.pos.x)),y:Math.max(-63,Math.min(94,raw.pos.y)),z:Math.max(-510,Math.min(510,raw.pos.z))};
    for(const k of ['seals','opened','discovered'])if(Array.isArray(raw[k]))s[k]=[...new Set(raw[k].filter(v=>typeof v==='string'))];
    s.seals=s.seals.filter(k=>['grove','dunes','frost'].includes(k));
    s.edits=Array.isArray(raw.edits)?raw.edits.filter(e=>Array.isArray(e)&&e.length===2&&/^-?\d+,-?\d+,-?\d+$/.test(e[0])&&(e[1]===null||BLOCKS[e[1]])):[];
    if(raw.spawn&&['x','y','z'].every(k=>Number.isFinite(raw.spawn[k])))s.spawn={x:Math.max(-510,Math.min(510,raw.spawn.x)),y:Math.max(-63,Math.min(94,raw.spawn.y)),z:Math.max(-510,Math.min(510,raw.spawn.z))};
    for(const[key,items]of Object.entries(raw.containers||{})){if(!/^-?\d+,-?\d+,-?\d+$/.test(key)||!items||typeof items!=='object')continue;const bag={};for(const[k,n]of Object.entries(items))if(ITEMS[k]&&Number.isFinite(n)&&n>0)bag[k]=Math.min(999999,Math.floor(n));s.containers[key]=bag;}
    s.victory=raw.victory===true;s.waypoint=typeof raw.waypoint==='string'?raw.waypoint:'camp';
    for(const k of Object.keys(s.stats))if(Number.isFinite(raw.stats?.[k]))s.stats[k]=Math.max(0,raw.stats[k]);return s;
  }catch{return null;}
}
export function saveState(storage,state){try{storage.setItem(slotKey(state.mode),JSON.stringify(state));return true;}catch{return false;}}
export function loadSettings(storage){try{return {...defaultSettings,...JSON.parse(storage.getItem(prefix+'settings')||'{}')};}catch{return {...defaultSettings};}}
export function saveSettings(storage,settings){try{storage.setItem(prefix+'settings',JSON.stringify(settings));}catch{}}
export function importLegacy(storage,state){
  try{const old=JSON.parse(storage.getItem('voxel-vault-player-v3')||'null');if(!old?.inv)return false;
    const aliases={diamond:'crystal',ore:'crystal',voidalloy:'crystal',sword:'iron_sword',diamond_sword:'crystal_sword',voidalloy_sword:'crystal_sword',diamond_pickaxe:'crystal_pickaxe',voidalloy_pickaxe:'crystal_pickaxe',iron_bow:'bow',wood_bow:'bow',gold_armory:'armor',diamond_armory:'crystal_armor'};
    for(const [oldKey,n]of Object.entries(old.inv)){const k=aliases[oldKey]||oldKey;if(ITEMS[k]&&Number.isFinite(n)&&n>0)state.inv[k]=Math.max(state.inv[k]||0,Math.min(999999,Math.floor(n)));}return true;
  }catch{return false;}
}
