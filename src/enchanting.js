import {infusionValue,armorInfusion} from './infusions.js?v=38';
import {ITEMS} from './data.js?v=38';
import {ARMOR_SLOTS} from './badlands-content.js?v=38';
export const enchantKind=item=>item?.slot?'Protection':['sword','bow'].includes(item?.kind)?'Power':['pickaxe','axe','shovel','hoe'].includes(item?.kind)?'Efficiency':null;
export const enchantLevel=(s,name)=>Math.min(5,Math.max(0,s.enchants?.[name]||0));
export const enchantCost=(s,name)=>25*(enchantLevel(s,name)+1)**2;
export const gearPower=(s,name)=>1+enchantLevel(s,name)*.12;
export const weaponPower=(s,name)=>(enchantKind(ITEMS[name])==='Power'?gearPower(s,name):1)*(1+infusionValue(s,name,ITEMS[name]?.kind==='bow'?'power':'edge'));
export const miningPower=(s,name)=>enchantKind(ITEMS[name])==='Efficiency'?gearPower(s,name)*(1+infusionValue(s,name,'haste')):1;
export function armorProtection(s){
 const parts=ARMOR_SLOTS.map(slot=>s.armorParts?.[slot]).filter(name=>ITEMS[name]?.slot&&s.inv[name]>0);
 const protection=parts.reduce((sum,name)=>sum+ITEMS[name].reduction+enchantLevel(s,name)*.01,0);
 return Math.min(.8,(parts.length?protection:ITEMS[s.armor]?.reduction||0)+armorInfusion(s,'ward'));
}
export function enchantGear(g,name){
 const s=g.state,item=ITEMS[name];
 if(s.infusions?.[name]||g.creative||!enchantKind(item)||!(s.inv[name]>0)||enchantLevel(s,name)>=5||(s.aura||0)<enchantCost(s,name))return false;
 s.aura-=enchantCost(s,name);s.enchants??={};s.enchants[name]=enchantLevel(s,name)+1;
 g.audio.play('craft');g.toast(`${item.name} · ${enchantKind(item)} ${s.enchants[name]}`,'Upgrade applies to this gear type.','reward');g.save();return true;
}
export function awardAura(g,amount){
 if(g.creative||!Number.isFinite(amount)||amount<=0)return;
 const total=amount+(g.state.auraRemainder||0),whole=Math.floor(total+1e-9);
 // Keep fractional ore bonuses so low-level enchantments still earn their advertised XP.
 g.state.auraRemainder=Math.max(0,total-whole);
 g.state.aura=Math.min(999999999,(g.state.aura||0)+whole);
 if(whole)g.emit('aura',{amount:whole});
}
