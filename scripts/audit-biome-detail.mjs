import {World} from '../src/world.js';
import {BIOME_DETAIL} from '../src/biome-detail.js';
import {writeFileSync} from 'node:fs';
const w=new World(7821,[],12),locations={};
for(let x=-6000;x<=6000;x+=48)for(let z=-6000;z<=6000;z+=48){const c=w.column(x,z);if(locations[c.biome]||Math.hypot(x,z)<600||c.h>65||c.biome!=='ocean'&&c.h<7)continue;locations[c.biome]={x,z,y:c.h+1};}
const rows=[];
for(const[id,p]of Object.entries(BIOME_DETAIL)){
 const loc=locations[id];if(!loc)throw Error('No location: '+id);
 w.prepare(Math.floor(loc.x/16),Math.floor(loc.z/16));
 const counts={};for(const[k,t]of w.structures){const[x,,z]=k.split(',').map(Number);if(Math.floor(x/16)===Math.floor(loc.x/16)&&Math.floor(z/16)===Math.floor(loc.z/16))counts[t]=(counts[t]||0)+1;}
 rows.push({biome:id,location:loc,profile:p,generated:counts});
}
writeFileSync('reports/upgrade-2026-09-24/biome-detail-locations.json',JSON.stringify({seed:7821,terrain:12,rows},null,2));
console.log(rows.map(r=>r.biome+': '+JSON.stringify(r.location)).join('\n'));
