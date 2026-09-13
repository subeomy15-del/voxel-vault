// Saved stacks and placed blocks keep their value when the ore list changes.
export const RESOURCE_ALIASES={
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
 return inv;
}
export function normalizeResources(s){
 normalizeInventory(s.inv);s.bar=s.bar.map(canonicalItem);
 for(const key of ['armor','glider','ammo'])s[key]=canonicalItem(s[key]);
 for(const bag of Object.values(s.containers||{}))normalizeInventory(bag);
 normalizeInventory(s.moonChest||{});for(const drop of s.drops||[])drop.item=canonicalItem(drop.item);
}
