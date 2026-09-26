import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../server.js';
import { BEDWARS_BEDS, BEDWARS_SPAWNS, MODE_RULES, mapEdits } from '../src/mode-rules.js?v=38';

async function fixture(t, mode, count = 2) {
  let clock = 1000;
  const server = createServer({ now: () => clock, reconnectGraceMs: 1e9, matchTickMs: 1000000, admissionBurst: 100 });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, body) {
    const result = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: result.status, body: await result.json() };
  }
  const created = await request('/api/rooms', { mode, name: 'Competitive test', playerName: 'Host' });
  assert.equal(created.status, 201);
  const actors = [created.body], code = created.body.room.code;
  async function action(actor, type, values = {}) { return request(`/api/rooms/${code}/action`, { token: actor.token, type, ...values }); }
  async function state(actor = actors[0]) { const result = await request(`/api/rooms/${code}?token=${actor.token}`); assert.equal(result.status, 200); return result.body; }
  for (let index = 1; index < count; index++) {
    const joined = await request(`/api/rooms/${code}/join`, { playerName: `Player ${index}` });
    assert.equal(joined.status, 200);
    actors.push(joined.body);
    await action(joined.body, 'ready', { ready: true });
  }
  async function start() { return action(actors[0], 'start'); }
  function advance(ms) { clock += ms; }
  async function self(actor) { return (await state(actor)).room.match.players.find(player => player.id === actor.playerId); }
  async function move(actor, target) {
    const from = (await self(actor)).pose;
    const steps = Math.max(1, Math.ceil(Math.hypot(target.x - from.x, target.z - from.z) / 14), Math.ceil(Math.abs(target.y - from.y) / 35));
    for (let index = 1; index <= steps; index++) {
      advance(1000);
      const mix = index / steps;
      const result = await action(actor, 'pose', { x: from.x + (target.x - from.x) * mix, y: from.y + (target.y - from.y) * mix, z: from.z + (target.z - from.z) * mix, dimension: MODE_RULES[mode].dimension, yaw: 0, pitch: 0, held: 'wood_sword', moving: true });
      assert.equal(result.status, 200);
    }
    const position = (await self(actor)).pose;
    assert.ok(Math.abs(position.x - target.x) < .01 && Math.abs(position.y - target.y) < .01 && Math.abs(position.z - target.z) < .01, 'movement was accepted');
  }
  return { request, actors, code, action, state, start, advance, self, move };
}

test('competitive modes require two players, balance teams and supply a protected arena', async t => {
  const api = await fixture(t, 'bedwars', 1), [host] = api.actors;
  assert.equal((await api.start()).status, 409);
  const guest = (await api.request(`/api/rooms/${api.code}/join`, { playerName: 'Tide' })).body;
  await api.action(guest, 'ready', { ready: true });
  const started = await api.start();
  assert.equal(started.status, 200);
  const { room, snapshot } = started.body;
  assert.equal(room.mode, 'bedwars');
  assert.deepEqual(room.match.players.map(player => player.team), ['ember', 'tide']);
  assert.deepEqual(room.match.players[0].spawn, BEDWARS_SPAWNS.ember);
  assert.deepEqual(room.match.beds, { ember: true, tide: true });
  assert.deepEqual(snapshot.edits, mapEdits());
  assert.equal(new Map(snapshot.edits.ender).get('-48,25,-4'), 'bed');
  assert.equal((await api.request(`/api/rooms/${api.code}/join`, { playerName: 'Late' })).status, 409);
  assert.equal((await api.action(host, 'rematch')).status, 409);
  assert.equal((await api.request('/api/rooms', { mode: '__proto__' })).status, 400);
  const balanced = await fixture(t, 'bedwars', 7);
  const teams = (await balanced.start()).body.room.match.players.map(player => player.team);
  assert.equal(teams.filter(team => team === 'ember').length, 4);
  assert.equal(teams.filter(team => team === 'tide').length, 3);
});

test('Bed Wars enforces reach, friendly fire, swing cooldown and respawns with a living bed', async t => {
  const api = await fixture(t, 'bedwars', 3), [host, enemy, teammate] = api.actors;
  await api.start();
  assert.equal((await api.action(host, 'attack', { targetId: enemy.playerId })).status, 403);
  assert.equal((await api.action(host, 'attack', { targetId: teammate.playerId })).status, 403);
  assert.equal((await api.action(host, 'fall')).status, 403);
  await api.move(enemy, { x: -47, y: 25, z: 3.5 });
  assert.equal((await api.action(host, 'attack', { targetId: enemy.playerId })).status, 200);
  assert.equal((await api.self(enemy)).hp, 15);
  assert.equal((await api.action(host, 'attack', { targetId: enemy.playerId })).status, 429);
  for (let hit = 0; hit < 3; hit++) { api.advance(550); assert.equal((await api.action(host, 'attack', { targetId: enemy.playerId })).status, 200); }
  const fallen = await api.self(enemy);
  assert.equal(fallen.alive, false);
  assert.equal(fallen.eliminated, false);
  assert.ok(fallen.respawnAt > 0);
  assert.equal((await api.action(enemy, 'attack', { targetId: host.playerId })).status, 409);
  api.advance(3000);
  const respawned = await api.self(enemy);
  assert.equal(respawned.hp, 20);
  assert.equal(respawned.alive, true);
  assert.equal(respawned.spawnSerial, 2);
  assert.equal(respawned.pose.x, BEDWARS_SPAWNS.tide.x);
  assert.equal((await api.state()).room.match.phase, 'playing');
});

test('Bed Wars budgets blocks, protects bases and beds, and sells upgrades at generators', async t => {
  const api = await fixture(t, 'bedwars'), [host] = api.actors;
  await api.start();
  const point = { x: -48, y: 25, z: 5, dimension: 'ender' };
  assert.equal((await api.action(host, 'edit', { ...point, block: 'plank' })).status, 200);
  assert.equal((await api.self(host)).blocks, 31);
  assert.equal((await api.action(host, 'edit', { ...point, block: 'plank' })).status, 409);
  assert.equal((await api.action(host, 'edit', { ...point, block: null })).status, 200);
  assert.equal((await api.self(host)).blocks, 32);
  assert.equal((await api.action(host, 'edit', { ...point, block: null })).status, 403);
  assert.equal((await api.action(host, 'edit', { ...point, block: 'ender_gate' })).status, 403);
  assert.equal((await api.action(host, 'edit', { x: -49, y: 24, z: 3, dimension: 'ender', block: null })).status, 403);
  await api.move(host, { x: -48.5, y: 25, z: 0 });
  assert.equal((await api.action(host, 'edit', { ...BEDWARS_BEDS.ember, block: null })).status, 403);
  assert.equal((await api.action(host, 'edit', { ...BEDWARS_BEDS.tide, block: null })).status, 403);
  await api.move(host, BEDWARS_SPAWNS.ember);
  api.advance(60000);
  const rich = await api.self(host);
  assert.ok(rich.currency >= 52);
  assert.equal((await api.action(host, 'buy', { item: 'sword' })).status, 200);
  assert.equal((await api.action(host, 'buy', { item: 'armor' })).status, 200);
  assert.equal((await api.action(host, 'buy', { item: 'blocks' })).status, 200);
  const equipped = await api.self(host);
  assert.equal(equipped.weapon, 'iron_sword');
  assert.equal(equipped.armor, true);
  assert.equal(equipped.blocks, 48);
  assert.equal((await api.action(host, 'buy', { item: '__proto__' })).status, 400);
  await api.move(host, { x: -30, y: 25, z: 3.5 });
  assert.equal((await api.action(host, 'buy', { item: 'blocks' })).status, 403);
});

test('server combat respects player-built walls and publishes ordered match revisions', async t => {
  const api = await fixture(t, 'bedwars'), [host, enemy] = api.actors;
  const initial = (await api.start()).body.room.match;
  assert.equal(initial.revision, 0);
  assert.equal(initial.serverNow, 1000);
  await api.move(enemy, { x: -47, y: 25, z: 3.5 });
  const wall = { x: -48, y: 26, z: 3, dimension: 'ender', block: 'plank' };
  assert.equal((await api.action(host, 'edit', wall)).status, 200);
  const blockedRevision = (await api.state()).room.match.revision;
  assert.ok(blockedRevision > initial.revision);
  assert.equal((await api.action(host, 'attack', { targetId: enemy.playerId })).status, 403);
  assert.equal((await api.self(enemy)).hp, 20);
  await api.action(host, 'edit', { ...wall, block: null });
  const attack = await api.action(host, 'attack', { targetId: enemy.playerId });
  assert.equal(attack.status, 200);
  assert.ok(attack.body.match.revision > blockedRevision);
  assert.equal(attack.body.match.players.find(player => player.id === enemy.playerId).hp, 15);
});

test('the server rejects bridge placements once the authoritative block pouch is empty', async t => {
  const api = await fixture(t, 'bedwars'), [host] = api.actors;
  await api.start();
  const points = [];
  for (let x = -51; x <= -45; x++) for (let z = 1; z <= 6; z++) points.push({ x, y: 25, z, dimension: 'ender', block: 'plank' });
  for (let index = 0; index < 32; index++) assert.equal((await api.action(host, 'edit', points[index])).status, 200);
  assert.equal((await api.self(host)).blocks, 0);
  assert.equal((await api.action(host, 'edit', points[32])).status, 409);
  const state = await api.state();
  assert.equal(state.snapshot.buildCount, 32);
  assert.equal(new Map(state.snapshot.edits.ender).get(`${points[32].x},25,${points[32].z}`), null);
});

test('breaking an enemy bed makes the final kill decisive; only the host can reset the round', async t => {
  const api = await fixture(t, 'bedwars'), [host, enemy] = api.actors;
  const initial = (await api.start()).body;
  await api.move(host, { x: 48.5, y: 25, z: 0 });
  assert.equal((await api.action(host, 'edit', { ...BEDWARS_BEDS.tide, block: null })).status, 200);
  assert.equal((await api.state()).room.match.beds.tide, false);
  assert.equal((await api.action(host, 'edit', { ...BEDWARS_BEDS.tide, block: 'bed' })).status, 403);
  for (let hit = 0; hit < 4; hit++) { api.advance(550); assert.equal((await api.action(host, 'attack', { targetId: enemy.playerId })).status, 200); }
  const finished = await api.state();
  assert.equal(finished.room.match.phase, 'ended');
  assert.equal(finished.room.match.winner, 'ember');
  assert.equal(finished.room.match.players.find(player => player.id === enemy.playerId).eliminated, true);
  assert.equal((await api.action(enemy, 'rematch')).status, 403);
  const rematch = await api.action(host, 'rematch');
  assert.equal(rematch.status, 200);
  assert.notEqual(rematch.body.room.match.id, initial.room.match.id);
  assert.deepEqual(rematch.body.room.match.beds, { ember: true, tide: true });
  assert.ok(rematch.body.room.match.players.every(player => player.alive && player.hp === 20 && player.currency === 12 && player.blocks === 32));
  assert.deepEqual(rematch.body.snapshot.edits, mapEdits());
  assert.equal(rematch.body.snapshot.revision, 0);
  assert.equal((await api.action(host, 'edit', { x: -48, y: 25, z: 5, block: 'plank', dimension: 'ender', matchId: initial.room.match.id })).status, 409);
  assert.equal((await api.self(host)).blocks, 32);
});

test('destroying a bed during the enemy respawn countdown eliminates that team', async t => {
  const api = await fixture(t, 'bedwars'), [host, enemy] = api.actors;
  await api.start();
  await api.move(host, { x: 48.5, y: 25, z: 0 });
  for (let hit = 0; hit < 4; hit++) { api.advance(550); await api.action(host, 'attack', { targetId: enemy.playerId }); }
  assert.equal((await api.self(enemy)).eliminated, false);
  await api.action(host, 'edit', { ...BEDWARS_BEDS.tide, block: null });
  assert.equal((await api.state()).room.match.winner, 'ember');
  api.advance(5000);
  assert.equal((await api.self(enemy)).alive, false);
});

test('invalid teleports are corrected and crossing the void threshold causes a real respawn', async t => {
  const api = await fixture(t, 'bedwars'), [host] = api.actors;
  await api.start();
  await api.action(host, 'pose', { x: 48.5, y: 25, z: 3.5, dimension: 'ender' });
  assert.equal((await api.self(host)).pose.x, -48.5);
  assert.equal((await api.self(host)).spawnSerial, 2);
  await api.action(host, 'pose', { x: -48.5, y: 25, z: 3.5, dimension: 'overworld' });
  assert.equal((await api.self(host)).pose.dimension, 'ender');
  api.advance(1000);
  await api.action(host, 'pose', { x: -48.5, y: -1, z: 3.5, dimension: 'ender' });
  assert.equal((await api.self(host)).alive, false);
  api.advance(3000);
  assert.equal((await api.self(host)).pose.y, 25);
  assert.equal((await api.self(host)).alive, true);
});

test('Manhunt freezes hunters during head start and validates checkpoint ownership and proximity', async t => {
  const api = await fixture(t, 'manhunt'), [runner, hunter] = api.actors;
  const initial = (await api.start()).body.room.match;
  assert.equal(initial.players.find(player => player.id === runner.playerId).role, 'runner');
  assert.equal(initial.players.find(player => player.id === hunter.playerId).role, 'hunter');
  assert.equal(initial.headStartUntil - initial.startedAt, 20000);
  assert.equal(initial.endsAt - initial.headStartUntil, 360000);
  assert.equal((await api.action(hunter, 'attack', { targetId: runner.playerId })).status, 409);
  assert.equal((await api.action(runner, 'objective', { id: initial.beacons[0].id })).status, 409);
  api.advance(1000);
  await api.action(hunter, 'pose', { ...initial.origin, x: initial.origin.x + 10 });
  assert.equal((await api.self(hunter)).pose.x, initial.origin.x);
  api.advance(20000);
  assert.equal((await api.state()).room.match.huntersReleased, true);
  assert.equal((await api.action(hunter, 'objective', { id: initial.beacons[0].id })).status, 403);
  assert.equal((await api.action(runner, 'objective', { id: initial.beacons[0].id })).status, 403);
  assert.equal((await api.action(runner, 'objective', { id: 'escape' })).status, 409);
  for (const beacon of initial.beacons) {
    await api.move(runner, beacon);
    assert.equal((await api.action(runner, 'objective', { id: beacon.id })).status, 200);
  }
  assert.equal((await api.action(runner, 'objective', { id: 'escape' })).status, 403);
  await api.move(runner, initial.origin);
  assert.equal((await api.action(runner, 'objective', { id: 'escape' })).status, 200);
  assert.equal((await api.state()).room.match.winner, 'runner');
  assert.equal((await api.state()).room.match.phase, 'ended');
});

test('Manhunt hunters respawn; a caught runner or an expired clock ends the hunt', async t => {
  const api = await fixture(t, 'manhunt'), [runner, hunter] = api.actors;
  await api.start();
  api.advance(20000);
  for (let hit = 0; hit < 4; hit++) { api.advance(550); assert.equal((await api.action(runner, 'attack', { targetId: hunter.playerId })).status, 200); }
  assert.equal((await api.self(hunter)).alive, false);
  assert.equal((await api.state()).room.match.phase, 'playing');
  api.advance(3000);
  assert.equal((await api.self(hunter)).alive, true);
  for (let hit = 0; hit < 4; hit++) { api.advance(550); assert.equal((await api.action(hunter, 'attack', { targetId: runner.playerId })).status, 200); }
  assert.equal((await api.state()).room.match.winner, 'hunters');
  await api.action(runner, 'rematch');
  api.advance(380001);
  const expired = await api.state();
  assert.equal(expired.room.match.phase, 'ended');
  assert.equal(expired.room.match.winner, 'hunters');
  assert.match(expired.room.match.title, /Time is up/);
});

test('leaving forfeits a competitive team or role without blocking host migration', async t => {
  const api = await fixture(t, 'manhunt'), [runner, hunter] = api.actors;
  await api.start();
  assert.equal((await api.action(runner, 'leave')).status, 200);
  const result = await api.state(hunter);
  assert.equal(result.room.hostId, hunter.playerId);
  assert.equal(result.room.match.winner, 'hunters');
  assert.equal((await api.action(hunter, 'rematch')).status, 409);
});
