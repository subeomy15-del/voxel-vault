const biome=(name,color,top,temperature,moisture,hills,trees,density,structures,extra={})=>Object.freeze({name,color,top,temperature,moisture,hills,trees:Object.freeze(trees),density,structures:Object.freeze(structures),subsurface:'dirt',roughness:1.8,...extra});
export const BIOME_DEFINITIONS=Object.freeze({
 conifer:biome('Pine Forest','#527064','grass',.4,.62,17,['conifer','tall_conifer'],.69,['house','watchtower','mine']),
 cherry:biome('Blossom Grove','#c7a2ac','grass',.37,.55,9,['cherry'],.42,['shrine','house']),
 frozen_badlands:biome('Frostcut Mesas','#aeb9c8','snow',.17,.3,26,[],0,['watchtower','fortress','buried'],{subsurface:'chalk'}),
 river:biome('River Valley','#638e9b','gravel',.5,.7,2,['palm'],.25,['bridge','camp'],{subsurface:'clay'}),
 meadow:biome('Open Plains','#7d9e59','grass',.52,.38,6,['oak'],.16,['camp','wall','shrine','watchtower']),
 forest:biome('Oakwood Forest','#658657','grass',.48,.62,13,['oak','birch','oak'],.64,['house','tower','shrine','dungeon','mine']),
 dense_forest:biome('Deepwood','#405e43','grass',.43,.82,18,['great_oak','pine'],.86,['tower','house','temple']),
 autumn_forest:biome('Amberwood','#b29154','grass',.36,.52,11,['amber','amber','birch'],.48,['house','shrine','wall']),
 jungle:biome('Rainwild','#426e44','grass',.83,.82,22,['jungle','great_oak'],.92,['temple','shrine','tower','dungeon']),
 desert:biome('Dune Sea','#d3bd89','sand',.85,.18,10,[],0,['temple','gate','tower','buried'],{subsurface:'sandstone',roughness:.5}),
 badlands:biome('Redstone Mesas','#b2764b','red_sand',.72,.26,24,[],0,['wall','fortress','dungeon','tower'],{subsurface:'red_terracotta',roughness:.8}),
 snow_plains:biome('Frostfields','#d6e2df','snow',.16,.3,7,['pine'],.12,['camp','shrine','wall']),
 snow:biome('Whitepine Forest','#a9c4c4','snow',.17,.67,18,['pine','tall_pine'],.72,['house','watchtower','shrine']),
 mountain:biome('Crown Ranges','#929d9e','stone',.3,.42,16,['pine'],.08,['outpost','fortress','watchtower'],{roughness:3.2}),
 beach:biome('Broken Coast','#d2c39c','sand',.5,.5,2,['palm'],.25,['bridge','camp'],{subsurface:'gravel',roughness:.6}),
 ocean:biome('Outer Sea','#5e8799','sand',.5,.5,4,[],0,[],{subsurface:'gravel',roughness:1}),
 marsh:biome('Reedwater Marsh','#6a8061','grass',.62,.95,5,['oak'],.3,['swamp_hut','bridge','shrine'],{roughness:.8}),
 savanna:biome('Sungrass Savannah','#a9a16c','grass',.8,.43,9,['acacia','oak'],.2,['camp','wall','gate'])
});
export const WORLDGEN_VERSION=8;
export const SAVE_SCHEMA_VERSION=2;

export const UNDERGROUND_BIOMES=Object.freeze({cave:{name:'Caves',color:'#6a7976',top:'stone'},deep_cave:{name:'Deep Caves',color:'#555d70',top:'slate'}});
