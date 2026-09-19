import {infusionTooltip} from './infusion-ui.js?v=33';
import {ITEMS,RECIPES,SMELTING,canCraft,maxCraft,ingredientCount,ingredientKeys} from './data.js?v=33';
import {icon} from './icons.js?v=33';
import {packSlot} from './inventory-layout.js?v=33';
import {enchantRow} from './workshop-ui.js?v=33';
import {enchantKind,enchantLevel,enchantCost} from './enchanting.js?v=33';
const text=(node,value)=>{if(node&&node.textContent!==String(value))node.textContent=String(value);};
const flag=(node,name,value)=>{if(node.classList.contains(name)!==!!value)node.classList.toggle(name,!!value);};
const attr=(node,name,value)=>{if(node.getAttribute(name)!==String(value))node.setAttribute(name,String(value));};
const element=html=>{const template=document.createElement('template');template.innerHTML=html;return template.content.firstElementChild;};
const diff=(old,next)=>new Set([...Object.keys(old),...Object.keys(next)].filter(k=>old[k]!==next[k]));
const equipped=(s,name)=>s.bar[s.selected]===name||s.armor===name||Object.values(s.armorParts||{}).includes(name)||s.glider===name||s.ammo===name;

/** Stable DOM bindings: item deltas never replace the dialog, grid or unchanged icons. */
export class InventoryBindings {
 constructor(ui){this.ui=ui;this.hotbar=document.querySelector('#hotbar');this.hotbarNames=[];this.hotbarSlots=[];this.root=null;this.inv={};this.store={};this.gear='';this.enchants={};this.aura=-1;}
 updateHotbar(){
  const g=this.ui.game,s=g.state;
  for(let i=0;i<9;i++){
   const name=s.bar[i];let slot=this.hotbarSlots[i];
   if(!slot){slot=element(`<button class="slot" data-action="slot" data-slot="${i}"><small>${i+1}</small><span class="slot-art"></span><b></b></button>`);this.hotbar.append(slot);this.hotbarSlots[i]=slot;}
   if(this.hotbarNames[i]!==name){slot.querySelector('.slot-art').innerHTML=icon(name);slot.title=ITEMS[name].name+(name==='firecracker'?' · click or H to use':'');this.hotbarNames[i]=name;}
   const tooltip=infusionTooltip(s,name);slot.title=ITEMS[name].name+(tooltip?'\n'+tooltip:'');flag(slot,'infused',!!tooltip);slot.dataset.tier=s.infusions?.[name]?.tier||'';
   flag(slot,'selected',s.selected===i);text(slot.querySelector('b'),g.creative?'∞':s.inv[name]||0);
  }
  text(document.querySelector('#item-name'),ITEMS[g.held].name);
 }
 bind(){
  const root=this.ui.overlay.firstElementChild;if(root===this.root)return false;
  this.root=root;this.inv={};this.store={};this.gear='';this.enchants={};this.aura=-1;
  this.pack=new Map([...root.querySelectorAll('.pack-storage [data-item]')].map(n=>[n.dataset.item,n]));
  this.catalogue=new Map([...root.querySelectorAll('.item-card')].map(n=>[n.dataset.equip||n.dataset.inspect,n]));
  this.recipes=new Map([...root.querySelectorAll('[data-recipe-item]')].map(n=>[n.dataset.recipeItem,n]));
  this.enchantRows=new Map([...root.querySelectorAll('[data-enchant-item]')].map(n=>[n.dataset.enchantItem,n]));
  this.stores=[...root.querySelectorAll('.storage-grid')].map(grid=>({grid,slots:new Map([...grid.querySelectorAll('[data-transfer]')].map(n=>[n.dataset.transfer,n]))}));return true;
 }
 update(){
  this.updateHotbar();this.ui.infusionView?.update();const g=this.ui.game,s=g.state;
  if(!['inventory','craft','enchant','storage','furnace'].includes(g.screen)||!this.ui.overlay.firstElementChild)return;
  const fresh=this.bind(),changed=diff(this.inv,s.inv),gear=JSON.stringify([s.selected,s.bar,s.armor,s.armorParts,s.glider,s.ammo]),gearChanged=gear!==this.gear;
  const store=g.containerKey==='moon'?s.moonChest:s.containers[g.containerKey]||{},stored=diff(this.store,store),enchantChanged=diff(this.enchants,s.enchants||{}),auraChanged=this.aura!==s.aura;
  if(!fresh&&!changed.size&&!stored.size&&!gearChanged&&!auraChanged&&!enchantChanged.size)return;
  if(g.screen==='inventory'){
   const grid=this.root.querySelector('.pack-storage');
   for(const name of changed){
    let slot=this.pack.get(name);const count=s.inv[name]||0,matches=!this.ui.search||`${ITEMS[name]?.name} ${ITEMS[name]?.description||''}`.toLowerCase().includes(this.ui.search.toLowerCase());
    if(!slot&&grid&&count>0&&ITEMS[name]&&!ITEMS[name].hidden&&matches){slot=element(packSlot(g,name,count));const empty=grid.querySelector('.vacant');if(empty)empty.replaceWith(slot);else grid.append(slot);this.pack.set(name,slot);}
    if(slot){let countNode=slot.querySelector('b');if(!countNode){countNode=document.createElement('b');slot.append(countNode);}text(countNode,g.creative?'∞':count);attr(slot,'aria-label',`${ITEMS[name].name} · ${count}`);slot.disabled=count<=0;flag(slot,'unowned',count<=0);}
    const card=this.catalogue.get(name);if(card){flag(card,'unowned',!count);text(card.querySelector(':scope > span'),g.creative?'∞':count?'× '+count:'NOT OWNED');}
   }
   if(gearChanged){
    for(const[name,slot]of this.pack)flag(slot,'selected',name===g.held);
    for(const[name,card]of this.catalogue){const active=equipped(s,name);flag(card,'equipped',active);const i=ITEMS[name];text(card.querySelector(':scope > small'),active?'EQUIPPED':i.kind==='glider'?i.glideSpeed+' M/S · DESCENT '+i.sink:i.tier?'TIER '+i.tier:i.nutrition?'FOOD +'+i.nutrition+' · ENERGY +'+i.saturation:(i.kind==='food'?'Food':i.plant||i.kind==='seed'?'Nature':i.place?'Building':i.kind==='material'?'Materials':'Gear').toUpperCase());}
    for(const gearSlot of this.root.querySelectorAll('[data-gear]')){const key=gearSlot.dataset.gear,name=key==='glider'?s.glider:key==='ammo'?s.ammo:s.armorParts?.[key],old=gearSlot.querySelector('.pack-slot');if(old?.dataset.item!==(name||'')){const next=name?element(packSlot(g,name,0,ITEMS[name]?.slot?`data-unequip="${key}"`:null)):element('<div class="pack-slot vacant" data-item="" aria-label="Nothing equipped">—</div>');old.replaceWith(next);}}
    for(const shape of this.root.querySelectorAll('[data-character-armor]')){const name=s.armorParts?.[shape.dataset.characterArmor];attr(shape,'opacity',name?1:0);if(name)attr(shape,'fill',ITEMS[name].color);}
    const shirt=this.root.querySelector('[data-character-shirt]');if(shirt)attr(shirt,'fill',ITEMS[s.armorParts?.chestplate]?.color||'#397dba');
   }
   for(const[slot,index]of [...this.root.querySelectorAll('.pack-hotbar .pack-slot')].map((n,i)=>[n,i])){const name=s.bar[index];if(slot.dataset.item!==name){slot.replaceWith(element(packSlot(g,name,s.inv[name]||0,`data-action="pack-slot-${index}" aria-pressed="${s.selected===index}"`)));}else{flag(slot,'selected',s.selected===index);attr(slot,'aria-pressed',s.selected===index);let b=slot.querySelector('b');if(!b){b=document.createElement('b');slot.append(b);}text(b,g.creative?'∞':s.inv[name]||0);}}
   const labels=this.root.querySelectorAll('.pack-label span');text(labels[0],[...this.pack.keys()].filter(k=>s.inv[k]>0).length+' stacks');text(labels[1],'Destination: slot '+(s.selected+1));text(this.root.querySelector('.pack-workshop [data-action="enchant"]'),`Aura ${s.aura||0} · Enchant gear`);
   text(this.root.querySelector('.book-intro span b'),s.selected+1);
  }
  if(g.screen==='craft'){
   const stations=new Map();
   for(const recipe of RECIPES){const row=this.recipes.get(recipe.item);if(!row||!fresh&&!Object.keys(recipe.cost).some(k=>ingredientKeys(k,recipe).some(i=>changed.has(i))))continue;
    if(!stations.has(recipe.station))stations.set(recipe.station,g.stationAvailable(recipe.station));
    const ready=canCraft(s.inv,recipe)&&stations.get(recipe.station),amount=maxCraft(s.inv,recipe)*(recipe.count||1);flag(row,'ready',ready);
    for(const cost of row.querySelectorAll('[data-ingredient]')){const k=cost.dataset.ingredient,count=ingredientCount(s.inv,k,recipe);text(cost,`${count}/${recipe.cost[k]} ${ITEMS[k].name}`);flag(cost,'enough',count>=recipe.cost[k]);flag(cost,'missing',count<recipe.cost[k]);}
    for(const button of row.querySelectorAll('button'))button.disabled=!ready;text(row.querySelector('[data-craft-all]'),'Craft All'+(amount?' ('+amount+')':''));
   }
  }
  if(g.screen==='enchant'){
   text(this.root.querySelector('[data-aura-points]'),`${s.aura||0} aura points`);const grid=this.root.querySelector('.enchant-grid');
   for(const name of changed)if(s.inv[name]>0&&enchantKind(ITEMS[name])&&!this.enchantRows.has(name)){grid.querySelector(':scope > p')?.remove();const row=element(enchantRow(g,name));grid.append(row);this.enchantRows.set(name,row);}
   for(const[name,row]of this.enchantRows){if(!fresh&&!auraChanged&&!changed.has(name)&&!enchantChanged.has(name))continue;const level=enchantLevel(s,name),cost=enchantCost(s,name),ready=s.inv[name]>0&&!g.creative&&level<5&&s.aura>=cost,button=row.querySelector('[data-enchant]');row.hidden=!(s.inv[name]>0);text(row.querySelector('small'),`${enchantKind(ITEMS[name])} ${level}/5`);text(row.querySelector('b'),level===5?'MAX LEVEL':`${cost} aura → level ${level+1}`);button.disabled=!ready;text(button,level===5?'Maxed':ready?'Enchant':'Need aura');}
  }
  if(g.screen==='storage')for(let side=0;side<2;side++){const bag=side===0?store:s.inv,deltas=side===0?stored:changed,binding=this.stores[side];if(!binding)continue;for(const name of deltas){let slot=binding.slots.get(name);if(!slot&&bag[name]>0){binding.grid.querySelector('p')?.remove();slot=element(`<button data-transfer="${name}" ${side===0?'data-withdraw="true"':''}>${icon(name,28)}<span>${ITEMS[name].name}</span><b></b></button>`);binding.grid.append(slot);binding.slots.set(name,slot);}if(slot){text(slot.querySelector('b'),bag[name]||0);slot.disabled=!(bag[name]>0);flag(slot,'unowned',!(bag[name]>0));}}}
  if(g.screen==='furnace'){
   const fuel=this.root.querySelector('.fuel-readout');let readout=fuel?.querySelector('[data-fuel-counts]');if(fuel&&!readout){for(const n of [...fuel.childNodes])if(n.nodeType===3)n.remove();readout=document.createElement('span');readout.dataset.fuelCounts='';fuel.append(readout);}text(readout,` Coal: ${s.inv.coal||0} · Timber: ${ingredientCount(s.inv,'wood')}`);
   for(const button of this.root.querySelectorAll('[data-smelt]')){const r=SMELTING.find(r=>r.output===button.dataset.smelt),ready=(s.inv[r.input]||0)>0&&!!((g.station?.type!=='campfire'&&s.inv.coal)||ingredientCount(s.inv,'wood'));flag(button,'ready',ready);button.disabled=!ready;text(button.querySelector('small'),`${ITEMS[r.input].name}: ${s.inv[r.input]||0} available`);}
  }
  this.inv={...s.inv};this.store={...store};this.gear=gear;this.enchants={...s.enchants};this.aura=s.aura;
 }
}
