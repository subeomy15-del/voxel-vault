import {endPortalPoint,framesComplete,FRAME_OFFSETS} from './stronghold.js?v=38';
export function portalAtPlayer(g){
 const candidates=[g.state.gate,endPortalPoint(g.world.stronghold),g.target].filter(Boolean);
 if(g.state.dimension==='nether')candidates.push({x:72,y:25,z:-48});
 return candidates.find(p=>Math.hypot(g.pos.x-p.x-.5,g.pos.y-p.y,g.pos.z-p.z-.5)<=3.5&&['ender_gate','stronghold_portal'].includes(g.world.get(p.x,p.y,p.z)))||null;
}
export function transitionError(g,destination,portal=portalAtPlayer(g)){
 const source=g.state.dimension;
 if(g.state.mode==='parkour'||g.multiplayer?.active)return 'Dimension travel is available in solo worlds.';
 if(g.traveling||g.portalCooldown>0)return 'Wait for the portal to settle.';
 if(!portal||Math.hypot(g.pos.x-portal.x-.5,g.pos.y-portal.y,g.pos.z-portal.z-.5)>3.5)return 'Stand beside an active portal.';
 const block=g.world.get(portal.x,portal.y,portal.z);
 if(source==='nether'&&destination==='ender')return 'Return to the Overworld. The End can only be reached through a stronghold.';
 if(block==='ender_gate'&&((source==='overworld'&&destination==='nether')||(source==='nether'&&destination==='overworld')))return '';
 if(source==='overworld'&&destination==='ender'&&block==='stronghold_portal'){
  const p=endPortalPoint(g.world.stronghold);if(p&&p.x===portal.x&&p.y===portal.y&&p.z===portal.z&&framesComplete(g.world))return '';
 }
 if(source==='ender'&&destination==='overworld'&&block==='ender_gate'&&portal.x===0&&portal.y===19&&portal.z===0&&g.state.dragon?.defeated)return '';
 return 'This portal cannot make that journey.';
}
export function insertEye(g,target){
 const s=g.world.stronghold;if(g.state.dimension!=='overworld'||!s||!target||g.state.inv.eye_of_ender<1||Math.hypot(g.pos.x-target.x-.5,g.pos.y-target.y,g.pos.z-target.z-.5)>4)return false;
 if(!FRAME_OFFSETS.some(([x,z])=>target.x===s.x+x&&target.y===s.y&&target.z===s.z-11+z)||g.world.get(target.x,target.y,target.z)!=='end_frame')return false;
 g.state.inv.eye_of_ender--;g.world.set(target.x,target.y,target.z,'end_frame_filled');
 if(framesComplete(g.world)){const p=endPortalPoint(s);g.world.set(p.x,p.y,p.z,'stronghold_portal');g.toast('The End portal is open','Prepare your equipment before stepping into the center.','reward');}
 g.audio.play('portal');g.save();return true;
}
export function useEye(g){
 if(g.screen||g.multiplayer?.active||g.state.dimension!=='overworld'||!(g.state.inv.eye_of_ender>0)||g.eyeCooldown>0)return false;
 if(insertEye(g,g.target))return true;
 const site=g.world.stronghold;if(!site){g.toast('This old world has no stronghold','Its terrain is preserved. Stronghold progression is available in new worlds.');return false;}
 g.state.inv.eye_of_ender--;g.eyeCooldown=2.5;
 const dx=site.x-g.pos.x,dz=site.z-g.pos.z,d=Math.max(1,Math.hypot(dx,dz));
 g.eyeFlight={x:g.pos.x,y:g.pos.y+1.5,z:g.pos.z,dx:dx/d,dz:dz/d,time:0};
 g.toast('The Eye seeks an ancient library','Follow the rising green trail. Each throw consumes one Eye.');g.save();return true;
}
export function tickEye(g,dt){g.eyeCooldown=Math.max(0,(g.eyeCooldown||0)-dt);const f=g.eyeFlight;if(!f)return;f.time+=dt;if(f.time>2){g.eyeFlight=null;return;}g.renderer.burst(f.x+f.dx*f.time*6,f.y+Math.sin(f.time*Math.PI/2)*3,f.z+f.dz*f.time*6,'#8fe2ba',2);}
export function buildNetherPortal(g,p){
 if(g.state.dimension!=='overworld'||g.multiplayer?.active||!p?.valid)return false;
 for(let x=-2;x<=2;x++)for(let y=0;y<=4;y++)if(g.world.get(p.x+x,p.y+y,p.z)||g.world.edits.has(`${p.x+x},${p.y+y},${p.z}`)){g.toast('Clear room for the frame','The portal needs five blocks of width and height.');return false;}
 for(let x=-2;x<=2;x++){if(!g.world.solid(p.x+x,p.y-1,p.z)){g.toast('Support the portal','Build a level, five-block-wide foundation first.');return false;}}
 for(let x=-2;x<=2;x++)for(let y=-1;y<=4;y++)if(Math.abs(x)===2||y===-1||y===4)g.world.set(p.x+x,p.y+y,p.z,'obsidian');
 g.world.set(p.x,p.y,p.z,'ender_gate');g.state.gate={x:p.x,y:p.y,z:p.z};if(!g.creative)g.state.inv.ender_gate--;g.state.stats.built++;g.renderer.riftEffects&&(g.renderer.riftEffects.epoch=-1);g.save();return true;
}
