import {ITEMS} from './data.js?v=28';
import {ARMOR_SLOTS} from './badlands-content.js?v=28';
export const enchantKind=item=>item?.slot?'Protection':['sword','bow'].includes(item?.kind)?'Power':['pickaxe','axe','shovel','hoe'].includes(item?.kind)?'Efficiency':null;
export const enchantLevel=(s,name)=>Math.min(5,Math.max(0,s.enchants?.[name]||0));
export const enchantCost=(s,name)=>25*(enchantLevel(s,name)+1)**2;
export const gearPower=(s,name)=>1+enchantLevel(s,name)*.12;
export const weaponPower=(s,name)=>enchantKind(ITEMS[name])==='Power'?gearPower(s,name):1;
export const miningPower=(s,name)=>enchantKind(ITEMS[name])==='Efficiency'?gearPower(s,name):1;
export function armorProtection(s){
 const parts=ARMOR_SLOTS.map(slot=>s.armorParts?.[slot]).filter(name=>ITEMS[name]?.slot&&s.inv[name]>0);
 const protection=parts.reduce((sum,name)=>sum+ITEMS[name].reduction+enchantLevel(s,name)*.01,0);
 return Math.min(.8,parts.length?protection:ITEMS[s.armor]?.reduction||0);
}
export function enchantGear(g,name){
 const s=g.state,item=ITEMS[name];
 if(g.creative||!enchantKind(item)||!(s.inv[name]>0)||enchantLevel(s,name)>=5||(s.aura||0)<enchantCost(s,name))return false;
 s.aura-=enchantCost(s,name);s.enchants??={};s.enchants[name]=enchantLevel(s,name)+1;
 g.audio.play('craft');g.toast(`${item.name} · ${enchantKind(item)} ${s.enchants[name]}`,'Upgrade applies to this gear type.','reward');g.save();return true;
}
export function awardAura(g,amount){if(g.creative||amount<=0)return;g.state.aura=Math.min(999999999,(g.state.aura||0)+Math.floor(amount));g.emit('aura',{amount:Math.floor(amount)});}
