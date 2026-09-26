import assert from 'node:assert/strict';
import {copyFile,writeFile} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate,results=[];
try{
 await c.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.v=m.renderer;const {freshState}=await import('/src/save.js?v=38');g.state=freshState(7821,'creative');g.loadWorld();g.screen=null;g.flying=true;g.state.time=100;const {applyQualityPreset}=await import('/src/settings.js?v=38');applyQualityPreset(m.settings,'low');v.applySettings();m.ui.render();})()`);
 for(const [name,x,y,z,pitch]of[['jungle',-5000,46,-3176,-.45],['marsh',-4840,8,1144,-.25],['seabed',-5000,-2,1112,-.25]]){
  await ev(`g.pos={x:${x},y:${y},z:${z}};g.pitch=${pitch};g.yaw=.5;g.vx=0;g.vy=0;g.vz=0;g.mobs=[];g.aquaticTimer=3;`);
  for(let i=0;i<400;i++){if(await ev('v.landingReady(g.pos)&&!v.inflight&&!v.queue.length&&!v.ready.length'))break;await sleep(100);}
  await sleep(4500);
  const r=await ev(`({name:${JSON.stringify(name)},position:{...g.pos},biome:g.world.biome(g.pos.x,g.pos.z),ready:v.landingReady(g.pos),fish:g.mobs.filter(m=>['river_fish','tropical_fish','pufferfish'].includes(m.kind)).length,chunks:v.chunks.size})`);assert.ok(r.ready);results.push(r);
  if(name==='seabed'){
   await ev(`(()=>{const fish=g.mobs.find(m=>['river_fish','tropical_fish','pufferfish'].includes(m.kind));if(fish){g.pos={x:fish.x+3,y:fish.y-1.4,z:fish.z+6};g.yaw=Math.atan2(3,6);g.pitch=0;g.vx=g.vy=g.vz=0;}})()`);await sleep(300);

  }
  await c.screenshot('ecology-'+name);await copyFile('/private/tmp/voxel-vault-ecology-'+name+'.png',new URL('../reports/upgrade-2026-09-24/ecology-'+name+'.png',import.meta.url));
 }
 assert.ok(results.at(-1).fish>0,'real aquatic spawning');assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);
 await writeFile(new URL('../reports/upgrade-2026-09-24/ecology.json',import.meta.url),JSON.stringify({results,errors:c.errors,failed:c.failed},null,2));console.log(results);
}finally{await c.close();}
