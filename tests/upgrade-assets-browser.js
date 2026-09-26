import assert from 'node:assert/strict';
import {writeFile,copyFile} from 'node:fs/promises';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate,root=new URL('../reports/upgrade-2026-09-24/',import.meta.url);
try{
 const result=await ev(`(async()=>{const src=document.querySelector('script[type=module]').src,{ITEMS}=await import(new URL('data.js?v=38',src)),{itemAssetPath}=await import(new URL('item-assets.js?v=38',src)),names=Object.keys(ITEMS).sort(),canvas=document.createElement('canvas'),cols=12,w=96,h=66;canvas.width=cols*w;canvas.height=Math.ceil(names.length/cols)*h;const ctx=canvas.getContext('2d');ctx.fillStyle='#1f292d';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;ctx.font='8px monospace';const missing=[],sizes={};for(let i=0;i<names.length;i++){const name=names[i],img=new Image(),x=i%cols*w,y=Math.floor(i/cols)*h;img.src=new URL(itemAssetPath(name),src);try{await img.decode();ctx.drawImage(img,x+32,y+3,32,32);sizes[img.naturalWidth+'x'+img.naturalHeight]=(sizes[img.naturalWidth+'x'+img.naturalHeight]||0)+1;}catch{missing.push(name);}ctx.fillStyle='#edf1e9';ctx.fillText(name.slice(0,18),x+3,y+47);if(name.length>18)ctx.fillText(name.slice(18),x+3,y+58);}return {count:names.length,missing,sizes,png:canvas.toDataURL('image/png').split(',')[1]};})()`);
 await writeFile(new URL('icon-contact-sheet.png',root),Buffer.from(result.png,'base64'));delete result.png;await writeFile(new URL('icon-assets.json',root),JSON.stringify(result,null,2));assert.deepEqual(result.missing,[]);
 await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.v=m.renderer;g.start('creative',true);g.pos={x:268435456.5,y:0,z:-268435455.5};g.pos.y=g.world.height(g.pos.x,g.pos.z)+10;g.flying=true;g.yaw=.6;g.pitch=-.35;g.state.time=100;m.ui.render();})()`);
 for(let i=0;i<400;i++){if(await ev('v.chunks.size>=9&&!v.inflight&&!v.queue.length&&!v.ready.length'))break;await sleep(100);}
 assert.equal(await ev('v.landingReady(g.pos)'),true);assert.ok(await ev('Math.abs(v.renderOrigin.x)>1e8'));
 const position=await ev('({...g.pos})');await ev('g.save()');assert.equal(await ev('g.saveReady'),true);
 await c.screenshot('upgrade-far');await copyFile('/private/tmp/voxel-vault-upgrade-far.png',new URL('far-origin.png',root));
 await c.send('Page.reload');await sleep(1000);await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;g.start('creative');g.pause();})()`);
 assert.equal(await ev('g.pos.x'),position.x);assert.equal(await ev('g.pos.z'),position.z);
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);console.log('PASS: '+JSON.stringify(result)+'; far render origin and absolute save position survive reload.');
}finally{await c.close();}
