import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const debugPort=process.env.VOXEL_CDP_PORT||9234,base=process.env.VOXEL_TEST_URL||'http://localhost:3002';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const {webSocketDebuggerUrl}=await(await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const ws=new WebSocket(webSocketDebuggerUrl),pending=new Map(),errors=[];
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let id=0;
ws.onmessage=({data})=>{const message=JSON.parse(data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error')errors.push(message.params.args.map(arg=>arg.value||arg.description).join(' '));if(message.id){const call=pending.get(message.id);if(call){pending.delete(message.id);clearTimeout(call.timer);message.error?call.reject(Error(JSON.stringify(message.error))):call.resolve(message.result);}}};
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const callId=++id,timer=setTimeout(()=>reject(Error(`Timeout: ${method}`)),30000);pending.set(callId,{resolve,reject,timer});ws.send(JSON.stringify({id:callId,method,params,sessionId}));});
const {browserContextId}=await send('Target.createBrowserContext');
try{
  const {targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const call=(method,params={})=>send(method,params,sessionId);
  const evaluate=async expression=>{if(expression.trim().endsWith(';'))expression+='void 0';const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
  const until=async(expression,label)=>{for(let count=0;count<160;count++){if(await evaluate(expression))return;await wait(100);}throw Error(label||expression);};
  await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:base});
  await until(`!!document.querySelector('.block-lobby')`,'The game did not load.');
  await evaluate(`(async()=>{const m=await import(document.querySelector('script[type="module"]').src);window.g=m.game;window.r=m.renderer;window.ui=m.ui;window.settings=m.settings;})()`);
  await until('r.chunks.size>=9');


  await evaluate(`window.soloSeed=g.state.seed;window.soloPos={...g.pos};ui.action('tower-select');window.p=g.parkour;`);
  assert.equal(await evaluate(`document.querySelectorAll('.tower-world-card').length`),3,JSON.stringify({errors,state:await evaluate(`({screen:g.screen,overlay:document.querySelector('#overlay').innerText.slice(0,300),loading:document.querySelector('#loading').innerText})`)}));
  assert.equal(await evaluate(`document.querySelectorAll('.arcade-card').length`),0);
  const shot=async name=>{await until(`document.querySelector('#loading').hidden`);await wait(150);await writeFile('/private/tmp/voxel-vault-tower-'+name+'.png',Buffer.from((await call('Page.captureScreenshot')).data,'base64'));};
  await shot('worlds');
  const input=(code,pressed)=>call('Input.dispatchKeyEvent',{type:pressed?'keyDown':'keyUp',key:code==='Space'?' ':code==='ShiftLeft'?'Shift':code==='ControlLeft'?'Control':code.replace('Key','').toLowerCase(),code});
  for(const world of ['tower-prism','tower-aurora','tower-inferno']){
    await evaluate(`document.querySelector('[data-world="${world}"]').click();`);
    await until(`p.course.id==='${world}'&&document.querySelector('#loading').hidden&&r.queue.length===0`);
    assert.equal(await evaluate(`document.body.classList.contains('tower-active')`),true);
    assert.equal(await evaluate(`document.querySelector('#tower-hud').hidden`),false);
    assert.equal(await evaluate(`p.course.stages.length`),8);
    assert.ok(await evaluate(`p.towerRuntime.obstacles.some(o=>o.kind==='lift')&&p.towerRuntime.obstacles.some(o=>o.kind==='crumble')`));
    await shot(world+'-start');
    if(world==='tower-prism'){
      await call('Page.bringToFront');
      await input('KeyW',true);await wait(200);await input('KeyW',false);
      assert.ok(await evaluate(`p.timer.elapsed>0&&g.pos.x>p.course.spawn.x+.2`),'real keyboard starts the tower');
      await input('Space',true);await wait(140);assert.ok(await evaluate(`!g.grounded&&g.pos.y>13.3`));await input('Space',false);
      await evaluate(`p.respawn();g.screen=null;ui.render();`);
      await input('ControlLeft',true);await wait(80);assert.equal(await evaluate(`g.crouching`),true);await input('ControlLeft',false);
      await evaluate(`g.pause();ui.render();window.pt=p.timer.elapsed;window.ot=p.towerRuntime.time;`);await wait(200);
      assert.equal(await evaluate(`pt===p.timer.elapsed&&ot===p.towerRuntime.time`),true);
      await evaluate(`ui.action('resume');`);
    }
    // Contact each ordered floor landing, inspecting visible dynamics and saved splits.
    for(let cp=1;cp<9;cp++){
      await evaluate(`p.checkpoint=${cp-1};g.pos={...p.course.checkpoints[${cp}]};g.yaw=p.course.checkpoints[${cp}].yaw;g.grounded=true;g.velocity=g.vx=g.vz=0;p.towerRuntime.respawn();p.update(.01);`);
      assert.equal(await evaluate(`p.checkpoint`),cp,world+' floor '+cp);
      if(cp===4||cp===6||cp===7)await shot(world+'-floor-'+(cp+1));
    }
    await evaluate(`g.pos={...p.course.finish};g.grounded=true;g.velocity=g.vx=g.vz=0;p.towerRuntime.respawn();p.update(.01);ui.render();`);
    await until(`g.screen==='parkour-results'`);
    assert.equal(await evaluate(`p.summitReward.first`),true);
    assert.ok(await evaluate(`document.querySelector('.tower-earned').textContent.includes(p.course.crystalReward)`));
    await shot(world+'-summit');
    await evaluate(`ui.action('tower-select');`);
  }
  assert.ok(await evaluate(`document.querySelector('.tower-profile').textContent.includes('Tower Legend')`));
  await shot('collection');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await call('Emulation.setTouchEmulationEnabled',{enabled:true});await wait(150);
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),'world selection fits mobile');await shot('mobile-worlds');
  await evaluate(`document.querySelector('[data-world="tower-prism"]').click();ui.touch=true;ui.resume();`);
  await until(`document.querySelector('#loading').hidden&&r.queue.length===0`);
  assert.equal(await evaluate(`document.querySelector('[data-touch="crouch"]').hidden`),false);
  await evaluate(`document.exitPointerLock();`);await wait(100);await evaluate(`ui.resume();`);
  await until(`!document.pointerLockElement&&g.screen===null&&document.querySelector('#loading').hidden&&!document.querySelector('#touch-controls').hidden`);
  await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);await shot('mobile-play-before');
  const point=await evaluate(`(()=>{const b=document.querySelector('[data-touch="crouch"]').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};})()`);
  assert.equal(await evaluate(`document.elementFromPoint(${point.x},${point.y})?.dataset.touch`),'crouch',JSON.stringify(await evaluate(`({screen:g.screen,touchHidden:document.querySelector('#touch-controls').hidden,point:${JSON.stringify(point)},element:document.elementFromPoint(${point.x},${point.y})?.outerHTML?.slice(0,200),viewport:[innerWidth,innerHeight]})`)));
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await wait(100);
  assert.equal(await evaluate(`g.crouching`),true,'real touch crouch');
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),'mobile HUD fits');await shot('mobile-play');
  await evaluate(`ui.action('players');document.querySelector('[data-action="multiplayer"]').click();`);
  assert.equal(await evaluate(`g.screen==='multiplayer'&&!p.active&&p.towerRuntime.course===null&&p.towerRuntime.view.root.parent===null`),true,'multiplayer navigation cleans up tower');
  await evaluate(`(async()=>{const m=await import(document.querySelector('script[type="module"]').src);m.multiplayerUI.back();})()`);
  assert.equal(await evaluate(`g.state.seed===soloSeed&&g.pos.x===soloPos.x&&g.pos.z===soloPos.z`),true,'solo restored');
  assert.equal(await evaluate(`document.querySelectorAll('.arcade-card').length`),14,'arcade intact');
  assert.equal(await evaluate(`document.querySelectorAll('.game-mode').length`),3,'existing worlds intact');
  await evaluate(`ui.action('course-select');`);
  assert.equal(await evaluate(`document.querySelectorAll('.course-card').length`),12,'existing parkour intact');
  assert.deepEqual(errors,[],'Browser emitted errors.');
  console.log('PASS: three tower worlds, real keyboard and touch, eight floors, dynamics, pause, summit rewards, collection, mobile layout, solo restoration and original modes.');
}finally{await send('Target.disposeBrowserContext',{browserContextId});ws.close();}
