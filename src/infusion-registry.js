export const INFUSION_TIERS=['Common','Uncommon','Rare','Epic','Relic'];
const def=(name,tags,amount,description,extra={})=>({name,tags,amount,description,maxLevel:3,weight:100,minAltar:1,exclusiveWith:[],...extra});
export const ENCHANTS={
 edge:def('Edge',['melee'],.06,'{n}% more melee damage.'),
 critical:def('Critical',['melee'],.12,'Sprint criticals deal {n}% extra damage.',{weight:55,minAltar:2}),
 swift_strike:def('Swift Strike',['melee'],.04,'{n}% shorter attack cooldown.',{exclusiveWith:['impact']}),
 impact:def('Impact',['melee','ranged'],.24,'Push targets an extra {v} blocks on impact.',{exclusiveWith:['swift_strike']}),
 execution:def('Execution',['melee'],.05,'{n}% more damage against targets below 30% health.',{weight:25,minAltar:3}),
 ashen_edge:def('Ashen Edge',['melee'],.08,'{n}% more damage to Ashen creatures.',{weight:40,minAltar:4,unlock:'ashen',exclusiveWith:['void_edge']}),
 void_edge:def('Void Edge',['melee'],.09,'{n}% more damage to Fracture creatures.',{weight:25,minAltar:5,unlock:'fracture',exclusiveWith:['ashen_edge']}),
 haste:def('Haste',['tool'],.09,'{n}% faster mining.'),
 fortune:def('Fortune',['tool'],.05,'{n}% chance for one extra natural ore drop.',{weight:55,minAltar:2}),
 momentum:def('Momentum',['tool'],.03,'Each consecutive block adds {n}% mining speed, up to five blocks.',{weight:65,minAltar:2}),
 miners_aura:def("Miner’s Aura",['tool'],.1,'{n}% bonus Vault XP from valuable natural ores.',{weight:30,minAltar:3}),
 vein_sense:def('Vein Sense',['tool'],2,'Mining ore reveals nearby ore for {v} seconds.',{weight:25,minAltar:3}),
 ward:def('Ward',['armor'],.008,'{n} percentage points of damage protection per equipped piece.'),
 recovery:def('Recovery',['armor'],.04,'{n}% faster natural recovery per equipped piece.',{minAltar:2}),
 featherstep:def('Featherstep',['boots'],.12,'{n}% less fall damage.',{minAltar:2}),
 ash_ward:def('Ash Ward',['armor'],.025,'{n}% less heat damage per equipped piece.',{minAltar:4,unlock:'ashen',exclusiveWith:['void_ward']}),
 void_ward:def('Void Ward',['armor'],.025,'{n}% less void and Fracture combat damage per piece.',{minAltar:5,unlock:'fracture',exclusiveWith:['ash_ward']}),
 power:def('Power',['ranged'],.07,'{n}% more projectile damage.'),
 velocity:def('Velocity',['ranged'],.07,'{n}% faster projectiles.'),
 quick_draw:def('Quick Draw',['ranged'],.05,'{n}% shorter bow draw and reload time.',{minAltar:2}),
 ruin_seeker:def('Ruin Seeker',['boots'],.02,'{n}% faster walking near ancient ruins.',{minAltar:2,unlock:'ruins',secret:true,weight:30}),
 ash_walker:def('Ash Walker',['boots'],.03,'{n}% faster walking in the Ashen realm.',{minAltar:4,unlock:'ashen',secret:true,weight:30}),
 void_step:def('Void Step',['boots'],.04,'{n}% stronger jump impulse in the Fracture.',{minAltar:5,unlock:'postgame',secret:true,weight:25}),
};
export const ALTARS=[
 {id:'basic_altar',name:'Basic altar',color:'#909b86',cost:{stone:8,wood:4,iron_ingot:1},odds:[[78,20,2,0,0],[45,48,7,0,0],[25,57,18,0,0]]},
 {id:'runed_altar',name:'Runed altar',color:'#8ca89e',cost:{basic_altar:1,ruin:8,gold_ingot:2},unlock:'ruins',odds:[[35,49,15,1,0],[20,45,30,5,0],[8,35,47,10,0]]},
 {id:'ancient_altar',name:'Ancient altar',color:'#b7a577',cost:{runed_altar:1,diamond:3,obsidian:4},unlock:'ruins',odds:[[12,46,37,5,0],[5,26,53,15,1],[0,9,55,33,3]]},
 {id:'ashen_altar',name:'Ashen altar',color:'#bd8663',cost:{ancient_altar:1,netherrack:16,knight_heart:2},unlock:'ashen',odds:[[0,24,55,20,1],[0,12,52,32,4],[0,5,43,45,7]]},
 {id:'fracture_altar',name:'Fracture altar',color:'#a999d6',cost:{ashen_altar:1,moonstone:12},unlock:'fracture',odds:[[0,5,48,42,5],[0,0,38,50,12],[0,0,27,53,20]]},
];
export const OFFERS=[{name:'Quiet infusion',cost:18},{name:'Deep infusion',cost:39},{name:'Resonant infusion',cost:72}];
export function itemTags(item){return item?.kind==='armor'?['armor',...(item.slot==='boots'?['boots']:[])]:item?.kind==='bow'?['ranged']:item?.kind==='sword'?['melee']:['axe','pickaxe','shovel','hoe'].includes(item?.kind)?['tool',...(item.kind==='axe'?['melee']:[])]:[];}
export function enchantUnlocked(state,key){
 if(!key)return true;
 if(key==='ruins'){
  const ruin=id=>typeof id==='string'&&(/^(?:outpost-(?:lodge|tower|ruins)$|ruin:)/.test(id)||['grove','dunes','frost'].includes(id));
  return [state,...Object.values(state.realms||{})].some(realm=>realm?.opened?.some(ruin));
 }
 return key==='ashen'&&state.fortressCleared||key==='fracture'&&(state.dimension==='ender'||!!state.realms?.ender)||key==='postgame'&&state.dragon?.defeated===true;
}
export function enchantText(id,level){const d=ENCHANTS[id];return d.description.replace('{n}',Number((d.amount*level*100).toFixed(1))).replace('{v}',Number((d.amount*level).toFixed(2)));}
export function installAltars(blocks,items,recipes){for(const a of ALTARS){blocks[a.id]={name:a.name,color:a.color,solid:true,hardness:1.6};items[a.id]={...blocks[a.id],place:true,description:'Spend Vault XP for a random equipment infusion. '+(a.unlock==='ashen'?'Awakens after defeating the Ashen fortress guardian.':a.unlock==='fracture'?'Awakens after entering the final realm.':a.unlock?'Awakens after opening a ruin chest.':'Three investment options; stronger outcomes are never guaranteed.')};recipes.push({item:a.id,cost:a.cost,station:'bench',category:'Building'});}}
