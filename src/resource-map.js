// Saved stacks and placed blocks keep their value when the ore list changes.
export const RESOURCE_ALIASES={
 relic_forge:'stonebrick',relic_shard:'iron_ingot',forge_seal:'diamond',grappling_hook:'iron_pickaxe',ruby_blade:'diamond_sword',sapphire_blade:'diamond_sword',warhammer:'iron_sword',vanguard_armor:'diamond_armor',storm_glider:'diamond_glider',starfall_bow:'diamond_bow',dawnblade:'diamond_sword',aegis_armor:'diamond_armor',seraph_glider:'diamond_glider',sacred_orb:'moonstone_orb',
 crystal:'diamond',copper:'iron',ruby:'diamond',sapphire:'diamond',emerald:'diamond',violet_crystal:'moonstone',
 copper_ingot:'iron_ingot',copper_block:'iron_block',ruby_block:'diamond_block',sapphire_block:'diamond_block',emerald_block:'diamond_block',
 copper_pickaxe:'iron_pickaxe',copper_axe:'iron_axe',copper_sword:'iron_sword',copper_armor:'armor',
 crystal_sword:'diamond_sword',crystal_pickaxe:'diamond_pickaxe',crystal_armor:'diamond_armor',
 ruby_pickaxe:'diamond_pickaxe',emerald_axe:'diamond_axe',sapphire_shovel:'diamond_shovel',
 coal_glider:'hang_glider',copper_glider:'iron_glider',crystal_glider:'diamond_glider'
};
export const canonicalItem=name=>RESOURCE_ALIASES[name]||name;
export function normalizeInventory(inv){
 for(const[from,to]of Object.entries(RESOURCE_ALIASES))if(Object.hasOwn(inv,from)){const n=inv[from];if(Number.isFinite(n)&&n>0)inv[to]=(inv[to]||0)+n;delete inv[from];}
 for(const [old,tier]of Object.entries({armor:'iron',gold_armor:'gold',diamond_armor:'diamond',moonstone_armor:'moonstone'}))if(inv[old]>0){for(const slot of ['helm','chestplate','gauntlets','leggings','boots'])inv[tier+'_'+slot]=(inv[tier+'_'+slot]||0)+inv[old];delete inv[old];}
 return inv;
}
export function normalizeResources(s){
 const oldArmor=canonicalItem(s.armor),tier={armor:'iron',gold_armor:'gold',diamond_armor:'diamond',moonstone_armor:'moonstone'}[oldArmor];
 normalizeInventory(s.inv);s.bar=s.bar.map(k=>{const n=canonicalItem(k);return {armor:'iron_chestplate',gold_armor:'gold_chestplate',diamond_armor:'diamond_chestplate',moonstone_armor:'moonstone_chestplate'}[n]||n;});
 s.armorParts??={};if(tier){for(const slot of ['helm','chestplate','gauntlets','leggings','boots'])if(s.inv[tier+'_'+slot]>0&&!s.armorParts[slot])s.armorParts[slot]=tier+'_'+slot;s.armor=null;}
 for(const key of ['armor','glider','ammo'])s[key]=canonicalItem(s[key]);
 for(const bag of Object.values(s.containers||{}))normalizeInventory(bag);
 normalizeInventory(s.moonChest||{});for(const drop of s.drops||[])drop.item=canonicalItem(drop.item);
}
