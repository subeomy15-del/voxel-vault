import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {World} from '../src/world.js?v=35';
import {connect,sleep} from './cdp.js';
const w=new World(7821,[],9),scenes={},types=['badlands','conifer','cherry','autumn_forest','jungle','beach','frozen_badlands','snow','mountain','marsh','desert','meadow','forest','dense_forest','savanna','snow_plains','river','ocean'];
for(const type of types){let best=null;for(let x=-4000;x<=4000;x+=64)for(let z=-4000;z<=4000;z+=64){if(Math.hypot(x,z)<650)continue;const c=w.column(x,z);if(c.biome!==type||c.h<(['ocean','river'].includes(type)?-40:6)||c.h>66)continue;let same=0;for(const[dx,dz]of[[32,0],[-32,0],[0,32],[0,-32]])if(w.biome(x+dx,z+dz)===type)same++;if(same===4&&(!best||Math.hypot(x,z)<Math.hypot(best.x,best.z)))best={x,z,y:c.h};}assert.ok(best,type);scenes[type]=best;w.pruneCache(0,0,1);}
scenes.badlands_cliffs={x:864,z:-1440,y:w.height(864,-1440)};scenes.nearby_badlands={x:240,z:180,y:w.height(240,180)};
const sites=w.ruins.find({radius:24});for(const type of['fortress','mine','swamp_hut','outpost','temple']){const site=sites.find(s=>s.type===type);if(site)scenes[type]=site;}
const c=await connect(),folder=new URL('../reports/regions/',import.meta.url);await mkdir(folder,{recursive:true});
try{
 await c.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 await c.evaluate(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.v=m.renderer;window.ui=m.ui;const {freshState}=await import('/src/save.js?v=35');g.state=freshState(7821,'creative');g.loadWorld();g.screen='pause';g.state.time=110;g.mobs=[];ui.render();const {applyQualityPreset}=await import('/src/settings.js?v=35');applyQualityPreset(m.settings,'medium');v.applySettings(m.settings);const style=document.createElement('style');style.textContent='body>*:not(#world){visibility:hidden!important}';document.head.append(style);})()`);
 const results=[];
 for(const[name,s]of Object.entries(scenes)){
  await c.evaluate(`(()=>{const x=${s.x+.5},z=${s.z+(s.radius||12)+18},y=Math.min(94,Math.max(${Math.max(4,s.y)+(s.radius?12:8)},g.world.ground(x,z)+3));g.pos={x,y,z};g.yaw=0;g.pitch=Math.atan2(${s.y+3}-y-1.58,z-(${s.z}));g.state.time=110;v.stream(g.pos)})()`);
  assert.equal(await c.evaluate('g.world.intersects(g.pos.x,g.pos.y,g.pos.z)'),false,name+' camera must be outside terrain');
  let settled=false;for(let i=0;i<400;i++){if(await c.evaluate('!v.inflight&&!v.queue.length&&!v.ready.length&&v.chunks.size>40')){settled=true;break;}await sleep(50);}assert.ok(settled,name+' streaming');await sleep(450);
  await writeFile(new URL(name+'.png',folder),Buffer.from((await c.send('Page.captureScreenshot')).data,'base64'));
  results.push({name,site:s,...await c.evaluate('({...v.telemetry,biome:g.world.biome(g.pos.x,g.pos.z)})')});
 }
 // The worker must generate exactly the same blocks/mesh as player collision uses.
 const parity=await c.evaluate(`(async()=>{const {meshChunk}=await import('/src/mesh.js?v=35');const cx=Math.floor(g.pos.x/16),cz=Math.floor(g.pos.z/16);const sum=m=>{let h=2166136261;for(const g of Object.values(m))for(const a of Object.values(g))for(const b of new Uint8Array(a.buffer))h=Math.imul(h^b,16777619);return h>>>0;};const worker=new Worker('/src/terrain-worker.js?v=35',{type:'module'});const remote=await new Promise((resolve,reject)=>{worker.onmessage=e=>resolve(e.data.geometry);worker.onerror=reject;worker.postMessage({type:'init',epoch:1,seed:g.world.seed,terrain:g.world.terrain,dimension:'overworld',edits:[...g.world.edits]});worker.postMessage({type:'mesh',epoch:1,revision:0,cx,cz,ambientOcclusion:true});});worker.terminate();return [sum(meshChunk(g.world,cx,cz)),sum(remote)];})()`);assert.equal(...parity);
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);await writeFile(new URL('browser.json',folder),JSON.stringify(results,null,2));console.log('PASS: '+results.length+' streamed regional scenes, worker parity, zero console errors or failed assets');
}finally{await c.close();}
