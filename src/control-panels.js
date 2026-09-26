import {ENEMIES} from './combat.js?v=38';
import {BIOME_DEFINITIONS} from './biome-registry.js?v=38';
import {MOB_VARIATIONS,validVariation} from './mob-variations.js?v=38';
const button=(action,label)=>`<button data-action="${action}">${label}</button>`;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installControlPanels(game,ui,multiplayer){
 const render=ui.render.bind(ui),action=ui.action.bind(ui);
 ui.render=function(){
  render();let body,title;const screen=game.screen;
  if(screen==='character'){
   title='Your character';body='<p>Choose your colors. Use P to see your character in third person.</p><div class="character-colors">'+[['shirtColor','Shirt'],['skinColor','Skin'],['hairColor','Hair'],['pantsColor','Trousers']].map(([key,label])=>`<label>${label}<input type="color" aria-label="${label} color" data-setting="${key}" value="${ui.settings[key]}"></label>`).join('')+'</div>'+button('inventory','Equipment & armor')+button('explorer','Creatures & biomes');
  }else if(screen==='explorer'){
   title='Creatures & biomes';body=`<p>${game.creative?'Choose a creature and appearance, then summon it nearby.':'A field guide to the world. Summoning and biome travel are available in solo Creative.'}</p><label>Creature <select id="explorer-mob">${Object.entries(ENEMIES).filter(([id])=>id!=='grazer').map(([id,m])=>`<option value="${id}">${m.name||id}</option>`).join('')}</select></label><label>Appearance <select id="explorer-variation"><option>default</option></select></label>${game.creative?button('summon-creature','Summon creature'):''}<h3>World biomes</h3><div class="biome-cards">${Object.entries(BIOME_DEFINITIONS).map(([id,b])=>`<article style="--biome:${b.color}"><b>${b.name}</b><small>${b.trees.length?'Woodland':'Open terrain'} · ${b.top.replaceAll('_',' ')}</small>${game.creative?button('visit-biome-'+id,'Find & visit'):''}</article>`).join('')}</div><p>Caves and Deep Caves are below the surface. New biome variants generate in newly created worlds.</p>`;
   if(game.creative&&!multiplayer.active)body='<p>'+button('new-creative','Create a new expanded world')+' '+button('export-world','Export this world')+'</p>'+body;
  }else if(screen==='confirm-creative'){
   title='Create a new Creative world?';body='<p>This replaces your active Creative world. A recovery copy is kept, but export your world first if you want a separate backup.</p>'+button('export-world','Export current world')+button('confirm-new-creative','Create new world')+button('explorer','Cancel');
  }else if(screen==='emotes'){
   title='Express yourself';body='<p>Emotes play in third person for five seconds.</p>'+['wave','dance','cheer'].map(id=>button('emote-'+id,id[0].toUpperCase()+id.slice(1))).join('');
  }else if(screen==='players'){
   title='Players';body=multiplayer.active?`<ul>${(multiplayer.room?.players||[]).map(p=>`<li>${escape(p.name||'Player')}${p.id===multiplayer.playerId?' · You':''}</li>`).join('')}</ul>`:'<p>You are exploring a solo world.</p>';body+=button('multiplayer','Multiplayer rooms');
  }else if(screen==='invite'){
   title='Play together';body='<p>Open Multiplayer, create or join a room, and share its room code with your friend.</p>'+button('multiplayer','Open multiplayer');
  }
  if(title){ui.overlay.innerHTML=ui.frame(title,'VOXEL VAULT',body,true);ui.overlay.hidden=false;}
 };
 ui.overlay.addEventListener('change',event=>{if(event.target.id==='explorer-mob'){const select=ui.overlay.querySelector('#explorer-variation');select.replaceChildren(...(MOB_VARIATIONS[event.target.value]||['default']).map(v=>new Option(v,v)));}});
 ui.action=function(name,element){
  if(name==='new-creative'&&game.creative&&!multiplayer.active){game.pause('confirm-creative');ui.render();return;}
  if(name==='confirm-new-creative'&&game.creative&&!multiplayer.active){if(game.start('creative',true)!==false)ui.resume();return;}
  if(['character','explorer','emotes','players','invite'].includes(name)){game.pause(name);ui.render();return;}
  if(name==='summon-creature'){
   if(!game.creative||multiplayer.active)return;
   if(game.mobs.length>=128){game.toast('Creature limit reached','Move to another area before summoning more.');return;}
   const kind=ui.overlay.querySelector('#explorer-mob').value;if(!ENEMIES[kind])return;
   const def=ENEMIES[kind],x=game.pos.x-Math.sin(game.yaw)*4,z=game.pos.z-Math.cos(game.yaw)*4,y=game.world.ground(x,z);
   if(game.world.intersects(x,y,z,def.height||1.9,def.radius||.4)||game.world.waterAt(x,y,z)){game.toast('Find an open spot','The creature needs dry, clear ground ahead of you.');return;}
   const mob=game.spawnMob(x,z,kind,y);mob.variation=validVariation(kind,ui.overlay.querySelector('#explorer-variation').value);game.save();ui.resume();return;
  }
  if(name.startsWith('visit-biome-')){
   if(!game.creative||multiplayer.active)return;const id=name.slice(12);if(!BIOME_DEFINITIONS[id])return;
   if(game.world.dimension!=='overworld'){game.toast('Return to the Overworld','Biome travel is available in the Overworld.');return;}
   // Yield between bounded rings so searching cannot freeze input/rendering.
   const seedWorld=game.world;game.toast('Finding '+BIOME_DEFINITIONS[id].name,'Searching nearby terrain…');
   (async()=>{for(let ring=1;ring<=30;ring++){
    if(game.world!==seedWorld||game.screen!=='explorer')return;
    for(let step=0;step<48;step++){const angle=step*Math.PI/24,x=Math.round(game.pos.x+Math.cos(angle)*ring*210),z=Math.round(game.pos.z+Math.sin(angle)*ring*210);
     if(seedWorld.biome(x,z)!==id)continue;const y=seedWorld.ground(x,z);if(y<5||seedWorld.intersects(x,y,z,1.9,.4)||seedWorld.waterAt(x,y,z))continue;
     Object.assign(game.pos,{x:x+.5,y:y+3,z:z+.5});game.vx=game.vz=game.velocity=0;game.flying=true;game.save();ui.resume();game.toast(BIOME_DEFINITIONS[id].name,'Creative flight enabled · Space rises, C descends');return;
    }await new Promise(resolve=>setTimeout(resolve,0));
   }game.toast('Not found nearby','Try a new Creative world for the expanded biome set.');})();return;
  }
  if(name.startsWith('emote-')){game.emote={name:name.slice(6),until:game.state.elapsed+5};ui.resume();return;}
  return action(name,element);
 };
}
