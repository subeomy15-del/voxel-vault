import {POTIONS,POTION_FAMILIES,potionDescription} from './potion-content.js?v=38';
export const DRINK_COOLDOWN=3;
const legacy={id:'potion',family:'healing',name:'Healing tonic',power:10,duration:0,color:'#d4abe9'};
export const potionFor=id=>id==='potion'?legacy:POTIONS[id];
export function potionPower(state,family){const b=state.brews?.[family];return b?.remaining>0?(POTIONS[b.id]?.recovery||POTIONS[b.id]?.power||0):0;}
export function normalizeBrews(raw){
 const brews={};
 if(raw&&typeof raw==='object')for(const [family,b]of Object.entries(raw)){
  const p=POTIONS[b?.id];if(p?.family===family&&p.duration>0&&Number.isFinite(b.remaining)&&b.remaining>0)brews[family]={id:p.id,remaining:Math.min(p.duration,b.remaining)};
 }
 return brews;
}
export function drinkPotion(g,id){
 const p=potionFor(id),s=g.state;
 if(!p||g.multiplayer?.competitive||s.mode==='parkour'||s.hp<=0||(g.screen&&!['inventory','craft'].includes(g.screen))||!(s.inv[id]>0))return false;
 if((s.potionCooldown||0)>0){g.toast('Let the infusion settle',`${Math.ceil(s.potionCooldown)}s before your next potion.`);return false;}
 if(p.family==='healing'&&s.hp>=20)return false;
 s.brews??={};const old=s.brews[p.family],previous=POTIONS[old?.id];
 if(old?.remaining>0&&previous?.power>p.power){g.toast('Stronger infusion active','This bottle is kept for later.');return false;}
 if(!g.creative){s.inv[id]--;if(id!=='potion')g.add('empty_flask');}
 if(p.family==='healing')s.hp=Math.min(20,s.hp+p.power);
 if(p.duration)s.brews[p.family]={id:p.id,remaining:previous?.power===p.power?Math.max(old.remaining,p.duration):p.duration};
 s.potionCooldown=DRINK_COOLDOWN;g.eating=null;g.drawState=null;g.audio.play('heal');
 g.renderer.burst(g.pos.x,g.pos.y+1,g.pos.z,p.color,6);g.toast(p.name,p.duration?`${p.duration}s infusion active`:`+${p.power} health`);g.emit('hud');g.save();return true;
}
export function tickPotions(g,dt){
 const s=g.state;s.potionCooldown=Math.max(0,(s.potionCooldown||0)-dt);
 for(const[family,b]of Object.entries(s.brews||{})){
  const p=POTIONS[b.id],time=Math.min(dt,b.remaining);
  if(p&&(family==='regeneration'||p.recovery))s.hp=Math.min(20,s.hp+time*(p.recovery||p.power));
  b.remaining-=dt;if(b.remaining<=0)delete s.brews[family];
 }
 if(g.creative){s.breath=20;return;}
 const submerged=g.world.waterAt(g.pos.x,g.pos.y+1.6,g.pos.z);
 s.breath=submerged?Math.max(0,(s.breath??20)-dt*(1-potionPower(s,'water_breathing'))):Math.min(20,(s.breath??20)+dt*6);
 if(submerged&&s.breath<=0)g.hurt(2,false,'drowning');
}
export function potionDamageMultiplier(g,source){
 const s=g.state,defense=potionPower(s,'defense');let resistance=0;
 if(source==='fire')resistance=potionPower(s,'fire_resistance');
 if(source==='ash'||source==='fire'&&s.dimension==='nether')resistance=Math.max(resistance,potionPower(s,'ash_resistance'));
 if(source==='void'||source==='combat'&&s.dimension==='ender')resistance=potionPower(s,'void_resistance');
 return Math.max(.25,(1-defense)*(1-resistance));
}
export function potionHUD(state){return Object.entries(state.brews||{}).map(([family,b])=>({key:'brew:'+family,name:POTIONS[b.id].name,color:POTION_FAMILIES[family].color,time:b.remaining,description:potionDescription(POTIONS[b.id])}));}
