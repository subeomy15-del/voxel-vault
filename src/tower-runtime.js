import * as THREE from '../vendor/three.module.js';

const TAU = Math.PI * 2;
const EPSILON = .001;
const lerp = (a, b, t) => a + (b - a) * t;
const modulo = (value, period) => ((value % period) + period) % period;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const feetHeight = g => g.crouching ? 1.3 : 1.75;
const overlap = (b, x, y, z, height = 1.75, radius = .28) =>
  x + radius > b.x1 + EPSILON && x - radius < b.x2 - EPSILON &&
  z + radius > b.z1 + EPSILON && z - radius < b.z2 - EPSILON &&
  y + height - EPSILON > b.y1 && y + EPSILON < b.y2;
const horizontalOverlap = (b, pos, radius = .28) =>
  pos.x + radius > b.x1 + EPSILON && pos.x - radius < b.x2 - EPSILON &&
  pos.z + radius > b.z1 + EPSILON && pos.z - radius < b.z2 - EPSILON;

export function platformPosition(spec, time) {
  const period = Math.max(.5, spec.period || 6);
  const progress = (1 - Math.cos(TAU * (time + (spec.phase || 0)) / period)) / 2;
  return { x: lerp(spec.from.x, spec.to.x, progress), y: lerp(spec.from.y, spec.to.y, progress), z: lerp(spec.from.z, spec.to.z, progress) };
}

function platformBounds(spec, position) {
  const width = spec.size?.x || 3, depth = spec.size?.z || 3, thickness = spec.thickness || .45;
  return { x1: position.x - width / 2, x2: position.x + width / 2, y1: position.y - thickness, y2: position.y, z1: position.z - depth / 2, z2: position.z + depth / 2 };
}

export function gateIsOpen(spec, time) {
  return modulo(time + (spec.phase || 0), Math.max(.5, spec.period || 4)) < (spec.openDuration || 2);
}

function segmentDistance(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}

export function touchesSweeper(spec, time, pos, height = 1.75, playerRadius = .28) {
  const center = spec.center, beam = spec.beamRadius || .22;
  if (pos.y + EPSILON >= center.y + beam || pos.y + height - EPSILON <= center.y - beam) return false;
  const angle = (spec.phase || 0) + time * (spec.speed || 1.15);
  const x = Math.cos(angle) * spec.radius, z = Math.sin(angle) * spec.radius;
  return segmentDistance(pos.x, pos.z, center.x - x, center.z - z, center.x + x, center.z + z) < playerRadius + beam;
}

/** The tower owns temporary collision and edits; the regular world stays immutable. */
export class TowerRuntime {
  constructor(game, parkour) {
    this.game = game; this.parkour = parkour; this.time = 0; this.obstacles = []; this.status = null;
    this.view = new TowerView(game.renderer);
  }

  reset(course) {
    this.dispose();
    if (!course?.tower) return;
    this.course = course; this.world = this.game.world; this.time = 0; this.previousPos = { ...this.game.pos };
    this.obstacles = (course.dynamics || []).map(spec => {
      const state = { spec, kind: spec.kind, id: spec.id, armedAt: null, goneUntil: null, originals: [] };
      if (spec.kind === 'moving' || spec.kind === 'lift') {
        state.position = platformPosition(spec, 0); state.bounds = platformBounds(spec, state.position);
      } else if (spec.kind === 'ceiling' || spec.kind === 'gate') state.bounds = spec.bounds;
      if (spec.kind === 'gate') state.open = gateIsOpen(spec, 0);
      if (spec.kind === 'crumble') {
        const [x1, x2, z1, z2, y] = spec.platform;
        state.bounds = { x1, x2: x2 + 1, y1: y - 1, y2: y, z1, z2: z2 + 1 };
        const layers = spec.layers || 1;
        for (let x = x1; x <= x2; x++) for (let z = z1; z <= z2; z++) for (let layer = 1; layer <= layers; layer++) {
          const cell = [x, y - layer, z], key = cell.join(',');
          const type = this.world.get(...cell);
          if (type) state.originals.push({ cell, key, hadEdit: this.world.edits.has(key), edit: this.world.edits.get(key), type });
        }
      }
      return state;
    });
    this.installCollision(); this.view.reset(this.course, this.obstacles); this.updateStatus();
  }

  installCollision() {
    const world = this.world;
    this.originalIntersects = world.intersects; this.originalGround = world.ground; this.originalSolid = world.solid;
    this.intersectsHook = (x, y, z, height = 1.75, radius = .28) =>
      this.originalIntersects.call(world, x, y, z, height, radius) || this.collisionBoxes().some(b => overlap(b, x, y, z, height, radius));
    this.groundHook = (x, z, from = 95) => {
      let top = this.originalGround.call(world, x, z, from);
      for (const box of this.collisionBoxes()) if (x >= box.x1 && x <= box.x2 && z >= box.z1 && z <= box.z2 && box.y2 <= from + EPSILON) top = Math.max(top, box.y2);
      return top;
    };
    this.solidHook = (x, y, z) => this.originalSolid.call(world, x, y, z) ||
      this.collisionBoxes().some(b => overlap(b, x + .5, y, z + .5, 1, .499));
    world.intersects = this.intersectsHook; world.ground = this.groundHook; world.solid = this.solidHook;
  }

  collisionBoxes(exclude = null) {
    return this.obstacles.filter(o => o !== exclude && ['moving', 'lift', 'ceiling'].includes(o.kind)).map(o => o.bounds);
  }

  update(dt) {
    const g = this.game, p = this.parkour;
    if (!this.course || this.world !== g.world || g.screen || p.respawnTime || p.timer?.finished || !(dt > 0) || !Number.isFinite(dt)) return;
    const previousTime = this.time; this.time += dt;
    const rider = this.obstacles.find(o => ['moving', 'lift'].includes(o.kind) && g.grounded && (g.velocity || 0) <= .1 &&
      Math.abs(g.pos.y - o.bounds.y2) < .09 && horizontalOverlap(o.bounds, g.pos));
    const oldRiderPosition = rider && { ...rider.position };
    for (const obstacle of this.obstacles) {
      const spec = obstacle.spec;
      if (obstacle.kind === 'moving' || obstacle.kind === 'lift') {
        obstacle.position = platformPosition(spec, this.time); obstacle.bounds = platformBounds(spec, obstacle.position);
      }
      if (obstacle.kind === 'gate') obstacle.open = gateIsOpen(spec, this.time);
      if (obstacle.kind === 'crumble') this.updateCrumble(obstacle);
    }
    if (rider) this.carryPlayer(rider, oldRiderPosition);
    this.resolveMovingCollisions();
    const from = this.previousPos || g.pos, to = g.pos;
    // Teleports and checkpoint retries should never sweep through old hazards.
    const continuous = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) < 6;
    const steps = Math.max(1, Math.min(120, Math.ceil(Math.max(dt / .025, continuous ? Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) / .1 : 1))));
    let hit = null;
    for (let i = 0; i <= steps && !hit; i++) {
      const t = i / steps, time = lerp(previousTime, this.time, t);
      const position = continuous ? { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t), z: lerp(from.z, to.z, t) } : to;
      hit = this.obstacles.find(o => o.kind === 'gate' && !gateIsOpen(o.spec, time) && overlap(o.bounds, position.x, position.y, position.z, feetHeight(g)) ||
        o.kind === 'sweeper' && touchesSweeper(o.spec, time, position, feetHeight(g)));
    }
    this.previousPos = { ...g.pos }; this.view.update(this.obstacles, this.time); this.updateStatus();
    if (hit) {
      g.renderer.burst?.(g.pos.x, g.pos.y + .8, g.pos.z, hit.spec.color || '#ff667f', 12);
      g.audio.play('hurt'); p.resetToCheckpoint();
    }
  }

  carryPlayer(platform, previous) {
    const g = this.game, dx = platform.position.x - previous.x, dy = platform.position.y - previous.y, dz = platform.position.z - previous.z;
    const from = { ...g.pos }, count = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / .08));
    for (let i = 1; i <= count; i++) {
      const t = i / count, next = { x: from.x + dx * t, y: from.y + dy * t, z: from.z + dz * t };
      const blocked = this.originalIntersects.call(this.world, next.x, next.y, next.z, feetHeight(g), .28) ||
        this.collisionBoxes(platform).some(b => overlap(b, next.x, next.y, next.z, feetHeight(g)));
      if (blocked) { g.grounded = false; return; }
      g.pos = next;
    }
    g.grounded = true; g.velocity = 0;
  }

  resolveMovingCollisions() {
    const g = this.game;
    for (const platform of this.obstacles) {
      if (!['moving', 'lift'].includes(platform.kind) || !overlap(platform.bounds, g.pos.x, g.pos.y, g.pos.z, feetHeight(g))) continue;
      const box = platform.bounds;
      const clear = point => !this.originalIntersects.call(this.world, point.x, point.y, point.z, feetHeight(g), .28) &&
        !this.collisionBoxes(platform).some(b => overlap(b, point.x, point.y, point.z, feetHeight(g)));
      const landing = { ...g.pos, y: box.y2 };
      // A platform can catch descending feet as it moves underneath a jump.
      if ((g.velocity || 0) <= 0 && box.y2 - g.pos.y <= .5 && clear(landing)) {
        g.pos = landing; g.grounded = true; g.velocity = 0; g.jumpActive = false; continue;
      }
      // A side moving into the body pushes it out instead of leaving it embedded.
      const candidates = [
        { ...g.pos, x: box.x1 - .282, axis: 'x' }, { ...g.pos, x: box.x2 + .282, axis: 'x' },
        { ...g.pos, z: box.z1 - .282, axis: 'z' }, { ...g.pos, z: box.z2 + .282, axis: 'z' },
      ].sort((a, b) => Math.hypot(a.x - g.pos.x, a.z - g.pos.z) - Math.hypot(b.x - g.pos.x, b.z - g.pos.z));
      const escape = candidates.find(clear);
      if (escape) {
        g.pos = { x: escape.x, y: escape.y, z: escape.z };
        if (escape.axis === 'x') g.vx = 0; else g.vz = 0;
        g.grounded = false;
      } else { this.parkour.resetToCheckpoint(); return; }
    }
  }

  updateCrumble(obstacle) {
    const g = this.game, spec = obstacle.spec;
    if (obstacle.goneUntil !== null) {
      if (this.time >= obstacle.goneUntil) { this.restoreCrumble(obstacle); obstacle.goneUntil = null; obstacle.armedAt = null; }
      return;
    }
    if (obstacle.armedAt === null && g.grounded && Math.abs(g.pos.y - obstacle.bounds.y2) < .12 && horizontalOverlap(obstacle.bounds, g.pos)) obstacle.armedAt = this.time;
    if (obstacle.armedAt !== null && this.time - obstacle.armedAt >= (spec.delay || .8)) {
      for (const original of obstacle.originals) this.writeTemporaryCell(original, null);
      obstacle.goneUntil = this.time + (spec.restore || 3.5);
      g.renderer.burst?.((obstacle.bounds.x1 + obstacle.bounds.x2) / 2, obstacle.bounds.y2, (obstacle.bounds.z1 + obstacle.bounds.z2) / 2, spec.color || '#ffba61', 12);
      if (g.grounded && Math.abs(g.pos.y - obstacle.bounds.y2) < .12 && horizontalOverlap(obstacle.bounds, g.pos)) { g.grounded = false; g.coyote = 0; }
    }
  }

  writeTemporaryCell(original, type, restore = false) {
    const world = this.world, [x, y, z] = original.cell;
    if (restore && !original.hadEdit) world.edits.delete(original.key);
    else world.edits.set(original.key, restore ? original.edit : type);
    // The worker only accepts value edits. A restored base value gives identical geometry.
    world.changes.push([original.key, restore ? original.type : type]);
    for (const [a, b] of [[x, z], [x - 1, z], [x + 1, z], [x, z - 1], [x, z + 1]]) world.dirty.add(`${Math.floor(a / 16)},${Math.floor(b / 16)}`);
  }

  restoreCrumble(obstacle) {
    if (obstacle.goneUntil === null) return;
    for (const original of obstacle.originals) this.writeTemporaryCell(original, original.type, true);
  }

  /** A checkpoint respawn resets every disappearing step without moving the clock. */
  respawn() {
    if (!this.course) return;
    for (const obstacle of this.obstacles) if (obstacle.kind === 'crumble') {
      this.restoreCrumble(obstacle); obstacle.goneUntil = null; obstacle.armedAt = null;
    }
    this.previousPos = { ...this.game.pos }; this.view.update(this.obstacles, this.time);
  }

  updateStatus() {
    const pos = this.game.pos, stage = this.parkour.checkpoint;
    let nearest = null, distance = 8;
    for (const o of this.obstacles) {
      if (o.spec.stage !== undefined && o.spec.stage !== stage) continue;
      const center = o.position || o.spec.center || { x: (o.bounds.x1 + o.bounds.x2) / 2, y: o.bounds.y2, z: (o.bounds.z1 + o.bounds.z2) / 2 };
      const d = Math.hypot(pos.x - center.x, (pos.y - center.y) * .5, pos.z - center.z);
      if (d < distance) { nearest = o; distance = d; }
    }
    if (!nearest) { this.status = null; return; }
    const hints = {
      moving: ['Moving platforms', 'Ride the shuttle, then jump to the next landing.'],
      lift: ['Rising lift', 'Step aboard and ride up. The lift carries you.'],
      crumble: ['Crumbling steps', 'Keep moving — touched blocks drop away.'],
      ceiling: ['Low tunnel', 'Hold C to crouch under the low ceiling.'],
      gate: [nearest.open ? 'Gate open' : 'Gate closed', nearest.open ? 'Cross while the signal is green.' : 'Wait for green before crossing.'],
      sweeper: ['Rotating sweeper', 'Jump over the spinning beam.'],
    };
    const [title, message] = hints[nearest.kind] || ['Tower climb', 'Follow the colors to the summit.'];
    this.status = { id: nearest.id, kind: nearest.kind, title, message };
  }

  dispose() {
    if (this.world) {
      for (const obstacle of this.obstacles) if (obstacle.kind === 'crumble') this.restoreCrumble(obstacle);
      if (this.world.intersects === this.intersectsHook) this.world.intersects = this.originalIntersects;
      if (this.world.ground === this.groundHook) this.world.ground = this.originalGround;
      if (this.world.solid === this.solidHook) this.world.solid = this.originalSolid;
    }
    this.view.dispose(); this.world = null; this.course = null; this.obstacles = []; this.status = null; this.previousPos = null;
  }
}

/** All visuals use game time, so pause freezes exactly the collision pose on screen. */
export class TowerView {
  constructor(renderer) { this.renderer = renderer; this.root = new THREE.Group(); this.root.name = 'tower-obstacles'; this.states = []; }

  box(group, color, w, h, d, x = 0, y = 0, z = 0, glow = false) {
    const material = new THREE.MeshLambertMaterial({ color, emissive: glow ? color : '#000000', emissiveIntensity: glow ? .35 : 0 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
  }

  reset(course, states) {
    this.dispose(); this.states = states; this.renderer.scene?.add(this.root);
    for (const state of states) {
      const spec = state.spec, color = spec.color || course.color || '#71dfff', group = new THREE.Group();
      group.name = spec.id || spec.kind; state.mesh = group; this.root.add(group);
      if (state.kind === 'moving' || state.kind === 'lift') {
        const w = spec.size?.x || 3, d = spec.size?.z || 3, h = spec.thickness || .45;
        this.box(group, color, w, h, d, 0, -h / 2);
        for (const x of [-w / 2 + .06, w / 2 - .06]) this.box(group, '#ecfcff', .1, .04, d, x, .025, 0, true);
        for (const z of [-d / 2 + .06, d / 2 - .06]) this.box(group, '#ecfcff', w, .04, .1, 0, .025, z, true);
        this.box(group, '#183b52', w * .45, .015, .15, 0, .035);
        const track = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(spec.from.x, spec.from.y - .25, spec.from.z), new THREE.Vector3(spec.to.x, spec.to.y - .25, spec.to.z)]), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .35 })); this.root.add(track);
      } else if (state.kind === 'ceiling') {
        const b = state.bounds; group.position.set((b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2, (b.z1 + b.z2) / 2);
        this.box(group, color, b.x2 - b.x1, b.y2 - b.y1, b.z2 - b.z1);
        this.box(group, '#ffe485', b.x2 - b.x1 + .05, .07, .16, 0, -(b.y2 - b.y1) / 2, (b.z2 - b.z1) / 2, true);
      } else if (state.kind === 'crumble') {
        const b = state.bounds; group.position.set((b.x1 + b.x2) / 2, b.y2 + .018, (b.z1 + b.z2) / 2);
        state.marker = this.box(group, color, b.x2 - b.x1 - .04, .035, b.z2 - b.z1 - .04, 0, 0, 0, true);
        const w = b.x2 - b.x1, d = b.z2 - b.z1;
        this.box(group, '#382543', w * .8, .01, .07, 0, .025, 0);
        this.box(group, '#382543', .07, .01, d * .8, 0, .025, 0);
      } else if (state.kind === 'gate') {
        const b = state.bounds, w = b.x2 - b.x1, h = b.y2 - b.y1, d = b.z2 - b.z1;
        group.position.set((b.x1 + b.x2) / 2, b.y1, (b.z1 + b.z2) / 2);
        state.beams = new THREE.Group(); group.add(state.beams);
        // Beams run along the wide side of the crossing, matching its collision bounds.
        const alongX = w >= d;
        for (let y = .2; y <= h; y += .42) this.box(state.beams, '#ff667f', alongX ? w : Math.min(w, .18), .065, alongX ? Math.min(d, .18) : d, 0, y, 0, true);
        for (const side of [-1, 1]) this.box(group, color, alongX ? .14 : Math.max(w, .18), h + .18, alongX ? Math.max(d, .18) : .14, alongX ? side * w / 2 : 0, h / 2, alongX ? 0 : side * d / 2);
        state.signal = this.box(group, '#ff667f', alongX ? Math.min(w, .8) : Math.max(w, .22), .2, alongX ? Math.max(d, .22) : Math.min(d, .8), 0, h + .15, 0, true);
      } else if (state.kind === 'sweeper') {
        group.position.set(spec.center.x, spec.center.y, spec.center.z);
        state.beam = new THREE.Group(); group.add(state.beam);
        this.box(state.beam, color, spec.radius * 2, (spec.beamRadius || .22) * 2, (spec.beamRadius || .22) * 2, 0, 0, 0, true);
        for (const x of [-spec.radius, spec.radius]) this.box(state.beam, '#fff0af', .2, .52, .52, x, 0, 0, true);
        this.box(group, '#183447', .45, .45, .45);
      }
    }
    this.update(states, 0);
  }

  update(states, time) {
    for (const state of states) {
      if (!state.mesh) continue;
      if (state.position) state.mesh.position.set(state.position.x, state.position.y, state.position.z);
      if (state.kind === 'sweeper') state.beam.rotation.y = -((state.spec.phase || 0) + time * (state.spec.speed || 1.15));
      if (state.kind === 'gate') {
        state.beams.visible = !state.open; state.signal.material.color.set(state.open ? '#78ffc0' : '#ff667f'); state.signal.material.emissive.set(state.open ? '#78ffc0' : '#ff667f');
      }
      if (state.kind === 'crumble') {
        state.mesh.visible = state.goneUntil === null;
        state.marker.material.emissiveIntensity = state.armedAt === null ? .12 : .4 + Math.sin(time * 30) * .35;
        state.marker.material.color.set(state.armedAt === null ? state.spec.color || '#ffba61' : '#ff786d');
      }
    }
  }

  dispose() {
    this.root.traverse(object => { object.geometry?.dispose(); if (Array.isArray(object.material)) for (const material of object.material) material.dispose(); else object.material?.dispose(); });
    this.root.clear(); this.root.removeFromParent(); this.states = [];
  }
}
