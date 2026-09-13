import { connect,sleep } from './cdp.js';
const c=await connect();
try{
 if(process.argv.includes('--close')){await c.send('Browser.close');process.exit(0);}
 await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await c.evaluate(`(async()=>{const m=await import('/src/main.js?v=16');window.g=m.game;window.v=m.renderer;window.ui=m.ui;})()`);
 await c.evaluate(`g.screen='menu';ui.render()`);await sleep(1500);await c.screenshot('menu-final');
 console.log(await c.evaluate(`({screen:g?.screen,chunks:v?.chunks.size,drawCalls:v?.renderer.info.render.calls,triangles:v?.renderer.info.render.triangles,loading:document.querySelector('#loading').textContent,body:document.body.innerText.slice(0,100)})`));
 console.log('Frame timing:',await c.evaluate(`new Promise(resolve=>{let last=performance.now(),frames=[];function tick(now){frames.push(now-last);last=now;if(frames.length<120)requestAnimationFrame(tick);else{frames.sort((a,b)=>a-b);resolve({medianMs:frames[60],p95Ms:frames[114],drawCalls:v.renderer.info.render.calls,triangles:v.renderer.info.render.triangles,visibleChests:[...v.chestMeshes.values()].every(c=>c.parent.parent===v.scene),beacons:v.beacons.length,geometries:v.renderer.info.memory.geometries});}}requestAnimationFrame(tick);})`));console.log('Errors:',JSON.stringify(c.errors));
}finally{c.socket.close();}
