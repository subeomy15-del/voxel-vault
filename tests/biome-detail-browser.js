import assert from 'node:assert/strict';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
const report=JSON.parse(await readFile(new URL('../reports/upgrade-2026-09-24/biome-detail-locations.json',import.meta.url))),c=await connect(),ev=c.evaluate,results=[];
try{
 await c.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.v=m.renderer;const {freshState}=await import('/src/save.js?v=38');g.state=freshState(7821,'creative');g.loadWorld();g.screen=null;g.flying=true;g.state.time=100;const {applyQualityPreset}=await import('/src/settings.js?v=38');applyQualityPreset(m.settings,'medium');v.applySettings();m.ui.render();})()`);
 for(const id of ['bluebell_forest','many_cactus_desert','snow_cedar','flower_meadow','cherry']){
  const p=report.rows.find(r=>r.biome===id).location;
  await ev(`(()=>{let p=${JSON.stringify(p)};outer:for(let dx=0;dx<12;dx++)for(let dz=0;dz<12;dz++){const x=p.x+dx+.5,z=p.z+dz+.5,y=g.world.height(Math.floor(x),Math.floor(z))+1;if(!g.world.intersects(x,y,z,1.8,.4)){p={x,y,z};break outer;}}g.pos=p;g.vx=g.vy=g.vz=0;g.yaw=.6;g.pitch=-.1;})()`);
  for(let i=0;i<400;i++){if(await ev('v.landingReady(g.pos)&&!v.inflight&&!v.queue.length&&!v.ready.length'))break;await sleep(100);}
  await sleep(1500);
  const row=await ev(`({id:${JSON.stringify(id)},biome:g.world.biome(g.pos.x,g.pos.z),position:g.pos,ready:v.landingReady(g.pos),performance:v.diagnostics.snapshot(v,g)})`);assert.ok(row.ready);results.push(row);
  await c.screenshot('biome-'+id);await copyFile('/private/tmp/voxel-vault-biome-'+id+'.png',new URL('../reports/upgrade-2026-09-24/biome-'+id+'.png',import.meta.url));
 }
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);
 await writeFile(new URL('../reports/upgrade-2026-09-24/biome-detail-browser.json',import.meta.url),JSON.stringify({results,errors:c.errors,failed:c.failed},null,2));console.log(results.map(r=>({id:r.id,ready:r.ready,biome:r.biome})));
}finally{await c.close();}
