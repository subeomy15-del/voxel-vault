import {coordinateHash} from './coordinate-hash.js?v=38';
import {BIOME_DEFINITIONS} from './biome-registry.js?v=38';
const palettes={
 meadow:['#829756','#a4ad69'],forest:['#577c40','#82964e'],dense_forest:['#426e40','#66834a'],jungle:['#367447','#668b43'],
 autumn_forest:['#a48549','#b49a59'],cherry:['#bd8b9d','#d7acb7'],desert:['#a18b61','#c0a874'],badlands:['#9b7b53','#b39a70'],
 snow:['#b1c4c7','#8b9d9c'],snow_plains:['#b1c4c7','#8b9d9c'],snow_cedar:['#b1c4c7','#8b9d9c'],frozen_badlands:['#a3b4ba','#bcc9c9'],
 mountain:['#8e9690','#adb2a5'],beach:['#a0ac7b','#b1ba89'],river:['#799c65','#9fb58a'],marsh:['#69824a','#90a061'],savanna:['#a9a061','#c1b57a'],
 spectral_forest:['#637f88','#8caaa7'],conifer:['#567552','#819066'],ocean:['#367c68','#68905c']
};
// Render-only garnish: never writes voxels, edits, inventories or generator versions.
export function habitatInstances(world,cx,cz,quality='medium'){
 const blocked=new Set();
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const[k]of world.edits.chunkEntries?.(cx+dx,cz+dz)||[]){const[x,,z]=k.split(',').map(Number);if(x<cx*16-1||x>cx*16+16||z<cz*16-1||z>cz*16+16)continue;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)blocked.add(`${x+a},${z+b}`);}
 const ground=[],water=[],limit=quality==='low'?6:quality==='medium'?16:24,waterLimit=quality==='low'?4:8;
 for(let a=0;a<16;a++)for(let b=0;b<16;b++){
  const x=cx*16+a,z=cz*16+b,n=coordinateHash(x,z,world.seed+9187);
  if(n>.16)continue;
  // Leave edited columns and their immediate neighbors completely clear.
  if(blocked.has(`${x},${z}`))continue;
  const h=world.height(x,z),biome=world.biome(x,z),parent=BIOME_DEFINITIONS[biome]?.parent||biome,palette=palettes[biome]||palettes[parent]||palettes.forest;
  const below=world.get(x,h,z),above=world.get(x,h+1,z),patch=world.noise(x+611,z-287,13);
  if(h<3&&h>-19&&above==='water'&&water.length<waterLimit&&n<.035&&patch>.48&&world.waterAt(x,h+2,z)&&!world.solid(x,h+1,z)){
   const tall=n<.009&&h<-7;
   water.push({tall,x:x+.5,y:h+1,z:z+.5,scale:tall?Math.min(8,2-h)*(.65+n*10):Math.min(2.2,Math.max(.45,(3-h)*.3))*(.6+n*6),angle:n*91,color:biome==='marsh'?'#6a8548':n<.017?'#4f936b':'#397d69'});continue;
  }
  if(ground.length>=limit||above||h<5||!['grass','dry_grass','dirt','sand','red_sand','snow','gravel','stone'].includes(below))continue;
  if(patch<.4||n>(['sand','red_sand','stone','snow','gravel'].includes(below)?.025:.12))continue;
  ground.push({x:x+.25+n*3,y:h+1,z:z+.3+n*2,scale:['sand','red_sand'].includes(below)?.48:below==='snow'?.2:.65+n*3,angle:n*147,color:palette[n<.06?0:1],stony:['stone','gravel','snow'].includes(below)});
 }
 return {ground,water};
}
