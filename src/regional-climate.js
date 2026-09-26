import {BIOME_FAMILIES} from './expanded-biomes.js?v=38';
import {climateAt,noise2,smooth,integerHash} from './climate.js?v=38';
// Version eight is separate: saved version-seven terrain never changes underneath builds.
export function regionalClimate(seed,x,z,hashFn=integerHash){
 const c=climateAt(seed,x,z,hashFn),n=(s,o)=>noise2(c.wx,c.wz,seed+o,s,hashFn),t=c.temperature,m=c.moisture;
 if(c.biome==='forest'&&t<.51&&m>.54)c.biome='conifer';
 else if(c.biome==='autumn_forest'&&n(540,2109)>.5)c.biome='cherry';
 else if(c.biome==='snow_plains'&&n(610,2203)>.53)c.biome='frozen_badlands';
 const dryHot=smooth(.58,.66,t)*(1-smooth(.36,.45,m));
 const mesaWeight=Math.max(dryHot*smooth(.26,.31,m),(1-smooth(.23,.3,t))*(1-smooth(.43,.51,m))*smooth(.45,.65,n(610,2203)));
 // Continuous terraces: steep flanks and broad tops, without quantization walls.
 const plateau=smooth(.3,.64,n(105,2309)),canyon=smooth(.04,.16,Math.abs(n(330,2311)-.5));
 const hills=n(130,17)*2-1,detail=n(27,53)*2-1,ridge=1-Math.abs(n(370,331)*2-1);
 const dunes=(Math.sin(c.wx*.028+n(190,33)*4)+Math.sin(c.wz*.018+c.wx*.008))*2.2;
 const ocean=1-smooth(.24,.38,c.continental);
 let height=9+(c.continental-.4)*48+hills*(6+c.wet*11+c.cold*3)+detail*(1.1+c.wet)+c.mountain*(25+ridge*38)+smooth(.57,.76,t)*c.dry*dunes;
 height+=mesaWeight*(plateau*26*canyon-5*(1-canyon));
 height=height*(1-ocean)+(-8-22*n(240,667))*ocean;
 const riverDistance=Math.abs(n(270,1187)-.5);
 const river=(1-smooth(.009,.14,riverDistance))*(1-c.mountain)*smooth(.31,.44,c.continental);
 const lake=(1-smooth(.035,.18,n(160,1821)))*c.wet*(1-c.mountain);
 c.water=Math.max(river,lake);c.h=height*(1-c.water)+1.4*c.water;c.river=riverDistance*330;
 if(c.water>.82&&c.continental>.4&&c.mountain<.2)c.biome='river';
 c.h=Math.max(-36,Math.min(78,c.h));return c;
}
export function regionalSurface(c,x,z,seed){
 const n=noise2(x,z,seed+917,13);
 if(c.biome==='red_sand_desert')return 'red_sand';
 if(c.biome==='many_cactus_desert')return 'sand';
 if(c.biome==='oasis')return c.h<5?'sand':'grass';
 if(c.biome==='badlands')return 'red_sand';
 if(c.biome==='frozen_badlands')return n>.65?'chalk':'snow';
 if(c.biome==='river')return n>.5?'gravel':'sand';
 if(c.biome==='ocean'||c.biome==='beach')return c.h<-9?'gravel':'sand';
 if(c.biome==='desert')return 'sand';
 if(['snow','snow_plains','snow_cedar'].includes(c.biome))return 'snow';
 if(c.biome==='mountain')return c.h>58?'snow':n>.72?'gravel':'stone';
 if(c.biome==='marsh')return n>.64?'clay':'grass';
 if(c.biome==='savanna')return n>.25?'dry_grass':'grass';
 // Transitional surface flecks are spatially coherent, not random checkerboards.
 const snow=1-smooth(.23,.3,c.temperature),sand=smooth(.6,.7,c.temperature)*(1-smooth(.27,.36,c.moisture));
 return n<snow?'snow':n<sand?'sand':c.h>62&&integerHash(x,z,seed)<smooth(62,76,c.h)?'snow':'grass';
}

export function expandedClimate(seed,x,z){
 const c=regionalClimate(seed,x,z),family=BIOME_FAMILIES[c.biome];
 if(family){const patch=integerHash(Math.floor(c.wx/210),Math.floor(c.wz/210),seed+4013);c.biome=family[Math.floor(patch*family.length)];}
 // Pools follow a continuous local depression; surrounding dunes remain intact.
 if(c.biome==='oasis'){const edge=Math.min(((c.wx%210)+210)%210,210-((c.wx%210)+210)%210,((c.wz%210)+210)%210,210-((c.wz%210)+210)%210);const pool=(1-smooth(.10,.25,noise2(c.wx,c.wz,seed+4021,85)))*smooth(0,55,edge)*smooth(.65,.71,c.temperature)*(1-smooth(.24,.3,c.moisture))*(1-smooth(.2,.48,c.mountain));c.h=c.h*(1-pool)+2*pool;c.water=Math.max(c.water,pool);}
 return c;
}
