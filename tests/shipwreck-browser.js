import assert from 'node:assert/strict';
import {copyFile,writeFile} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate;
try{
 await c.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 const site=await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.v=m.renderer;const {freshState}=await import('/src/save.js?v=38'),{wreckAnchor}=await import('/src/shipwrecks.js?v=38');g.state=freshState(7821,'creative');g.state.terrain=10;g.loadWorld();g.screen=null;g.flying=true;g.state.time=100;const {applyQualityPreset}=await import('/src/settings.js?v=38');applyQualityPreset(m.settings,'medium');v.applySettings();let site;outer:for(let x=-15;x<15;x++)for(let z=-15;z<15;z++){const s=wreckAnchor(g.world,x,z);if(s&&s.y<-7){site=s;break outer;}}if(!site)throw Error('No wreck');window.site=site;g.pos={x:site.x+13,y:site.y+5,z:site.z+15};g.yaw=Math.atan2(13,15);g.pitch=-.15;g.vx=g.vy=g.vz=0;m.ui.render();return site;})()`);
 for(let i=0;i<500;i++){if(await ev('g.state.exploration.wrecks.some(w=>w.id===site.id)&&v.landingReady(g.pos)&&!v.queue.length&&!v.inflight&&!v.ready.length'))break;await sleep(100);}
 assert.equal(await ev('g.state.exploration.wrecks.some(w=>w.id===site.id)'),true);
 await sleep(1500);await c.screenshot('shipwreck');await copyFile('/private/tmp/voxel-vault-shipwreck.png',new URL('../reports/upgrade-2026-09-24/shipwreck.png',import.meta.url));
 const result=await ev(`({site,terrain:g.state.terrain,blocks:g.world.edits.size,chests:g.world.chests.filter(c=>c.id===site.id).length,performance:v.diagnostics.snapshot(v,g)})`);assert.equal(result.chests,1);assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);await writeFile(new URL('../reports/upgrade-2026-09-24/shipwreck-browser.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);
}finally{await c.close();}
