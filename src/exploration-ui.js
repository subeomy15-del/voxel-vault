import {ITEMS} from './data.js?v=35';
import {TRADE_OFFERS} from './exploration-content.js?v=35';
import {icon} from './icons.js?v=35';
const distance=(g,p)=>Math.round(Math.hypot(g.pos.x-p.x,g.pos.z-p.z));
export function explorationMarkup(g){
 const s=g.state,e=s.exploration;
 if(g.screen==='waystones')return `<p>Activated destinations in this realm. Both stones need to remain intact, with a safe landing nearby.</p><div class="recipe-grid">${e.stones.filter(p=>p.dimension===s.dimension).map((p,i)=>`<article class="recipe">${icon('waystone',42)}<div><strong>Waystone ${i+1}</strong><small>X ${p.x} · Y ${p.y} · Z ${p.z} · ${distance(g,p)}m</small></div><button data-waystone="${p.id}" ${p.id===g.waystoneSource?'disabled':''}>${p.id===g.waystoneSource?'Here':'Travel'}</button><button data-forget-stone="${p.id}" aria-label="Forget waystone ${i+1}">Forget</button></article>`).join('')}</div>`;
 if(g.screen==='sea-charts')return `<p>Recovered charts point to submerged caches. Bring a breathing potion and leave enough air for the return trip.</p><div class="recipe-grid">${e.caches.map(p=>`<article class="recipe">${icon('sea_chart',42)}<div><strong>${p.claimed?'Recovered':'Mariner’s cache'}</strong><small>Surface realm · X ${p.x} · Y ${p.y} · Z ${p.z}${s.dimension==='overworld'?' · '+distance(g,p)+'m':''}</small></div><b>${p.claimed?'✓':'◇'}</b></article>`).join('')||'<p>Fish along an ocean or beach to find waterlogged charts.</p>'}</div>`;
 const names={lodge:'Mara, the provisioner',tower:'Tovin, the pathfinder',ruins:'Iri, the collector'};
 return `<p><strong>${names[g.tradingSite]||'Wayfarer trader'}</strong> · Barter with gathered supplies. Stock returns next morning.</p><div class="recipe-grid">${TRADE_OFFERS.map(o=>`<article class="recipe" data-trade-row="${o.id}">${icon(o.item,42)}<div><strong>${ITEMS[o.item].name} ×${o.count}</strong><small>${Object.entries(o.cost).map(([id,n])=>`${n} ${ITEMS[id].name}`).join(' + ')}</small><span data-trade-stock></span></div><button data-trade="${o.id}">Trade</button></article>`).join('')}</div>`;
}
export function updateTrading(ui){
 const g=ui.game;if(g.screen!=='trading')return;
 const record=g.state.exploration.trades[g.tradingSite],day=Math.floor(g.state.time/600);
 for(const o of TRADE_OFFERS){const row=ui.overlay.querySelector(`[data-trade-row="${o.id}"]`);if(!row)continue;const remaining=o.stock-(record?.day===day?record.bought[o.id]||0:0),label=`${remaining} trades remaining today`;
  if(row.querySelector('[data-trade-stock]').textContent!==label)row.querySelector('[data-trade-stock]').textContent=label;
  row.querySelector('button').disabled=remaining<=0||Object.entries(o.cost).some(([id,n])=>(g.state.inv[id]||0)<n);
 }
}
