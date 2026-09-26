import {regionalClimate} from './regional-climate.js?v=38';
import {noise2,smooth} from './climate.js?v=38';
import {BIOME_FAMILIES} from './expanded-biomes.js?v=38';
import {coordinateHash} from './coordinate-hash.js?v=38';
export function continentalClimate(seed,x,z){
 const c=regionalClimate(seed,x,z,coordinateHash),family=BIOME_FAMILIES[c.biome];
 // Coherent scalar contours replace version ten's independent square cells.
 const n=noise2(c.wx,c.wz,seed+4013,330,coordinateHash);
 if(family)c.biome=family[Math.min(family.length-1,Math.max(0,Math.floor((n-.2)/.6*family.length)))];
 if(c.biome==='snow'&&noise2(c.wx,c.wz,seed+4079,290,coordinateHash)>.5)c.biome='snow_cedar';
 if(c.biome==='hilly_plains')c.h+=Math.sin(c.wx/75)*Math.sin(c.wz/90)*3;
 if(c.biome==='oasis'){const pool=Math.max(0,1-Math.abs(n-.74)*25)*Math.max(0,1-noise2(c.wx,c.wz,seed+4021,85,coordinateHash)*2);c.h=c.h*(1-pool)+2*pool;c.water=Math.max(c.water,pool);}
 // Wet climate contours lower the basin continuously before the marsh boundary.
 const wetland=smooth(.72,.81,c.moisture)*smooth(.45,.5,c.temperature)*(1-smooth(.57,.65,c.temperature))*(1-c.mountain);
 const hummocks=1.5+noise2(c.wx,c.wz,seed+7191,45,coordinateHash)*6;
 c.h=c.h*(1-wetland)+hummocks*wetland;
 return c;
}
export const CAVE_REGIONS=Object.freeze({
 stony_cave:{name:'Stony Caves',rock:'stone',color:'#84918e'},
 andesite_cave:{name:'Andesite Caves',rock:'andesite',color:'#818b91'},
 granite_cave:{name:'Granite Caves',rock:'granite',color:'#a7958b'},
 diorite_cave:{name:'Diorite Caves',rock:'diorite',color:'#c6ccc6'}
});
export function caveRegion(seed,x,z){
 const n=noise2(x,z,seed+8123,180,coordinateHash),id=n<.46?'stony_cave':n<.61?'andesite_cave':n<.74?'granite_cave':'diorite_cave';
 return {id,...CAVE_REGIONS[id]};
}
