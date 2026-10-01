import {coordinateHash} from './coordinate-hash.js?v=42';
import {BIOME_DEFINITIONS} from './biome-registry.js?v=42';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
// Fronts share a continuous clock; walking across a biome changes precipitation,
// not the direction of the wind or the entire sky.
export function weatherAt(seed,time,biome){
 const d=BIOME_DEFINITIONS[biome]||{},period=Math.floor(time/480),phase=((time%480)+480)%480/480;
 const wet=(d.moisture??.5)>.42,cold=(d.temperature??.5)<.28;
 const chance=coordinateHash(period,19,seed+9833),envelope=smooth(Math.min((phase-.12)/.18,(.88-phase)/.18));
 const intensity=wet&&chance<.4?envelope*(.22+chance*.8):0;
 const front=mix(coordinateHash(period-1,19,seed+9833),chance,smooth(phase));
 const wind=.25+mix(coordinateHash(period-1,23,seed),coordinateHash(period,23,seed),smooth(phase))*.65;
 const windAngle=mix(coordinateHash(period-1,31,seed),coordinateHash(period,31,seed),smooth(phase))*Math.PI*2;
 return {intensity,kind:cold?'snow':'rain',cloud:Math.min(.82,.26+front*.25+intensity*.8),wind,windX:Math.cos(windAngle)*wind,windZ:Math.sin(windAngle)*wind};
}
export function localConditions(time,biome,altitude=20,weather={}){
 const d=BIOME_DEFINITIONS[biome]||{},phase=((time%600)+600)%600/600,elevation=Math.sin(phase*Math.PI*2);
 const daylight=smooth((elevation+.22)/.57),moisture=d.moisture??.5;
 const temperature=Math.round(-12+(d.temperature??.5)*48-Math.max(0,altitude-20)*.12+elevation*4-(weather.intensity||0)*5);
 const mist=smooth(1-Math.abs(phase-.035)/.13)*moisture*.55*(1-(weather.wind||.3)*.6);
 const label=(weather.intensity||0)>.06?(weather.kind==='snow'?'Snowfall':'Rain showers'):(weather.cloud||0)>.6?'Overcast':mist>.15?'Morning mist':(weather.cloud||0)>.4?'Scattered clouds':'Clear skies';
 return {daylight,temperature,mist,label,period:phase<.06?'Dawn':phase<.22?'Morning':phase<.44?'Afternoon':phase<.55?'Dusk':'Night',clock:`${String(Math.floor((phase*24+6)%24)).padStart(2,'0')}:${String(Math.floor(phase*24*60)%60).padStart(2,'0')}`};
}
