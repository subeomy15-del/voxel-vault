import test from 'node:test';
import assert from 'node:assert/strict';
import { TOWER_WORLDS, towerGeometry } from '../src/tower-course.js?v=43';
import { CAMPAIGN, COURSES, courseGeometry } from '../src/parkour-course.js?v=43';
import { BLOCKS } from '../src/data.js?v=43';
import { World, WORLD_TOP } from '../src/world.js?v=43';
import { Game } from '../src/game.js?v=43';
import { Parkour } from '../src/parkour.js?v=43';

const center = p => ({ x: (p[0] + p[1]) / 2 + .5, y: p[4], z: (p[2] + p[3]) / 2 + .5 });
function harness() {
  const storage = { data: new Map(), getItem(k) { return this.data.get(k) || null; }, setItem(k, v) { this.data.set(k, v); } };
  const game = new Game({ settings: { particles: 'off' }, setWorld() {}, stream() {}, burst() {} }, { play() {}, quiet() {} }, storage);
  const parkour = new Parkour(game); return { game, parkour };
}

test('three tower worlds add eight distinct obstacle types without replacing the campaign', () => {
  assert.equal(CAMPAIGN.length, 12); assert.equal(TOWER_WORLDS.length, 3);
  assert.equal(new Set(TOWER_WORLDS.map(c => c.seed)).size, 3);
  for (const c of TOWER_WORLDS) {
    assert.equal(COURSES[c.id], c); assert.equal(c.tower, true); assert.equal(c.stages.length, 8);
    assert.equal(new Set(c.stages.map(s => s.kind)).size, 8);
    assert.equal(new Set(c.stages.map(s => s.color)).size, 8);
    assert.equal(c.checkpoints.length, 9); assert.ok(c.crystalReward > 0);
    assert.equal(c.finish.y - c.spawn.y, 56);
    assert.ok(c.medalTimes.gold < c.medalTimes.silver && c.medalTimes.silver < c.medalTimes.bronze);
    assert.equal(courseGeometry(c.seed), towerGeometry(c));
  }
  assert.ok(TOWER_WORLDS[1].dynamics.some(d => d.kind === 'moving'));
  assert.ok(TOWER_WORLDS[2].dynamics.filter(d => d.kind === 'gate').length > TOWER_WORLDS[0].dynamics.filter(d => d.kind === 'gate').length);
});

test('all checkpoints and summit have safe, clear footing and geometry fits the world height', () => {
  for (const course of TOWER_WORLDS) {
    const geometry = towerGeometry(course), world = new World(course.seed, [], 6, 'parkour');
    for (const type of geometry.blocks.values()) assert.ok(BLOCKS[type], `${course.id}: missing block ${type}`);
    for (const [key] of geometry.blocks) {
      const y = Number(key.split(',')[1]); assert.ok(y <= WORLD_TOP, `${course.id}: geometry above world ceiling`);
    }
    for (const p of [...course.checkpoints, course.finish]) {
      assert.equal(world.intersects(p.x, p.y, p.z, 1.75), false, `${course.id}: blocked checkpoint`);
      assert.equal(world.intersects(p.x, p.y - .04, p.z, .05), true, `${course.id}: unsupported checkpoint`);
    }
  }
});

test('normal tower jumps are reachable with the actual controller at 60 and 20 FPS', () => {
  const { game, parkour } = harness();
  for (const course of TOWER_WORLDS) for (const dt of [1 / 60, .05]) {
    parkour.start(course.id);
    for (const stage of course.stages.filter(s => ['precision', 'beams', 'crouch', 'crumble', 'gates', 'sweepers'].includes(s.kind))) {
      const route = course.platforms.slice(stage.startIndex, stage.endIndex + 1);
      for (let i = 0; i < route.length - 1; i++) {
        const source = route[i], target = route[i + 1], from = center(source), to = center(target);
        if (target[4] === source[4]) continue; // The crouch tunnel is a flat walk.
        const dx = to.x - from.x, dz = to.z - from.z, distance = Math.hypot(dx, dz), ux = dx / distance, uz = dz / distance;
        const edgeDistance = Math.min(ux > 0 ? (source[1] + 1 - from.x) / ux : ux < 0 ? (source[0] - from.x) / ux : Infinity,
          uz > 0 ? (source[3] + 1 - from.z) / uz : uz < 0 ? (source[2] - from.z) / uz : Infinity);
        let landed = false;
        for (const margin of [.55, .35, .8]) {
          game.pos = { ...from }; Object.assign(game, { vx: 0, vz: 0, velocity: 0, grounded: true, stamina: 100,
            jumpActive: false, jumpReleased: false, jumpBuffer: 0, mantle: null, crouchToggle: false, padFlight: 0 });
          game.yaw = Math.atan2(-dx, -dz); game.keys.clear(); game.keys.add('KeyW'); game.keys.add('ShiftLeft');
          let jumped = false;
          for (let frame = 0; frame < Math.ceil(2.5 / dt); frame++) {
            if (!jumped && (game.pos.x - from.x) * ux + (game.pos.z - from.z) * uz >= Math.max(0, edgeDistance - margin)) {
              game.jump(); jumped = true;
            }
            game.move(dt);
            if (jumped && game.grounded && Math.abs(game.pos.y - target[4]) < .01 &&
              game.pos.x >= target[0] - .27 && game.pos.x <= target[1] + 1.27 &&
              game.pos.z >= target[2] - .27 && game.pos.z <= target[3] + 1.27) { landed = true; break; }
            if (jumped && game.pos.y < target[4] - 1.1) break;
          }
          if (landed) break;
        }
        assert.ok(landed, `${course.id} ${stage.kind} jump ${i} at ${1 / dt} FPS: ${JSON.stringify(game.pos)}`);
      }
    }
  }
});

test('the tower launch reaches its raised landing with forward input at 60 and 20 FPS', () => {
  const { game, parkour } = harness();
  for (const course of TOWER_WORLDS) for (const dt of [1 / 60, .05]) {
    parkour.start(course.id); parkour.checkpoint = 3;
    const stage = course.stages[3], approach = course.platforms[stage.startIndex + 1], landing = course.platforms[stage.startIndex + 2];
    game.pos = center(approach); game.yaw = stage.checkpoint.yaw;
    game.keys.add('KeyW'); game.keys.add('ShiftLeft');
    let launched = false, landed = false;
    for (let frame = 0; frame < 3 / dt; frame++) {
      game.update(dt); launched ||= game.padFlight > 0;
      if (launched && game.grounded && Math.abs(game.pos.y - landing[4]) < .01 &&
        game.pos.x >= landing[0] - .27 && game.pos.x <= landing[1] + 1.27 &&
        game.pos.z >= landing[2] - .27 && game.pos.z <= landing[3] + 1.27) { landed = true; break; }
      if (parkour.respawnTime) break;
    }
    assert.ok(launched); assert.ok(landed, `${course.id} launch at ${1 / dt} FPS: ${JSON.stringify(game.pos)}`);
  }
});

test('the course elevators and sky ferries carry riders to reachable exits at 60 and 20 FPS', () => {
  const { game, parkour } = harness();
  for (const course of TOWER_WORLDS) for (const dt of [1 / 60, .05]) {
    for (const kind of ['lift', 'moving']) {
      const spec = course.dynamics.find(d => d.kind === kind);
      if (!spec) continue;
      parkour.start(course.id); parkour.checkpoint = 4;
      game.pos = { ...spec.from }; game.yaw = course.stages[4].checkpoint.yaw;
      parkour.towerRuntime.respawn();
      for (let n = 0; n < Math.round(spec.period / 2 / dt); n++) game.update(dt);
      assert.ok(Math.abs(game.pos.y - spec.to.y) < .02, `${course.id} ${kind} top height`);
      assert.ok(Math.hypot(game.pos.x - spec.to.x, game.pos.z - spec.to.z) < .02, `${course.id} ${kind} carries rider`);
      assert.equal(game.grounded, true);
      const stage = course.stages[4], exit = kind === 'lift' ? course.platforms[stage.startIndex + 2] : course.platforms[stage.endIndex];
      game.keys.add('KeyW'); game.keys.add('ShiftLeft'); game.jump();
      let landed = false;
      for (let n = 0; n < 2 / dt; n++) {
        game.update(dt);
        if (game.grounded && Math.abs(game.pos.y - exit[4]) < .01 &&
          game.pos.x >= exit[0] - .27 && game.pos.x <= exit[1] + 1.27 &&
          game.pos.z >= exit[2] - .27 && game.pos.z <= exit[3] + 1.27) { landed = true; break; }
        if (parkour.respawnTime) break;
      }
      assert.ok(landed, `${course.id} ${kind} exit at ${1 / dt} FPS: ${JSON.stringify(game.pos)}`);
    }
  }
});
