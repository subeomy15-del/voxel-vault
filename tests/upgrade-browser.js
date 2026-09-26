import assert from 'node:assert/strict';
import {writeFile,copyFile} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate,label=process.env.UPGRADE_LABEL||'after',duration=Number(process.env.UPGRADE_SECONDS||120),samples=[];
const imports=`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.v=m.renderer;window.ui=m.ui;const {freshState}=await import('/src/save.js?v=38');g.state=freshState(7821,'creative');g.loadWorld();g.screen=null;g.flying=true;g.pos={x:640.5,y:84,z:640.5};g.yaw=-Math.PI/2;g.pitch=-.5;g.state.time=100;const {applyQualityPreset}=await import('/src/settings.js?v=38');applyQualityPreset(m.settings,'low');v.applySettings();ui.render();})()`;
try{
 await c.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await ev(imports);
 for(let i=0;i<400;i++){if(await ev('v.chunks.size>=9&&!v.inflight&&!v.queue.length&&!v.ready.length'))break;await sleep(100);}
 await c.screenshot('upgrade-'+label);await copyFile('/private/tmp/voxel-vault-upgrade-'+label+'.png',new URL('../reports/upgrade-2026-09-24/'+label+'.png',import.meta.url));
 const device=await ev(`(()=>{const gl=v.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');return {browser:navigator.userAgent,cores:navigator.hardwareConcurrency,gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),width:innerWidth,height:innerHeight,seed:g.state.seed,terrain:g.state.terrain,quality:v.options.quality,renderDistance:v.options.renderDistance};})()`);
 await ev("g.keys.add('KeyW');g.keys.add('ShiftLeft')");
 for(let i=0;i<duration;i++){
  await sleep(1000);
  if(i%5===0)samples.push(await ev('({...v.diagnostics.snapshot(v,g),x:g.pos.x,z:g.pos.z,origin:v.renderOrigin?{x:v.renderOrigin.x,z:v.renderOrigin.z,rebases:v.renderOrigin.rebases}:null,ready:v.ready.length,revisions:v.chunkVersions.size,columns:g.world.columns.size})'));
 }
 await ev('g.keys.clear();g.world.set(Math.floor(g.pos.x),75,Math.floor(g.pos.z),"gold_block");g.save()');await ev('g.saveReady');
 assert.ok(samples.at(-1).x>samples[0].x+100,'actual movement must continue');
 for(const s of samples){assert.ok(s.chunks<=81&&s.queued<=50&&s.ready<=2&&s.revisions<=81);}
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);
 await writeFile(new URL('../reports/upgrade-2026-09-24/'+label+'-flight.json',import.meta.url),JSON.stringify({label,seconds:duration,device,samples,errors:c.errors,failedAssets:c.failed,note:'Automated creative flight using movement keys in headless Chrome; not fresh survival progression.'},null,2));
 console.log(JSON.stringify({label,seconds:duration,device,first:samples[0],last:samples.at(-1)}));
}finally{await c.close();}
