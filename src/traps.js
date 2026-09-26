import {BLOCKS} from './data.js?v=38';
export function trapAt(g,p){
 for(const dy of [.03,-.05]){const b=BLOCKS[g.world.get(Math.floor(p.x),Math.floor(p.y+dy),Math.floor(p.z))];if(b?.snare||b?.trapDamage)return b;}
 return null;
}
export function tickTraps(g,dt){
 g.trapTimer=(g.trapTimer||0)-dt;
 if(g.trapTimer>0)return;g.trapTimer=1;
 const under=trapAt(g,g.pos);if(under?.trapDamage&&!g.flying&&g.grounded)g.hurt(under.trapDamage);
 for(const m of [...g.mobs]){
  if(m.kind==='dragon')continue;
  const block=trapAt(g,m);if(block?.trapDamage)g.hit(m,block.trapDamage);
 }
}
