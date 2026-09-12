import { VERSION, ITEMS, STARTER_BAR, starterInventory, dailySeed, BLOCKS,CROPS,EFFECTS } from './data.js?v=11';
import { ANIMALS } from './wildlife.js?v=11';
import { REALM_FIELDS,captureRealm } from './realms.js?v=11';
const prefix='voxel-vault-v2-';
export const defaultSettings={volume:.45,sensitivity:1,quality:'high',bobbing:true,perspective:0};
export function freshState(seed=7821,mode='adventure') {
  const inv=starterInventory();if(mode==='creative')for(const k of Object.keys(ITEMS))inv[k]=999;
  if(mode==='ender')Object.assign(inv,{end_stone:128,moonstone_orb:9,moonstone_pickaxe:1,moonstone_sword:1,moonstone_glider:1,ender_berry:16,obsidian:32,moonstone_chest:1,ender_gate:1});
  return {version:VERSION,seed,mode,dimension:mode==='ender'?'ender':'overworld',realms:{},gate:null,outposts:[],rift:{collected:[],started:0,finished:0,best:0,rewarded:false,kit:false,runs:0},moonChest:{},inv,bar:mode==='ender'?['moonstone_sword','moonstone_pickaxe','moonstone_orb','end_stone','obsidian','ender_berry','torch','moonstone_chest','ender_gate']:[...STARTER_BAR],selected:0,hp:20,armor:null,pos:null,yaw:0,pitch:0,time:70,elapsed:0,seals:[],opened:[],discovered:['camp'],edits:[],victory:false,stats:{mined:0,built:0,kills:0,crafted:0,deaths:0,smelted:0,harvested:0},waypoint:'home',spawn:null,origin:null,containers:{},crops:{},terrain:6,food:20,saturation:5,exhaustion:0,effects:{},glider:mode==='ender'?'moonstone_glider':null,ammo:'arrows',drops:[],animals:[]};
}
export function slotKey(mode){return prefix+mode+(mode==='daily'?'-'+dailySeed():'');}
export function loadState(storage,mode='adventure') {
  try {
    const raw=JSON.parse(storage.getItem(slotKey(mode))||'null');if(!raw||raw.version!==VERSION)return null;
    const s=freshState(Number.isFinite(raw.seed)?raw.seed:7821,mode);s.terrain=raw.terrain===6?6:5;
    for(const [k,n]of Object.entries(raw.inv||{}))if(ITEMS[k]&&Number.isFinite(n))s.inv[k]=Math.max(0,Math.min(999999,Math.floor(n)));
    if(Array.isArray(raw.bar)&&raw.bar.length===9)s.bar=raw.bar.map((k,i)=>ITEMS[k]?k:STARTER_BAR[i]);
    if(mode==='creative')for(const k of Object.keys(ITEMS))s.inv[k]=Math.max(999,s.inv[k]||0);
    s.selected=Math.max(0,Math.min(8,raw.selected|0));s.hp=Math.max(1,Math.min(20,Number(raw.hp)||20));s.armor=ITEMS[raw.armor]?.kind==='armor'&&s.inv[raw.armor]?raw.armor:null;
    for(const k of ['yaw','pitch','time','elapsed'])if(Number.isFinite(raw[k]))s[k]=raw[k];
    if(raw.pos&&['x','y','z'].every(k=>Number.isFinite(raw.pos[k])))s.pos={x:Math.max(-510,Math.min(510,raw.pos.x)),y:Math.max(-63,Math.min(94,raw.pos.y)),z:Math.max(-510,Math.min(510,raw.pos.z))};
    for(const k of ['seals','opened','discovered'])if(Array.isArray(raw[k]))s[k]=[...new Set(raw[k].filter(v=>typeof v==='string'))];
    s.seals=s.seals.filter(k=>['grove','dunes','frost'].includes(k));
    s.edits=Array.isArray(raw.edits)?raw.edits.filter(e=>Array.isArray(e)&&e.length===2&&/^-?\d+,-?\d+,-?\d+$/.test(e[0])&&(e[1]===null||BLOCKS[e[1]])):[];
    if(raw.spawn&&['x','y','z'].every(k=>Number.isFinite(raw.spawn[k])))s.spawn={x:Math.max(-510,Math.min(510,raw.spawn.x)),y:Math.max(-63,Math.min(94,raw.spawn.y)),z:Math.max(-510,Math.min(510,raw.spawn.z))};
    if(raw.origin&&['x','y','z'].every(k=>Number.isFinite(raw.origin[k])))s.origin={x:Math.max(-510,Math.min(510,raw.origin.x)),y:Math.max(-63,Math.min(94,raw.origin.y)),z:Math.max(-510,Math.min(510,raw.origin.z))};
    for(const[k,c]of Object.entries(raw.crops||{}))if(/^-?\d+,-?\d+,-?\d+$/.test(k)&&CROPS[c?.kind]&&Number.isFinite(c.readyAt)&&c.readyAt>=0)s.crops[k]={kind:c.kind,readyAt:c.readyAt};
    for(const[key,items]of Object.entries(raw.containers||{})){if(!/^-?\d+,-?\d+,-?\d+$/.test(key)||!items||typeof items!=='object')continue;const bag={};for(const[k,n]of Object.entries(items))if(ITEMS[k]&&Number.isFinite(n)&&n>0)bag[k]=Math.min(999999,Math.floor(n));s.containers[key]=bag;}
    for(const k of ['food','saturation','exhaustion'])if(Number.isFinite(raw[k]))s[k]=Math.max(0,Math.min(k==='exhaustion'?4:20,raw[k]));
    for(const[name,t]of Object.entries(raw.effects||{}))if(EFFECTS[name]&&Number.isFinite(t)&&t>0)s.effects[name]=Math.min(EFFECTS[name].duration,t);
    if(ITEMS[raw.glider]?.kind==='glider'&&s.inv[raw.glider]>0)s.glider=raw.glider;
    if(ITEMS[raw.ammo]?.kind==='ammo')s.ammo=raw.ammo;
    for(const d of (Array.isArray(raw.drops)?raw.drops:[]).slice(0,128))if(ITEMS[d?.item]&&['x','y','z','count'].every(k=>Number.isFinite(d[k]))&&d.count>=1&&Math.abs(d.x)<=512&&Math.abs(d.z)<=512&&d.y>=-64&&d.y<=96)s.drops.push({id:s.drops.length+1,item:d.item,count:Math.min(999,Math.floor(d.count)),x:d.x,y:d.y,z:d.z,age:Math.max(0,Math.min(599,Number.isFinite(d.age)?d.age:0))});
    for(const a of (Array.isArray(raw.animals)?raw.animals:[]).slice(0,128))if(ANIMALS[a?.kind]&&['x','y','z','hp'].every(k=>Number.isFinite(a[k]))&&a.hp>0&&Math.abs(a.x)<=511&&Math.abs(a.z)<=511&&a.y>=-63&&a.y<=94)s.animals.push({kind:a.kind,x:a.x,y:a.y,z:a.z,hp:Math.min(ANIMALS[a.kind].hp,a.hp),angle:Number.isFinite(a.angle)?a.angle:0});
    s.outposts=(Array.isArray(raw.outposts)?raw.outposts:[]).filter(p=>['lodge','tower','ruins'].includes(p?.id)&&['x','y','z'].every(k=>Number.isFinite(p[k]))&&Math.abs(p.x)<491&&Math.abs(p.z)<491&&p.y>5&&p.y<79).slice(0,3).map(({id,x,y,z})=>({id,x:x|0,y:y|0,z:z|0}));
    s.dimension=raw.dimension==='ender'||mode==='ender'?'ender':'overworld';
    const point=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]))&&Math.abs(p.x)<=508&&Math.abs(p.z)<=508&&p.y>=-60&&p.y<=89;
    if(point(raw.gate))s.gate={x:raw.gate.x|0,y:raw.gate.y|0,z:raw.gate.z|0};
    for(const dimension of ['overworld','ender'])if(raw.realms?.[dimension]&&typeof raw.realms[dimension]==='object'){
      const fields=Object.fromEntries(REALM_FIELDS.filter(k=>k in raw.realms[dimension]).map(k=>[k,raw.realms[dimension][k]]));
      const realm=loadState({getItem:()=>JSON.stringify({...fields,version:VERSION,seed:s.seed,dimension,realms:{}})},mode==='creative'?'creative':'adventure');
      if(realm)s.realms[dimension]=captureRealm(realm);
    }
    if(raw.rift&&typeof raw.rift==='object'){
      s.rift.collected=Array.isArray(raw.rift.collected)?[...new Set(raw.rift.collected.filter(k=>['dawn','ember','dusk'].includes(k)))]:[];
      for(const k of ['started','finished','best','runs'])if(Number.isFinite(raw.rift[k])&&raw.rift[k]>=0)s.rift[k]=raw.rift[k];
      s.rift.rewarded=raw.rift.rewarded===true;s.rift.kit=raw.rift.kit===true;
    }
    for(const[k,n]of Object.entries(raw.moonChest||{}))if(ITEMS[k]&&Number.isFinite(n)&&n>0)s.moonChest[k]=Math.min(999999,Math.floor(n));
    s.victory=raw.victory===true;s.waypoint=typeof raw.waypoint==='string'?raw.waypoint:'camp';
    for(const k of Object.keys(s.stats))if(Number.isFinite(raw.stats?.[k]))s.stats[k]=Math.max(0,raw.stats[k]);return s;
  }catch{return null;}
}
export function saveState(storage,state){try{storage.setItem(slotKey(state.mode),JSON.stringify(state));return true;}catch{return false;}}
export function loadSettings(storage){try{const s={...defaultSettings,...JSON.parse(storage.getItem(prefix+'settings')||'{}')};s.perspective=[0,1,2].includes(Number(s.perspective))?Number(s.perspective):0;return s;}catch{return {...defaultSettings};}}
export function saveSettings(storage,settings){try{storage.setItem(prefix+'settings',JSON.stringify(settings));}catch{}}
export function importLegacy(storage,state){
  try{const old=JSON.parse(storage.getItem('voxel-vault-player-v3')||'null');if(!old?.inv)return false;
    const aliases={diamond:'crystal',ore:'crystal',voidalloy:'crystal',sword:'iron_sword',diamond_sword:'crystal_sword',voidalloy_sword:'crystal_sword',diamond_pickaxe:'crystal_pickaxe',voidalloy_pickaxe:'crystal_pickaxe',iron_bow:'bow',wood_bow:'bow',gold_armory:'armor',diamond_armory:'crystal_armor'};
    for(const [oldKey,n]of Object.entries(old.inv)){const k=aliases[oldKey]||oldKey;if(ITEMS[k]&&Number.isFinite(n)&&n>0)state.inv[k]=Math.max(state.inv[k]||0,Math.min(999999,Math.floor(n)));}return true;
  }catch{return false;}
}
