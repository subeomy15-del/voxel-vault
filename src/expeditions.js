export const OUTPOSTS=[
 {id:'lodge',name:'Wayfarer Lodge',dx:18,dz:15,kind:'lodge',color:'#e4bd78',loot:{relic_shard:3,apple:8,wood:24,iron_ingot:5}},
 {id:'tower',name:'Old Watchtower',dx:-25,dz:-18,kind:'tower',color:'#81c8d7',loot:{relic_shard:4,arrows:32,sapphire:3,moonstone_orb:5}},
 {id:'ruins',name:'Crystal Sanctuary',dx:30,dz:-28,kind:'ruins',color:'#b69be7',loot:{relic_shard:5,ruby:4,emerald:4,golden_apple:2}}
];
export const FORGE_OFFERS=[['grappling_hook',3],['ruby_blade',5],['sapphire_blade',5],['warhammer',5],['vanguard_armor',7],['storm_glider',7],['starfall_bow',6]];
export function installOutposts(g){
 if(g.state.dimension!=='overworld')return;
 g.state.outposts??=[];const home=g.state.origin||g.pos,w=g.world;
 for(const def of OUTPOSTS){
  let site=g.state.outposts.find(p=>p.id===def.id);
  if(!site){
   for(let attempt=0;attempt<90;attempt++){
    const angle=attempt*2.399+OUTPOSTS.indexOf(def)*1.7,radius=20+Math.floor(attempt/12)*7;const x=Math.floor(home.x+(attempt<10?def.dx+attempt%3*4:Math.cos(angle)*radius)),z=Math.floor(home.z+(attempt<10?def.dz+Math.floor(attempt/3)*4:Math.sin(angle)*radius)),y=w.height(x,z)+1;
    if(y<6||y>78||Math.abs(x)>490||Math.abs(z)>490)continue;
    let safe=true;for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){
     if(Math.abs(w.height(x+dx,z+dz)+1-y)>5||w.waterAt(x+dx,y-1,z+dz))safe=false;
     for(let dy=-3;dy<=10;dy++)if(w.edits.has(`${x+dx},${y+dy},${z+dz}`))safe=false;
    }
    if(!safe)continue;site={id:def.id,x,y,z};g.state.outposts.push(site);
    const put=(dx,dy,dz,type)=>w.set(x+dx,y+dy,z+dz,type);
    for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){
     for(let dy=0;dy<=9;dy++)if(w.get(x+dx,y+dy,z+dz))put(dx,dy,dz,null);
     for(let dy=w.height(x+dx,z+dz)-y;dy<0;dy++)put(dx,dy,dz,def.kind==='lodge'?'stonebrick':'moss');
     put(dx,-1,dz,def.kind==='lodge'?'plank':'stonebrick');
    }
    if(def.kind==='lodge'){
     for(const dx of [-3,3])for(const dz of [-3,3])for(let dy=0;dy<4;dy++)put(dx,dy,dz,'wood');
     for(let dx=-3;dx<=3;dx++)for(let dy=0;dy<3;dy++){put(dx,dy,-3,dy===1&&Math.abs(dx)<2?'glass':'plank');if(Math.abs(dx)>1)put(dx,dy,3,'plank');}
     for(const dx of [-3,3])for(let dz=-2;dz<=2;dz++)for(let dy=0;dy<3;dy++)put(dx,dy,dz,dy===1&&Math.abs(dz)<2?'glass':'plank');
     for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++)put(dx,3+Math.floor((4-Math.abs(dx))*.5),dz,'pine_plank');
     put(-2,0,-2,'relic_forge');put(2,0,-2,'furnace');put(-2,0,2,'bed');put(0,3,2,'lantern');
    }else if(def.kind==='tower'){
     for(let dy=0;dy<8;dy++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if(Math.abs(dx)===2||Math.abs(dz)===2){if(dx===0&&dz===2&&dy<2)continue;put(dx,dy,dz,(dy===3||dy===6)&&(dx===0||dz===0)?'glass':'stonebrick');}
     for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){put(dx,7,dz,'plank');if((Math.abs(dx)===3||Math.abs(dz)===3)&&(dx+dz)%2===0)put(dx,8,dz,'stonebrick');}
     for(let dy=0;dy<8;dy++)put(-1,dy,0,'ladder');put(-1,7,0,'ladder');put(0,8,0,'lantern');
    }else{
     for(const dx of [-3,3])for(const dz of [-3,3])for(let dy=0;dy<(dx===dz?5:3);dy++)put(dx,dy,dz,dy===4?'sapphire_block':'marble');
     for(let dx=-3;dx<=3;dx++)put(dx,5,-3,'marble');put(0,0,-2,'relic_forge');put(0,1,-2,'violet_crystal');
     for(const dx of [-2,2])put(dx,0,2,'lantern');
    }
    put(1,0,1,'treasure_chest');break;
   }
  }
  if(!site)continue;
  w.landmarks.push({id:'outpost-'+site.id,name:def.name,subtitle:'Treasure and relic shards',type:'outpost',color:def.color,x:site.x,y:site.y,z:site.z});
  w.chests.push({id:'outpost-'+site.id,x:site.x+1,y:site.y,z:site.z+1,loot:def.loot,block:true,name:def.name});
 }
}
