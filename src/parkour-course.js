// Original, deterministic course geometry shared by the game and terrain worker.
export const CLOUDSTEP = {
  id:'cloudstep-v1', name:'Cloudstep Circuit', subtitle:'A garden above the clouds',
  spawn:{x:.5,y:13,z:5.5,yaw:0}, fallY:5,
  checkpoints:[
    {name:'Garden steps',x:.5,y:13,z:5.5,yaw:0},
    {name:'The ascent',x:.5,y:14,z:-16.5,yaw:-Math.PI/2},
    {name:'Long strides',x:31.5,y:17,z:-18.5,yaw:0},
    {name:'Cloud launcher',x:31.5,y:18,z:-49.5,yaw:0},
    {name:'Skyline',x:31.5,y:21,z:-65.5,yaw:Math.PI/2},
  ],
  finish:{x:6.5,y:23,z:-79.5,radius:2},
  pads:[{x:31.5,y:18,z:-55.5,radius:1.35,vx:0,vz:-9,velocity:15}],
  // Inclusive voxel bounds and the height of the walking surface.
  platforms:[
    [-4,4,0,10,13],[-2,2,-5,-3,13],[-2,2,-11,-8,14],[-4,4,-20,-14,14],
    [7,10,-21,-17,15],[13,16,-21,-17,16],[19,23,-21,-17,17],[26,35,-22,-15,17],
    [30,33,-30,-26,17],[31,32,-36,-33,17],[30,33,-43,-39,18],[28,35,-53,-46,18],
    [30,33,-57,-52,18],[28,35,-68,-62,21],[23,25,-69,-65,22],
    [18,20,-73,-70,22],[12,15,-77,-74,23],[3,9,-83,-77,23],
  ],
};
CLOUDSTEP.seed=91347; CLOUDSTEP.level=1; CLOUDSTEP.difficulty='Explorer'; CLOUDSTEP.color='#6fe1c5';
const themes=[
  ['Meadow Hop','Warm up on wide garden islands','green_wool','#86e4a0'],
  ['Coral Causeway','Weave across a sunlit reef','red_wool','#ff968b'],
  ['Amber Steps','Climb the golden switchbacks','gold_block','#ffcf72'],
  ['Frostline','Narrow landings above the snow','blue_wool','#8ddaff'],
  ['Cherry Heights','A winding path through pink skies','red_wool','#fbaad1'],
  ['Jade Towers','Follow the rising emerald terraces','green_wool','#69e1b8'],
  ['Sunset Sprint','Longer gaps. Keep your momentum','gold_block','#ffac69'],
  ['Moonlit Steps','Precision on a silver skyline','polished_marble','#bac2ff'],
  ['Cobalt Crossing','A twisting route in the blue','blue_wool','#6aafff'],
  ['Crown Ascent','The final climb to the crown','gold_block','#f6d877'],
  ['Sky Marathon','A long-distance test of every landing','green_wool','#9befc4'],
];
function makeCourse(theme,index){
  const [name,subtitle,trim,color]=theme,level=index+2, platforms=[], count=18+index*2;
  let x=0,z=5,y=13;
  for(let i=0;i<count;i++){
    const width=i%5===0?3:index<4?2:1;
    platforms.push([x-width,x+width,z-2,z+2,y]);
    // A full run-up and at most a two-block gap; rises stay within normal jump height.
    z-=index<6?6:7;x+=i%6<3?1:-1;if(i%4===3)y++;
  }
  const center=([a,b,c,d,y])=>({x:(a+b)/2+.5,y,z:(c+d)/2+.5,yaw:0});
  const spawn=center(platforms[0]);
  return {id:'sky-'+level,seed:91347+level,level,name,subtitle,trim,color,difficulty:level<6?'Explorer':level<10?'Challenger':'Expert',spawn,fallY:5,platforms,pads:[],checkpoints:platforms.filter((_,i)=>i%5===0).map((p,i)=>({...center(p),name:i?'Stage '+(i+1):'Start'})),finish:{...center(platforms.at(-1)),radius:1.4}};
}
export const CAMPAIGN=Object.freeze([CLOUDSTEP,...themes.map(makeCourse)]);
export const ARENA={id:'arcade-arena',seed:92000,name:'Prism Arena',spawn:{x:.5,y:13,z:9.5,yaw:0},fallY:5,checkpoints:[{name:'Start',x:.5,y:13,z:9.5,yaw:0}],finish:{x:0,y:100,z:0,radius:1},pads:[],platforms:[[-14,14,-14,14,13]],arena:true};
export const ARENAS=Object.freeze(Object.fromEntries([
  ['block-soccer','Mintfield Stadium',['green_wool','white_wool']],['bomb-tag','Fuse Factory',['stonebrick','red_wool']],
  ['rocket-rumble','Rocket Rock',['polished_marble','red_wool']],['coin-heist','Six Vaults',['polished_marble','gold_block']],
  ['meteor-dodge','Meteor Meadow',['stonebrick','gold_block']],['redlight-rush','Signal Speedway',['white_wool','green_wool']],
  ['tnt-run','Crumble Yard',['red_wool','gold_block']],['laser-jump','Neon Roundabout',['stonebrick','blue_wool']],
  ['gem-rush','Emerald Gardens',['polished_marble','green_wool']],['spleef','Frostbreak Plaza',['white_wool','blue_wool']],
  ['color-drop','Prism Arena',null],['infection','Overgrown Court',['stonebrick','green_wool']],
  ['crown-control','Crown Pavilion',['polished_marble','gold_block']],['sky-battle','Cobalt Colosseum',['stonebrick','blue_wool']],
].map(([id,name,floor],i)=>[id,{...ARENA,id:'arena-'+id,seed:92001+(i<8?i+6:i-8),name,floor}])));
export const COURSES=Object.freeze(Object.fromEntries([...CAMPAIGN,ARENA,...Object.values(ARENAS)].map(c=>[c.id,c])));
export const courseForSeed=seed=>Object.values(COURSES).find(c=>c.seed===seed)||CLOUDSTEP;
const geometries=new Map();
function expandedGeometry(course){
  const blocks=new Map(),heights=new Map();
  const put=(x,y,z,type)=>{blocks.set(`${x},${y},${z}`,type);heights.set(`${x},${z}`,Math.max(heights.get(`${x},${z}`)??-64,y));};
  const colors=['red_wool','blue_wool','green_wool','gold_block'];
  for(const [a,b,c,d,y] of course.platforms)for(let x=a;x<=b;x++)for(let z=c;z<=d;z++){
    put(x,y-1,z,course.arena?(course.floor?course.floor[(Math.abs(x)===14||Math.abs(z)===14||Math.floor(x/3)%2===0&&Math.floor(z/3)%2===0)?1:0]:colors[((Math.floor((x+15)/3)+Math.floor((z+15)/3))%4)]):x===a||x===b||z===c||z===d?course.trim:'polished_marble');
    if(!course.arena)put(x,y-2,z,'stonebrick');
  }
  if(course.arena){
    for(const x of [-17,17])for(const z of [-17,17]){
      for(let y=8;y<20;y++)put(x,y,z,y%3===0?'gold_block':'polished_marble');
      put(x,20,z,'lantern');
      for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)put(x+a,17,z+b,course.floor?.[1]||'blue_wool');
    }
  }
  if(!course.arena){
    for(const cp of course.checkpoints)put(Math.floor(cp.x),cp.y-1,Math.floor(cp.z),'gold_block');
    const f=course.finish;
    for(const dx of [-2,2])for(let dy=0;dy<4;dy++)put(Math.floor(f.x)+dx,f.y+dy,Math.floor(f.z)-2,'stonebrick');
    for(let dx=-2;dx<=2;dx++)put(Math.floor(f.x)+dx,f.y+4,Math.floor(f.z)-2,'gold_block');
    for(let i=0;i<course.platforms.length;i+=5){const [a,b,c,d,y]=course.platforms[i];put(a,y,c,'lantern');put(b,y,c,'lantern');}
  }
  // Ornamental floating gardens, crystalline spires and lanterns frame every arena.
  for(let i=0;i<8;i++){
    const x=Math.round(Math.cos(i*Math.PI/4)*24),z=Math.round(Math.sin(i*Math.PI/4)*24),y=8+i%3;
    for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){put(x+a,y-1,z+b,'stonebrick');put(x+a,y,z+b,'grass');}
    for(let h=1;h<=4;h++)put(x,y+h,z,'wood');
    for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)put(x+a,y+5,z+b,'leaf');
    put(x+2,y+1,z,'lantern');
  }
  return {blocks,heights};
}
let geometry;
export function courseGeometry(seed=91347){
  const course=courseForSeed(seed);
  if(course!==CLOUDSTEP){if(!geometries.has(seed))geometries.set(seed,expandedGeometry(course));return geometries.get(seed);}
  if(geometry)return geometry;
  const blocks=new Map(),heights=new Map();
  const put=(x,y,z,type)=>{blocks.set(`${x},${y},${z}`,type);heights.set(`${x},${z}`,Math.max(heights.get(`${x},${z}`)??-64,y));};
  const box=(x1,x2,y1,y2,z1,z2,type)=>{for(let x=x1;x<=x2;x++)for(let y=y1;y<=y2;y++)for(let z=z1;z<=z2;z++)put(x,y,z,type);};
  CLOUDSTEP.platforms.forEach(([x1,x2,z1,z2,top],index)=>{
    for(let x=x1;x<=x2;x++)for(let z=z1;z<=z2;z++){
      const edge=x===x1||x===x2||z===z1||z===z2;
      put(x,top-1,z,edge?'blue_wool':'polished_marble');
      put(x,top-2,z,'stonebrick');
      if(x>x1&&x<x2&&z>z1&&z<z2)put(x,top-3,z,'marble');
    }
    // A small warm landing stripe leads the eye from one island to the next.
    if(index>0)put(Math.floor((x1+x2)/2),top-1,Math.floor((z1+z2)/2),'gold_block');
  });
  for(const cp of CLOUDSTEP.checkpoints){
    const x=Math.floor(cp.x),z=Math.floor(cp.z);
    box(x-1,x+1,cp.y-1,cp.y-1,z-1,z+1,'green_wool');put(x,cp.y-1,z,'gold_block');
  }
  box(30,32,17,17,-56,-55,'launch_pad');
  box(4,8,22,22,-81,-78,'gold_block');
  // Gardens, railing posts, timber shelters and finish arch sit beside the route.
  for(const [x,y,z]of[[-3,13,7],[3,13,7],[-3,14,-19],[34,17,-16],[34,18,-52],[34,21,-67]]){
    put(x,y,z,'grass');put(x,y+1,z,x%2?'flower_blue':'flower_red');
    put(x,y,z+1,'wood');put(x,y+1,z+1,'lantern');
  }
  for(const x of[-4,4]){box(x,x,13,16,10,10,'wood');put(x,14,9,'lantern');}
  box(-4,4,17,17,9,11,'pine_plank');
  for(const x of[3,9])box(x,x,23,27,-82,-82,'stonebrick');
  box(3,9,28,28,-82,-82,'gold_block');
  // Small distant islands remain lightweight and are deliberately off the route.
  for(const [x,z,y]of[[-19,-19,8],[49,-34,10],[9,-48,8],[-11,-70,13]]){
    box(x-2,x+2,y-2,y-1,z-2,z+2,'stonebrick');box(x-2,x+2,y,y,z-2,z+2,'grass');
    box(x,x,y+1,y+3,z,z,'wood');box(x-1,x+1,y+4,y+5,z-1,z+1,'leaf');
  }
  geometry={blocks,heights};return geometry;
}
