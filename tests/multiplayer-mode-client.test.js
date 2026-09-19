import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js?v=33';
import { Multiplayer } from '../src/multiplayer.js?v=33';
import { MultiplayerModes } from '../src/multiplayer-modes.js?v=33';
import { BEDWARS_BLOCKS, BEDWARS_SPAWNS, MODE_RULES, mapEdits } from '../src/mode-rules.js?v=33';
import { ITEMS } from '../src/data.js?v=33';

const settle = () => new Promise(resolve => setImmediate(resolve));
const storage = () => ({ data: new Map(), getItem(key) { return this.data.get(key) || null; }, setItem(key, value) { this.data.set(key, value); } });

function harness(t, mode = 'bedwars', role = 'runner') {
  const store = storage(), requests = [];
  const game = new Game({ setWorld() {}, stream() {}, burst() {} }, { play() {}, quiet() {} }, store);
  game.screen = null; game.save();
  const origin = { x: .5, y: 82, z: .5, dimension: 'overworld' };
  const player = (id, index) => {
    const spawn = mode === 'bedwars' ? BEDWARS_SPAWNS[index ? 'tide' : 'ember'] : origin;
    return { id, team: mode === 'bedwars' ? index ? 'tide' : 'ember' : null, role: mode === 'manhunt' ? index ? role === 'runner' ? 'hunter' : 'runner' : role : null, hp: 20, alive: true, eliminated: false, respawnAt: 0, spawn: { ...spawn }, pose: { ...spawn, yaw: 0, pitch: 0, held: 'wood_sword' }, spawnSerial: 1, weapon: 'wood_sword', armor: false, blocks: 32, currency: 30 };
  };
  const match = { id: 'round-1', revision: 1, mode, phase: 'playing', startedAt: Date.now(), endsAt: Date.now() + 600000, headStartUntil: mode === 'manhunt' ? Date.now() + 20000 : 0, beds: { ember: true, tide: true }, origin, beacons: mode === 'manhunt' ? [{ id: 'beacon-1', x: 80, y: 82, z: 24, collected: false }, { id: 'beacon-2', x: -60, y: 82, z: 80, collected: false }, { id: 'beacon-3', x: -80, y: 82, z: -50, collected: false }] : [], players: [player('me', 0), player('other', 1)] };
  const room = { code: 'MODES1', mode, seed: 91357, status: 'playing', hostId: 'me', match, players: match.players.map(player => ({ id: player.id, name: player.id === 'me' ? 'Me' : 'Opponent', pose: { ...player.pose } })) };
  const h = { game, store, requests, serverMatch: match };
  const client = h.client = new Multiplayer(game, { fetcher: async (url, options) => {
    const body = JSON.parse(options.body || '{}'); requests.push(body);
    return { ok: true, status: 200, json: async () => ({ match: structuredClone(h.serverMatch) }) };
  }, eventSource: class {} });
  const ui = { render() {}, resume() { game.resume(); } };
  h.modes = new MultiplayerModes(game, ui, client);
  client.room = structuredClone(room); client.playerId = 'me'; client.token = 'token'; client.status = 'connected';
  client.replaceSnapshot({ edits: mapEdits(mode), revision: 0, buildCount: 0 });
  client.enterWorld();
  h.publish = (patch = {}, self = {}) => {
    h.serverMatch = { ...h.serverMatch, revision: h.serverMatch.revision + 1, ...patch, players: patch.players || h.serverMatch.players.map(player => player.id === 'me' ? { ...player, ...self } : player) };
    client.receive({ type: 'match', match: structuredClone(h.serverMatch) });
  };
  t.after(() => client.reset());
  return h;
}

test('competitive entry selects the right arena dimension and a finite, server-approved loadout', t => {
  for (const mode of ['bedwars', 'manhunt']) {
    const h = harness(t, mode);
    assert.equal(h.game.state.dimension, MODE_RULES[mode].dimension);
    assert.equal(h.game.state.mode, 'arena');
    assert.equal(h.game.creative, false);
    assert.equal(h.game.flying, false);
    assert.equal(h.game.state.selected, 0);
    assert.equal(h.game.held, 'wood_sword');
    assert.equal(h.game.state.bar.length, 9);
    for (const name of h.game.state.bar.slice(2, 8)) { assert.ok(BEDWARS_BLOCKS.includes(name)); assert.equal(h.game.state.inv[name], 32); }
    assert.equal(h.game.state.inv.moonstone_sword, undefined);
    assert.equal(h.game.state.inv.blast_charge, undefined);
  }
});

test('competitive interaction lookup does not access missing solo dragon state', t => {
  const h = harness(t);
  assert.equal(h.game.state.dimension, 'ender');
  assert.equal(h.game.state.dragon, undefined);
  h.game.target = { x: -48, y: 25, z: -4, type: 'bed' };
  assert.doesNotThrow(() => h.game.nearest());
  assert.equal(h.game.nearest(), null);
});

test('match HP and armor are authoritative and local environmental damage cannot kill a player', t => {
  const h = harness(t);
  h.publish({}, { hp: 12, armor: true, weapon: 'iron_sword', blocks: 7 });
  assert.equal(h.game.state.hp, 12);
  assert.equal(h.game.state.armorParts[ITEMS.iron_chestplate.slot], 'iron_chestplate');
  assert.equal(h.game.state.inv.wood_sword, undefined);
  assert.equal(h.game.state.inv.iron_sword, 1);
  assert.equal(h.game.state.inv.plank, 7);
  h.game.hurt(100, true);
  assert.equal(h.game.state.hp, 12);
  assert.equal(h.game.screen, null);
  h.game.state.hp = 2;
  h.modes.update(.1);
  assert.equal(h.game.state.hp, 12);
});

test('late match responses cannot restore stale HP, inventory or the room summary', t => {
  const h = harness(t);
  const old = structuredClone(h.serverMatch);
  h.publish({ revision: 10 }, { hp: 8, blocks: 4, currency: 6 });
  h.client.receive({ type: 'match', match: old });
  assert.equal(h.game.state.hp, 8);
  assert.equal(h.game.state.inv.plank, 4);
  assert.equal(h.modes.match.revision, 10);
  assert.equal(h.client.room.match.revision, 10);
});

test('ordinary match updates preserve local movement while spawn serials apply server corrections', t => {
  const h = harness(t);
  h.game.pos = { x: -43.5, y: 27, z: 3.5 };
  h.publish({}, { currency: 32 });
  assert.deepEqual(h.game.pos, { x: -43.5, y: 27, z: 3.5 });
  h.game.velocity = -12; h.game.vx = 5;
  h.publish({}, { spawnSerial: 2, pose: { x: -46.5, y: 25, z: 2.5, yaw: 1, pitch: .2, dimension: 'ender' } });
  assert.deepEqual(h.game.pos, { x: -46.5, y: 25, z: 2.5 });
  assert.equal(h.game.velocity, 0);
  assert.equal(h.game.vx, 0);
  assert.equal(h.game.yaw, 1);
  assert.equal(h.game.pitch, .2);
});

test('death waits for the server respawn instead of offering a local reset', t => {
  const h = harness(t);
  h.publish({}, { hp: 0, alive: false, respawnAt: Date.now() + 3000 });
  assert.equal(h.game.screen, 'match-respawn');
  assert.equal(h.modes.attack(), true);
  assert.equal(h.requests.length, 0);
  h.publish({}, { hp: 20, alive: true, respawnAt: 0, spawnSerial: 2, pose: { ...BEDWARS_SPAWNS.ember } });
  assert.equal(h.game.screen, null);
  assert.equal(h.game.state.hp, 20);
  assert.equal(h.game.pos.x, BEDWARS_SPAWNS.ember.x);
  h.publish({}, { hp: 0, alive: false, eliminated: true });
  assert.equal(h.game.screen, 'match-spectate');
});

test('hunter head start freezes input and ends only when the server timer releases it', t => {
  const h = harness(t, 'manhunt', 'hunter');
  assert.equal(h.game.screen, 'match-headstart');
  h.game.keys.add('KeyW'); h.game.touch.z = 1; h.game.attackHeld = true;
  h.modes.update(.1);
  assert.equal(h.game.keys.size, 0);
  assert.deepEqual(h.game.touch, { x: 0, z: 0 });
  assert.equal(h.game.attackHeld, false);
  assert.equal(h.modes.attack(), true);
  assert.equal(h.requests.length, 0);
  h.publish({ headStartUntil: Date.now() - 1 });
  assert.equal(h.game.screen, null);
  assert.equal(h.modes.frozen, false);
});

test('head start timers follow server time when a player device clock is different', t => {
  const h = harness(t, 'manhunt', 'hunter');
  const serverNow = Date.now() - 3600000;
  h.publish({ serverNow, headStartUntil: serverNow + 20000 });
  assert.equal(h.game.screen, 'match-headstart');
  assert.equal(h.modes.frozen, true);
  h.publish({ serverNow: serverNow + 21000, headStartUntil: serverNow + 20000 });
  assert.equal(h.game.screen, null);
  assert.equal(h.modes.frozen, false);
});

test('sword targeting requires an opposing player in reach and clear line of sight', async t => {
  const h = harness(t);
  h.game.yaw = 0; h.game.pitch = 0;
  h.client.room.players[1].pose = { x: h.game.pos.x, y: h.game.pos.y, z: h.game.pos.z - 3, dimension: 'ender' };
  h.game.world.raycast = () => null;
  assert.equal(h.modes.opponent()?.id, 'other');
  assert.equal(h.modes.attack(), true);
  assert.equal(h.game.attackCooldown, .6);
  await settle();
  assert.equal(h.requests.filter(request => request.type === 'attack').length, 1);
  h.game.world.raycast = () => ({ distance: 1 });
  assert.equal(h.modes.opponent(), null);
  h.game.world.raycast = () => null;
  h.modes.match.players[1].team = 'ember';
  assert.equal(h.modes.opponent(), null);
  h.game.state.selected = 1;
  assert.equal(h.modes.attack(), false, 'pickaxes retain normal mining');
});

test('runner objectives choose the nearest uncollected beacon and wait out the head start', async t => {
  const h = harness(t, 'manhunt', 'runner');
  h.game.pos = { ...h.serverMatch.beacons[2] };
  assert.equal(h.modes.objective().id, 'beacon-3');
  h.modes.update(.2);
  assert.equal(h.requests.length, 0);
  h.publish({ headStartUntil: Date.now() - 1 });
  h.modes.update(.2);
  await settle();
  assert.equal(h.requests.at(-1).type, 'objective');
  assert.equal(h.requests.at(-1).id, 'beacon-3');
  h.publish({ beacons: h.serverMatch.beacons.map(beacon => ({ ...beacon, collected: true })) });
  assert.equal(h.modes.objective().id, 'escape');
});

test('shop is available at the home generator and keeps purchases server-authoritative', async t => {
  const h = harness(t);
  h.game.pos.x = 0;
  h.modes.shop();
  assert.equal(h.game.screen, null);
  h.game.pos = { ...BEDWARS_SPAWNS.ember };
  h.modes.shop();
  assert.equal(h.game.screen, 'match-shop');
  h.modes.action('buy', 'sword');
  await settle();
  assert.equal(h.requests.at(-1).type, 'buy');
  assert.equal(h.requests.at(-1).item, 'sword');
  assert.equal(h.game.held, 'wood_sword', 'a request alone does not grant the upgrade');
  h.publish({}, { weapon: 'iron_sword', currency: 6 });
  assert.equal(h.game.held, 'iron_sword');
  h.modes.closeShop();
  assert.equal(h.game.screen, null);
});

test('rematch replaces the shared arena and resets elimination, upgrades and round UI', t => {
  const h = harness(t);
  h.client.receive({ type: 'edit', dimension: 'ender', x: 90, y: 80, z: 90, block: 'glass', revision: 1, buildCount: 1 });
  h.publish({ phase: 'ended', winner: 'tide', title: 'Tide wins!' }, { hp: 0, alive: false, eliminated: true, armor: true, weapon: 'iron_sword', blocks: 2 });
  assert.equal(h.game.screen, 'match-result');
  const players = h.serverMatch.players.map(player => ({ ...player, hp: 20, alive: true, eliminated: false, armor: false, weapon: 'wood_sword', blocks: 32, spawnSerial: 1, pose: { ...player.spawn } }));
  const next = { ...h.serverMatch, id: 'round-2', revision: 1, phase: 'playing', winner: null, title: 'Bed Wars', players };
  const room = { ...h.client.room, match: next };
  h.client.receive({ type: 'start', room, snapshot: { edits: mapEdits('bedwars'), revision: 0, buildCount: 0 } });
  assert.equal(h.modes.match.id, 'round-2');
  assert.equal(h.game.screen, null);
  assert.equal(h.game.state.hp, 20);
  assert.equal(h.game.state.inv.iron_sword, undefined);
  assert.equal(h.game.state.inv.plank, 32);
  assert.deepEqual(h.game.state.armorParts, {});
  assert.equal(h.game.world.get(90, 80, 90), null);
});
