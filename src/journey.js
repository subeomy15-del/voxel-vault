export const CHAPTERS=[
 {title:'Gather your first timber',realm:'Overworld',hint:'Select your axe with 3. Hold left click on a tree trunk. Collect 6 timber.',action:'inventory'},
 {title:'Build a workshop',realm:'Overworld',hint:'Press C to craft a workbench from 6 timber. Equip it from your backpack and place it with right click or E.',action:'craft'},
 {title:'Forge iron equipment',realm:'Overworld',hint:'Craft a furnace near your workbench. Mine iron and coal, smelt ingots, then craft an iron pickaxe. Ore veins are scarce; explore at different depths.',action:'craft'},
 {title:'Cross into the Nether',realm:'Overworld',hint:'Pack cooked food, armor, a bow and arrows. Follow the portal marker near home and walk through the frame.',action:'journal'},
 {title:'Conquer the Ashen Fortress',realm:'Nether',hint:'Follow the fortress marker to 72, −48. Avoid lava and magma. Defeat its guardian to unseal the End portal.',action:'map'},
 {title:'Enter the End',realm:'Nether',hint:'Take a bow, arrows, armor and a glider. Use the portal inside the cleared fortress. The arrival portal leads home.',action:'inventory'},
 {title:'Defeat the Ender Dragon',realm:'End',hint:'Find the altar at 0, −7. Press E to awaken the dragon. Shoot its four healing crystals, dodge its attacks and strike when it lands.',action:'journal'},
 {title:'Bring the trophy home',realm:'End',hint:'Your Dragon Egg is in your backpack. Return through the End portal, then use the Nether arrival portal to reach the Overworld.',action:'inventory'},
 {title:'Your world, your next adventure',realm:'Overworld',hint:'The dragon is defeated. Build a trophy hall, explore the outposts, master gliding or take on the optional Rift Run.',action:'journal'}
];
export function journeyStage(g){
 const s=g.state,inv=s.inv,previous=s.journeyStage||0;
 if(g.creative||previous===8)return previous;
 let stage=previous;
 if(inv.bench>0||['wood','birch','pinewood'].reduce((n,k)=>n+(inv[k]||0),0)>=6)stage=Math.max(stage,1);
 if(stage<2){
   const placed=[...g.world.edits.values()].includes('bench')||Object.values(s.realms||{}).some(r=>(r.edits||[]).some(e=>e[1]==='bench'));
   if(placed)stage=2;
 }
 if(['iron_pickaxe','gold_pickaxe','diamond_pickaxe','moonstone_pickaxe'].some(k=>inv[k]>0))stage=Math.max(stage,3);
 if(s.dimension==='nether'||s.realms.nether)stage=Math.max(stage,4);
 if(s.fortressCleared)stage=Math.max(stage,5);
 if(s.dimension==='ender'||s.realms.ender)stage=Math.max(stage,6);
 if(s.dragon?.defeated)stage=Math.max(stage,s.dimension==='overworld'?8:7);
 return stage;
}
export function journeyMarkup(s,creative=false){
 if(creative)return '<span class="rift-kicker">CREATIVE STUDIO</span><strong>Build something worth exploring</strong><small>Every material is in your backpack. Double tap Space to fly. Use slabs, stairs and contrasting materials to give your builds depth.</small><button data-action="inventory">Open materials</button>';
 const stage=Math.min(8,s.journeyStage||0),chapter=CHAPTERS[stage];
 return `<span class="rift-kicker">${stage===8?'JOURNEY COMPLETE':`CHAPTER ${stage+1} / 8 · ${chapter.realm.toUpperCase()}`}</span><strong>${chapter.title}</strong><div class="journey-track" aria-label="${stage} of 8 chapters complete">${CHAPTERS.slice(0,8).map((_,i)=>`<i class="${i<stage?'complete':i===stage?'current':''}"></i>`).join('')}</div><small>${chapter.hint}</small><button data-action="${chapter.action}">${chapter.action==='craft'?'Open crafting':chapter.action==='inventory'?'Open backpack':chapter.action==='map'?'Open map':'View journey'}</button>`;
}
export function journeyJournal(s){
 const stage=s.journeyStage||0;
 return `<section class="journey-journal"><span class="eyebrow">THE LONG WAY HOME</span><h3>${stage===8?'A world worth coming back to':'Your adventure'}</h3><p>Build a foothold in the Overworld, survive the Nether, defeat the dragon and bring your trophy home.</p><ol>${CHAPTERS.slice(0,8).map((c,i)=>`<li class="${i<stage?'complete':i===stage?'current':''}"><span>${i<stage?'✓':String(i+1).padStart(2,'0')}</span><div><strong>${c.title}</strong><small>${i<stage?'Complete':c.hint}</small></div></li>`).join('')}</ol></section>`;
}
