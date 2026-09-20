import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/world.js?v=35';
import { movePlayer, requestJump, releaseJump, movementInput, startMantle, MOVEMENT } from '../src/movement.js?v=35';

function player(options = {}) {
  const world = new World();
  world.edits.clear(); world.structures.clear();
  world.base = options.base || ((_x, y, _z) => y === 0 ? 'stone' : null);
  const g = {
    world, pos: { x: .5, y: 1, z: 3.5 }, yaw: 0, pitch: 0, velocity: 0, vx: 0, vz: 0,
    grounded: true, coyote: .11, jumpBuffer: 0, keys: new Set(), touch: { x: 0, z: 0 },
    stamina: 100, dashTime: 0, walk: 0, stepTimer: 0, cameraOffset: 0,
    state: { mode: 'adventure', inv: {}, food: 20, exhaustion: 0, effects: {} },
    renderer: { settings: { particles: false, ...options.settings }, burst() {} },
    events: [], audio: { play() {} },
    emit(type, payload = {}) { this.events.push({ type, ...payload }); },
    effect(name) { return this.state.effects[name] > 0; },
    hurt(amount) { this.damage = (this.damage || 0) + amount; },
    returnHome() { this.pos = { x: .5, y: 1, z: 3.5 }; },
    get creative() { return this.state.mode === 'creative'; }
  };
  return g;
}
function advance(g, seconds, dt = 1 / 120) { for (let t = 0; t < seconds - 1e-8; t += dt) movePlayer(g, Math.min(dt, seconds - t)); }

test('ground acceleration, braking and reversing respond promptly without diagonal speed gain', () => {
  const straight = player(), diagonal = player();
  straight.keys.add('KeyW'); diagonal.keys.add('KeyW'); diagonal.keys.add('KeyD');
  advance(straight, .15); advance(diagonal, .15);
  assert.equal(straight.vz, -MOVEMENT.walk);
  assert.ok(Math.abs(Math.hypot(diagonal.vx, diagonal.vz) - MOVEMENT.walk) < 1e-8);
  straight.keys.clear(); const before = straight.pos.z; advance(straight, .1);
  assert.equal(Math.abs(straight.vz), 0);
  assert.ok(before - straight.pos.z < .2, 'release brakes within a small fraction of one block');
  diagonal.keys.clear(); diagonal.keys.add('KeyS'); advance(diagonal, .17);
  assert.ok(diagonal.vz > 4 && Math.abs(diagonal.vx) < .05);
});

test('releasing air input preserves jump momentum while air steering remains bounded', () => {
  const coast = player(); coast.pos.y = 8; coast.grounded = false; coast.vx = 7.4;
  advance(coast, .3);
  assert.ok(coast.vx > 6.8);
  assert.ok(coast.pos.x > 2.5);
  const steer = player(); steer.pos.y = 8; steer.grounded = false; steer.vz = -7.4; steer.keys.add('KeyD');
  advance(steer, .3);
  assert.ok(steer.vx > 3);
  assert.ok(steer.vz < -5);
  assert.ok(Math.hypot(steer.vx, steer.vz) <= 7.4 + 1e-8, 'air strafing does not create extra speed');
});

test('explicit jump release produces a short hop while scripted and held jumps keep the 8.8 launch', () => {
  const full = player(), short = player();
  requestJump(full); requestJump(short);
  assert.equal(full.velocity, 8.8);
  let fullApex = full.pos.y, shortApex = short.pos.y;
  for (let frame = 0; frame < 100; frame++) {
    if (frame === 7) releaseJump(short);
    movePlayer(full, 1 / 120); movePlayer(short, 1 / 120);
    fullApex = Math.max(fullApex, full.pos.y); shortApex = Math.max(shortApex, short.pos.y);
  }
  assert.ok(fullApex > 2.5);
  assert.ok(shortApex < fullApex - .65);
  assert.ok(full.grounded && short.grounded);
  assert.ok(Math.abs(full.pos.y - 1) < .003);
});

test('jump buffers trigger on landing and coyote jumps work shortly after leaving an edge', () => {
  const buffered = player(); buffered.pos.y = 1.15; buffered.grounded = false; buffered.coyote = 0; buffered.velocity = -2;
  requestJump(buffered); assert.equal(buffered.velocity, -2); advance(buffered, .09);
  assert.ok(buffered.velocity > 0);
  const edge = player({ base: (_x, y, z) => y === 0 && z >= 0 ? 'stone' : null });
  edge.pos.z = .35; edge.keys.add('KeyW'); edge.keys.add('ShiftLeft');
  for (let i = 0; i < 60 && edge.grounded; i++) movePlayer(edge, 1 / 120);
  assert.equal(edge.grounded, false);
  assert.ok(edge.coyote > 0);
  requestJump(edge); assert.equal(edge.velocity, 8.8);
  const expired = player(); expired.pos.y = 10; expired.grounded = false; expired.coyote = 0;
  requestJump(expired); advance(expired, .2);
  assert.equal(expired.jumpBuffer, 0);
  assert.ok(expired.velocity < 0);
});

test('toggle sprint and crouch respond to fresh presses and release does not untoggle them', () => {
  const g = player({ settings: { sprintMode: 'toggle', crouchMode: 'toggle' } });
  movementInput(g, 'KeyW', true); movementInput(g, 'ShiftLeft', true); movementInput(g, 'ShiftLeft', true); movementInput(g, 'ShiftRight', true);
  movementInput(g, 'ShiftLeft', false); movementInput(g, 'ShiftRight', false); movePlayer(g, .02);
  assert.equal(g.sprinting, true);
  movementInput(g, 'ShiftLeft', true); movementInput(g, 'ShiftLeft', false); movePlayer(g, .02);
  assert.equal(g.sprinting, false);
  movementInput(g, 'ControlLeft', true); movementInput(g, 'ControlLeft', false); movePlayer(g, .02);
  assert.equal(g.crouching, true);
  movementInput(g, 'KeyX', true); movementInput(g, 'KeyX', false); movePlayer(g, .02);
  assert.equal(g.crouching, false);
});

test('Ctrl and X crouch everywhere while C crouches only inside the parkour course', () => {
  const g = player();
  movementInput(g, 'KeyC', true); movePlayer(g, .02); assert.equal(g.crouching, false);
  movementInput(g, 'KeyC', false); g.state.mode = 'parkour'; movementInput(g, 'KeyC', true); movePlayer(g, .02); assert.equal(g.crouching, true);
  movementInput(g, 'KeyC', false); movementInput(g, 'ControlRight', true); movePlayer(g, .02); assert.equal(g.crouching, true);
  movementInput(g, 'ControlRight', false); movePlayer(g, .02); assert.equal(g.crouching, false);
});

test('crouching protects ledges and cannot stand through a low ceiling', () => {
  const edge = player({ base: (_x, y, z) => y === 0 && z >= 0 ? 'stone' : null });
  edge.pos.z = .35; edge.keys.add('KeyW'); edge.keys.add('ControlLeft'); advance(edge, 1);
  assert.ok(edge.pos.z > -.28);
  assert.ok(edge.grounded);
  edge.keys.delete('ControlLeft'); advance(edge, .3);
  assert.ok(edge.pos.y < .9);
  const low = player(); low.pos.y = 1.5; low.pos.z = .5; low.world.set(0, 1, 0, 'oak_slab'); low.world.set(0, 3, 0, 'stone');
  movePlayer(low, .02);
  assert.equal(low.crouching, true);
  assert.equal(low.world.intersects(low.pos.x, low.pos.y, low.pos.z, 1.3), false);
});

test('a safe mantle moves smoothly onto a ledge without intersecting terrain', () => {
  for (const dt of [1 / 120, 1 / 60, .05]) {
    const g = player(); g.pos.z = 1.35; g.world.set(0, 1, 0, 'stone');
    assert.equal(startMantle(g), true);
    let last = { ...g.pos };
    for (let i = 0; i < 80 && g.mantle; i++) {
      movePlayer(g, dt);
      assert.equal(g.world.intersects(g.pos.x, g.pos.y, g.pos.z), false);
      assert.ok(Math.hypot(g.pos.x - last.x, g.pos.y - last.y, g.pos.z - last.z) < .7);
      last = { ...g.pos };
    }
    assert.equal(g.mantle, null);
    assert.ok(g.grounded);
    assert.ok(Math.abs(g.pos.y - 2) < .01);
    assert.ok(g.pos.z < 1);
  }
});

test('a fresh forward jump can catch a ledge while ordinary walking cannot auto-climb it', () => {
  const g = player(); g.pos.z = 1.3; g.world.set(0, 1, 0, 'stone'); g.keys.add('KeyW');
  requestJump(g);
  for (let i = 0; i < 60 && !g.events.some(event => event.type === 'mantle'); i++) movePlayer(g, 1 / 120);
  assert.ok(g.events.some(event => event.type === 'mantle'));
  while (g.mantle) { movePlayer(g, 1 / 120); assert.equal(g.world.intersects(g.pos.x, g.pos.y, g.pos.z), false); }
  assert.ok(g.pos.y >= 1.99);
  const walk = player(); walk.pos.z = 1.3; walk.world.set(0, 1, 0, 'stone'); walk.keys.add('KeyW'); advance(walk, .4);
  assert.equal(walk.mantle, undefined);
  assert.ok(walk.pos.z >= 1.27);
});

test('mantles reject tall walls, low ceilings, unsupported landings and excessive reach', () => {
  const high = player(); high.pos.z = 1.35; high.world.set(0, 1, 0, 'stone'); high.world.set(0, 2, 0, 'stone');
  assert.equal(startMantle(high), false);
  const ceiling = player(); ceiling.pos.z = 1.35; ceiling.world.set(0, 1, 0, 'stone'); ceiling.world.set(0, 3, 0, 'stone');
  assert.equal(startMantle(ceiling), false);
  const empty = player(); empty.pos.z = 1.35; assert.equal(startMantle(empty), false);
  const distant = player(); distant.pos.z = 2.35; distant.world.set(0, 1, 0, 'stone'); assert.equal(startMantle(distant), false);
});

test('an obstruction or teleport cancels a mantle instead of clipping or pulling the player back', () => {
  const blocked = player(); blocked.pos.z = 1.35; blocked.world.set(0, 1, 0, 'stone'); assert.ok(startMantle(blocked));
  movePlayer(blocked, .05); blocked.world.set(0, 3, 0, 'stone');
  for (let i = 0; i < 30 && blocked.mantle; i++) { movePlayer(blocked, .02); assert.equal(blocked.world.intersects(blocked.pos.x, blocked.pos.y, blocked.pos.z), false); }
  assert.equal(blocked.mantle, null);
  const teleported = player(); teleported.pos.z = 1.35; teleported.world.set(0, 1, 0, 'stone'); assert.ok(startMantle(teleported));
  teleported.pos = { x: 20, y: 1, z: 20 }; movePlayer(teleported, .02);
  assert.equal(teleported.mantle, null);
  assert.ok(teleported.pos.x > 19);
});

test('walking down a slab remains grounded instead of hovering or bouncing', () => {
  const g = player(); g.pos = { x: .5, y: 1.5, z: .5 }; g.world.set(0, 1, 0, 'oak_slab'); g.keys.add('KeyW');
  advance(g, .3);
  assert.ok(g.pos.z < -.28);
  assert.ok(Math.abs(g.pos.y - 1) < .003);
  assert.equal(g.grounded, true);
});

test('hard landing feedback fires once and launch-pad jumps ignore previous jump releases', () => {
  const fall = player(); fall.pos.y = 8; fall.grounded = false; advance(fall, 1.4);
  assert.equal(fall.events.filter(event => event.type === 'land').length, 1);
  assert.ok(fall.landingImpulse > .6);
  assert.ok(fall.damage > 0);
  const pad = player(); pad.grounded = false; pad.pos.y = 8; pad.jumpActive = true; pad.velocity = 15; pad.vz = -9; pad.padFlight = .65;
  releaseJump(pad); assert.equal(pad.velocity, 15); pad.keys.add('KeyW'); advance(pad, .2);
  assert.ok(pad.vz < -8.9);
  assert.ok(pad.pos.y > 10);
});

test('creative descent, water jumping and ladder climbing retain their movement controls', () => {
  const flight = player(); flight.state.mode = 'creative'; flight.flying = true; flight.pos.y = 8; flight.grounded = false; flight.keys.add('ControlLeft');
  advance(flight, .2); assert.ok(flight.pos.y < 6.5); assert.equal(flight.velocity, 0);
  const water = player(); water.pos.y = 5; water.grounded = false; water.world.waterAt = () => true; water.keys.add('Space');
  advance(water, .2); assert.ok(water.pos.y > 5.7);
  const ladder = player(); ladder.world.set(0, 1, 3, 'ladder'); ladder.world.set(0, 2, 3, 'ladder'); ladder.keys.add('Space');
  advance(ladder, .2); assert.ok(ladder.pos.y > 1.5);
});

test('different frame rates produce comparable sprint jumps and never tunnel through a wall', () => {
  const results = [];
  for (const dt of [1 / 120, 1 / 60, .05]) {
    const g = player(); g.keys.add('KeyW'); g.keys.add('ShiftLeft'); advance(g, .2, dt); requestJump(g); advance(g, .6, dt); results.push({ ...g.pos });
    const wall = player(); for (let y = 1; y < 5; y++) wall.world.set(0, y, 2, 'stone'); wall.keys.add('KeyW'); wall.dashTime = .3; advance(wall, .4, dt);
    assert.ok(wall.pos.z >= 3.27);
    assert.equal(wall.world.intersects(wall.pos.x, wall.pos.y, wall.pos.z), false);
  }
  for (const result of results) { assert.ok(Math.abs(result.z - results[0].z) < .15); assert.ok(Math.abs(result.y - results[0].y) < .15); }
});
