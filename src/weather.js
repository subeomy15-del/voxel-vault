import {coordinateHash} from './coordinate-hash.js?v=39';
import {BIOME_DEFINITIONS} from './biome-registry.js?v=39';
export function weatherAt(seed,time,biome){
 const d=BIOME_DEFINITIONS[biome]||{},period=Math.floor(time/480),phase=((time%480)+480)%480/480;
 const wet=(d.moisture??.5)>.42,cold=(d.temperature??.5)<.28;
 const chance=coordinateHash(period,19,seed+9833),envelope=Math.max(0,Math.min(1,(phase-.12)/.18,(.88-phase)/.18));
 const intensity=wet&&chance<.4?envelope*(.22+chance*.8):0;
 return {intensity,kind:cold?'snow':'rain',cloud:Math.min(.82,.26+chance*.25+intensity*.8),wind:.25+coordinateHash(period,23,seed)*.65};
}
