import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {connect,sleep} from '../tests/cdp.js?v=35';
const minutes=Number(process.argv[2]||30),c=await connect(),ev=c.evaluate,samples=[],started=Date.now();
try{
 await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.v=m.renderer;window.ui=m.ui;g.start('creative',true);g.flying=true;g.state.time=100;g.mobs=[];ui.render();const {applyQualityPreset}=await import('/src/settings.js?v=35');applyQualityPreset(m.settings,'low');v.applySettings();window.soakEdits=[];})()`);
 for(let i=0;Date.now()-started<minutes*60000;i++){
  await ev(`(()=>{for(const key of soakEdits)g.world.edits.delete(key);soakEdits=[];const x=${i%80*32+600},z=${Math.floor(i/80)%8*96+700},y=g.world.height(x,z)+8;g.pos={x,y,z};g.vx=g.vz=g.velocity=0;g.flying=true;g.mobs=[];for(let n=0;n<8;n++)g.spawnMob(x+(n%4)*2,z-4-Math.floor(n/4)*2,['deer','rabbit','zombie','skeleton','draugr_knight','guardian','spider','pig'][n],y);for(let n=0;n<3;n++){const key=[x+n,y-4,z].join(',');g.world.set(x+n,y-4,z,'stone');soakEdits.push(key);}v.burst(x,y,z,'#d6b77a',90);v.firework(x,y+3,z);})()`);
  await sleep(5000);
  const sample=await ev(`({geometries:v.renderer.info.memory.geometries,textures:v.renderer.info.memory.textures,models:v.mobMeshes.size,pool:v.mobPool.count,geometryCache:v.geometryCache.entries.size,chunks:v.chunks.size,queue:v.queue.length,columns:g.world.columns.size,regions:g.world.ruins.regions.size,particles:v.particles.count,dom:document.querySelectorAll('*').length,heap:performance.memory?.usedJSHeapSize||0})`);
  samples.push({elapsedSeconds:(Date.now()-started)/1000,...sample});
  assert.ok(sample.pool<=32&&sample.models<=10&&sample.chunks<=81&&sample.particles<=112&&sample.regions<100&&sample.columns<100000,JSON.stringify(sample));
  if(i%12===0){await writeFile(new URL('../reports/soak-progress.json',import.meta.url),JSON.stringify({minutes,samples},null,2));console.log(`Soak ${(Date.now()-started)/60000|0}/${minutes} min: ${sample.geometries} geometries, ${sample.textures} textures, ${sample.chunks} chunks`);}
 }
 const stable=samples.slice(Math.min(12,Math.floor(samples.length/3))),first=stable[0],last=stable.at(-1);
 assert.ok(last.textures<=first.textures+4,'Texture growth');assert.ok(last.geometries<=first.geometries+160,'Geometry growth');assert.ok(last.dom<=first.dom+25,'DOM growth');
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);
 await writeFile(new URL('../reports/soak.json',import.meta.url),JSON.stringify({minutes,elapsedSeconds:(Date.now()-started)/1000,samples,errors:c.errors,failedAssets:c.failed},null,2));
 console.log(`PASS: ${minutes} minute real-time travel/build/particle/model resource soak`);
}finally{await c.close();}
