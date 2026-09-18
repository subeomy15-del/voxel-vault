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
const browser = await socket((await (await fetch(`http://127.0.0.1:${process.env.VOXEL_CDP_PORT || 9234}/json/version`)).json()).webSocketDebuggerUrl);
const tabs = [], contexts = [];
async function page(url = base) {
  const { browserContextId } = await browser.send('Target.createBrowserContext'); contexts.push(browserContextId);
  const { targetId } = await browser.send('Target.createTarget', { url, browserContextId });
  const targets = await (await fetch(`http://127.0.0.1:${process.env.VOXEL_CDP_PORT || 9234}/json`)).json();
  const tab = await socket(targets.find(target => target.id === targetId).webSocketDebuggerUrl);
  tabs.push(tab);
  await tab.send('Runtime.enable'); await tab.send('Page.enable');
  await tab.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await until(tab, `!!document.querySelector('.block-lobby')||document.body.dataset.screen==='multiplayer'`, 'Home screen did not load');
  await tab.evaluate(`(async()=>{const src=document.querySelector('script[type=module]').src;const m=await import(src);window.g=m.game;window.ui=m.ui;window.mp=m.multiplayer;window.mui=m.multiplayerUI;window.avatars=m.multiplayerPlayers;window.modes=m.multiplayerModes||m.multiplayer.modes||g.multiplayerModes;})()`);
  return tab;
}
const screenshot = async (tab, name) => { await until(tab, 'document.querySelector("#loading").hidden', 'World should finish loading before screenshot'); await wait(250); return writeFile(`/private/tmp/voxel-vault-${name}.png`, Buffer.from((await tab.send('Page.captureScreenshot')).data, 'base64')); };
const click = (tab, selector) => tab.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const setting = (tab, key, value) => tab.evaluate(`(()=>{const input=document.querySelector('[data-setting="'+${JSON.stringify(key)}+'"]');if(input.type==='checkbox')input.checked=${JSON.stringify(value)};else input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const category = (tab, name) => click(tab, `[data-action="settings-tab-${name}"]`);
try {
  const tab = await page();
  assert.equal(await tab.evaluate(`document.querySelector('[data-action="parkour"]').textContent.includes('Play Parkour')`), true);
  await screenshot(tab, 'polished-home');
  await click(tab, '[data-action="settings"]');
  await setting(tab, 'fov', 92); await setting(tab, 'sensitivity', 1.45); await setting(tab, 'sprintMode', 'toggle');
  assert.equal(await tab.evaluate('ui.settings.fov'), 92); assert.equal(await tab.evaluate('g.renderer.settings.sprintMode'), 'toggle');
  await category(tab, 'graphics'); await setting(tab, 'quality', 'low');
  assert.equal(await tab.evaluate('g.renderer.renderer.shadowMap.enabled'), false);
  assert.equal(await tab.evaluate('ui.settings.renderDistance'), 3);
  await setting(tab, 'renderDistance', 4); assert.equal(await tab.evaluate('ui.settings.quality'), 'custom');
  await screenshot(tab, 'settings-graphics');
  await category(tab, 'audio');
  await setting(tab, 'masterVolume', .32); await setting(tab, 'musicVolume', .28); await setting(tab, 'effectsVolume', .47);
  await until(tab, 'Math.abs(g.audio.masterGain.gain.value-.32)<.002&&Math.abs(g.audio.effectsGain.gain.value-.47)<.002', 'Live audio buses should settle at the selected volumes');
  const audioState=await tab.evaluate('({master:g.audio.masterGain.gain.value,effects:g.audio.effectsGain.gain.value,music:g.audio.musicGain.gain.value,state:g.audio.context.state,time:g.audio.context.currentTime,settings:ui.settings.masterVolume})');
  assert.ok(Math.abs(audioState.master-.32)<.002,JSON.stringify(audioState));
  assert.ok(await tab.evaluate('Math.abs(g.audio.effectsGain.gain.value-.47)<.002'));
  assert.ok(await tab.evaluate('g.audio.musicGain.gain.value>0'));
  await screenshot(tab, 'settings-audio');
  await category(tab, 'accessibility'); await setting(tab, 'bobbing', false); await setting(tab, 'cameraEffects', false); await setting(tab, 'debugFPS', true);
  assert.equal(await tab.evaluate('g.renderer.settings.debugFPS'), true); await setting(tab, 'debugFPS', false);
  await tab.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await tab.evaluate('document.documentElement.scrollWidth<=innerWidth'));
  await screenshot(tab, 'settings-mobile');
  await click(tab, '.close'); await click(tab, '[data-action="controls"]');
  assert.equal(await tab.evaluate('g.screen'), 'controls'); assert.ok(await tab.evaluate(`document.querySelector('.modern-controls').textContent.includes('Ctrl / X')`));
  await click(tab, '.close'); await click(tab, '[data-action="credits"]');
  assert.equal(await tab.evaluate('g.screen'), 'credits'); assert.ok(await tab.evaluate(`document.querySelector('.credits-list').textContent.includes('Web Audio')`));
  await click(tab, '.close'); assert.equal(await tab.evaluate('g.screen'), 'menu');
  await screenshot(tab, 'polished-home-mobile');
  await tab.send('Page.reload'); await until(tab, `!!document.querySelector('.block-lobby')`);
  await tab.evaluate(`(async()=>{const m=await import(document.querySelector('script[type=module]').src);window.g=m.game;window.ui=m.ui;})()`);
  const persisted = await tab.evaluate('({fov:ui.settings.fov,sprintMode:ui.settings.sprintMode,quality:ui.settings.quality,master:ui.settings.masterVolume,music:ui.settings.musicVolume,effects:ui.settings.effectsVolume,bobbing:ui.settings.bobbing,camera:ui.settings.cameraEffects})');
  assert.deepEqual(persisted, {fov:92,sprintMode:'toggle',quality:'custom',master:.32,music:.28,effects:.47,bobbing:false,camera:false});
  assert.deepEqual(tab.errors, []);
  console.log('PASS: Parkour menu entry, real settings controls, live graphics preset, audio gain buses, comfort toggles, controls/credits navigation, mobile layout and reload persistence.');
} finally {
  for (const tab of tabs) tab.ws.close();
  for (const browserContextId of contexts) await browser.send('Target.disposeBrowserContext', { browserContextId });
  browser.ws.close();
}
