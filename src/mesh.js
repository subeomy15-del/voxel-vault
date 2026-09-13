import { BLOCKS } from './data.js?v=16';
import { WORLD_BOTTOM, WORLD_TOP } from './world.js?v=16';
import { TILE,ATLAS_COLS,ATLAS_WIDTH,ATLAS_HEIGHT } from './textures.js?v=16';
export const BLOCK_TYPES=Object.keys(BLOCKS);
const ids=Object.fromEntries(BLOCK_TYPES.map((t,i)=>[t,i+1]));
const faces=[
  {n:[1,0,0],v:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]],shade:.86},
  {n:[-1,0,0],v:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]],shade:.78},
  {n:[0,1,0],v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],shade:1},
  {n:[0,-1,0],v:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],shade:.59},
  {n:[0,0,1],v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],shade:.91},
  {n:[0,0,-1],v:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]],shade:.8},
];
const isGlass=type=>type==='glass'||type?.endsWith('_glass');
const empty=()=>({position:[],normal:[],uv:[],color:[],index:[]});
export function meshChunk(world,cx,cz,underground=false){
  const solid=empty(),water=empty(),glass=empty(),low=underground?WORLD_BOTTOM:-10;
  let high=0;for(let x=-1;x<=16;x++)for(let z=-1;z<=16;z++)high=Math.max(high,world.height(cx*16+x,cz*16+z)+13);
  for(const[k,t]of world.edits){if(!t)continue;const[x,y,z]=k.split(',').map(Number);if(Math.floor(x/16)===cx&&Math.floor(z/16)===cz)high=Math.max(high,y+2);}
  high=Math.min(WORLD_TOP+1,high);const depth=high-low+2,vox=new Uint16Array(18*18*depth),at=(x,y,z)=>(x*18+z)*depth+y;
  for(let x=0;x<18;x++)for(let z=0;z<18;z++)for(let y=0;y<depth;y++)vox[at(x,y,z)]=ids[world.get(cx*16+x-1,low+y-1,cz*16+z-1)]||0;
  const transparent=id=>!id||BLOCKS[BLOCK_TYPES[id-1]]?.boxes||BLOCKS[BLOCK_TYPES[id-1]]?.plant||isGlass(BLOCK_TYPES[id-1])||['water','glass','ladder','torch','lantern','campfire'].includes(BLOCK_TYPES[id-1]);
  for(let x=1;x<17;x++)for(let z=1;z<17;z++)for(let y=1;y<depth-1;y++){
    const id=vox[at(x,y,z)];if(!id)continue;const type=BLOCK_TYPES[id-1],out=type==='water'?water:isGlass(type)?glass:solid;
    if(BLOCKS[type].renderOnly)continue;
    const wx=cx*16+x-1,wy=low+y-1,wz=cz*16+z-1,small=type==='torch'||type==='lantern',ladder=type==='ladder';
    if(BLOCKS[type].plant||type==='campfire'){
      const tile=(id-1)*3,u=tile%ATLAS_COLS*TILE/ATLAS_WIDTH,v=1-(Math.floor(tile/ATLAS_COLS)+1)*TILE/ATLAS_HEIGHT;
      for(const points of [[[.08,0,.08],[.92,0,.92],[.92,1,.92],[.08,1,.08]],[[.92,0,.08],[.08,0,.92],[.08,1,.92],[.92,1,.08]]]){
        const start=out.position.length/3;
        for(let k=0;k<4;k++){const p=points[k];out.position.push(wx+p[0],wy+p[1],wz+p[2]);out.normal.push(0,1,0);out.color.push(1,1,1);out.uv.push(u+(k===1||k===2?TILE-.4:.4)/ATLAS_WIDTH,v+(k>1?TILE-.4:.4)/ATLAS_HEIGHT);}
        out.index.push(start,start+1,start+2,start,start+2,start+3,start+2,start+1,start,start+3,start+2,start);
      }
      continue;
    }
    if(BLOCKS[type].boxes){
      const textureId=ids[BLOCKS[type].texture]||id;
      for(const box of BLOCKS[type].boxes)for(let f=0;f<6;f++){
        const face=faces[f],tile=(textureId-1)*3+(f===2?0:f===3?2:1),u=tile%ATLAS_COLS*TILE/ATLAS_WIDTH,v=1-(Math.floor(tile/ATLAS_COLS)+1)*TILE/ATLAS_HEIGHT,start=out.position.length/3;
        for(let k=0;k<4;k++){const p=face.v[k],px=box[0]+p[0]*(box[3]-box[0]),py=box[1]+p[1]*(box[4]-box[1]),pz=box[2]+p[2]*(box[5]-box[2]);out.position.push(wx+px,wy+py,wz+pz);out.normal.push(...face.n);out.color.push(face.shade,face.shade,face.shade);out.uv.push(u+(k===1||k===2?TILE-.4:.4)/ATLAS_WIDTH,v+(k>1?TILE-.4:.4)/ATLAS_HEIGHT);}
        out.index.push(start,start+1,start+2,start,start+2,start+3);
      }
      continue;
    }
    for(let f=0;f<6;f++){
      const face=faces[f],[nx,ny,nz]=face.n,neighbor=vox[at(x+nx,y+ny,z+nz)];
      if(type==='water'&&neighbor||isGlass(type)&&neighbor===id)continue;
      if(type!=='water'&&!transparent(neighbor)&&!small&&!ladder)continue;
      const tile=(id-1)*3+(f===2?0:f===3?2:1),u=(tile%ATLAS_COLS)*TILE/ATLAS_WIDTH,v=1-(Math.floor(tile/ATLAS_COLS)+1)*TILE/ATLAS_HEIGHT,start=out.position.length/3;
      for(let k=0;k<4;k++){
        const p=face.v[k];let px=p[0],py=p[1],pz=p[2];
        if(small){px=.35+px*.3;pz=.35+pz*.3;py*=.8;}if(ladder)pz=.43+pz*.14;
        if(type==='water'&&py===1)py=.88;
        out.position.push(wx+px,wy+py,wz+pz);out.normal.push(nx,ny,nz);
        let ao=0;if(type!=='water'&&!small&&!ladder){const axes=face.n.map((n,i)=>n===0?i:-1).filter(i=>i>=0),base=[x+nx,y+ny,z+nz];for(const mask of[1,2,3]){const q=[...base];for(let a=0;a<2;a++)if(mask&(1<<a))q[axes[a]]+=p[axes[a]]?1:-1;if(!transparent(vox[at(...q)]))ao++;}}
        const shade=face.shade*(1-ao*.115);if(isGlass(type)){const tint=parseInt(BLOCKS[type].color.slice(1),16);out.color.push(...[16,8,0].map(shift=>shade*Math.pow(((tint>>shift)&255)/255,2.2)));}else out.color.push(shade,shade,shade);out.uv.push(u+(k===1||k===2?TILE-.4:.4)/ATLAS_WIDTH,v+(k>1?TILE-.4:.4)/ATLAS_HEIGHT);
      }
      out.index.push(start,start+1,start+2,start,start+2,start+3);
    }
  }
  return Object.fromEntries(Object.entries({solid,water,glass}).map(([name,data])=>[name,Object.fromEntries(Object.entries(data).map(([k,v])=>[k,k==='index'?new Uint32Array(v):new Float32Array(v)]))]));
}
