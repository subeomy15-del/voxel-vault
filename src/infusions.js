import {ITEMS} from './data.js?v=33';
import {ENCHANTS,ALTARS,OFFERS,itemTags,enchantUnlocked} from './infusion-registry.js?v=33';
export const secureRandom=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;
export function enchantPool(state,name,altar){const tags=itemTags(ITEMS[name]);return Object.entries(ENCHANTS).filter(([,d])=>d.minAltar<=altar&&d.tags.some(t=>tags.includes(t))&&enchantUnlocked(state,d.unlock));}
export function rollInfusion(state,name,altar,offer,rng=secureRandom){
 const odds=ALTARS[altar-1]?.odds[offer];if(!odds||!itemTags(ITEMS[name]).length)throw Error('Invalid infusion');
 let draw=rng()*100,tier=5;for(let i=0;i<5;i++){draw-=odds[i];if(draw<0){tier=i+1;break;}}
 const pool=enchantPool(state,name,altar),enchants={};let budget=tier===5?6:tier;
 while(budget>0){const eligible=pool.filter(([id,d])=>(enchants[id]||0)<d.maxLevel&&(enchants[id]||Object.keys(enchants).length<3)&&!Object.keys(enchants).some(k=>d.exclusiveWith.includes(k)||ENCHANTS[k].exclusiveWith.includes(id)));if(!eligible.length)break;
  let weight=rng()*eligible.reduce((n,[,d])=>n+d.weight,0),chosen=eligible.at(-1)[0];for(const[id,d]of eligible){weight-=d.weight;if(weight<0){chosen=id;break;}}enchants[chosen]=(enchants[chosen]||0)+1;budget--;
 }
 return {tier,altar,enchants};
}
export function normalizeRoll(name,raw){
 if(!raw||!Number.isInteger(raw.tier)||raw.tier<1||raw.tier>5||!Number.isInteger(raw.altar)||raw.altar<1||raw.altar>5)return null;
 const tags=itemTags(ITEMS[name]),entries=Object.entries(raw.enchants||{});if(!entries.length||entries.length>3)return null;
 let points=0;for(const[id,level]of entries){const d=ENCHANTS[id];if(!d||!d.tags.some(t=>tags.includes(t))||d.minAltar>raw.altar||!Number.isInteger(level)||level<1||level>3||entries.some(([other])=>d.exclusiveWith.includes(other)))return null;points+=level;}
 if(points!==(raw.tier===5?6:raw.tier))return null;return {tier:raw.tier,altar:raw.altar,enchants:Object.fromEntries(entries)};
}
export const infusionValue=(state,name,id)=>(state.infusions?.[name]?.enchants[id]||0)*(ENCHANTS[id]?.amount||0);
export function armorInfusion(state,id){const names=Object.values(state.armorParts||{}).filter(n=>state.inv[n]>0);if(!names.length&&state.inv[state.armor]>0)names.push(state.armor);return names.reduce((sum,name)=>sum+infusionValue(state,name,id),0);}
export function nearbyAltar(g){for(let i=4;i>=0;i--)if(enchantUnlocked(g.state,ALTARS[i].unlock)&&g.nearbyStation(ALTARS[i].id))return i+1;return 0;}
export function infusionMaterial(altar,offer){return offer===2&&altar>=3?{name:altar===5?'moonstone':altar===4?'netherrack':'diamond',count:altar===4?2:1}:null;}
export function recoverInfusion(state,storage,key){
 try{const j=JSON.parse(storage.getItem(key+'.infusion')||'null');if(!j||j.world!==state.infusionWorld||j.seq!==(state.infusionSeq||0)+1||!Number.isSafeInteger(j.seq)||j.seed!==state.seed||!state.inv[j.name])return;
  const roll=normalizeRoll(j.name,j.roll);if(!roll||!Number.isFinite(j.aura)||j.aura<0||j.aura>state.aura)return;
  if(j.material&&(!ITEMS[j.material.name]||!Number.isInteger(j.material.after)||j.material.after<0))return;
  state.aura=j.aura;if(j.material)state.inv[j.material.name]=Math.min(state.inv[j.material.name]||0,j.material.after);
  state.infusions??={};state.infusions[j.name]=roll;delete state.enchants[j.name];state.infusionSeq=j.seq;
  state.enchantCodex=[...new Set([...(state.enchantCodex||[]),...Object.keys(roll.enchants)])];
 }catch{/* An invalid journal must never erase the underlying world. */}
}
export async function infuse(g,name,offer,key){
 if(g.infusing||g.creative||g.multiplayer?.active||g.state.mode==='parkour'||g.screen!=='enchant')return false;
 const s=g.state,altar=nearbyAltar(g),cost=OFFERS[offer]?.cost,material=infusionMaterial(altar,offer);
 if(!altar||!cost||!itemTags(ITEMS[name]).length||!(s.inv[name]>0)||s.aura<cost||material&&(s.inv[material.name]||0)<material.count)return false;
 g.infusing=true;
 try{
  // Persist the world identity before creating its first replayable transaction.
  s.infusionWorld??=crypto.randomUUID();if(!g.save()||await g.saveReady===false)throw Error('Save your world before enchanting.');
  if(g.state!==s||g.screen!=='enchant'||nearbyAltar(g)!==altar||s.aura<cost||!(s.inv[name]>0)||material&&(s.inv[material.name]||0)<material.count)return false;
  const roll=rollInfusion(s,name,altar,offer),journal={world:s.infusionWorld,seed:s.seed,seq:(s.infusionSeq||0)+1,name,roll,aura:s.aura-cost,material:material?{name:material.name,after:s.inv[material.name]-material.count}:null};
  // A small atomic write commits payment AND result before any animation reveals it.
  g.storage.setItem(key+'.infusion',JSON.stringify(journal));recoverInfusion(s,g.storage,key);
  if(s.infusionSeq!==journal.seq)throw Error('The infusion record could not be read.');
  g.save();g.audio.play('craft');g.emit('infusion',{name,roll});g.emit('hud');return roll;
 }catch(error){g.toast('Infusion not completed',error.message);return false;}finally{g.infusing=false;}
}
