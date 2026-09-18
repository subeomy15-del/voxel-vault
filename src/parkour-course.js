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
export const COURSES=Object.freeze({[CLOUDSTEP.id]:CLOUDSTEP});
let geometry;
export function courseGeometry(){
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
