// Version ten biomes. Older saves retain their original climate selection.
const entry=(name,parent,trees,color)=>({name,parent,trees,color});
export const EXPANDED_BIOMES=Object.freeze({
 grassy_plains:entry('Grassy Plains','meadow',['oak'],'#84bc48'),
 hilly_plains:entry('Hilly Plains','meadow',['oak'],'#77ae43'),
 flower_meadow:entry('Meadows','meadow',[],'#a3c965'),
 maple_forest:entry('Maple Forest','forest',['oak','amber'],'#6b9d42'),
 aspen_forest:entry('Aspen Forest','forest',['birch'],'#a6bd65'),
 pear_forest:entry('Pear Forest','forest',['pear'],'#91b24e'),
 plum_forest:entry('Plum Forest','forest',['plum'],'#859152'),
 bluebell_forest:entry('Bluebell Forest','forest',['oak'],'#787ecc'),
 cedar_forest:entry('Cedar Forest','conifer',['tall_conifer'],'#487649'),
 many_cactus_desert:entry('Many Cactus Desert','desert',[],'#d4c383'),
 red_sand_desert:entry('Red Sand Desert','desert',[],'#ce8050'),
 spectral_forest:entry('Spectral Forest','dense_forest',['spectral'],'#5c7d92'),
 oasis:entry('Oasis','desert',['palm'],'#7ec18c')
});
export const BIOME_FAMILIES=Object.freeze({
 meadow:['meadow','grassy_plains','hilly_plains','flower_meadow'],
 forest:['forest','maple_forest','aspen_forest','pear_forest','plum_forest','bluebell_forest'],
 conifer:['conifer','cedar_forest'],dense_forest:['dense_forest','spectral_forest'],
 desert:['desert','many_cactus_desert','red_sand_desert','oasis']
});
