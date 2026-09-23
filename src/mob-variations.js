export const MOB_VARIATIONS=Object.freeze({
 cow:['default','cream'],sheep:['default','black','red','orange','pink','purple','yellow','blue','brown','cyan','gray','green','lightBlue','lightGray','lime','magenta'],
 horse:['default','black','brown','cream'],cave_golem:['default','iron'],
 draugr_zombie:['default','longHairChestplate','longHairClothed','shortHairClothed'],
 frost_zombie:['default','longHairChestplate','shortHairClothed'],
 wolf:['default','white','brown','grey','spectral'],wildcat:['default','tabby','grey','black','calico','siamese','leopard'],
 draugr_huntress:['default','chainmail'],stalker:['default','crimson','frost','void'],
 npc:['default','emma','leo','isabel','sanjay','imara','enoch','sara','carmen']
});
const colors={cream:'#eee0b9',black:'#303640',red:'#c6463c',orange:'#e48b3b',pink:'#e7a7c2',purple:'#8657ba',yellow:'#ead568',blue:'#4b76c3',brown:'#865a3f',cyan:'#55b7bd',gray:'#8a9297',green:'#52874b',lightBlue:'#9acee4',lightGray:'#bec7ca',lime:'#a3cd4f',magenta:'#c15cac',white:'#edf2e6',grey:'#8b9399',spectral:'#aacfd7',iron:'#a5b2b7',tabby:'#b39364',calico:'#cfbda4',siamese:'#c3b796',leopard:'#d2ae62',chainmail:'#99aab3',crimson:'#b94754',frost:'#badde9',void:'#71568d',emma:'#d4a9a0',leo:'#b9a069',isabel:'#caa799',sanjay:'#a87b59',imara:'#865d49',enoch:'#ba926c',sara:'#d9b49a',carmen:'#b78161'};
export const validVariation=(kind,value)=>(MOB_VARIATIONS[kind]||['default']).includes(value)?value:'default';
export const variationColor=(mob,fallback)=>colors[validVariation(mob.kind,mob.variation)]||fallback;
