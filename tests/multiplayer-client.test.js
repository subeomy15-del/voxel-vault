import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js?v=33';
import { Multiplayer } from '../src/multiplayer.js?v=33';
import { slotKey } from '../src/save.js?v=33';

const storage = () => ({ data: new Map(), getItem(key) { return this.data.get(key) || null; }, setItem(key, value) { this.data.set(key, value); } });
const response = (body = { ok: true }, status = 200) => ({ ok: status < 400, status, json: async () => body });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const settle = () => new Promise(resolve => setImmediate(resolve));
const snapshot = (edits = {}, revision = 0) => ({ edits: { overworld: [], nether: [], ender: [], ...edits }, revision, buildCount: revision });

function harness(t, responder) {
  const sources = [], requests = [], store = storage();
  class FakeEventSource {
    constructor(url) { this.url = url; sources.push(this); }
    close() { this.closed = true; }
    open() { this.onopen?.(); }
    fail() { this.onerror?.(); }
    send(event) { this.onmessage?.({ data: JSON.stringify(event) }); }
  }
  const game = new Game({ setWorld() {}, stream() {}, burst() {} }, { play() {}, quiet() {} }, store);
  game.screen = null;
  game.save();
  const h = {
    game, store, sources, requests,
    room: { code: 'CREW01', name: 'Test crew', hostId: 'player-1', seed: 91357, status: 'playing', buildCount: 0, players: [{ id: 'player-1', name: 'Builder', ready: true, pose: null }] }
  };
  h.fetcher = async (url, options) => {
    const request = { url, body: options.body ? JSON.parse(options.body) : null, options };
    requests.push(request);
    const custom = responder?.(request, h);
    if (custom !== undefined) return await custom;
    if (url.endsWith('/api/rooms') || url.endsWith('/join')) return response({ room: structuredClone(h.room), token: 'test-token', playerId: 'player-1', snapshot: snapshot() });
    return response();
  };
  h.client = new Multiplayer(game, { fetcher: h.fetcher, eventSource: FakeEventSource });
  h.connect = async () => { await h.client.create({ name: 'Test crew', playerName: 'Builder' }); sources.at(-1).open(); };
  h.edits = () => requests.filter(request => request.body?.type === 'edit');
  t.after(() => h.client.reset());
  return h;
}

test('joining and leaving preserve solo worlds, inventory, location and existing creative saves', async t => {
  const h = harness(t), g = h.game;
  g.state.inv.diamond = 7;
  g.world.set(120, 80, 130, 'plank');
  g.pos = { x: 120.5, y: 82, z: 130.5 };
  g.yaw = 1.2; g.pitch = -.3;
  g.save();
  const solo = h.store.getItem(slotKey('adventure'));
  const soloTerrain = g.state.terrain;
  h.store.setItem(slotKey('creative'), 'existing creative save');
  await h.connect();
  assert.equal(h.client.active, true);
  assert.equal(g.state.seed, h.room.seed);
  assert.equal(g.state.mode, 'creative');
  assert.equal(g.state.terrain, 6, 'shared terrain must match the authoritative server');
  g.state.inv.diamond = 1234;
  g.world.set(125, 80, 130, 'stonebrick');
  await h.client.editQueue;
  g.save();
  assert.equal(h.store.getItem(slotKey('adventure')), solo);
  assert.equal(h.store.getItem(slotKey('creative')), 'existing creative save');
  await h.client.leave();
  assert.equal(h.client.active, false);
  assert.equal(g.state.terrain, soloTerrain, 'leaving restores the solo generation version');
  assert.equal(g.state.inv.diamond, 7);
  assert.deepEqual(g.pos, { x: 120.5, y: 82, z: 130.5 });
  assert.equal(g.yaw, 1.2);
  assert.equal(g.world.get(120, 80, 130), 'plank');
  assert.equal(g.world.get(125, 80, 130), null);
  assert.equal(h.store.getItem(slotKey('adventure')), solo);
});

test('server edits update the live world without echoing back to the server', async t => {
  const h = harness(t);
  await h.connect();
  h.sources.at(-1).send({ type: 'edit', dimension: 'overworld', x: 101, y: 82, z: 102, block: 'glass', revision: 1, buildCount: 1 });
  await settle();
  assert.equal(h.game.world.get(101, 82, 102), 'glass');
  assert.equal(h.client.edits.overworld.get('101,82,102'), 'glass');
  assert.equal(h.edits().length, 0);
  assert.equal(h.client.pending, 0);
  assert.equal(h.client.room.buildCount, 1);
});

test('local edits are sent once and a rejection restores the canonical server block', async t => {
  const h = harness(t, request => request.body?.type === 'edit' ? response({ error: 'Build limit reached' }, 409) : undefined);
  await h.connect();
  h.sources.at(-1).send({ type: 'edit', dimension: 'overworld', x: 101, y: 82, z: 102, block: 'glass', revision: 1, buildCount: 1 });
  assert.equal(h.game.world.set(101, 82, 102, 'plank'), true);
  assert.equal(h.game.world.get(101, 82, 102), 'plank');
  await h.client.editQueue;
  assert.equal(h.game.world.get(101, 82, 102), 'glass');
  assert.equal(h.edits().length, 1);
  assert.equal(h.edits()[0].body.dimension, 'overworld');
  assert.equal(h.client.pending, 0);
  assert.match(h.client.error, /Build limit reached/);
});

test('rejecting consecutive optimistic edits on one cell restores its original terrain', async t => {
  const h = harness(t, request => request.body?.type === 'edit' ? response({ error: 'Rejected' }, 409) : undefined);
  await h.connect();
  const original = h.game.world.get(101, 82, 102);
  h.game.world.set(101, 82, 102, 'plank');
  h.game.world.set(101, 82, 102, 'glass');
  await h.client.editQueue;
  assert.equal(h.game.world.get(101, 82, 102), original, 'a rejected optimistic block must not become the rollback baseline');
  assert.equal(h.client.pending, 0);
});

test('shared edits stay in their dimensions and are replayed when travelling', async t => {
  const h = harness(t);
  await h.connect();
  const overworld = h.game.world.get(101, 82, 102);
  h.sources.at(-1).send({ type: 'edit', dimension: 'nether', x: 101, y: 82, z: 102, block: 'glass', revision: 1, buildCount: 1 });
  assert.equal(h.game.world.get(101, 82, 102), overworld);
  h.game.travel('nether');
  assert.equal(h.game.world.get(101, 82, 102), 'glass');
  assert.equal(h.edits().length, 0, 'entering a dimension does not repost its snapshot');
  h.game.world.set(105, 82, 106, 'plank');
  await h.client.editQueue;
  assert.equal(h.edits().at(-1).body.dimension, 'nether');
});

test('an edit rejected after dimension travel is removed from the cached realm too', async t => {
  const pending = deferred();
  const h = harness(t, request => request.body?.type === 'edit' ? pending.promise : undefined);
  await h.connect();
  const original = h.game.world.get(101, 82, 102);
  h.game.world.set(101, 82, 102, 'glass');
  await settle();
  h.game.travel('nether');
  pending.resolve(response({ error: 'Build limit reached' }, 409));
  await h.client.editQueue;
  h.game.travel('overworld');
  assert.equal(h.game.world.get(101, 82, 102), original, 'realm snapshots must not resurrect rejected local edits');
});

test('a rejection reaches the current world after a player travels away and back', async t => {
  const pending = deferred();
  const h = harness(t, request => request.body?.type === 'edit' ? pending.promise : undefined);
  await h.connect();
  const original = h.game.world.get(101, 82, 102);
  h.game.world.set(101, 82, 102, 'glass');
  await settle();
  h.game.travel('nether');
  h.game.travel('overworld');
  pending.resolve(response({ error: 'Build limit reached' }, 409));
  await h.client.editQueue;
  assert.equal(h.game.world.get(101, 82, 102), original, 'the old World object must not absorb the only rollback');
});

test('multiplayer saves capture in-memory realm position while leaving all solo storage untouched', async t => {
  const h = harness(t);
  await h.connect();
  const saved = new Map(h.store.data);
  h.game.pos = { x: 100.5, y: 84, z: 101.5 };
  h.game.yaw = 1.4;
  h.game.pitch = .2;
  h.game.save();
  assert.deepEqual(h.game.state.pos, h.game.pos);
  assert.equal(h.game.state.yaw, 1.4);
  assert.equal(h.game.state.pitch, .2);
  assert.deepEqual(h.store.data, saved);
  h.game.travel('nether');
  assert.deepEqual(h.game.state.realms.overworld.pos, { x: 100.5, y: 84, z: 101.5 });
});

test('a reconnect blocks local building until a snapshot restores missed remote edits', async t => {
  const h = harness(t);
  await h.connect();
  const source = h.sources.at(-1);
  source.fail();
  assert.equal(h.client.status, 'reconnecting');
  assert.equal(h.game.world.set(101, 82, 102, 'plank'), false);
  assert.equal(h.edits().length, 0);
  source.send({ type: 'snapshot', room: h.room, snapshot: snapshot({ overworld: [['101,82,102', 'glass'], ['105,82,106', 'stonebrick']] }, 2) });
  assert.equal(h.client.status, 'connected');
  assert.equal(h.game.world.get(101, 82, 102), 'glass');
  assert.equal(h.game.world.get(105, 82, 106), 'stonebrick');
  assert.equal(h.client.revision, 2);
  assert.equal(h.edits().length, 0);
});

test('queued events from a closed stream cannot mutate the restored solo world', async t => {
  const h = harness(t);
  await h.connect();
  const source = h.sources.at(-1);
  await h.client.leave();
  const soloSeed = h.game.state.seed;
  const original = h.game.world.get(101, 82, 102);
  source.open();
  source.fail();
  source.send({ type: 'edit', dimension: 'overworld', x: 101, y: 82, z: 102, block: 'glass', revision: 99, buildCount: 99 });
  source.send({ type: 'snapshot', room: h.room, snapshot: snapshot({ overworld: [['101,82,102', 'plank']] }, 100) });
  assert.equal(source.closed, true);
  assert.equal(h.client.room, null);
  assert.equal(h.client.status, 'idle');
  assert.equal(h.game.state.seed, soloSeed);
  assert.equal(h.game.world.get(101, 82, 102), original);
});

test('leaving while a join request is pending prevents its late response from reopening the room', async t => {
  const pending = deferred();
  const h = harness(t, request => request.url.endsWith('/api/rooms') ? pending.promise : undefined);
  const joining = h.client.create({ name: 'Pending crew' });
  await h.client.leave();
  pending.resolve(response({ room: h.room, token: 'late-token', playerId: 'player-1', snapshot: snapshot() }));
  await joining.catch(() => {});
  assert.equal(h.client.room, null);
  assert.equal(h.client.active, false);
  assert.equal(h.sources.length, 0);
});

test('a late pose rejection from a departed lobby cannot disconnect the next lobby', async t => {
  const pending = deferred();
  const h = harness(t, request => request.body?.type === 'pose' ? pending.promise : undefined);
  await h.connect();
  h.client.update(.2);
  await h.client.leave();
  h.room = { ...h.room, code: 'CREW02', seed: 78219 };
  await h.connect();
  pending.resolve(response({ error: 'Previous room expired' }, 410));
  await settle();
  assert.equal(h.client.room?.code, 'CREW02');
  assert.equal(h.client.active, true);
  assert.equal(h.client.status, 'connected');
});

test('a late leave response cannot reset a newer lobby after the old room disconnects', async t => {
  const pending = deferred();
  const h = harness(t, request => request.body?.type === 'leave' ? pending.promise : undefined);
  await h.connect();
  const leaving = h.client.leave();
  h.client.disconnected('Room expired');
  h.room = { ...h.room, code: 'CREW02', seed: 78219 };
  await h.connect();
  pending.resolve(response());
  await leaving;
  assert.equal(h.client.room?.code, 'CREW02');
  assert.equal(h.client.active, true);
});

test('leaving detaches pending edits so they do not delay or decrement a new lobby queue', async t => {
  const oldEdit = deferred(), newEdit = deferred();
  let sent = 0;
  const h = harness(t, request => request.body?.type === 'edit' ? (++sent === 1 ? oldEdit.promise : newEdit.promise) : undefined);
  await h.connect();
  h.game.world.set(101, 82, 102, 'glass');
  await settle();
  assert.equal(h.client.pending, 1);
  await h.client.leave();
  h.room = { ...h.room, code: 'CREW02', seed: 78219 };
  await h.connect();
  assert.equal(h.client.pending, 0, 'the new room begins with an empty edit queue');
  h.game.world.set(105, 82, 106, 'plank');
  await settle();
  assert.equal(sent, 2, 'new room edits do not wait for the old server request');
  oldEdit.resolve(response({ error: 'Previous room expired' }, 410));
  await settle();
  assert.equal(h.client.pending, 1, 'the old completion must not alter the new room counter');
  newEdit.resolve(response());
  await h.client.editQueue;
  assert.equal(h.client.pending, 0);
  assert.equal(h.client.room.code, 'CREW02');
});

test('failure to open a room stream clears credentials and permits retry', async t => {
  const h = harness(t);
  h.client.EventSource = class { constructor() { throw Error('Event streams are unavailable'); } };
  await assert.rejects(h.client.create({ name: 'No stream' }), /Event streams are unavailable/);
  assert.equal(h.client.room, null);
  assert.equal(h.client.token, null);
  assert.equal(h.client.active, false);
  assert.equal(h.client.status, 'idle');
});

test('reserved indestructible blocks never enter the optimistic world or edit queue', async t => {
  const h = harness(t);
  await h.connect();
  const before = h.game.world.get(101, 82, 102);
  assert.equal(h.game.world.set(101, 82, 102, 'bedrock'), false);
  assert.equal(h.game.world.set(101, 82, 102, 'dragon_crystal'), false);
  assert.equal(h.game.world.get(101, 82, 102), before);
  await h.client.editQueue;
  assert.equal(h.edits().length, 0);
});
