import {EXPANDED_BIOMES} from './expanded-biomes.js?v=38';
const biome=(name,color,top,temperature,moisture,hills,trees,density,structures,extra={})=>Object.freeze({name,color,top,temperature,moisture,hills,trees:Object.freeze(trees),density,structures:Object.freeze(structures),subsurface:'dirt',roughness:1.8,...extra});
const definitions={
 snow_cedar:biome('Snowy Cedar Forest','#b8cfcb','snow',.17,.67,18,['snow_cedar'],.68,['watchtower','buried','mine'],{introduced:11,parent:'snow',subsurface:'dirt'}),
 conifer:biome('Pine Forest','#527064','grass',.4,.62,17,['conifer','tall_conifer'],.69,['house','watchtower','mine']),
 cherry:biome('Cherry Blossom Forest','#c7a2ac','grass',.37,.55,9,['cherry'],.42,['shrine','house']),
 frozen_badlands:biome('Frozen Badlands','#aeb9c8','snow',.17,.3,26,[],0,['watchtower','fortress','buried'],{subsurface:'chalk'}),
 river:biome('Rivers','#638e9b','gravel',.5,.7,2,['palm'],.25,['bridge','camp'],{subsurface:'clay'}),
 meadow:biome('Plains','#7d9e59','grass',.52,.38,6,['oak'],.16,['camp','wall','shrine','watchtower']),
 forest:biome('Oakwood Forest','#658657','grass',.48,.62,13,['oak','birch','oak'],.64,['house','tower','shrine','dungeon','mine']),
 dense_forest:biome('Deepwood','#405e43','grass',.43,.82,18,['great_oak','pine'],.86,['tower','house','temple']),
 autumn_forest:biome('Autumn Forest','#b29154','grass',.36,.52,11,['amber','amber','birch'],.48,['house','shrine','wall']),
 jungle:biome('Jungle','#426e44','grass',.83,.82,22,['jungle','great_oak'],.92,['temple','shrine','tower','dungeon']),
 desert:biome('Desert','#d3bd89','sand',.85,.18,10,[],0,['temple','gate','tower','buried'],{subsurface:'sandstone',roughness:.5}),
 badlands:biome('Redstone Mesas','#b2764b','red_sand',.72,.26,24,[],0,['wall','fortress','dungeon','tower'],{subsurface:'red_terracotta',roughness:.8}),
 snow_plains:biome('Snowy Plains','#d6e2df','snow',.16,.3,7,['pine'],.12,['camp','shrine','wall']),
 snow:biome('Snowy Pine Forest','#a9c4c4','snow',.17,.67,18,['pine','tall_pine'],.72,['house','watchtower','shrine']),
 mountain:biome('Mountain','#929d9e','stone',.3,.42,16,['pine'],.08,['outpost','fortress','watchtower'],{roughness:3.2}),
 beach:biome('Broken Coast','#d2c39c','sand',.5,.5,2,['palm'],.25,['bridge','camp'],{subsurface:'gravel',roughness:.6}),
 ocean:biome('Outer Sea','#5e8799','sand',.5,.5,4,[],0,[],{subsurface:'gravel',roughness:1}),
 marsh:biome('Reedwater Marsh','#6a8061','grass',.62,.95,5,['oak'],.3,['swamp_hut','bridge','shrine'],{roughness:.8}),
 savanna:biome('Sungrass Savannah','#a9a16c','grass',.8,.43,9,['acacia','oak'],.2,['camp','wall','gate'])
};
for(const [id,extra] of Object.entries(EXPANDED_BIOMES)){const parent=definitions[extra.parent];definitions[id]=Object.freeze({...parent,...extra,trees:Object.freeze(extra.trees),density:id==='oasis'?.65:parent.density,top:id==='red_sand_desert'?'red_sand':id==='oasis'?'grass':parent.top});}
export const BIOME_DEFINITIONS=Object.freeze(definitions);
export const BIOME_ALIASES=Object.freeze({'Cactus Fields':'many_cactus_desert','Many Cactus Desert':'many_cactus_desert','Red Desert':'red_sand_desert','Red Sand Desert':'red_sand_desert'});
export const normalizeBiomeId=value=>BIOME_ALIASES[value]||value;
export const WORLDGEN_VERSION=12;
export const SAVE_SCHEMA_VERSION=2;

export const UNDERGROUND_BIOMES=Object.freeze({stony_cave:{name:'Stony Caves',color:'#84918e',top:'stone'},andesite_cave:{name:'Andesite Caves',color:'#818b91',top:'andesite'},granite_cave:{name:'Granite Caves',color:'#a7958b',top:'granite'},diorite_cave:{name:'Diorite Caves',color:'#c6ccc6',top:'diorite'},cave:{name:'Caves',color:'#6a7976',top:'stone'},deep_cave:{name:'Deep Caves',color:'#555d70',top:'slate'}});
