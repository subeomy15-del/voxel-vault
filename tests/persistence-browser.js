import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate;
const imports=`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.ui=m.ui;window.v=m.renderer;})()`;
try{
 const fixture=await readFile(new URL('./fixtures/pre-upgrade-v31.json',import.meta.url),'utf8');
 await ev(`localStorage.setItem('voxel-vault-v2-adventure',${JSON.stringify(fixture)})`);await c.send('Page.reload');await sleep(800);await ev(imports);
 assert.equal(await ev('!!g.storage.worker'),true,'IndexedDB save worker must start');
 assert.equal(await ev('g.state.inv.diamond'),13);assert.equal(await ev('g.world.edits.get("300,39,-201")'),null);
 const legacy=await ev(`localStorage.getItem('voxel-vault-v2-adventure')`),realmEdits=await ev('JSON.stringify(Object.fromEntries(Object.entries(g.state.realms).map(([d,r])=>[d,r.edits])))');
 assert.equal(await ev('g.save();g.saveReady'),true);assert.equal(await ev(`localStorage.getItem('voxel-vault-v2-adventure')`),legacy,'Migration keeps the original localStorage save');
 await ev(`for(let i=0;i<100000;i++)g.world.edits.set((1000+i%1000)+',40,'+Math.floor(i/1000),'stonebrick');g.save()`);
 assert.equal(await ev('g.saveReady'),true);
 const timings=await ev(`(async()=>{const samples=[];for(let i=0;i<10;i++){g.world.edits.set('1000,40,0',i%2?'plank':null);const t=performance.now();g.save();samples.push(performance.now()-t);await g.saveReady;}return {samples,status:g.saveStatus,edits:g.world.edits.size};})()`);
 assert.ok(timings.samples.every(t=>t<8),JSON.stringify(timings));assert.equal(timings.status.status,'saved');
 await ev(`g.world.edits.set('1000,40,0',null);g.state.inv.diamond=29;g.save()`);await ev('g.saveReady');
 await c.send('Page.reload');await sleep(1000);await ev(imports);assert.equal(await ev('g.state.inv.diamond'),29);assert.equal(await ev(`g.world.edits.has('1000,40,0')&&g.world.edits.get('1000,40,0')===null`),true);
 assert.equal(await ev(`g.state.containers['301,40,-201'].diamond`),4);assert.equal(await ev(`g.state.realms.nether.edits.length>0&&g.state.realms.ender.edits.length>0`),true);
 assert.equal(await ev('JSON.stringify(Object.fromEntries(Object.entries(g.state.realms).map(([d,r])=>[d,r.edits])))'),realmEdits,'Active realm updates must not overwrite saved realm snapshots');
 const before=await ev('g.state.seed');await assert.rejects(()=>ev(`ui.importWorldBackup('{broken')`),/valid JSON/);assert.equal(await ev('g.state.seed'),before);
 await writeFile('/private/tmp/voxel-vault-persistence.json',JSON.stringify(timings,null,2));
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);console.log('PASS: legacy migration, original backup retained, 100k incremental edits, <8 ms save requests, explicit air, all realm snapshots, reload and rejected corrupt import. '+JSON.stringify(timings));
}finally{await c.close();}
