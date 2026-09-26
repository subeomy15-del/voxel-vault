// Generator 12: layered habitats. All anchors use absolute coordinates and bounded footprints.
const profile=(cover,density,rock,logs,extra={})=>Object.freeze({cover,density,rock,logs,fog:1,...extra});
export const BIOME_DETAIL=Object.freeze({
 meadow:profile(['dry_grass_tuft','daisy'],.08,'limestone',false),
 grassy_plains:profile(['fern','dry_grass_tuft','flower_blue'],.23,'limestone',false),
 hilly_plains:profile(['dry_grass_tuft','daisy'],.12,'limestone',false),
 flower_meadow:profile(['daisy','flower_blue','flower_red','lavender'],.33,'limestone',false),
 forest:profile(['leaf_litter','fern','mushroom'],.2,'moss',true),
 maple_forest:profile(['leaf_litter','fern','flower_red'],.25,'moss',true),
 aspen_forest:profile(['leaf_litter','daisy','fern'],.18,'limestone',true,{log:'birch'}),
 pear_forest:profile(['leaf_litter','fern','berries_crop'],.24,'moss',true),
 plum_forest:profile(['leaf_litter','mushroom','berries_crop'],.24,'moss',true),
 bluebell_forest:profile(['flower_blue','flower_blue','leaf_litter'],.36,'moss',true),
 autumn_forest:profile(['leaf_litter','leaf_litter','mushroom'],.35,'granite',true),
 cherry:profile(['blossom_litter','blossom_litter','daisy'],.3,'moss',true),
 conifer:profile(['leaf_litter','forest_moss','mushroom'],.25,'granite',true,{log:'pinewood',fog:.9}),
 cedar_forest:profile(['forest_moss','fern','mushroom'],.32,'moss',true,{log:'pinewood',fog:.85}),
 dense_forest:profile(['forest_moss','fern','mushroom'],.34,'moss',true,{fog:.78}),
 spectral_forest:profile(['forest_moss','lavender','mushroom'],.22,'slate',true,{fog:.72}),
 jungle:profile(['forest_moss','fern','berries_crop'],.35,'moss',true,{fog:.82}),
 desert:profile(['dry_shrub','pebbles'],.045,'sandstone',false),
 many_cactus_desert:profile(['dry_shrub','pebbles'],.08,'sandstone',false,{cactus:true}),
 red_sand_desert:profile(['dry_shrub','pebbles'],.055,'red_terracotta',false),
 badlands:profile(['pebbles','dry_shrub'],.10,'red_terracotta',false),
 oasis:profile(['fern','dry_grass_tuft','cane'],.21,'sandstone',true),
 savanna:profile(['dry_grass_tuft','dry_shrub'],.24,'granite',true),
 marsh:profile(['forest_moss','reeds','mushroom'],.18,'moss',true,{fog:.8}),
 snow_plains:profile(['snow_layer'],.08,'granite',false),
 snow:profile(['snow_layer','snow_layer','pebbles'],.17,'granite',true,{log:'pinewood'}),
 snow_cedar:profile(['snow_layer','snow_layer','pebbles'],.2,'granite',true,{log:'pinewood'}),
 frozen_badlands:profile(['snow_layer','pebbles'],.13,'chalk',false),
 mountain:profile(['pebbles','snow_layer'],.09,'stone',false),
 beach:profile(['pebbles','dry_grass_tuft'],.07,'gravel',true,{driftwood:true}),
 river:profile(['pebbles','reeds'],.18,'gravel',true,{driftwood:true}),
 ocean:profile([],0,'gravel',false)
});
export function detailedSurface(world,x,z,c,original){
 if(c.h<5||['snow','sand','red_sand','mud'].includes(original))return original;
 const p=world.noise(x+631,z-71,19),forest=BIOME_DETAIL[c.biome]?.logs&&!BIOME_DETAIL[c.biome]?.driftwood;
 const slope=Math.max(Math.abs(c.h-world.height(x+1,z)),Math.abs(c.h-world.height(x,z+1)));
 if(slope>2&&['grass','dry_grass'].includes(original))return slope>4?'stone':'gravel';
 if(forest&&original==='grass'&&p>.57)return 'dirt';
 if(c.biome==='mountain'&&c.h<55&&p>.58)return 'gravel';
 return original;
}
export function biomeDetail(world,put,x,z,c){
 const p=BIOME_DETAIL[c.biome];if(!p||c.h<5||c.h>79)return;
 const n=world.hash(x,z,world.seed+8401),patch=world.noise(x-39,z+713,18);
 // Plants form patches with openings, rather than a uniform noise carpet.
 if(p.cover.length&&n<p.density*(patch>.5?1.5:.3)){
  let type=p.cover[Math.floor(world.noise(x+821,z,11)*p.cover.length)%p.cover.length];
  if(type==='snow_layer'&&c.biome==='mountain'&&c.h<52)type='pebbles';
  put(x,c.h+1,z,type);
 }
 const span=24,gx=Math.floor(x/span),gz=Math.floor(z/span);
 if(x!==gx*span+4+Math.floor(world.hash(gx,gz,world.seed+8403)*16)||z!==gz*span+4+Math.floor(world.hash(gz,gx,world.seed+8407)*16))return;
 const heights=[];for(const[dx,dz]of[[-3,0],[3,0],[0,-3],[0,3],[0,0]])heights.push(world.height(x+dx,z+dz));
 if(Math.max(...heights)-Math.min(...heights)>2||Math.min(...heights)<5)return;
 const choice=world.hash(gx,gz,world.seed+8411);
 if(p.cactus&&choice<.65){
  const h=3+Math.floor(n*4);for(let y=1;y<=h;y++)put(x,c.h+y,z,'cactus');
  for(const side of[-1,1]){put(x+side,c.h+2,z,'cactus');put(x+side*2,c.h+2,z,'cactus');put(x+side*2,c.h+3,z,'cactus');}return;
 }
 if(p.logs&&choice<.38&&Math.max(...heights)-Math.min(...heights)<=1){
  const alongX=n>.5,wood=p.log||'wood';
  for(let i=-2;i<=2;i++){const a=x+(alongX?i:0),b=z+(alongX?0:i),h=world.height(a,b);put(a,h+1,b,wood);if(!p.driftwood&&i%2===0)put(a,h+2,b,'forest_moss');}return;
 }
 if(choice>.75)return;
 const radius=1+(choice>.4?1:0),height=1+(choice>.45?1:0);
 for(let dx=-radius;dx<=radius;dx++)for(let dz=-radius;dz<=radius;dz++)if(dx*dx+dz*dz<=radius*radius+1){
  const bed=world.height(x+dx,z+dz),top=c.h+height-(Math.abs(dx)+Math.abs(dz)>radius?1:0);
  for(let y=bed+1;y<=top;y++)put(x+dx,y,z+dz,p.rock);
  if(['snow','snow_cedar','snow_plains','frozen_badlands'].includes(c.biome)&&top>=bed+1)put(x+dx,top+1,z+dz,'snow_layer');
 }
}
