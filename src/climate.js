import {BIOME_DEFINITIONS} from './biome-registry.js?v=33';
export const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function integerHash(x,z,seed){let n=Math.imul(x|0,374761393)^Math.imul(z|0,668265263)^Math.imul(seed|0,1442695041);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;}
export function noise2(x,z,seed,scale){const a=Math.floor(x/scale),b=Math.floor(z/scale),u=smooth(0,1,x/scale-a),v=smooth(0,1,z/scale-b);return (integerHash(a,b,seed)*(1-u)+integerHash(a+1,b,seed)*u)*(1-v)+(integerHash(a,b+1,seed)*(1-u)+integerHash(a+1,b+1,seed)*u)*v;}
export function climateAt(seed,x,z){
 const n=(a,b,s,offset)=>noise2(a,b,seed+offset,s);
 const wx=x+(n(x,z,420,91)-.5)*170,wz=z+(n(x,z,420,193)-.5)*170;
 const temperature=n(wx,wz,680,171),moisture=n(wx,wz,590,811),continental=n(wx,wz,920,127),ridge=1-Math.abs(n(wx,wz,370,331)*2-1);
 const mountain=smooth(.68,.9,n(wx,wz,780,499))*smooth(.39,.56,continental);
 const ocean=1-smooth(.24,.38,continental),coast=1-smooth(.34,.43,continental);
 let biome;
 if(ocean>.65)biome='ocean';else if(coast>.65)biome='beach';else if(mountain>.48)biome='mountain';
 else if(temperature<.27)biome=moisture>.48?'snow':'snow_plains';
 else if(temperature>.65)biome=moisture<.3?'desert':moisture<.4?'badlands':moisture<.62?'savanna':'jungle';
 else if(moisture>.81)biome=temperature>.5?'marsh':'dense_forest';else if(moisture>.67)biome='dense_forest';else if(moisture>.49)biome=temperature<.4?'autumn_forest':'forest';else biome='meadow';
 // Blend terrain coefficients independently of the displayed biome label.
 const wet=smooth(.35,.76,moisture),warm=smooth(.57,.76,temperature),cold=1-smooth(.19,.33,temperature),dry=1-smooth(.29,.43,moisture);
 const hills=n(wx,wz,130,17)*2-1,detail=n(wx,wz,27,53)*2-1;
 const broad=9+(continental-.4)*48,hillStrength=6+wet*11+cold*3;
 const dunes=(Math.sin(wx*.028+n(wx,wz,190,33)*4)+Math.sin(wz*.018+wx*.008))*2.2;
 const mesa=Math.floor(n(wx,wz,150,789)*5)*4;
 let height=broad+hills*hillStrength+detail*(1.1+wet)+mountain*(25+ridge*38)+warm*dry*dunes;
 const badland=warm*smooth(.19,.29,moisture)*(1-smooth(.34,.43,moisture));height+=badland*mesa;
 height=height*(1-ocean)+(-8-22*n(wx,wz,240,667))*ocean;
 // Contours of a low-frequency field produce continuous, winding watercourses.
 const riverDistance=Math.abs(n(wx,wz,270,1187)-.5),river=(1-smooth(.014,.05,riverDistance))*(1-mountain)*smooth(.31,.44,continental);
 const lake=(1-smooth(.035,.1,n(wx,wz,160,1821)))*wet*(1-mountain);
 const water=Math.max(river,lake);height=height*(1-water)+1.4*water;
 const surface=ocean>.65?'ocean':height<6&&coast>.65?'beach':biome;
 return {h:Math.max(-36,Math.min(78,height)),biome:surface,temperature,moisture,continental,mountain,river:riverDistance*330,water,wet,cold,dry,wx,wz};
}
export function blendedSurface(sample,x,z,seed){
 const def=BIOME_DEFINITIONS[sample.biome],snowLine=integerHash(x,z,seed+129);if(snowLine<smooth(56,68,sample.h))return 'snow';
 if(['ocean','beach'].includes(sample.biome))return sample.h<-9?'gravel':'sand';
 const fleck=noise2(x,z,seed+919,9),dryEdge=smooth(.62,.68,sample.temperature)*(1-smooth(.28,.34,sample.moisture));
 const red=smooth(.59,.73,sample.temperature)*smooth(.25,.32,sample.moisture)*(1-smooth(.36,.44,sample.moisture));if(fleck<red)return 'red_sand';if(sample.biome==='mountain')return fleck>.65?'gravel':'stone';
 if(fleck<dryEdge)return 'sand';if(fleck<sample.cold)return 'snow';return ['sand','snow','red_sand'].includes(def.top)?'grass':def.top;
}
