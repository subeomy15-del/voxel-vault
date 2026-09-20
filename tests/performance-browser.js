import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate,results=[];
try{
 for(const touch of [false,true]){
  await c.send('Emulation.setDeviceMetricsOverride',{width:touch?390:1920,height:touch?844:1080,deviceScaleFactor:touch?2:1,mobile:touch});
  await c.send('Emulation.setTouchEmulationEnabled',{enabled:touch});
  await c.send('Emulation.setCPUThrottlingRate',{rate:touch?4:1});
  await c.send('Page.reload',{ignoreCache:true});
  for(let i=0;i<100;i++){if(await ev('!!document.querySelector(".block-lobby")'))break;await sleep(100);}
  await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.v=m.renderer;window.settings=m.settings;window.ui=m.ui;g.start('creative',true);g.pos={x:.5,y:7,z:20.5};g.yaw=0;g.pitch=0;g.flying=true;g.mobs=[];g.state.time=110;ui.render();})()`);
  assert.equal(await ev('settings.quality'),'auto');assert.equal(await ev('v.options.quality'),touch?'low':'medium');
  for(const quality of touch?['auto']:['low','medium','high','auto']){
   await ev(`(async()=>{const {applyQualityPreset}=await import('/src/settings.js?v=34');applyQualityPreset(settings,'${quality}');v.applySettings();})()`);
   for(let i=0;i<220;i++){if(await ev('!v.queue.length&&!v.inflight&&!v.ready.length&&v.chunks.size>=9'))break;await sleep(70);}
   const metrics=await ev(`new Promise(resolve=>{let previous=performance.now(),samples=[];function frame(t){samples.push(t-previous);previous=t;if(samples.length<150)requestAnimationFrame(frame);else{samples.sort((a,b)=>a-b);resolve({p95:samples[142],median:samples[75],...v.telemetry,casters:[...v.chunks.values()].reduce((n,g)=>n+g.children.filter(m=>m.castShadow).length,0),geometries:v.renderer.info.memory.geometries,textures:v.renderer.info.memory.textures});}}requestAnimationFrame(frame);})`);
   assert.ok(metrics.p95<(touch?34:20),`${quality} ${touch?'touch':'desktop'} p95 ${metrics.p95}`);
   assert.ok(metrics.casters<=22,'Terrain shadows must remain local');if(touch)assert.equal(metrics.pixelRatio,1);
   results.push({touch,requested:quality,...metrics});
  }
 }
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);
 await writeFile(new URL('../reports/phase3-frames.json',import.meta.url),JSON.stringify(results,null,2));
 console.log('PASS: fresh Auto, live quality changes, bounded shadows, desktop and CPU-throttled touch frame budgets. '+JSON.stringify(results.map(({touch,requested,p95,drawCalls,casters})=>({touch,requested,p95,drawCalls,casters}))));
}finally{await c.close();}
