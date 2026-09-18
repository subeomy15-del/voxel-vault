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
const screenshot = async (tab, name) => { await until(tab, 'document.querySelector("#loading").hidden', 'World should finish loading before screenshot'); return writeFile(`/private/tmp/voxel-vault-${name}.png`, Buffer.from((await tab.send('Page.captureScreenshot')).data, 'base64')); };
const fill = (tab, id, value) => tab.evaluate(`(()=>{const input=document.getElementById(${JSON.stringify(id)});if(!input)throw Error('Missing field: '+${JSON.stringify(id)});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
const click = (tab, selector) => tab.evaluate(`(()=>{const button=document.querySelector(${JSON.stringify(selector)});if(!button||button.disabled)throw Error('Unavailable control: '+${JSON.stringify(selector)});button.click();})()`);
const key = async (tab, code, value = code) => {
  await tab.send('Page.bringToFront');
  await tab.send('Input.dispatchKeyEvent', { type: 'keyDown', key: value, code, windowsVirtualKeyCode: code === 'Escape' ? 27 : value.toUpperCase().charCodeAt(0) });
  await tab.send('Input.dispatchKeyEvent', { type: 'keyUp', key: value, code, windowsVirtualKeyCode: code === 'Escape' ? 27 : value.toUpperCase().charCodeAt(0) });
};
async function crew(mode) {
  const host = await page();
  await click(host, '[data-mp-action="open"]');
  await until(host, '!mui.pending');
  await click(host, '[data-mp-action="create-tab"]');
  await fill(host, 'mp-player-name', mode + ' Host');
  await fill(host, 'mp-mode', mode);
  await fill(host, 'mp-lobby-name', 'Browser ' + mode);
  await fill(host, 'mp-max-players', '4');
  await host.evaluate(`document.querySelector('[data-mp-form="create"]').requestSubmit()`);
  await until(host, `mp.status==='connected'&&mp.room?.mode===${JSON.stringify(mode)}&&!mui.pending`, 'Mode lobby creation failed');
  assert.equal(await host.evaluate(`document.querySelector('[data-mp-action="start"]').disabled`), true, 'Competitive lobbies need two players');
  assert.equal(await host.evaluate(`!!document.querySelector('.mp-team-goals')`), false, 'Creative milestones should not appear in competitive lobbies');
  const code = await host.evaluate('mp.room.code');
  const guest = await page(base + '/?room=' + code);
  await until(guest, '!mui.pending');
  assert.equal(await guest.evaluate(`document.getElementById('mp-room-code').value`), code, 'Invite code prefilled');
  await fill(guest, 'mp-player-name', mode + ' Friend');
  await guest.evaluate(`document.querySelector('[data-mp-form="join"]').requestSubmit()`);
  await until(host, 'mp.room.players.length===2');
  await until(guest, `mp.status==='connected'&&!mui.pending`);
  assert.equal(await host.evaluate(`document.querySelector('[data-mp-action="start"]').disabled`), true, 'Wait for guest readiness');
  await click(guest, '[data-mp-action="ready"]');
  await until(host, `!document.querySelector('[data-mp-action="start"]').disabled`);
  await screenshot(host, mode + '-lobby');
  await click(host, '[data-mp-action="start"]');
  await until(host, 'mp.active&&mp.status==="connected"');
  await until(guest, 'mp.active&&mp.status==="connected"');
  assert.equal(await host.evaluate('g.creative'), false, 'Competitive modes must not enable unlimited creative powers');
  assert.equal(await guest.evaluate('g.creative'), false);
  assert.equal(await host.evaluate('g.state.seed'), await guest.evaluate('g.state.seed'));
  if (mode === 'bedwars') assert.notDeepEqual(await host.evaluate('g.pos'), await guest.evaluate('g.pos'), 'Opposing teams have separate islands');
  await until(host, '!!mp.room.match?.players?.length');
  assert.equal(await host.evaluate('mp.room.match.phase'), 'playing');
  assert.equal(await host.evaluate('g.state.dimension'), mode === 'bedwars' ? 'ender' : 'overworld');
  assert.ok(await host.evaluate('g.state.inv.wood_sword > 0'), 'Server starter weapon reaches the player kit');
  await until(host, 'avatars.players.size===1');
  await host.send('Page.bringToFront');
  await host.evaluate('g.screen=null;ui.render();mui.update()');
  assert.equal(await host.evaluate(`document.getElementById('mp-party').hidden`), true, 'Competitive HUD replaces creative milestones');
  return { host, guest, code };
}
async function responsiveLobby(tab, mode) {
  await tab.evaluate('mui.open()');
  await tab.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await wait(200);
  assert.ok(await tab.evaluate('document.documentElement.scrollWidth<=innerWidth'), mode + ' mobile lobby fits');
  assert.ok(await tab.evaluate(`document.querySelector('.mp-room-hero').textContent.includes(mp.room.code)`));
  await screenshot(tab, mode + '-mobile');
  await key(tab, 'Escape', 'Escape');
  await until(tab, '!g.screen', 'Escape returns to active match');
  await tab.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
}
try {
  const bedwars = await crew('bedwars');
  await responsiveLobby(bedwars.host, 'bedwars');
  await screenshot(bedwars.host, 'bedwars-world');
  const guestId = await bedwars.guest.evaluate('mp.playerId');
  assert.deepEqual(await bedwars.host.evaluate('mp.room.match.beds'), { ember: true, tide: true });
  assert.equal(await bedwars.host.evaluate('g.world.get(-48,25,-4)'), 'bed');
  assert.equal(await bedwars.guest.evaluate('g.world.get(48,25,-4)'), 'bed');
  assert.notEqual(await bedwars.host.evaluate('mp.room.match.players.find(p=>p.id===mp.playerId).team'), await bedwars.guest.evaluate('mp.room.match.players.find(p=>p.id===mp.playerId).team'));
  const denied = await bedwars.host.evaluate(`mp.action('attack',{targetId:${JSON.stringify(guestId)}}).then(()=>'',e=>e.message)`);
  assert.match(denied, /reach/i, 'Opponents on distant islands cannot be hit');
  await key(bedwars.host, 'KeyK', 'k');
  await until(bedwars.host, 'g.screen==="match-shop"', 'K should open the base shop');
  assert.equal(await bedwars.host.evaluate(`document.querySelectorAll('.match-shop [data-mode-action="buy"]').length`), 3);
  const blocksBefore = await bedwars.host.evaluate('mp.modes.self.blocks');
  await click(bedwars.host, '[data-mode-action="buy"][data-item="blocks"]');
  await until(bedwars.host, `mp.modes.self.blocks===${blocksBefore + 16}`, 'Shop purchase grants real synchronized building blocks');
  assert.equal(await bedwars.host.evaluate('g.state.inv.plank'), blocksBefore + 16);
  assert.ok(await bedwars.host.evaluate('mp.modes.self.currency>=0'), 'Coin balance remains valid');
  await bedwars.host.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await bedwars.host.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Mobile shop fits');
  await screenshot(bedwars.host, 'bedwars-shop-mobile');
  await key(bedwars.host, 'Escape', 'Escape');
  await until(bedwars.host, '!g.screen', 'Escape closes shop');
  await key(bedwars.host, 'KeyK', 'k');
  await until(bedwars.host, 'g.screen==="match-shop"');
  await key(bedwars.host, 'KeyK', 'k');
  await until(bedwars.host, '!g.screen', 'K toggles shop closed');

  await bedwars.host.evaluate('mp.leave()'); await bedwars.guest.evaluate('mp.leave()');
  const manhunt = await crew('manhunt');
  assert.equal(await manhunt.host.evaluate('mp.room.match.players.find(p=>p.id===mp.playerId).role'), 'runner');
  assert.equal(await manhunt.guest.evaluate('mp.room.match.players.find(p=>p.id===mp.playerId).role'), 'hunter');
  assert.equal(await manhunt.host.evaluate('mp.room.match.beacons.length'), 3);
  assert.equal(await manhunt.host.evaluate(`document.querySelectorAll('#match-hud .match-beacons>span').length`), 3);
  assert.match(await manhunt.host.evaluate(`document.querySelector('#match-hud .match-bearing').textContent`), /Beacon [123]/);
  await manhunt.host.evaluate(`(()=>{const goal=mp.modes.objective(),dx=goal.x-g.pos.x,dz=goal.z-g.pos.z;g.yaw=Math.atan2(-dx,-dz);g.pitch=Math.atan2(goal.y+3.5-g.pos.y-1.58,Math.hypot(dx,dz));})()`);
  await until(manhunt.host, `!!document.querySelector('#match-markers .mode-world-marker')`, 'Runner beacon receives a world marker');
  await screenshot(manhunt.host, 'manhunt-beacons');
  const runnerId = await manhunt.host.evaluate('mp.playerId');
  await manhunt.guest.send('Page.bringToFront');
  await manhunt.guest.evaluate('g.screen=null;ui.render();window.hunterStart={...g.pos}');
  await manhunt.guest.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  await wait(700);
  await manhunt.guest.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  assert.ok(await manhunt.guest.evaluate('Math.hypot(g.pos.x-hunterStart.x,g.pos.z-hunterStart.z)<.15'), 'Hunter movement stays frozen during head start');
  assert.ok(await manhunt.guest.evaluate('mp.room.match.headStartUntil>Date.now()'), 'Runner receives a real head start');
  const headstartDenied = await manhunt.guest.evaluate(`mp.action('attack',{targetId:${JSON.stringify(runnerId)}}).then(()=>'',e=>e.message)`);
  assert.match(headstartDenied, /release|head start|combat starts/i);
  // Freeze both clients at their legitimate starting positions to test server combat after release.
  await manhunt.host.evaluate('g.pause();ui.render()');
  await manhunt.guest.evaluate('g.pause();ui.render()');
  await until(manhunt.guest, 'mp.room.match.huntersReleased', 'Hunters were not released after the head start', 250);
  const hpBefore = await manhunt.host.evaluate('g.state.hp');
  await manhunt.guest.evaluate(`mp.action('attack',{targetId:${JSON.stringify(runnerId)}})`);
  await until(manhunt.host, `g.state.hp<${hpBefore}`, 'Authoritative remote attack should lower the runner health');
  assert.equal(await manhunt.host.evaluate('mp.room.match.players.find(p=>p.id===mp.playerId).hp'), hpBefore - 5);
  await responsiveLobby(manhunt.host, 'manhunt');
  await screenshot(manhunt.host, 'manhunt-world');
  await manhunt.host.evaluate('mp.leave()'); await manhunt.guest.evaluate('mp.leave()');
  for (const tab of tabs) assert.deepEqual(tab.errors, [], 'No browser exceptions');
  console.log('PASS: separate browser sessions; Bed Wars and Manhunt UI creation, invites, ready checks, mode startup, arena/kit, shop purchases, frozen head start, beacon markers, real remote PvP, multiplayer avatars, mobile layouts and Escape/K navigation.');
} finally {
  for (const tab of tabs) tab.ws.close();
  for (const browserContextId of contexts) await browser.send('Target.disposeBrowserContext', { browserContextId });
  browser.ws.close();
}
