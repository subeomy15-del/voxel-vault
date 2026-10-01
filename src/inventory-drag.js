const hotbarIndex=node=>node?.matches('#hotbar .slot')?Number(node.dataset.slot):node?.closest('.pack-hotbar')?Number(node.dataset.action?.replace('pack-slot-','')):null;
export function installInventoryDrag(ui){
 let drag=null,highlight=null,ghost=null,suppressClick=false;
 const hint=document.createElement('aside');hint.className='inventory-drop-zone';hint.hidden=true;hint.textContent='Drop outside the panel to leave a stack · Shift: drop one';document.body.append(hint);
 const targetAt=(x,y)=>document.elementFromPoint(x,y);
 const clean=()=>{drag?.node.classList.remove('drag-source');highlight?.classList.remove('drag-target');ghost?.remove();highlight=ghost=drag=null;hint.hidden=true;document.body.classList.remove('inventory-dragging');};
 const finish=(target,one)=>{
  const g=ui.game,slot=target?.closest('.pack-hotbar .pack-slot,#hotbar .slot,.pack-storage .pack-slot'),index=hotbarIndex(slot);
  if(index!==null&&Number.isInteger(index))g.assignHotbar(drag.item,index,drag.index);
  else if(slot?.closest('.pack-storage')){
   const grid=slot.parentElement,source=[...grid.querySelectorAll('[data-item]')].find(n=>n.dataset.item===drag.item);
   if(source&&source!==slot){if(slot.classList.contains('vacant')){slot.replaceWith(source);grid.append(slot);}else{const marker=document.createTextNode('');source.replaceWith(marker);slot.replaceWith(source);marker.replaceWith(slot);}}
   g.state.inventoryOrder=[...grid.querySelectorAll('[data-item]')].map(n=>n.dataset.item);g.save();
  }else if(target&&!target.closest('#overlay .modal,#hotbar'))g.dropInventoryItem(drag.item,one);
 };
 document.addEventListener('dragstart',e=>{if(e.target.closest('.pack-slot,#hotbar .slot'))e.preventDefault();});
 document.addEventListener('pointerdown',e=>{
  const g=ui.game,node=e.target.closest('[draggable="true"][data-item]');
  if(e.button!==0||!node||g.screen!=='inventory'||!(g.state.inv[node.dataset.item]>0))return;
  drag={node,item:node.dataset.item,index:hotbarIndex(node),x:e.clientX,y:e.clientY,id:e.pointerId,active:false};
 });
 document.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;if(ui.game.screen!=='inventory'){clean();return;}
  if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;
  e.preventDefault();
  if(!drag.active){drag.active=true;drag.node.classList.add('drag-source');document.body.classList.add('inventory-dragging');hint.hidden=!!ui.game.multiplayer?.active;ghost=drag.node.cloneNode(true);ghost.removeAttribute('id');ghost.removeAttribute('aria-pressed');ghost.className='inventory-drag-ghost';ghost.setAttribute('aria-hidden','true');document.body.append(ghost);}
  ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
  const target=targetAt(e.clientX,e.clientY),slot=target?.closest('.pack-hotbar .pack-slot,#hotbar .slot,.pack-storage .pack-slot');
  if(highlight!==slot){highlight?.classList.remove('drag-target');highlight=slot;highlight?.classList.add('drag-target');}hint.classList.toggle('active',!!target&&!target.closest('#overlay .modal,#hotbar'));
 },{passive:false});
 document.addEventListener('pointerup',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  if(drag.active){e.preventDefault();suppressClick=true;if(ui.game.screen==='inventory')finish(targetAt(e.clientX,e.clientY),e.shiftKey);setTimeout(()=>{suppressClick=false;},0);}
  clean();ui.refreshItems();
 });
 document.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
 document.addEventListener('keydown',e=>{if(e.code==='Escape')clean();});
 document.addEventListener('pointercancel',clean);window.addEventListener('blur',clean);
}
