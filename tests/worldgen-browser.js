import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
import {World} from '../src/world.js?v=36';
const c=await connect(),ev=c.evaluate,w=new World(7821,[],9),sites=w.ruins.find({radius:14});
const folder=new URL('../reports/worldgen/',import.meta.url);await mkdir(folder,{recursive:true});
const scenes=Object.fromEntries(['temple','fortress','observatory','house','dungeon'].map(type=>[type,sites.find(s=>s.type===type)]));
for(const biome of['jungle','desert','mountain','snow','autumn_forest','ocean']){let closest=null;for(let x=-3200;x<=3200;x+=80)for(let z=-3200;z<=3200;z+=80){if(Math.hypot(x,z)<650)continue;const col=w.column(x,z);if(col.biome===biome&&(biome==='ocean'||col.h>7)&&(!closest||Math.hypot(x,z)<Math.hypot(closest.x,closest.z)))closest={x,y:col.h,z,biome};}scenes[biome]=closest;}
const ready=async()=>{for(let i=0;i<220;i++){if(await ev('v.chunks.size>=9&&!v.inflight&&!v.queue.length&&!v.ready.length'))return;await sleep(80);}throw Error('Streaming did not settle');};
try{
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.v=m.renderer;window.ui=m.ui;window.settings=m.settings;const {freshState}=await import('/src/save.js?v=36');g.state=freshState(7821,'creative');g.loadWorld();g.flying=true;g.screen=null;g.mobs=[];ui.render();const {applyQualityPreset}=await import('/src/settings.js?v=36');applyQualityPreset(settings,'medium');v.applySettings(settings);})()`);
 const metrics=[];
 for(const[name,site]of Object.entries(scenes)){
  assert.ok(site,name+' fixture');const radius=site.radius||18;
  await ev(`g.pos={x:${site.x+.5},y:${Math.min(90,site.y+(site.radius?radius*.5+7:11))},z:${site.z+radius+20}};g.yaw=0;g.pitch=-.3;g.vx=g.vz=g.velocity=0;g.flying=true;g.state.time=110;g.mobs=[];document.querySelector('#toasts').replaceChildren()`);await ready();await sleep(180);
  const data=await ev(`new Promise(resolve=>{let previous=performance.now(),frames=[];function sample(t){frames.push(t-previous);previous=t;if(frames.length<90)requestAnimationFrame(sample);else{frames.sort((a,b)=>a-b);resolve({median:frames[45],p95:frames[85],...v.telemetry,columns:g.world.columns.size,regions:g.world.ruins.regions.size,generatedCells:g.world.structures.size,edits:g.world.edits.size});}}requestAnimationFrame(sample);})`);
  metrics.push({name,site,...data});await writeFile(new URL(name+'.png',folder),Buffer.from((await c.send('Page.captureScreenshot')).data,'base64'));
 }
 await ev(`g.save(true)`);assert.equal(await ev('g.saveReady'),true);
 const checksum=await ev(`(async()=>{const {meshChunk}=await import('/src/mesh.js?v=36');const cx=Math.floor(g.pos.x/16),cz=Math.floor(g.pos.z/16),local=meshChunk(g.world,cx,cz);const hash=mesh=>{let n=2166136261;for(const group of Object.values(mesh))for(const values of Object.values(group)){const bytes=new Uint8Array(values.buffer);for(const b of bytes)n=Math.imul(n^b,16777619);}return n>>>0;};const worker=new Worker('/src/terrain-worker.js?v=36',{type:'module'});const remote=await new Promise((resolve,reject)=>{worker.onmessage=e=>resolve(e.data.geometry);worker.onerror=reject;worker.postMessage({type:'init',epoch:1,seed:g.world.seed,terrain:g.world.terrain,dimension:g.world.dimension,edits:[...g.world.edits]});worker.postMessage({type:'mesh',epoch:1,revision:0,cx,cz,underground:false,ambientOcclusion:true});});worker.terminate();return {main:hash(local),worker:hash(remote)};})()`);assert.equal(checksum.main,checksum.worker,'Main and worker chunk geometry must agree');
 assert.equal(await ev('v.renderer.info.programs.filter(p=>p.diagnostics&&!p.diagnostics.runnable).length'),0);assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);
 await writeFile(new URL('browser.json',folder),JSON.stringify(metrics,null,2));console.log('PASS: 11 real biome/ruin scenes streamed without missing assets or shader/runtime errors. '+JSON.stringify(metrics.map(({name,p95,drawCalls})=>({name,p95,drawCalls}))));
}finally{await c.close();}
