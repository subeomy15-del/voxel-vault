export function installExploration(blocks,items,recipes,smelting){
 blocks.waystone={name:'Waystone',color:'#7b9fa1',solid:true,hardness:2};
 items.waystone={...blocks.waystone,place:true,description:'Place and activate to link a safe destination in this realm. Up to 32 destinations.'};
 items.fishing_rod={name:'Riverline rod',color:'#bb9b68',kind:'fishing',description:'Aim into water and press E to cast. When the float splashes, press E again to reel in.'};
 items.river_fish={name:'Silverfin',color:'#91b7af',kind:'food',nutrition:2,saturation:1,raw:true,description:'A freshwater catch. Cook it in a furnace for a filling meal.'};
 items.sea_fish={name:'Copperback',color:'#c79464',kind:'food',nutrition:3,saturation:1,raw:true,description:'A coastal catch. Cook it for a hearty meal.'};
 items.grilled_fish={name:'Herbed fish',color:'#cda46a',kind:'food',nutrition:7,saturation:10,description:'A cooked catch: 7 food and 10 stored energy.'};
 items.grilled_sea_fish={name:'Seared copperback',color:'#b77c51',kind:'food',nutrition:8,saturation:11,description:'A rich coastal meal: 8 food and 11 stored energy.'};
 items.sea_chart={name:'Waterlogged chart',color:'#c6b78d',kind:'chart',description:'A recovered chart marking a submerged cache. Equip and use to read its coordinates.'};
 recipes.push({item:'fishing_rod',cost:{wood:3,fiber:3,iron_ingot:1},station:'bench',category:'Gear'},
  {item:'waystone',cost:{stonebrick:6,gold_ingot:2,diamond:1},station:'bench',category:'Building'});
 smelting.push({input:'river_fish',output:'grilled_fish',count:1,furnaceOnly:true},{input:'sea_fish',output:'grilled_sea_fish',count:1,furnaceOnly:true});
}
export const TRADE_OFFERS=[
 {id:'bread',item:'bread',count:4,cost:{wheat:6},stock:4},
 {id:'arrows',item:'arrows',count:12,cost:{iron_ingot:1,fiber:2},stock:4},
 {id:'herbs',item:'lavender',count:4,cost:{berries:6},stock:3},
 {id:'iron',item:'iron_ingot',count:2,cost:{cotton:12},stock:2},
 {id:'gold',item:'gold_ingot',count:1,cost:{sea_fish:6},stock:2},
 {id:'diamond',item:'diamond',count:1,cost:{gold_ingot:8},stock:1},
];
