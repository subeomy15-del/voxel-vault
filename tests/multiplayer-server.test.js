import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../server.js';

async function fixture(t, options = {}) {
  const server = createServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  async function request(path, body, config = {}) {
    const response = await fetch(base + path, { ...config, method: config.method || (body === undefined ? 'GET' : 'POST'), headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...config.headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  async function create(body = {}) { const result = await request('/api/rooms', { playerName: 'Host', name: 'Treehouse crew', ...body }); assert.equal(result.status, 201); return result.body; }
  async function join(host, playerName = 'Guest') { const result = await request(`/api/rooms/${host.room.code}/join`, { playerName }); assert.equal(result.status, 200); return result.body; }
  function action(member, type, body = {}) { return request(`/api/rooms/${member.room.code}/action`, { token: member.token, type, ...body }); }
  function get(member) { return request(`/api/rooms/${member.room.code}?token=${member.token}`); }
  return { base, request, create, join, action, get };
}

async function stream(t, base, member) {
  const controller = new AbortController();
  const response = await fetch(`${base}/api/rooms/${member.room.code}/events?token=${member.token}`, { signal: controller.signal });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const reader = response.body.getReader(), decoder = new TextDecoder(), queue = [], waiters = [];
  let pending = '';
  const done = (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = pending.indexOf('\n\n')) >= 0) {
          const frame = pending.slice(0, boundary); pending = pending.slice(boundary + 2);
          const data = frame.split('\n').find(line => line.startsWith('data: '));
          if (!data) continue;
          const event = JSON.parse(data.slice(6)), index = waiters.findIndex(waiter => waiter.type === event.type);
          if (index >= 0) { const [waiter] = waiters.splice(index, 1); clearTimeout(waiter.timer); waiter.resolve(event); }
          else queue.push(event);
        }
      }
    } catch (error) { if (!controller.signal.aborted) throw error; }
  })();
  async function close() { controller.abort(); await done; }
  t.after(close);
  function next(type) {
    const index = queue.findIndex(event => event.type === type);
    if (index >= 0) return Promise.resolve(queue.splice(index, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = { type, resolve, timer: setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error(`Timed out waiting for ${type}`)); }, 2000) };
      waiters.push(waiter);
    });
  }
  return { next, close };
}

test('lobbies expose public discovery without private rooms or session secrets', async t => {
  const api = await fixture(t);
  assert.equal((await api.request('/api/health')).body.multiplayer, true);
  const host = await api.create(), privateHost = await api.create({ public: false });
  assert.match(host.room.code, /^[A-Z2-9]{6}$/);
  assert.equal(host.room.hostId, host.playerId);
  assert.equal(host.room.status, 'waiting');
  assert.equal(host.room.players[0].ready, true);
  const guest = await api.join(host);
  assert.notEqual(host.token, guest.token);
  const listing = await api.request('/api/rooms');
  assert.equal(listing.body.rooms.length, 1);
  assert.equal(listing.body.rooms[0].players, 2);
  assert.equal(listing.body.rooms[0].code, host.room.code);
  const publicData = JSON.stringify([listing.body, guest.room, (await api.get(host)).body]);
  for (const secret of [host.token, guest.token, privateHost.token]) assert.ok(!publicData.includes(secret));
  assert.equal((await api.request(`/api/rooms/${host.room.code}?token=${privateHost.token}`)).status, 401);
  assert.equal((await api.request(`/api/rooms/${host.room.code}`)).status, 401);
  assert.equal((await api.request(`/api/rooms/${host.room.code}/events?token=invalid`)).status, 401);
  assert.equal((await api.request(`/api/rooms/${host.room.code}/action`, { token: guest.playerId, type: 'start' })).status, 401);
});

test('concurrent joins enforce capacity and host start respects readiness', async t => {
  const api = await fixture(t), host = await api.create({ maxPlayers: 3 });
  const attempts = await Promise.all(Array.from({ length: 8 }, (_, index) => api.request(`/api/rooms/${host.room.code}/join`, { playerName: `Builder ${index}` })));
  const guests = attempts.filter(result => result.status === 200).map(result => result.body);
  assert.equal(guests.length, 2);
  assert.equal(attempts.filter(result => result.status === 409).length, 6);
  assert.equal((await api.get(host)).body.room.players.length, 3);
  assert.equal((await api.action(guests[0], 'start')).status, 403);
  assert.equal((await api.action(host, 'start')).status, 409);
  assert.equal((await api.action(host, 'edit', { x: 1, y: 20, z: 1, block: 'wood' })).status, 409);
  for (const guest of guests) assert.equal((await api.action(guest, 'ready', { ready: true })).status, 200);
  assert.equal((await api.action(host, 'start')).body.room.status, 'playing');
  assert.equal((await api.action(guests[0], 'ready', { ready: false })).status, 409);
});

test('SSE synchronizes start, poses, edits, pings, late joins and reconnect snapshots', async t => {
  const api = await fixture(t), host = await api.create();
  const hostEvents = await stream(t, api.base, host);
  assert.equal((await hostEvents.next('snapshot')).room.code, host.room.code);
  const guest = await api.join(host);
  assert.equal((await hostEvents.next('room')).room.players.length, 2);
  const guestEvents = await stream(t, api.base, guest);
  await guestEvents.next('snapshot');
  await api.action(guest, 'ready', { ready: true });
  await api.action(host, 'start');
  assert.equal((await guestEvents.next('start')).snapshot.seed, host.snapshot.seed);
  assert.equal((await hostEvents.next('start')).room.status, 'playing');
  const pose = { x: 3.5, y: 7, z: 4.25, yaw: .4, pitch: .1, dimension: 'overworld', held: 'wood', moving: true };
  await api.action(guest, 'pose', pose);
  const poseEvent = await hostEvents.next('pose');
  assert.deepEqual(poseEvent.pose, pose);
  assert.equal(poseEvent.playerId, guest.playerId);
  await api.action(host, 'edit', { x: 3, y: 10, z: 4, block: 'wood', dimension: 'overworld' });
  const firstEdit = await guestEvents.next('edit');
  assert.equal(firstEdit.revision, 1);
  assert.equal(firstEdit.block, 'wood');
  assert.deepEqual(await hostEvents.next('edit'), firstEdit);
  await api.action(guest, 'edit', { x: 3, y: 10, z: 4, block: null, dimension: 'overworld' });
  await api.action(host, 'edit', { x: 0, y: 18, z: 0, block: 'end_stone', dimension: 'ender' });
  await api.action(guest, 'ping', { x: 3, y: 11, z: 4, dimension: 'overworld' });
  assert.equal((await hostEvents.next('ping')).playerId, guest.playerId);
  const late = await api.join(host, 'Late builder');
  assert.equal(late.room.status, 'playing');
  assert.equal(late.snapshot.revision, 3);
  assert.deepEqual(late.snapshot.edits.overworld, [['3,10,4', null]]);
  assert.deepEqual(late.snapshot.edits.ender, [['0,18,0', 'end_stone']]);
  await guestEvents.close();
  await api.action(host, 'edit', { x: 8, y: 10, z: 8, block: 'glass' });
  const resumed = await stream(t, api.base, guest);
  const reconnect = await resumed.next('snapshot');
  assert.equal(reconnect.room.players.length, 3);
  assert.equal(reconnect.snapshot.revision, 4);
  assert.equal(reconnect.snapshot.edits.overworld.find(([key]) => key === '8,10,8')[1], 'glass');
  assert.ok(!JSON.stringify(reconnect).includes(host.token));
});

test('host departure transfers ownership and invalidates the departed token', async t => {
  const api = await fixture(t), host = await api.create(), guest = await api.join(host);
  const events = await stream(t, api.base, guest);
  await events.next('snapshot');
  assert.equal((await api.action(host, 'leave')).status, 200);
  const migrated = await events.next('room');
  assert.equal(migrated.room.hostId, guest.playerId);
  assert.equal(migrated.room.players[0].ready, true);
  assert.equal((await api.action(host, 'heartbeat')).status, 401);
  assert.equal((await api.action(guest, 'start')).status, 200);
  assert.equal((await api.action(guest, 'leave')).status, 200);
  assert.equal((await api.get(guest)).status, 404);
});

test('invalid edits and poses cannot mutate snapshots; shared edit storage is bounded', async t => {
  const api = await fixture(t, { maxEdits: 2 }), host = await api.create();
  await api.action(host, 'start');
  const edit = { x: 0, y: 10, z: 0, block: 'wood', dimension: 'overworld' };
  const invalid = [{ block: 'invented' }, { block: '__proto__' }, { block: 'bedrock' }, { block: 'dragon_crystal' }, { block: 0 }, { block: undefined }, { x: .5 }, { x: 1000001 }, { y: -64 }, { y: 95 }, { z: '3' }, { dimension: '__proto__' }];
  for (const change of invalid) assert.equal((await api.action(host, 'edit', { ...edit, ...change })).status, 400, JSON.stringify(change));
  assert.equal((await api.action(host, '__proto__')).status, 400);
  assert.equal((await api.action(host, 'pose', { x: 0, y: 10, z: 0, held: '__proto__' })).status, 400);
  assert.equal((await api.action(host, 'pose', { x: 0, y: 10, z: 0, yaw: '0' })).status, 400);
  assert.equal((await api.get(host)).body.snapshot.revision, 0);
  assert.equal((await api.action(host, 'edit', edit)).status, 200);
  assert.equal((await api.action(host, 'edit', { ...edit, dimension: 'nether' })).status, 200);
  assert.equal((await api.action(host, 'edit', { ...edit, x: 1 })).status, 409);
  assert.equal((await api.action(host, 'edit', { ...edit, block: null })).status, 200);
  const state = (await api.get(host)).body.snapshot;
  assert.equal(state.revision, 3);
  assert.equal(state.buildCount, 2);
});

test('stale sessions expire, heartbeat retains membership, and host migration follows expiry', async t => {
  let clock = 0;
  const api = await fixture(t, { now: () => clock, reconnectGraceMs: 100 }), host = await api.create(), guest = await api.join(host);
  clock = 80;
  assert.equal((await api.action(guest, 'heartbeat')).status, 200);
  clock = 150;
  const current = await api.get(guest);
  assert.equal(current.body.room.players.length, 1);
  assert.equal(current.body.room.hostId, guest.playerId);
  assert.equal((await api.get(host)).status, 401);
  clock = 251;
  assert.deepEqual((await api.request('/api/rooms')).body.rooms, []);
  assert.equal((await api.get(guest)).status, 404);
});

test('request, admission and action limits prevent room and message floods', async t => {
  const api = await fixture(t, { now: () => 0, admissionBurst: 2 }), host = await api.create();
  const guest = await api.join(host);
  assert.equal((await api.request('/api/rooms', { playerName: 'Another' })).status, 429);
  for (let count = 0; count < 5; count++) assert.equal((await api.action(guest, 'chat', { text: 'Hello' })).status, 200);
  assert.equal((await api.action(guest, 'chat', { text: 'Too much' })).status, 429);
  const limited = await fixture(t, { requestBurst: 1, requestRate: 0 });
  assert.equal((await limited.request('/api/health')).status, 200);
  assert.equal((await limited.request('/api/health')).status, 429);
  const full = await fixture(t, { maxRooms: 1 });
  await full.create();
  assert.equal((await full.request('/api/rooms', {})).status, 503);
});

test('HTTP accepts allowed origins, validates bodies and serves only browser assets', async t => {
  const api = await fixture(t, { allowedOrigins: ['https://play.example'] });
  const allowed = await api.request('/api/health', undefined, { headers: { Origin: 'https://play.example' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://play.example');
  assert.equal((await api.request('/api/health', undefined, { headers: { Origin: 'https://untrusted.example' } })).status, 403);
  const preflight = await fetch(api.base + '/api/rooms', { method: 'OPTIONS', headers: { Origin: 'https://play.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
  assert.equal(preflight.status, 204);
  assert.equal((await api.request('/api/rooms', { name: 'x'.repeat(9000) })).status, 413);
  assert.equal((await api.request('/api/rooms', {} , { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await fetch(api.base + '/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await api.request('/api/rooms', { maxPlayers: 9 })).status, 400);
  assert.equal((await api.request('/api/rooms', { public: 'yes' })).status, 400);
  assert.equal((await api.request('/api/rooms', { playerName: '' })).status, 400);
  for (const path of ['/.git/config', '/package.json', '/server.js', '/server/lobbies.js', '/tests/multiplayer-server.test.js', '/assets/../../server.js', '/src/%2e%2e/server.js?v=31']) assert.equal((await fetch(api.base + path)).status, 404, path);
  for (const path of ['/', '/src/main.js?v=31', '/style.css', '/favicon.svg', '/vendor/three.module.js']) assert.equal((await fetch(api.base + path)).status, 200, path);
});
