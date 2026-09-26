import assert from 'node:assert/strict';
import {writeFile,copyFile} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate,results=[];
try{
 await c.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.v=m.renderer;const {freshState}=await import('/src/save.js?v=38');g.state=freshState(7821,'creative');g.state.terrain=10;g.state.inv.diamond=17;g.state.containers['4,60,4']={wood:9};g.loadWorld();g.world.set(4,60,4,'chest');g.world.set(5,60,4,'gold_block');g.screen=null;g.flying=true;g.wreckTimer=Infinity;g.state.time=100;const {applyQualityPreset}=await import('/src/settings.js?v=38');applyQualityPreset(m.settings,'medium');v.applySettings();m.ui.render();window.originalEdits=JSON.stringify([...g.world.edits]);window.originalSeed=g.state.seed;})()`);
 const locations=await ev(`(()=>{const found={};for(let x=-1800;x<1800;x+=32)for(let z=-1800;z<1800;z+=32){const h=g.world.height(x,z),b=g.world.biome(x,z);if(!found.ocean&&b==='ocean'&&h>-12&&h<-5)found.ocean={x,z,y:8};if(!found.forest&&b==='forest'&&h>8)found.forest={x,z,y:h+2};}return found;})()`);
 for(const name of ['ocean','underwater','forest']){
  const p={...(name==='forest'?locations.forest:locations.ocean)};if(name==='underwater')p.y=0;
  await ev(`g.pos=${JSON.stringify(p)};g.yaw=.8;g.pitch=${name==='ocean'?-.35:-.12};g.vx=g.vy=g.vz=0;`);
  for(let i=0;i<400;i++){if(await ev('v.landingReady(g.pos)&&!v.queue.length&&!v.ready.length&&!v.inflight'))break;await sleep(100);}
  await sleep(2000);assert.equal(await ev('v.landingReady(g.pos)'),true);
  results.push(await ev(`({name:${JSON.stringify(name)},position:g.pos,terrain:g.state.terrain,decor:[...v.chunks.values()].flatMap(c=>c.children).filter(o=>o.userData.visualHabitat).length,aquaticInstances:[...v.chunks.values()].flatMap(c=>c.children).filter(o=>o.userData.aquatic).reduce((n,o)=>n+o.count,0),telemetry:v.diagnostics.snapshot(v,g)})`));
  await c.screenshot('visual-'+name);await copyFile('/private/tmp/voxel-vault-visual-'+name+'.png',new URL('../reports/upgrade-2026-09-24/visual-'+name+'.png',import.meta.url));
 }
 assert.equal(await ev('JSON.stringify([...g.world.edits])===originalEdits'),true);assert.equal(await ev('g.state.seed===originalSeed'),true);
 await ev("g.state.mode='adventure';g.state.inv.diamond=17;g.pause();g.save()");assert.equal(await ev('g.saveReady'),true);await c.send('Page.reload');await sleep(1500);
 const restored=await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;g.start('adventure');g.pause();return {terrain:g.state.terrain,seed:g.state.seed,diamond:g.state.inv.diamond,chest:g.world.get(4,60,4),build:g.world.get(5,60,4),contents:g.state.containers['4,60,4']};})()`);
 assert.deepEqual(restored,{terrain:10,seed:7821,diamond:17,chest:'chest',build:'gold_block',contents:{wood:9}});assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);
 await writeFile(new URL('../reports/upgrade-2026-09-24/existing-world-visuals.json',import.meta.url),JSON.stringify({results,restored,errors:c.errors,failed:c.failed},null,2));console.log({restored,scenes:results.map(r=>({name:r.name,decor:r.decor,aquatic:r.aquaticInstances}))});
}finally{await c.close();}
