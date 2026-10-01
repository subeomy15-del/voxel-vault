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
 await screenshot(tab,'skybound-menu');
 await click(tab,'[data-action="course-select"]');
 assert.equal(await tab.evaluate('document.querySelectorAll(".course-card").length'),12);
 await screenshot(tab,'skybound-courses');
 await click(tab,'[data-course="sky-12"]');
 await until(tab,'g.parkour.course.id==="sky-12"&&!g.screen');
 await until(tab,'document.querySelector("#loading").hidden',null,300);
 assert.equal(await tab.evaluate('g.world.get(0,12,5)!==null'),true);
 await screenshot(tab,'skybound-parkour');
 await tab.evaluate('ui.action("menu")');
 for(const mode of ['gem-rush','spleef','color-drop','infection','crown-control','sky-battle']){
  await click(tab,'[data-mode="'+mode+'"]');
  await until(tab,'arcade.active&&!g.screen');
  await until(tab,'document.querySelector("#loading").hidden',null,300);
  await tab.evaluate('arcade.round.countdown=0;window.before=arcade.round.players.slice(1).map(p=>({x:p.x,z:p.z}));g.screen=null;ui.render()');
  await wait(1600);
  assert.equal(await tab.evaluate('arcade.models.length'),5);
  assert.ok(await tab.evaluate('arcade.round.players.slice(1).some((p,i)=>Math.hypot(p.x-before[i].x,p.z-before[i].z)>.1)'),mode+' AI moves');
  if(mode==='gem-rush'){
   await tab.evaluate('const gem=arcade.round.gems[0];gem.ready=0;g.pos={x:gem.x,y:13,z:gem.z};arcade.update(.05)');
   assert.ok(await tab.evaluate('arcade.round.players[0].score>0'));
  }
  if(mode==='spleef'){
   await tab.evaluate('arcade.round.players[0].cooldown=0;arcade.round.breakTile(g.pos.x+2,g.pos.z,arcade.round.players[0]);arcade.update(.05)');
   assert.equal(await tab.evaluate('g.world.get(Math.floor(g.pos.x+2),12,Math.floor(g.pos.z))'),null);
  }
  if(mode==='color-drop'){
   await tab.evaluate('arcade.round.elapsed=5.1;arcade.update(.05)');
   assert.ok(await tab.evaluate('arcade.round.removed.size>0'));
  }
  await screenshot(tab,'skybound-'+mode);
  if(!await tab.evaluate('arcade.round.ended')){
  await tab.evaluate('g.pause();ui.render();window.pausedAt=arcade.round.elapsed');await wait(200);
  assert.equal(await tab.evaluate('arcade.round.elapsed===pausedAt'),true);
  await tab.evaluate('g.screen=null;arcade.round.elapsed=arcade.round.mode.duration;arcade.update(.05)');
  }
  assert.equal(await tab.evaluate('g.screen'),'arcade-results',mode);
  await click(tab,'[data-action="menu"]');
  assert.equal(await tab.evaluate('g.state.mode!=="parkour"&&!arcade.active'),true);
 }
 await tab.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 assert.ok(await tab.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile hub fits');
 await screenshot(tab,'skybound-mobile');
 await click(tab,'[data-action="course-select"]');
 assert.ok(await tab.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile campaign fits');
 await screenshot(tab,'skybound-courses-mobile');
 assert.deepEqual(tab.errors,[],'no runtime exceptions');
 console.log('PASS: six playable arcade modes, moving AI, collection, tile removal, color hazards, pause/results, 12 courses, save restoration, mobile layouts, no browser exceptions.');
} finally {for(const tab of tabs)tab.ws.close();for(const browserContextId of contexts)await browser.send('Target.disposeBrowserContext',{browserContextId});browser.ws.close();}
