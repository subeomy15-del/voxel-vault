import {ITEMS} from './data.js?v=37';
import {icon} from './icons.js?v=37';
import {ENCHANTS,ALTARS,OFFERS,INFUSION_TIERS,itemTags,enchantText} from './infusion-registry.js?v=37';
import {nearbyAltar,enchantPool,infusionMaterial} from './infusions.js?v=37';
const roman=['','I','II','III','IV','V'];
export function infusionTooltip(state,name){const r=state.infusions?.[name];return r?`${INFUSION_TIERS[r.tier-1]} · Tier ${roman[r.tier]}\n`+Object.entries(r.enchants).map(([id,lv])=>`${ENCHANTS[id].name} ${roman[lv]} — ${enchantText(id,lv)}`).join('\n'):'';}
const resultMarkup=roll=>roll?`<strong>${INFUSION_TIERS[roll.tier-1]} · TIER ${roman[roll.tier]}</strong><ul>${Object.entries(roll.enchants).map(([id,level],i)=>`<li style="--reveal:${i}" title="${enchantText(id,level)}">${ENCHANTS[id].name} ${roman[level]}<small>${enchantText(id,level)}</small></li>`).join('')}</ul>`:'<p>No infusion yet.</p>';
export class InfusionUI{
 constructor(ui){this.ui=ui;this.selected=null;this.signature='';
  document.addEventListener('change',e=>{if(e.target.matches('[data-infusion-gear]')){this.selected=e.target.value;this.replace();}if(e.target.matches('[data-reroll-confirm]'))this.update();});
  document.addEventListener('click',async e=>{
   const button=e.target.closest('[data-infuse]');if(!button)return;
   const g=ui.game,name=this.selected,state=g.state;button.disabled=true;
   const pending=g.infuse(name,Number(button.dataset.infuse));this.update();const result=await pending;
   // Saving can outlive a selection change or a newly opened world/menu.
   if(result&&g.state===state&&this.selected===name){
    const box=ui.overlay.querySelector('[data-infusion-result]');
    if(box){box.innerHTML=resultMarkup(result);box.classList.remove('reveal');void box.offsetWidth;box.classList.add('reveal');}
    const check=ui.overlay.querySelector('[data-reroll-confirm]');if(check)check.checked=false;
   }
   ui.refreshItems();this.update();
  });
 }
 markup(){
  const g=this.ui.game,s=g.state,gear=Object.keys(s.inv).filter(name=>s.inv[name]>0&&itemTags(ITEMS[name]).length&&!ITEMS[name].hidden),altar=nearbyAltar(g);
  if(!gear.includes(this.selected))this.selected=gear[0]||null;
  const name=this.selected,roll=s.infusions?.[name];
  return `<section class="infusion-panel"><header><div><span class="eyebrow">VAULT INFUSION</span><h3>${altar?ALTARS[altar-1].name:'Find your resonance'}</h3></div><b data-vault-xp>${s.aura} Vault XP</b></header><p>${altar?'Choose how much XP to invest. No offer guarantees the best tier.':'Craft a Basic altar at a workbench, place it nearby, then interact. Better altars awaken through ruin and realm exploration.'}</p><div class="infusion-layout"><section><label>Equipment<select data-infusion-gear aria-label="Equipment to infuse">${gear.map(id=>`<option value="${id}" ${id===name?'selected':''}>${ITEMS[id].name}</option>`).join('')}</select></label>${name?icon(name,88):''}<div data-infusion-result class="infusion-result">${resultMarkup(roll)}</div><label class="reroll-warning"><input type="checkbox" data-reroll-confirm> Replace current enchantments</label><small>Applies to this equipment type. Rerolling replaces its entire previous roll, including legacy upgrades.</small></section><section><h4>Possible enchantments</h4><div class="infusion-pool">${altar&&name?enchantPool(s,name,altar).map(([id,d])=>`<span title="${enchantText(id,1)} Levels I–III.">${d.name}</span>`).join(''):'Explore, build an altar, and bring a tool, weapon or armor.'}</div><div class="infusion-offers">${OFFERS.map((offer,i)=>{const odds=ALTARS[(altar||1)-1].odds[i],material=infusionMaterial(altar,i);return `<article><h4>${offer.name}</h4><b>${offer.cost} XP${material?' + '+material.count+' '+ITEMS[material.name].name:''}</b>${odds.map((chance,t)=>chance?`<div class="infusion-odds"><span>${roman[t+1]}</span><meter value="${chance}" max="100" aria-label="Tier ${t+1}: ${chance}%"></meter><span>${chance}%</span></div>`:'').join('')}<button data-infuse="${i}">Infuse</button></article>`;}).join('')}</div></section></div><details class="infusion-codex"><summary>Enchantment codex · <span data-codex-count>${s.enchantCodex?.length||0}</span> / ${Object.keys(ENCHANTS).length}</summary><div>${Object.entries(ENCHANTS).map(([id,d])=>`<p data-codex="${id}">${s.enchantCodex?.includes(id)?`<b>${d.name}</b> · ${d.tags.join(', ')} · Levels I–III<br>${enchantText(id,1)} Appears at altar tier ${d.minAltar}+.`:'???? · Undiscovered enchantment'}</p>`).join('')}</div></details></section>`;
 }
 replace(){const old=this.ui.overlay.querySelector('.infusion-panel');if(!old)return;const template=document.createElement('template');template.innerHTML=this.markup();old.replaceWith(template.content.firstElementChild);this.signature='';this.update();}
 update(){const g=this.ui.game,s=g.state,root=this.ui.overlay.querySelector('.infusion-panel');if(!root)return;const altar=nearbyAltar(g),roll=s.infusions?.[this.selected],confirm=root.querySelector('[data-reroll-confirm]');
  root.querySelector('[data-vault-xp]').textContent=`${s.aura} Vault XP`;confirm.closest('label').hidden=!(roll||s.enchants?.[this.selected]);
  for(const b of root.querySelectorAll('[data-infuse]')){const i=Number(b.dataset.infuse),m=infusionMaterial(altar,i);b.disabled=g.infusing||!altar||!this.selected||!(s.inv[this.selected]>0)||s.aura<OFFERS[i].cost||g.creative||!!g.multiplayer?.active||m&&(s.inv[m.name]||0)<m.count||!!(roll||s.enchants?.[this.selected])&&!confirm.checked;b.textContent=g.infusing?'Saving roll…':roll?'Reroll':'Infuse';}
  root.querySelector('[data-codex-count]').textContent=s.enchantCodex?.length||0;
  for(const id of s.enchantCodex||[]){const node=root.querySelector(`[data-codex="${id}"]`),d=ENCHANTS[id];if(node&&!node.dataset.known){node.textContent=`${d.name} · ${d.tags.join(', ')} · Levels I–III · ${enchantText(id,1)} Altar tier ${d.minAltar}+.`;node.dataset.known='true';}}
 }
}
