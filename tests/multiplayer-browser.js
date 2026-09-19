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
async function until(tab, expression, message) {
  for (let i = 0; i < 100; i++) { if (await tab.evaluate(expression)) return; await wait(100); }
  throw Error(message || 'Timed out: ' + expression);
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
  await tab.evaluate(`(async()=>{const src=document.querySelector('script[type=module]').src;const m=await import(src);window.g=m.game;window.ui=m.ui;window.mp=m.multiplayer;window.mui=m.multiplayerUI;window.avatars=m.multiplayerPlayers;})()`);
  await until(tab, `document.querySelector('#loading').hidden`, 'Terrain never finished loading');
  return tab;
}
const screenshot = async (tab, name) => writeFile(`/private/tmp/voxel-vault-${name}.png`, Buffer.from((await tab.send('Page.captureScreenshot')).data, 'base64'));
try {
  const host = await page();
  await screenshot(host, 'together-home');
  await host.evaluate(`g.start('adventure',true);g.add('diamond',7);g.save(true);window.savedSolo=JSON.stringify(g.state);g.screen='menu';ui.render();mui.open();`);
  await until(host, `g.screen==='multiplayer'`);
  await host.evaluate(`mp.create({name:'Test builders',playerName:'Host',public:true,maxPlayers:3})`);
  await until(host, `mp.status==='connected'&&mp.room?.players.length===1`);
  const code = await host.evaluate('mp.room.code');
  const guest = await page(base + '/?room=' + code);
  await guest.evaluate(`mui.open();mp.join(${JSON.stringify(code)},'Friend <b>safe</b>')`);
  await until(host, 'mp.room.players.length===2');
  assert.equal(await host.evaluate(`document.querySelectorAll('.mp-roster b b').length`), 0);
  const denied = await host.evaluate(`mp.start().then(()=>false,error=>error.message)`);
  assert.match(denied, /ready/i);
  await guest.evaluate('mp.ready(true)');
  await until(host, 'mp.room.players.every(p=>p.ready)');
  await screenshot(host, 'together-lobby');
  await host.evaluate('mp.start()');
  await until(guest, 'mp.active&&mp.status===\'connected\'');
  await until(host, 'mp.active&&mp.status===\'connected\'');
  assert.equal(await host.evaluate('g.state.seed'), await guest.evaluate('g.state.seed'));
  await host.evaluate('g.world.set(10,55,10,"plank")');
  await until(guest, 'g.world.get(10,55,10)==="plank"');
  await guest.evaluate('g.world.set(11,55,10,"glass")');
  await until(host, 'g.world.get(11,55,10)==="glass"');
  await guest.evaluate('g.world.set(10,55,10,null)');
  await until(host, 'g.world.get(10,55,10)===null');
  await until(host, 'avatars.players.size===1');
  await until(guest, 'avatars.players.size===1');
  const hostPosition = await host.evaluate('g.pos');
  await guest.evaluate(`g.pos={x:${hostPosition.x}+3,y:${hostPosition.y},z:${hostPosition.z}-4};g.flying=true;g.yaw=0;g.screen=null;ui.render()`);
  await host.evaluate('g.screen=null;ui.render()');
  await wait(1200);
  await until(host, `document.querySelector('#loading').hidden`);
  await screenshot(host, 'together-world');
  await guest.evaluate('mp.ping()');
  await until(host, '!!mp.pingMarker');
  // A transport reconnect receives a full snapshot, including edits while absent.
  await guest.evaluate('mp.source.close();mp.status="reconnecting"');
  await host.evaluate('g.world.set(12,55,10,"stonebrick")');
  await host.evaluate('mp.editQueue');
  await guest.evaluate('mp.connectEvents()');
  await until(guest, 'mp.status==="connected"&&g.world.get(12,55,10)==="stonebrick"');
  // Late join sees exactly the existing world, and consumes a real room slot.
  const late = await page();
  await late.evaluate(`mp.join(${JSON.stringify(code)},'Late builder')`);
  await until(late, 'mp.active&&g.world.get(12,55,10)==="stonebrick"');
  const full = await fetch(base + '/api/rooms/' + code + '/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerName: 'Overflow' }) });
  assert.equal(full.status, 409);
  // Joining and building never changes this player's original Adventure slot.
  await host.evaluate('mp.leave()');
  assert.equal(await host.evaluate('JSON.stringify(g.state)===savedSolo'), true);
  await until(guest, 'mp.isHost');
  await guest.evaluate('mui.open()');
  await guest.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await wait(250);
  assert.ok(await guest.evaluate('document.documentElement.scrollWidth<=innerWidth'));
  await screenshot(guest, 'together-mobile');
  await guest.evaluate('mp.leave()'); await late.evaluate('mp.leave()');
  assert.ok(!(await (await fetch(base + '/api/rooms')).json()).rooms.some(room => room.code === code));
  for (const tab of tabs) assert.deepEqual(tab.errors, []);
  console.log('PASS: independent browser sessions, invites, readiness, shared blocks/removal, avatars, pings, reconnect, late join, capacity, host migration, solo preservation and mobile layout.');
} finally {
  for (const tab of tabs) tab.ws.close();
  for (const browserContextId of contexts) await browser.send('Target.disposeBrowserContext', { browserContextId });
  browser.ws.close();
}
