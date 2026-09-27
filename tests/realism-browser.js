import assert from 'node:assert/strict';
import {mkdir,writeFile,copyFile,readFile} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
const label=process.env.REALISM_LABEL||'after',dir=new URL('../reports/realism-2026-09-27/',import.meta.url);await mkdir(dir,{recursive:true});
const c=await connect(),ev=c.evaluate,rows=[];
try{
 await c.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.v=m.renderer;const base=new URL('./',document.querySelector('script[type=module]').src),suffix=new URL(document.querySelector('script[type=module]').src).search;const {freshState}=await import(new URL('save.js'+suffix,base));g.state=freshState(7821,'creative');g.state.terrain=10;g.loadWorld();g.screen=null;g.flying=true;g.wreckTimer=Infinity;g.state.time=100;const {applyQualityPreset}=await import(new URL('settings.js'+suffix,base));applyQualityPreset(m.settings,'medium');v.applySettings();m.ui.render();g.update=()=>v.stream(g.pos);window.gameBase=base;})()`);
 const locations=await ev(`(()=>{const out={};for(let x=-1800;x<1800;x+=32)for(let z=-1800;z<1800;z+=32){const b=g.world.biome(x,z),h=g.world.height(x,z);if(!out.ocean&&b==='ocean'&&h>-12&&h<-5)out.ocean={x,z,y:0};if(!out.forest&&b==='forest'&&h>8)out.forest={x,z,y:h+2};if(!out.snow&&b==='snow'&&h>8)out.snow={x,z,y:h+6};}return out;})()`);
 for(const name of ['ocean','forest','snow']){
  assert.ok(locations[name],name);await ev(`g.pos=${JSON.stringify(locations[name])};g.yaw=.8;g.pitch=-.12;g.state.time=100;`);
  for(let i=0;i<400;i++){if(await ev('v.landingReady(g.pos)&&!v.queue.length&&!v.ready.length&&!v.inflight'))break;await sleep(100);}
  assert.equal(await ev('v.landingReady(g.pos)'),true);await sleep(2000);
  await ev('v.diagnostics.count=0;v.diagnostics.cursor=0');await sleep(5000);
  rows.push(await ev(`({name:${JSON.stringify(name)},position:g.pos,biome:g.world.biome(g.pos.x,g.pos.z),metrics:v.diagnostics.snapshot(v,g),p50:v.diagnostics.percentile(.5),p99:v.diagnostics.percentile(.99)})`));
  await c.screenshot('realism-'+label+'-'+name);await copyFile('/private/tmp/voxel-vault-realism-'+label+'-'+name+'.png',new URL(label+'-'+name+'.png',dir));
  if(label==='after'&&name!=='ocean'){
   const weather=await ev(`(async()=>{const {weatherAt}=await import(new URL('weather.js'+new URL(document.querySelector('script[type=module]').src).search,gameBase));const b=g.world.biome(g.pos.x,g.pos.z);outer:for(let dx=0;dx<16;dx++)for(let dz=0;dz<16;dz++){const x=g.pos.x+dx,z=g.pos.z+dz,y=g.world.height(x,z)+2;let clear=true;for(let h=y;h<y+25;h++)if(g.world.solid(x,h,z))clear=false;if(clear){g.pos={x,y,z};break outer;}}for(let t=40;t<10000;t+=40){const w=weatherAt(7821,t,b);if(w.intensity>.2){g.state.time=t;return w;}}return null;})()`);assert.ok(weather);await sleep(1000);
   const visible=await ev('v.scenery.weatherView.mesh.visible');assert.ok(visible,JSON.stringify({name,weather}));
   await c.screenshot('realism-'+weather.kind);await copyFile('/private/tmp/voxel-vault-realism-'+weather.kind+'.png',new URL(weather.kind+'.png',dir));rows.push({name:weather.kind,weather,visible});
  }
 }
 if(label==='after'){
  await ev(`g.pos=${JSON.stringify(locations.ocean)};g.state.time=100;g.spawnMob(g.pos.x+2,g.pos.z-4,'reef_ray',g.pos.y-1);g.yaw=0;g.pitch=-.2;`);await sleep(3000);
  assert.ok(await ev(`[...v.mobMeshes.values()].some(m=>m.userData.creature?.def.model==='ray')`));await c.screenshot('realism-ray');await copyFile('/private/tmp/voxel-vault-realism-ray.png',new URL('ray.png',dir));
 }
 const device=await ev(`(()=>{const gl=v.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {browser:navigator.userAgent,cores:navigator.hardwareConcurrency,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};})()`);
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);await writeFile(new URL(label+'.json',dir),JSON.stringify({device,rows,errors:c.errors,failed:c.failed},null,2));console.log({label,rows});
}finally{await c.close();}
