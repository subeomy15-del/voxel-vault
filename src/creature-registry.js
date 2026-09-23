const creature=(name,model,behavior,hp,speed,damage,color,extra={})=>Object.freeze({name,model,behavior,hp,speed,damage,color,xp:Math.round(12+hp*.4),glow:'#d1d8c3',height:1.9,radius:.4,drops:{coal:[1,2]},...extra});
export const NEW_ANIMALS={
 camel:creature('Camel','camel','graze',26,1.4,0,'#d4ad72',{passive:true,height:2.2,radius:.5,flee:5,food:['wheat','apple'],drops:{leather:[1,2]}}),
 npc:creature('NPC','undead','graze',20,0,0,'#cda583',{passive:true,height:1.9,flee:0,food:[],drops:{}}),
 mob_67:creature('67','ape','graze',24,1.2,0,'#589dc5',{passive:true,height:1.9,flee:4,food:['apple'],drops:{}}),
 bobino_musculino:creature('Bobino Musculino','ape','graze',24,1.4,0,'#b77b50',{passive:true,height:1.9,flee:4,food:['apple'],drops:{}}),
 capitano_explovissimo:creature('Capitano Explovissimo','reaver','graze',24,1.3,0,'#557ba5',{passive:true,height:1.9,flee:4,food:['apple'],drops:{}}),
 horse:creature('Horse','horse','graze',22,1.6,0,'#9b7958',{passive:true,height:1.9,radius:.48,flee:7,food:['apple','wheat'],drops:{leather:[1,2]}}),
 stag:creature('Stag','stag','graze',20,1.4,0,'#9c7854',{passive:true,height:2.25,flee:6,food:['wheat','carrot'],drops:{raw_venison:[2,3],leather:[1,2]}}),
 gold_watermelon_stag:creature('Gold Watermelon Stag','stag','graze',24,1.7,0,'#b49a4e',{passive:true,height:2.25,flee:7,food:['watermelon'],glow:'#e0cf77',rare:true,drops:{watermelon:[2,3],gold_ingot:[1,1]}})
};
export const CREATURES={
 wolf:creature('Wolf','wolf','lunge',18,2.5,3,'#8a9290',{height:1.05,drops:{leather:[1,1]}}),
 wildcat:creature('Wildcat','cat','lunge',14,3.1,3,'#b69a67',{height:1.05,drops:{leather:[1,1]}}),
 bear:creature('Bear','bear','heavy',38,1.5,6,'#76634e',{height:1.7,radius:.6,drops:{raw_venison:[2,3],leather:[2,3]}}),
 gorilla:creature('Gorilla','ape','heavy',34,1.8,5,'#60615a',{height:1.9,radius:.55,drops:{fiber:[3,5],apple:[1,2]}}),
 slime:creature('Slime','slime','hop',10,1.3,2,'#88aa6c',{height:.75,radius:.45,drops:{fiber:[1,2]}}),
 spirit_golem:creature('Spirit Golem','golem','heavy',42,1.3,5,'#8ba99f',{spirit:true,height:2.2,radius:.6,drops:{diamond:[1,1]}}),
 spirit_wolf:creature('Spirit Wolf','wolf','lunge',22,2.8,4,'#9fbab5',{spirit:true,height:1.05,drops:{coal:[2,3],fiber:[2,3]}}),
 spirit_bear:creature('Spirit Bear','bear','heavy',42,1.6,6,'#91aaa9',{spirit:true,height:1.7,radius:.6,drops:{iron_ingot:[1,2]}}),
 spirit_stag:creature('Spirit Stag','stag','lunge',28,2.6,4,'#b1c4b0',{spirit:true,height:2.25,drops:{gold_ingot:[1,1]}}),
 spirit_gorilla:creature('Spirit Gorilla','ape','heavy',38,2,5,'#9aafbc',{spirit:true,height:1.9,drops:{iron_ingot:[1,2]}}),
 cave_golem:creature('Cave Golem','golem','heavy',40,1.1,6,'#858c85',{height:2.2,radius:.6,drops:{iron_ingot:[1,2]}}),
 draugr_zombie:creature('Draugr Zombie','undead','melee',26,1.7,4,'#707b66',{drops:{coal:[2,3]}}),
 draugr_skeleton:creature('Draugr Skeleton','archer','ranged',22,1.8,4,'#b8b19b',{drops:{arrows:[4,8]}}),
 draugr_huntress:creature('Draugr Huntress','hunter','ranged',24,2.3,4,'#788679',{range:16,drops:{arrows:[5,9],leather:[1,1]}}),
 draugr_warper:creature('Draugr Warper','warper','warp',24,1.7,4,'#887e98',{drops:{gold_ingot:[1,1],coal:[2,3]}}),
 draugr_reaver:creature('Draugr Reaver','reaver','heavy',40,1.8,6,'#717a7b',{drops:{iron_ingot:[1,2],knight_heart:[1,1]}}),
 frost_golem:creature('Frost Golem','golem','heavy',42,1.1,6,'#adc5ce',{height:2.2,radius:.6,drops:{frost_arrows:[4,7]}}),
 frost_zombie:creature('Frost Zombie','undead','melee',25,1.6,4,'#a0b5b5',{drops:{coal:[2,3]}}),
 frost_skeleton:creature('Frost Skeleton','archer','ranged',22,1.7,4,'#c4d7dc',{drops:{frost_arrows:[3,6]}}),
 frost_wraith:creature('Frost Wraith','wraith','ranged',19,2,4,'#a9cbd8',{spirit:true,height:1.7,drops:{frost_arrows:[3,5]}}),
 magma_golem:creature('Magma Golem','golem','heavy',44,1.2,6,'#69534a',{height:2.2,radius:.6,glow:'#e9a45b',drops:{iron_ingot:[2,3],coal:[3,5]}}),
 crone:creature('Crone','crone','ranged',25,1.4,4,'#7c806c',{range:13,drops:{mushroom:[2,3],fiber:[2,4]}})
};
// No new guardians: the existing storyline guardian is the only guardian definition.
export function creatureSpawn(world,x,y,z,serial,time){
 const biome=world.biomeAtHeight(x,y,z),night=time%600>330,index=Math.abs(serial);
 if(world.dimension==='nether')return ['stalker','magma_golem','crone'][index%3];
 if(world.dimension==='ender')return ['enderling','void_archer','spirit_golem'][index%3];
 if(biome==='deep_cave')return ['cave_golem','magma_golem','slime','draugr_warper'][index%4];
 if(biome==='cave')return ['slime','cave_golem','draugr_zombie','draugr_skeleton'][index%4];
 if(['snow','snow_plains','frozen_badlands'].includes(biome))return ['frost_zombie','frost_skeleton','frost_golem','frost_wraith'][index%4];
 if(biome==='spectral_forest')return ['spirit_wolf','spirit_bear','spirit_stag','spirit_gorilla','spirit_golem'][index%5];
 if(biome==='badlands')return ['draugr_skeleton','draugr_knight','draugr_knight','draugr_huntress','draugr_reaver','draugr_warper'][index%6];
 if(night&&index%13===0)return biome==='jungle'?'spirit_gorilla':biome==='mountain'?'spirit_golem':['spirit_wolf','spirit_bear','spirit_stag'][Math.floor(index/13)%3];
 const list=biome==='jungle'?['gorilla','wildcat','draugr_huntress']:biome==='marsh'?['slime','crone','spider']:(['forest','conifer','dense_forest'].includes(biome)||biome.endsWith('_forest'))?['wolf','bear','draugr_zombie','draugr_skeleton']:['zombie','skeleton','stalker'];
 return list[index%list.length];
}
