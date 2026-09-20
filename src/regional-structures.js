// Templates use existing materials and a compact construction vocabulary.
export const REGIONAL_STRUCTURES={
 mine:{name:'Lanternless Mine',radius:12,tier:2},
 swamp_hut:{name:'Reedkeeper Shelter',radius:8,tier:1},
 outpost:{name:'Windward Refuge',radius:9,tier:1}
};
export function buildRegionalRoom(t,type,p,roll){
 if(type==='mine'){
  const end=roll>.5?9:7;
  t.room(-3,-end,3,3,-7,4,p.stone);t.floor(-3,-end,3,3,-3,p.stone);
  for(const z of [-end+1,-3,2]){t.pillar(-2,z,-7,3,p.wood);t.pillar(2,z,-7,3,p.wood);t.wall(-2,z,2,z,-4,1,p.wood);}
  t.room(3,-end,8,-end+5,-7,4,p.stone);t.floor(3,-end,8,-end+5,-3,p.stone);
  for(let y=-7;y<=2;y++){t.block(0,y,2,null,true);t.block(1,y,2,'ladder',true);}
  for(let y=-7;y<-4;y++)t.block(3,y,-end+2,null,true);
  t.wall(-2,3,2,3,0,3,p.wood);t.block(0,0,3,null,true);t.block(0,1,3,null,true);
  t.block(-2,-7,-3,'lantern',true);t.block(6,-7,-end+1,'stone_spikes',true);
  return {x:7,y:-7,z:-end+3};
 }
 if(type==='swamp_hut'){
  for(const x of [-4,4])for(const z of [-4,4])t.pillar(x,z,-1,7,p.wood);
  t.room(-4,-4,4,4,3,3,p.wood);t.floor(-5,-5,5,5,6,p.wood);t.floor(-2,4,2,6,2,p.wood);
  t.ladder(0,6,0,3);t.block(-3,3,-3,'furnace',true);t.block(3,3,-3,'lantern',true);
  return {x:2,y:3,z:-2};
 }
 t.room(-5,-4,5,4,0,4,p.stone);t.floor(-6,-5,6,5,4,p.wood);
 for(const x of [-5,5])for(const z of [-4,4])t.pillar(x,z,0,6,p.stone);
 t.block(-4,0,-3,'bed',true);t.block(4,0,-3,'furnace',true);t.block(0,3,-3,'lantern',true);
 return {x:3,y:0,z:-2};
}
export function embellishRuin(t,type,p,seed,roll){
 // An off-axis annex creates a second route and a thin, mineable secret wall.
 if(['temple','house','fortress','observatory'].includes(type)){
  const side=roll>.5?1:-1;
  const x=type==='house'?side*5:side*7;
  t.room(Math.min(x,x+side*3),-3,Math.max(x,x+side*3),1,0,3,p.stone);
  t.block(x,0,0,p.stone,true);t.block(x,1,0,p.stone,true);
  t.block(x+side*2,0,-2,'bookshelf',true);t.block(x+side*2,0,-1,'lantern',true);
 }
 if(['dungeon','mine','temple','fortress'].includes(type)){
  const y=['dungeon','mine'].includes(type)?type==='mine'?-7:-5:0;
  t.block(-1,y,1,'stone_spikes',true);t.block(-2,y,1,'gravel',true);
 }
 // Distinct window placement provides several seeded silhouettes without changing the footprint.
 if(['tower','watchtower','outpost'].includes(type))for(const y of roll>.5?[2,5]:[3,6])for(const x of[-3,3])t.block(x,y,0,null,true);
}
