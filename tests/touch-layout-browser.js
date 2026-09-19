import assert from 'node:assert/strict';
import {connect,sleep} from './cdp.js';
const c=await connect(),ev=c.evaluate;
try{
 await c.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 for(const width of [320,390,768,1440]){
  await c.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:width<768?2:1,mobile:width<768});
  await ev(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.ui=m.ui;ui.touch=true;if(g.screen==='menu')g.start('creative',true);g.add('firecracker',5);g.state.glider='hang_glider';g.state.inv.hang_glider=1;g.screen=null;ui.render();ui.hud();})()`);
  for(let i=0;i<120;i++){if(await ev("document.querySelector('#loading').hidden"))break;await sleep(100);}await sleep(180);
  const bounds=await ev(`(()=>{const a=document.querySelector('[data-touch=firecracker]').getBoundingClientRect(),b=document.querySelector('[data-touch=glide]').getBoundingClientRect();return {a:{x:a.x,y:a.y,w:a.width,h:a.height},b:{x:b.x,y:b.y,w:b.width,h:b.height},width:innerWidth,height:innerHeight};})()`);
  for(const b of [bounds.a,bounds.b])assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=bounds.width+1&&b.y+b.h<=bounds.height+1,JSON.stringify(bounds));
  assert.ok(bounds.a.x+bounds.a.w<=bounds.b.x||bounds.b.x+bounds.b.w<=bounds.a.x||bounds.a.y+bounds.a.h<=bounds.b.y||bounds.b.y+bounds.b.h<=bounds.a.y,'Touch actions overlap');
  const before=await ev('g.state.inv.firecracker');await ev('g.firecrackerCooldown=0');const p={x:bounds.a.x+bounds.a.w/2,y:bounds.a.y+bounds.a.h/2,id:1};assert.equal(await ev(`document.elementFromPoint(${p.x},${p.y})?.dataset.touch`),'firecracker','Boost must not be covered at '+width);
  await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(50);assert.equal(await ev('g.state.inv.firecracker'),before-1);
  await ev(`ui.action('inventory');ui.refreshItems()`);assert.ok(await ev('document.documentElement.scrollWidth<=innerWidth+1'),'Inventory overflow at '+width);
  if(width===390)await c.screenshot('release-mobile-inventory');
 }
 assert.deepEqual(c.errors,[]);assert.deepEqual(c.failed,[]);console.log('PASS: 320/390/768/1440 layouts and real touch quick boost.');
}finally{await c.close();}
