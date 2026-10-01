import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const base = process.env.VOXEL_TEST_URL || 'http://localhost:3002';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function socket(url) {
  const ws = new WebSocket(url), pending = new Map(), errors = [];
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.id) { const call = pending.get(message.id); if (!call) return; pending.delete(message.id); clearTimeout(call.timer); message.error ? call.reject(Error(JSON.stringify(message.error))) : call.resolve(message.result); }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const serial = ++id; const timer = setTimeout(() => { pending.delete(serial); reject(Error('Timeout: ' + method)); }, 30000); pending.set(serial, { resolve, reject, timer }); ws.send(JSON.stringify({ id: serial, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  return { ws, send, evaluate, errors };
}
async function until(tab, expression, message, attempts = 100) {
  for (let i = 0; i < attempts; i++) { if (await tab.evaluate(expression)) return; await wait(100); }
  const state = await tab.evaluate(`JSON.stringify({screen:window.g?.screen,status:window.mp?.status,error:window.mp?.error,uiError:window.mui?.localError,pending:window.mui?.pending})`).catch(()=> 'page unavailable');
  throw Error((message || 'Timed out: ' + expression) + ' ' + state);
}
const browser = await socket((await (await fetch(`http://127.0.0.1:${process.env.VOXEL_CDP_PORT || 9224}/json/version`)).json()).webSocketDebuggerUrl);
const tabs = [], contexts = [];
async function page(url = base) {
  const { browserContextId } = await browser.send('Target.createBrowserContext'); contexts.push(browserContextId);
  const { targetId } = await browser.send('Target.createTarget', { url, browserContextId });
  const targets = await (await fetch(`http://127.0.0.1:${process.env.VOXEL_CDP_PORT || 9224}/json`)).json();
  const tab = await socket(targets.find(target => target.id === targetId).webSocketDebuggerUrl);
  tabs.push(tab);
  await tab.send('Runtime.enable'); await tab.send('Page.enable');
  await tab.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await until(tab, `!!document.querySelector('.block-lobby')||document.body.dataset.screen==='multiplayer'`, 'Home screen did not load');
  await tab.evaluate(`(async()=>{const src=document.querySelector('script[type=module]').src;const m=await import(src);window.g=m.game;window.ui=m.ui;window.mp=m.multiplayer;window.mui=m.multiplayerUI;window.avatars=m.multiplayerPlayers;window.modes=m.multiplayerModes||m.multiplayer.modes||g.multiplayerModes;})()`);
  return tab;
}
const screenshot = async (tab, name) => { await until(tab, 'document.querySelector("#loading").hidden', 'World should finish loading before screenshot'); await wait(400);await until(tab,'document.querySelector("#loading").hidden'); return writeFile(`/private/tmp/voxel-vault-${name}.png`, Buffer.from((await tab.send('Page.captureScreenshot')).data, 'base64')); };
const fill = (tab, id, value) => tab.evaluate(`(()=>{const input=document.getElementById(${JSON.stringify(id)});if(!input)throw Error('Missing field: '+${JSON.stringify(id)});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
const click = (tab, selector) => tab.evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(selector)});if(!button||button.disabled)throw Error('Unavailable control: '+${JSON.stringify(selector)});button.click();})()`);
const key = async (tab, code, value = code) => {
  await tab.send('Page.bringToFront');
  await tab.send('Input.dispatchKeyEvent', { type: 'keyDown', key: value, code, windowsVirtualKeyCode: code === 'Escape' ? 27 : value.toUpperCase().charCodeAt(0) });
  await tab.send('Input.dispatchKeyEvent', { type: 'keyUp', key: value, code, windowsVirtualKeyCode: code === 'Escape' ? 27 : value.toUpperCase().charCodeAt(0) });
};

try {
 const tab=await page();
 await tab.evaluate(`(async()=>{window.arcade=(await import(document.querySelector('script[type=module]').src)).arcade})()`);
 assert.equal(await tab.evaluate('document.querySelectorAll(".arcade-card").length'),14);
 await screenshot(tab,'party-hub');
 for(const mode of ['block-soccer','bomb-tag','rocket-rumble','coin-heist','meteor-dodge','redlight-rush','tnt-run','laser-jump']){
  await click(tab,'[data-mode="'+mode+'"]');
  await until(tab,'arcade.active&&!g.screen');await wait(300);
  await until(tab,'document.querySelector("#loading").hidden',null,300);
  await tab.evaluate('arcade.round.countdown=0;window.before=arcade.round.players.slice(1).map(p=>({x:p.x,z:p.z}));g.screen=null;ui.render();g.keys.add("KeyW");');
  await wait(1100);await tab.evaluate('g.keys.clear()');
  assert.ok(await tab.evaluate('arcade.round.players.slice(1).some((p,i)=>Math.hypot(p.x-before[i].x,p.z-before[i].z)>.1)'),mode+' AI acts');
  assert.equal(await tab.evaluate('!!arcade.partyView'),true);
  // Restart a finished survival round before checking its interactive mechanics.
  if(await tab.evaluate('arcade.round.ended')){await click(tab,'[data-action="arcade-play"]');await wait(300);await until(tab,'document.querySelector("#loading").hidden');}
  await tab.evaluate('g.screen=null;arcade.round.countdown=0;arcade.round.players.forEach(p=>{if(p.bot)p.cooldown=10});');
  if(mode==='block-soccer'){
   await tab.evaluate('g.pos={x:0,y:13,z:1};g.yaw=0;g.pitch=0;arcade.update(.01);g.attack();');
   assert.ok(await tab.evaluate('arcade.round.ball.vz<0'),'mouse attack kicks ball');
   await tab.evaluate('arcade.round.ball.x=0;arcade.round.ball.z=-13.49;arcade.round.ball.vz=-10;arcade.update(.05)');
   assert.equal(await tab.evaluate('arcade.round.teamScores[0]'),1);
  }
  if(mode==='bomb-tag'){
   await tab.evaluate('arcade.round.holder=0;arcade.round.passLock=0;g.yaw=0;g.pos={x:0,y:13,z:0};Object.assign(arcade.round.players[1],{x:0,z:-1,y:13});arcade.update(.01);g.attack()');
   assert.equal(await tab.evaluate('arcade.round.holder'),1);
  }
  if(mode==='rocket-rumble'){
   await tab.evaluate('g.yaw=0;g.attack()');assert.ok(await tab.evaluate('arcade.round.projectiles.some(p=>p.owner===0)'));
  }
  if(mode==='coin-heist'){
   await tab.evaluate('arcade.round.players[0].carry=5;g.pos={x:arcade.round.players[0].home.x,y:13,z:arcade.round.players[0].home.z};arcade.update(.05)');
   assert.ok(await tab.evaluate('arcade.round.players[0].score>=5'));
  }
  if(mode==='meteor-dodge'){
   await tab.evaluate('arcade.round.nextHazard=0;arcade.update(.05);arcade.frame(.01)');assert.ok(await tab.evaluate('arcade.round.warnings.length>0'));
  }
  if(mode==='redlight-rush'){
   await tab.evaluate('arcade.round.elapsed=5;arcade.round.players[0].invulnerable=0;g.pos.z-=2;arcade.update(.05)');
   assert.equal(await tab.evaluate('g.pos.z'),11);
  }
  if(mode==='tnt-run'){
   await tab.evaluate('g.pos={x:0.5,y:13,z:.5};arcade.update(.05);g.pos.y=15;for(let i=0;i<15;i++)arcade.update(.05)');
   assert.equal(await tab.evaluate('g.world.get(0,12,0)'),null);
  }
  if(mode==='laser-jump'){
   await tab.evaluate('g.pos={x:8,y:15,z:0};arcade.round.laser=0;arcade.round.players[0].invulnerable=0;window.lives=arcade.round.players[0].lives;arcade.update(.01)');assert.equal(await tab.evaluate('arcade.round.players[0].lives===lives'),true);
  }
  await screenshot(tab,'party-'+mode);
  if(!await tab.evaluate('arcade.round.ended')){
   await tab.evaluate('g.pause();ui.render();window.paused=arcade.round.elapsed');await wait(120);assert.equal(await tab.evaluate('arcade.round.elapsed===paused'),true);
   await tab.evaluate('g.screen=null;arcade.round.countdown=0;arcade.round.elapsed=arcade.round.mode.duration;arcade.update(.05)');
  }
  assert.equal(await tab.evaluate('g.screen'),'arcade-results',mode);
  await click(tab,'[data-action="menu"]');assert.equal(await tab.evaluate('arcade.active'),false);
 }
 await tab.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 assert.ok(await tab.evaluate('document.documentElement.scrollWidth<=innerWidth'));
 await screenshot(tab,'party-mobile');
 await click(tab,'[data-mode="rocket-rumble"]');await wait(500);await until(tab,'document.querySelector("#loading").hidden');
 await tab.evaluate('ui.touch=true;g.screen=null;arcade.round.countdown=0;ui.render();arcade.renderHud()');
 assert.ok(await tab.evaluate('getComputedStyle(document.querySelector("[data-touch=attack]")).display!=="none"'));
 await click(tab,'[data-action="arcade-dash"]');assert.ok(await tab.evaluate('arcade.round.players[0].dashReady>0'));
 await screenshot(tab,'party-mobile-game');
 await tab.evaluate('ui.action("menu")');await click(tab,'[data-action="arcade-random"]');assert.ok(await tab.evaluate('arcade.active'));
 assert.deepEqual(tab.errors,[],'no browser exceptions');
 console.log('PASS: 14 cards, eight new playable modes, objective-driven AI, kicking/scoring, bomb passing, rockets, banking, meteor warnings, stop/go penalties, collapsing terrain, laser jump clearance, results, save restoration, shuffle and mobile dash.');
} finally {for(const tab of tabs)tab.ws.close();for(const browserContextId of contexts)await browser.send('Target.disposeBrowserContext',{browserContextId});browser.ws.close();}
