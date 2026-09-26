import {EXPANDED_BIOMES} from './expanded-biomes.js?v=38';
const ecology={
 snow_cedar:{animals:['deer','rabbit'],enemies:['frost_howler','wisp'],feature:'Snow-laden cedar boughs and buried halls',resource:'pinewood'},
 meadow:{animals:['cow','sheep','rabbit'],enemies:['zombie','skeleton'],feature:'Open grasslands and fallen ramparts',resource:'wheat'},
 forest:{animals:['deer','pig','rabbit'],enemies:['zombie','skeleton'],feature:'Branching oaks and hidden homesteads',resource:'apple'},
 dense_forest:{animals:['deer','pig'],enemies:['spider','sentinel'],feature:'Great oaks above moss-covered chambers',resource:'mushroom'},
 conifer:{animals:['deer','rabbit','sheep'],enemies:['skeleton','sentinel'],feature:'Tall evergreen groves and abandoned mines',resource:'pinewood'},
 autumn_forest:{animals:['deer','rabbit'],enemies:['zombie','sentinel'],feature:'Amber maple crowns and weathered shrines',resource:'autumnleaf'},
 cherry:{animals:['rabbit','deer'],enemies:['sentinel','skeleton'],feature:'Blossom groves around forgotten shrines',resource:'cherry_leaf'},
 jungle:{animals:['pig','chicken'],enemies:['spider','sentinel'],feature:'High branching crowns and overgrown temples',resource:'watermelon'},
 desert:{animals:['rabbit'],enemies:['husk','skeleton'],feature:'Dunes and buried temple halls',resource:'glass'},
 badlands:{animals:['rabbit'],enemies:['skeleton','draugr_knight','draugr_knight'],feature:'Layered mesas, canyons and ancient forts',resource:'knight_heart'},
 savanna:{animals:['cow','sheep'],enemies:['husk','zombie'],feature:'Dry grass and broad acacia shelters',resource:'leather'},
 marsh:{animals:['pig','chicken'],enemies:['spider','zombie'],feature:'Reed pools and elevated timber huts',resource:'fiber'},
 snow_plains:{animals:['rabbit','sheep'],enemies:['frost_howler','skeleton'],feature:'Frozen ponds and wind-worn stone shrines',resource:'coal'},
 snow:{animals:['deer','rabbit'],enemies:['frost_howler','wisp'],feature:'Snow-tipped conifers and frozen watchtowers',resource:'white_wool'},
 frozen_badlands:{animals:['rabbit'],enemies:['frost_howler','brute'],feature:'Snow-capped red strata and ruined keeps',resource:'frost_arrows'},
 mountain:{animals:['sheep','rabbit'],enemies:['brute','skeleton'],feature:'High ridges and stone refuges',resource:'iron_ingot'},
 beach:{animals:['rabbit'],enemies:['husk'],feature:'Palm headlands and broken causeways',resource:'water_flask'},
 river:{animals:['deer','rabbit'],enemies:['zombie'],feature:'Gravel banks and ancient crossings',resource:'clay'},
 ocean:{animals:[],enemies:[],feature:'Deep shelves and submerged chart treasures',resource:'sea_fish'},
 cave:{animals:[],enemies:['spider','skeleton'],feature:'Mine passages and underground archives',resource:'iron'},
 deep_cave:{animals:[],enemies:['brute','spider'],feature:'Basalt chambers and deep crystal veins',resource:'diamond'}
};
for(const [id,def] of Object.entries(EXPANDED_BIOMES))ecology[id]={...ecology[def.parent],feature:def.name,animals:id==='oasis'?['camel']:ecology[def.parent].animals};
export const BIOME_ECOLOGY=Object.freeze(ecology);
export function biomeEnemy(world,x,y,z,salt=0){const id=world.biomeAtHeight(x,y,z),list=BIOME_ECOLOGY[id]?.enemies||['zombie','skeleton'];return list[Math.abs(salt)%list.length]||'zombie';}
