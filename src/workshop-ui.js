import {ITEMS,ingredientCount,maxCraft} from './data.js?v=35';
import {icon} from './icons.js?v=35';
import {enchantKind,enchantLevel,enchantCost} from './enchanting.js?v=35';
export function recipeMarkup(g,r,ready){
 const batches=maxCraft(g.state.inv,r),amount=batches*(r.count||1);
 return `<article data-recipe-item="${r.item}" class="recipe ${ready?'ready':''}">${icon(r.item,44)}<div><strong>${ITEMS[r.item].name}${r.count?' ×'+r.count:''}</strong><small>${r.station==='brewing_station'?'Brewing station required':r.station==='water'?'Nearby water required':r.station==='bench'?'Workbench required':'Craft by hand'} · ${ITEMS[r.item].description||'Building material'}</small><div class="costs">${Object.entries(r.cost).map(([k,n])=>`<span data-ingredient="${k}" class="${ingredientCount(g.state.inv,k,r)>=n?'enough':'missing'}">${ingredientCount(g.state.inv,k,r)}/${n} ${ITEMS[k].name}</span>`).join('')}</div></div><div class="craft-actions"><button data-craft="${r.item}" ${ready?'':'disabled'}>Craft ${r.count||1}</button><button data-craft-all="${r.item}" ${ready?'':'disabled'}>Craft All${amount?' ('+amount+')':''}</button></div></article>`;
}
export function enchantingMarkup(g){
 const s=g.state,gear=Object.entries(s.inv).filter(([name,n])=>n>0&&!ITEMS[name]?.hidden&&enchantKind(ITEMS[name]));
 return `<section class="aura-intro"><span class="eyebrow">AURA ENCHANTING</span><h3 data-aura-points>${s.aura||0} aura points</h3><p>Earn aura by mining natural blocks and defeating creatures. Choose gear below to upgrade it. Upgrades apply to every copy of that gear type and stay with your save.</p><small>Power: +12% damage per level · Efficiency: +12% mining speed per level · Protection: +1 percentage point per armor piece per level. Maximum level V; total armor protection caps at 80%.</small>${g.creative?'<p>Enchanting uses earned aura in Adventure and Daily worlds.</p>':''}</section><div class="recipe-grid enchant-grid">${gear.map(([name])=>enchantRow(g,name)).join('')||'<p>Craft a weapon, tool or armor piece to begin enchanting.</p>'}</div>`;
}

export function enchantRow(g,name){const s=g.state;const level=enchantLevel(s,name),cost=enchantCost(s,name),ready=!g.creative&&level<5&&(s.aura||0)>=cost;return `<article class="recipe" data-enchant-item="${name}">${icon(name,50)}<div><strong>${ITEMS[name].name}</strong><small>${enchantKind(ITEMS[name])} ${level}/5</small><b>${level===5?'MAX LEVEL':cost+' aura → level '+(level+1)}</b></div><button data-enchant="${name}" ${ready?'':'disabled'}>${level===5?'Maxed':ready?'Enchant':'Need aura'}</button></article>`;}
