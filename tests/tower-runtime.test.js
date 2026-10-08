import test from 'node:test';
import assert from 'node:assert/strict';
import { TowerRuntime, gateIsOpen, touchesSweeper } from '../src/tower-runtime.js?v=43';
import { movePlayer, requestJump } from '../src/movement.js?v=43';

function harness(dynamics, floor = []) {
  const base = new Map(floor), edits = new Map();
  const world = {
    edits, changes: [], dirty: new Set(), landmarks: [],
    get(x, y, z) { const k = `${x},${y},${z}`; return edits.has(k) ? edits.get(k) : base.get(k) || null; },
    waterAt() { return false; },
    intersects(x, y, z, height = 1.75, radius = .28) {
      for (let a = Math.floor(x - radius); a <= Math.floor(x + radius); a++) for (let b = Math.floor(y + .001); b <= Math.floor(y + height - .001); b++) for (let c = Math.floor(z - radius); c <= Math.floor(z + radius); c++) if (this.get(a, b, c)) return true;
      return false;
    },
    ground(x, z, from = 95) { for (let y = Math.floor(from); y >= -64; y--) if (this.get(Math.floor(x), y, Math.floor(z))) return y + 1; return -65; },
    solid(x, y, z) { return !!this.get(x, y, z); },
  };
  const game = {
    world, pos: { x: 0, y: 10, z: 0 }, vx: 0, vz: 0, velocity: 0, grounded: true, screen: null,
    keys: new Set(), touch: { x: 0, z: 0 }, yaw: 0, pitch: 0, stamina: 100, walk: 0, stepTimer: 0,
    state: { mode: 'parkour', dimension: 'parkour', inv: {}, exhaustion: 0, food: 20, effects: {}, armorParts: {} },
    renderer: { settings: { particles: 'off' }, burst() {} }, audio: { play() {} }, emit() {}, effect() { return false; }, hurt() {},
  };
  const parkour = { timer: { finished: false }, respawnTime: 0, checkpoint: 0, falls: 0, resetToCheckpoint() { this.falls++; this.respawnTime = .28; } };
  const runtime = new TowerRuntime(game, parkour); runtime.reset({ tower: true, dynamics, color: '#88ccff' });
  return { game, parkour, runtime, world, base };
}

const shuttle = { id: 'shuttle', kind: 'moving', from: { x: 0, y: 10, z: 0 }, to: { x: 4, y: 10, z: 0 }, size: { x: 3, z: 3 }, period: 4 };
function tick(h, count) { for (let i = 0; i < count; i++) { movePlayer(h.game, .025); h.runtime.update(.025); } }

test('moving platforms collide with the real movement solver and carry riders, but release a jumping player', () => {
  const h = harness([shuttle]);
  assert.equal(h.world.intersects(0, 9.9, 0), true);
  assert.equal(h.world.intersects(0, 10, 0), false);
  assert.equal(h.world.ground(0, 0, 11), 10);
  tick(h, 40);
  assert.ok(Math.abs(h.game.pos.x - 2) < .02, `rider should travel with platform, x=${h.game.pos.x}`);
  assert.ok(Math.abs(h.game.pos.y - 10) < .02); assert.equal(h.game.grounded, true);
  requestJump(h.game); const x = h.game.pos.x;
  tick(h, 8);
  assert.ok(Math.abs(h.game.pos.x - x) < .02, 'jumping breaks attachment to the platform');
  assert.ok(h.game.pos.y > 11); assert.equal(h.game.grounded, false);
  h.runtime.dispose(); assert.equal(h.world.ground(0, 0, 11), -65);
});

test('a rising and falling lift keeps the rider supported and collision poses freeze during pause', () => {
  const h = harness([{ ...shuttle, kind: 'lift', to: { x: 0, y: 14, z: 0 } }]);
  tick(h, 80); assert.ok(Math.abs(h.game.pos.y - 14) < .02); assert.equal(h.game.grounded, true);
  tick(h, 40); assert.ok(Math.abs(h.game.pos.y - 12) < .02); assert.equal(h.game.grounded, true);
  const time = h.runtime.time, pos = { ...h.runtime.obstacles[0].position };
  h.game.screen = 'pause'; h.runtime.update(9);
  assert.equal(h.runtime.time, time); assert.deepEqual(h.runtime.obstacles[0].position, pos);
  h.game.screen = null; h.parkour.respawnTime = .2; h.runtime.update(9); assert.equal(h.runtime.time, time);
  h.runtime.dispose();
});

test('a moving platform catches descending feet and pushes side contacts clear of its solid body', () => {
  const mover = { ...shuttle, from: { x: -3, y: 11, z: 0 }, to: { x: 3, y: 11, z: 0 }, period: 2 };
  const side = harness([mover]); side.runtime.update(.5);
  assert.equal(side.world.intersects(side.game.pos.x, side.game.pos.y, side.game.pos.z), false);
  assert.ok(Math.abs(side.game.pos.x) > 1.7, 'the moving side must eject, rather than embed, the body');
  const feet = harness([mover]); feet.game.pos.y = 10.8; feet.game.grounded = false; feet.game.velocity = -2; feet.runtime.respawn(); feet.runtime.update(.5);
  assert.equal(feet.game.pos.y, 11); assert.equal(feet.game.grounded, true); assert.equal(feet.game.velocity, 0);
  side.runtime.dispose(); feet.runtime.dispose();
});

test('low ceilings block standing players and allow the crouched body through', () => {
  const h = harness([{ id: 'tunnel', kind: 'ceiling', bounds: { x1: -1, x2: 1, y1: 11.45, y2: 12.05, z1: -2, z2: 2 } }]);
  assert.equal(h.world.intersects(0, 10, 0, 1.75), true);
  assert.equal(h.world.intersects(0, 10, 0, 1.3), false);
  const original = h.runtime.originalIntersects;
  h.runtime.dispose(); assert.equal(h.world.intersects, original); assert.equal(h.world.intersects(0, 10, 0), false);
});

test('crumbling steps remove collision, rebuild on recovery, and restore preexisting edits exactly on exit', () => {
  const cells = [['0,9,0', 'stonebrick'], ['1,9,0', 'stonebrick']];
  const spec = { id: 'crumble', kind: 'crumble', platform: [0, 1, 0, 0, 10], delay: .1, restore: .2 };
  const h = harness([spec], cells); h.game.pos.x = .5; h.game.pos.z = .5; h.runtime.respawn();
  h.runtime.update(.01); h.runtime.update(.11);
  assert.equal(h.world.get(0, 9, 0), null); assert.equal(h.world.get(1, 9, 0), null);
  assert.equal(h.game.grounded, false); assert.equal(h.world.dirty.size > 0, true);
  h.runtime.update(.21);
  assert.equal(h.world.get(0, 9, 0), 'stonebrick'); assert.equal(h.world.edits.size, 0);
  h.game.grounded = true; h.runtime.update(.01); h.runtime.update(.11);
  h.runtime.dispose(); assert.equal(h.world.get(0, 9, 0), 'stonebrick'); assert.equal(h.world.edits.size, 0);
  const h2 = harness([], cells); h2.world.edits.set('0,9,0', 'gold_block'); h2.runtime.reset({ tower: true, dynamics: [spec] });
  h2.game.pos = { x: .5, y: 10, z: .5 }; h2.runtime.respawn(); h2.runtime.update(.01); h2.runtime.update(.11); h2.runtime.dispose();
  assert.equal(h2.world.edits.get('0,9,0'), 'gold_block'); assert.equal(h2.world.edits.has('1,9,0'), false);
});

test('timed laser gates reset closed crossings, accept green crossings, and cannot be skipped between frames', () => {
  const spec = { id: 'gate', kind: 'gate', bounds: { x1: -.12, x2: .12, y1: 10, y2: 13.7, z1: -2, z2: 2 }, period: 4, openDuration: 2 };
  assert.equal(gateIsOpen(spec, 1), true); assert.equal(gateIsOpen(spec, 2.5), false);
  const h = harness([spec]); h.game.pos.x = -1; h.runtime.respawn(); h.runtime.time = 2.5;
  h.game.pos.x = 1; h.runtime.update(.025); assert.equal(h.parkour.falls, 1);
  const green = harness([spec]); green.game.pos.x = -1; green.runtime.respawn(); green.game.pos.x = 1; green.runtime.update(.025);
  assert.equal(green.parkour.falls, 0); h.runtime.dispose(); green.runtime.dispose();
});

test('rotating sweepers use the actual rotating beam and jumping above it clears the hazard', () => {
  const spec = { id: 'sweeper', kind: 'sweeper', center: { x: 0, y: 10.65, z: 0 }, radius: 3, speed: Math.PI / 2, beamRadius: .22 };
  assert.equal(touchesSweeper(spec, 0, { x: 2, y: 10, z: 0 }), true);
  assert.equal(touchesSweeper(spec, 0, { x: 0, y: 10, z: 2 }), false);
  assert.equal(touchesSweeper(spec, 1, { x: 0, y: 10, z: 2 }), true);
  assert.equal(touchesSweeper(spec, 0, { x: 2, y: 11, z: 0 }), false);
  const h = harness([spec]); h.game.pos = { x: 2, y: 10, z: 0 }; h.runtime.respawn(); h.runtime.update(.025);
  assert.equal(h.parkour.falls, 1); h.runtime.dispose();
});

test('checkpoint respawns rebuild steps and do not sweep through hazards from the old position', () => {
  const h = harness([{ id: 'gate', kind: 'gate', bounds: { x1: -.1, x2: .1, y1: 10, y2: 14, z1: -1, z2: 1 }, phase: 3, period: 4, openDuration: 1 }]);
  h.game.pos.x = -1; h.runtime.respawn(); h.game.pos.x = 1; h.runtime.respawn(); h.runtime.update(.025);
  assert.equal(h.parkour.falls, 0); h.runtime.dispose();
});
