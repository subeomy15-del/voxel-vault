import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js?v=36';
import { Parkour } from '../src/parkour.js?v=36';
import { CLOUDSTEP } from '../src/parkour-course.js?v=36';
import { movementInput, releaseJump } from '../src/movement.js?v=36';
import { slotKey } from '../src/save.js?v=36';

function harness() {
  const storage = { data: new Map(), writes: [], getItem(key) { return this.data.get(key) || null; }, setItem(key, value) { this.data.set(key, value); this.writes.push(key); } };
  const audio = { events: [], play(name) { this.events.push(name); }, quiet() {} };
  const game = new Game({ settings: { particles: 'off' }, setWorld() {}, stream() {}, burst() {} }, audio, storage);
  const course = new Parkour(game);
  return { game, course, storage, audio };
}
const bestKey = 'voxel-vault-parkour-' + CLOUDSTEP.id;
function visit(game, course, point, dt = 1) {
  game.pos = { x: point.x, y: point.y, z: point.z }; game.grounded = true; game.frameElapsed = dt; course.update(dt);
}

test('parkour isolates the solo save, restarts independently, and restores the exact solo state on leave', () => {
  const { game, course, storage } = harness();
  game.state.inv.diamond = 7; game.pos.x += 1; game.save();
  const solo = structuredClone(game.state), disk = storage.getItem(slotKey(game.state.mode));
  assert.equal(course.start(), true);
  assert.equal(game.state.mode, 'parkour'); assert.equal(game.state.dimension, 'parkour');
  assert.deepEqual(game.state.inv, {}); assert.equal(game.mobs.length, 0);
  game.state.stats.built = 999; game.pos.x = 40; game.save();
  assert.equal(storage.getItem(slotKey(solo.mode)), disk);
  assert.equal(course.start(), true); assert.equal(course.timer.elapsed, 0);
  course.leave(); assert.deepEqual(game.state, solo); assert.deepEqual(game.pos, solo.pos);
  assert.equal(game.screen, 'menu'); assert.equal(storage.getItem(slotKey(solo.mode)), disk);
  assert.equal(storage.data.has(slotKey('parkour')), false);
});

test('checkpoints require ordered grounded contact and the timer excludes idle and paused time', () => {
  const { game, course } = harness(); course.start();
  course.update(10); assert.equal(course.timer.elapsed, 0);
  game.pos.x += .2; course.update(.25); assert.equal(course.timer.elapsed, .25);
  game.screen = 'pause'; course.update(10); assert.equal(course.timer.elapsed, .25); game.screen = null;
  visit(game, course, CLOUDSTEP.checkpoints[2]); assert.equal(course.checkpoint, 0);
  game.pos = { ...CLOUDSTEP.checkpoints[1] }; game.grounded = false; course.update(.1); assert.equal(course.checkpoint, 0);
  game.grounded = true; game.pos.y += .5; course.update(.1); assert.equal(course.checkpoint, 0);
  visit(game, course, CLOUDSTEP.checkpoints[1]); assert.equal(course.checkpoint, 1);
  const split = [...course.timer.splits]; course.update(.1); assert.deepEqual(course.timer.splits, split);
  assert.deepEqual(game.state.spawn, { x: .5, y: 14, z: -16.5 });
});

test('finish requires all checkpoints, persists a valid PB once, and slower replays preserve it', () => {
  const { game, course, storage } = harness(); course.start();
  visit(game, course, CLOUDSTEP.finish); assert.equal(course.timer.finished, false);
  for (const cp of CLOUDSTEP.checkpoints.slice(1)) visit(game, course, cp, 2);
  visit(game, course, CLOUDSTEP.finish, 2);
  assert.equal(course.timer.finished, true); assert.equal(game.screen, 'parkour-results');
  assert.equal(course.newBest, true); assert.equal(course.best.splits.length, 4);
  const best = storage.getItem(bestKey), writes = storage.writes.filter(key => key === bestKey).length;
  course.finish(); assert.equal(storage.writes.filter(key => key === bestKey).length, writes);
  course.start(); assert.deepEqual(course.best, JSON.parse(best));
  for (const cp of CLOUDSTEP.checkpoints.slice(1)) visit(game, course, cp, 8);
  visit(game, course, CLOUDSTEP.finish, 8);
  assert.equal(course.newBest, false); assert.equal(storage.getItem(bestKey), best);
});

test('invalid stored personal bests are discarded and storage failure does not prevent finishing', () => {
  const { game, course, storage } = harness();
  for (const invalid of ['no JSON', '{"time":-1,"splits":[]}', '{"time":20,"splits":[1,8,4,12]}', '{"time":20,"splits":[1,2,3,30]}']) {
    storage.data.set(bestKey, invalid); course.start(); assert.equal(course.best, null);
  }
  storage.setItem = () => { throw Error('quota'); };
  for (const cp of CLOUDSTEP.checkpoints.slice(1)) visit(game, course, cp);
  visit(game, course, CLOUDSTEP.finish);
  assert.equal(course.timer.finished, true); assert.equal(course.storageFailed, true);
});

test('checkpoint retries clear velocity, held and toggled inputs, mantle and launch impulses', () => {
  const { game, course } = harness(); course.start(); course.checkpoint = 2;
  movementInput(game, 'KeyW', true); movementInput(game, 'Space', true); movementInput(game, 'ShiftLeft', true);
  Object.assign(game, { vx: 12, vz: -9, velocity: 15, mantle: {}, jumpBuffer: .1, jumpIntent: .2, jumpActive: true, coyote: .1, padFlight: .6, touchSprint: true, sprintToggle: true, crouchToggle: true, landingImpulse: 1, jumpImpulse: 1, touch: { x: 1, z: -1 } });
  assert.equal(course.resetToCheckpoint(), true); assert.equal(course.resetToCheckpoint(), false);
  for (const name of ['vx', 'vz', 'velocity', 'jumpBuffer', 'jumpIntent', 'coyote', 'padFlight', 'landingImpulse', 'jumpImpulse']) assert.equal(game[name], 0, name);
  for (const name of ['jumpActive', 'touchSprint', 'sprintToggle', 'crouchToggle']) assert.equal(game[name], false, name);
  assert.equal(game.mantle, null); assert.equal(game.keys.size, 0); assert.equal(game.movementInputHeld.size, 0); assert.deepEqual(game.touch, { x: 0, z: 0 });
  game.update(.15); assert.deepEqual(game.pos, { x: 31.5, y: 17, z: -18.5 });
  game.update(.15); assert.equal(course.respawnTime, 0); assert.equal(course.falls, 1); assert.equal(game.grounded, true);
});

test('course terrain stays immutable during building, mining input, combat, and normal updates', () => {
  const { game, course } = harness(); course.start();
  const before = game.world.get(0, 12, 5); assert.ok(before);
  assert.equal(game.world.set(0, 12, 5, null), false); assert.equal(game.world.set(0, 13, 4, 'stone'), false);
  game.target = { x: 0, y: 12, z: 5, type: before, normal: { x: 0, y: 1, z: 0 } };
  game.attackHeld = true; game.placeHeld = true; assert.equal(game.place(), false); game.attack();
  for (let i = 0; i < 120; i++) game.update(1 / 60);
  assert.equal(game.world.get(0, 12, 5), before); assert.equal(game.world.edits.size, 0);
  assert.equal(game.state.stats.mined, 0); assert.equal(game.state.stats.built, 0); assert.equal(game.state.hp, 20);
});

// Each entry is a real run-up, a takeoff threshold, and the next landing platform.
// No velocity or position is changed between takeoff and landing.
const jumps = [
  [0, .5, 2, .5, -3.5, 'z', .8], [1, .5, -3, .5, -9, 'z', -4.6],
  [2, .5, -8.5, .5, -16, 'z', -10.6], [3, 2, -18.5, 9, -18.5, 'x', 4.6],
  [4, 8, -18.5, 15, -18.5, 'x', 10.6], [5, 14, -18.5, 21.5, -18.5, 'x', 16.6],
  [6, 21, -18.5, 31.5, -18.5, 'x', 23.6], [7, 31.5, -19, 31.5, -28, 'z', -21.6],
  [8, 31.5, -27, 31.5, -34, 'z', -29.6], [9, 31.5, -34, 31.5, -40.5, 'z', -35.6],
  [10, 31.5, -40, 31.5, -49.5, 'z', -42.6],
  [13, 31, -65.5, 24.5, -66.5, 'x', 28.4], [14, 24.5, -67, 19.5, -71.5, 'x', 23.4],
  [15, 19.5, -71.5, 14, -75.5, 'x', 18.4], [16, 14, -75.5, 7, -78.5, 'x', 12.4],
];

test('every intended platform jump is reachable using the actual sprint/jump controller at 60 and 20 FPS', () => {
  const { game, course } = harness();
  for (const dt of [1 / 60, .05]) for (const [index, x, z, tx, tz, axis, edge] of jumps) {
    course.start(); game.pos = { x, y: CLOUDSTEP.platforms[index][4], z }; game.yaw = Math.atan2(-(tx - x), -(tz - z));
    game.keys.add('KeyW'); game.keys.add('ShiftLeft');
    const sign = Math.sign((axis === 'x' ? tx - x : tz - z));
    let jumped = false, landed = false;
    for (let frame = 0; frame < Math.ceil(3 / dt); frame++) {
      if (!jumped && (game.pos[axis] - edge) * sign >= 0) { game.jump(); jumped = true; }
      game.update(dt);
      assert.equal(game.world.intersects(game.pos.x, game.pos.y, game.pos.z), false, `platform ${index}, clipping`);
      const [x1, x2, z1, z2, top] = CLOUDSTEP.platforms[index + 1];
      if (jumped && game.grounded && Math.abs(game.pos.y - top) < .01 && game.pos.x >= x1 - .27 && game.pos.x <= x2 + 1.27 && game.pos.z >= z1 - .27 && game.pos.z <= z2 + 1.27) { landed = true; break; }
      if (jumped && game.pos.y < top - 1.1 || course.respawnTime) break;
    }
    assert.ok(landed, `platform ${index} -> ${index + 1} at ${Math.round(1 / dt)} FPS, final ${JSON.stringify(game.pos)}`);
  }
});

test('holding forward over the launch pad reaches the elevated sky deck without jump-release cutoff', () => {
  const { game, course } = harness();
  for (const dt of [1 / 60, .05]) {
    course.start(); course.checkpoint = 3; game.pos = { x: 31.5, y: 18, z: -49.5 }; game.yaw = 0;
    game.keys.add('KeyW'); game.keys.add('ShiftLeft');
    let launched = false, landed = false;
    for (let frame = 0; frame < 5 / dt; frame++) {
      game.update(dt);
      if (!launched && game.padFlight > 0) { launched = true; game.jumpActive = true; releaseJump(game); assert.equal(game.velocity, 15); }
      if (launched && game.grounded && game.pos.y > 20.9 && game.pos.z < -61.7) { landed = true; break; }
      if (course.respawnTime) break;
    }
    assert.ok(launched, 'pad activates from a grounded approach');
    assert.ok(landed, `launch pad landing at ${Math.round(1 / dt)} FPS, final ${JSON.stringify(game.pos)}`);
    assert.equal(game.world.edits.size, 0);
  }
});
