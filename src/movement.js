import { trapAt } from './traps.js?v=32';
import { BLOCKS, ITEMS } from './data.js?v=32';
import { WORLD_BOTTOM, WORLD_TOP } from './world.js?v=32';

export const MOVEMENT = Object.freeze({ walk: 4.8, sprint: 7.4, jump: 8.8, gravity: 24, coyote: .11, buffer: .14, step: .52, mantle: 1.25 });
const approach = (current, target, amount) => current < target ? Math.min(target, current + amount) : Math.max(target, current - amount);
const sprintKeys = ['ShiftLeft', 'ShiftRight'];
const crouchKeys = g => ['ControlLeft', 'ControlRight', 'KeyX', ...(g.state.mode === 'parkour' ? ['KeyC'] : [])];
const held = (g, keys) => keys.some(key => g.keys.has(key));
const settings = g => g.renderer?.settings || {};
const collides = (g, p, height = 1.75) => g.world.intersects(p.x, p.y, p.z, height);
const supported = (g, p = g.pos, depth = .04) => g.world.intersects(p.x, p.y - depth, p.z, depth + .012);

/** Route key transitions here; repeated keydown events never retrigger a toggle. */
export function movementInput(g, code, pressed) {
  g.movementInputHeld ??= new Set();
  const group = sprintKeys.includes(code) ? sprintKeys : crouchKeys(g).includes(code) ? crouchKeys(g) : null;
  const fresh = pressed && !g.movementInputHeld.has(code) && (!group || !group.some(key => g.movementInputHeld.has(key)));
  if (pressed) { g.keys.add(code); g.movementInputHeld.add(code); }
  else { g.keys.delete(code); g.movementInputHeld.delete(code); }
  if (fresh && sprintKeys.includes(code) && settings(g).sprintMode === 'toggle') g.sprintToggle = !g.sprintToggle;
  if (fresh && crouchKeys(g).includes(code) && settings(g).crouchMode === 'toggle') g.crouchToggle = !g.crouchToggle;
  if (code === 'Space' && !pressed) releaseJump(g);
  return code === 'Space' || !!group;
}

export function requestJump(g) {
  g.jumpBuffer = MOVEMENT.buffer; g.jumpIntent = .24; g.jumpReleased = false;
  tryJump(g);
}

/** Cutting only explicitly released jumps preserves scripted jumps and launch pads. */
export function releaseJump(g) {
  g.jumpReleased = true;
  if (g.jumpActive && g.velocity > 3.8 && !g.gliding && !g.flying && !g.grapple && !g.mantle && !(g.padFlight > 0)) g.velocity = 3.8;
}

function tryJump(g) {
  if (g.mantle || g.creative && g.flying || !(g.jumpBuffer > 0) || !(g.grounded || g.coyote > 0)) return false;
  g.velocity = g.effect('jump') ? 12.7 : MOVEMENT.jump;
  if (g.jumpReleased) g.velocity = 3.8;
  g.state.exhaustion += .18; g.grounded = false; g.coyote = 0; g.jumpBuffer = 0; g.jumpActive = true;
  g.jumpImpulse = 1; g.audio.play('jump'); g.emit?.('jump', { velocity: g.velocity });
  return true;
}

function approachHorizontal(g, x, z, amount) {
  const dx = x - g.vx, dz = z - g.vz, length = Math.hypot(dx, dz);
  if (length <= amount || length < 1e-8) { g.vx = x; g.vz = z; return; }
  g.vx += dx / length * amount; g.vz += dz / length * amount;
}

function airControl(g, x, z, speed, dt) {
  const input = Math.hypot(x, z);
  if (input < .01) { const drag = Math.exp(-.22 * dt); g.vx *= drag; g.vz *= drag; return; }
  const nx = x / input, nz = z / input, before = Math.hypot(g.vx, g.vz);
  const along = g.vx * nx + g.vz * nz, gain = Math.max(0, Math.min(speed - along, 13 * dt));
  g.vx += nx * gain; g.vz += nz * gain;
  // Turning in the air redirects momentum without repeatedly creating speed.
  const after = Math.hypot(g.vx, g.vz), limit = Math.max(before, speed);
  if (after > limit) { g.vx *= limit / after; g.vz *= limit / after; }
}

function clearSegment(g, from, to, height) {
  const count = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) / .075));
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    if (collides(g, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, z: from.z + (to.z - from.z) * t }, height)) return false;
  }
  return true;
}

/** Mantle a nearby low ledge only when the full up-then-forward body path fits. */
export function startMantle(g, direction = { x: -Math.sin(g.yaw), z: -Math.cos(g.yaw) }) {
  if (g.mantle || g.crouching || g.flying || g.gliding || g.grapple || g.velocity < -7 || g.world.waterAt(g.pos.x, g.pos.y + .8, g.pos.z)) return false;
  const length = Math.hypot(direction.x, direction.z);
  if (length < .01) return false;
  const dx = direction.x / length, dz = direction.z / length;
  for (const reach of [.45, .65, .85, 1.05]) {
    const x = g.pos.x + dx * reach, z = g.pos.z + dz * reach;
    const y = g.world.ground(x, z, g.pos.y + MOVEMENT.mantle), rise = y - g.pos.y;
    if (rise < .56 || rise > MOVEMENT.mantle || !Number.isFinite(y)) continue;
    const end = { x, y, z }, corner = { x: g.pos.x, y, z: g.pos.z };
    if (collides(g, end) || !supported(g, end) || !clearSegment(g, g.pos, corner, 1.75) || !clearSegment(g, corner, end, 1.75)) continue;
    g.mantle = { from: { ...g.pos }, corner, end, last: { ...g.pos }, time: 0, duration: .22 + rise * .065 };
    g.velocity = 0; g.vx = 0; g.vz = 0; g.grounded = false; g.jumpBuffer = 0; g.jumpIntent = 0; g.jumpActive = false;
    g.jumpImpulse = .45; g.emit?.('mantle', { height: rise });
    return true;
  }
  return false;
}

function tickMantle(g, dt) {
  const m = g.mantle;
  if (Math.hypot(g.pos.x - m.last.x, g.pos.y - m.last.y, g.pos.z - m.last.z) > .45) { g.mantle = null; return false; }
  const previousTime = m.time;
  m.time = Math.min(m.duration, m.time + dt);
  const t = m.time / m.duration, first = t < .58, raw = first ? t / .58 : (t - .58) / .42;
  const ease = raw * raw * (3 - 2 * raw), from = first ? m.from : m.corner, to = first ? m.corner : m.end;
  const next = { x: from.x + (to.x - from.x) * ease, y: from.y + (to.y - from.y) * ease, z: from.z + (to.z - from.z) * ease };
  const crossesCorner = previousTime < m.duration * .58 && m.time >= m.duration * .58;
  const clear = crossesCorner ? clearSegment(g, g.pos, m.corner, 1.75) && clearSegment(g, m.corner, next, 1.75) : clearSegment(g, g.pos, next, 1.75);
  if (!clear) { g.mantle = null; g.velocity = 0; return false; }
  g.pos = next; m.last = { ...next }; g.velocity = 0; g.vx = 0; g.vz = 0; g.grounded = false;
  if (m.time >= m.duration) { g.mantle = null; g.grounded = supported(g); g.coyote = g.grounded ? MOVEMENT.coyote : 0; }
  return true;
}

function stepUp(g, next, height) {
  const high = { ...next, y: g.pos.y + MOVEMENT.step };
  if (collides(g, high, height)) return false;
  let low = g.pos.y, top = high.y;
  for (let i = 0; i < 10; i++) { const middle = (low + top) / 2; if (collides(g, { ...next, y: middle }, height)) low = middle; else top = middle; }
  const landing = { ...next, y: top + .001 };
  if (!supported(g, landing) || !clearSegment(g, g.pos, { ...g.pos, y: landing.y }, height)) return false;
  const rise = landing.y - g.pos.y;
  g.pos = landing; g.cameraOffset -= rise;
  return true;
}

function verticalSweep(g, delta, height) {
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / .1));
  for (let i = 0; i < steps; i++) {
    const before = g.pos.y, y = before + delta / steps;
    if (g.world.intersects(g.pos.x, y, g.pos.z, height)) {
      let clear = before, blocked = y;
      for (let j = 0; j < 10; j++) { const middle = (clear + blocked) / 2; if (g.world.intersects(g.pos.x, middle, g.pos.z, height)) blocked = middle; else clear = middle; }
      g.pos.y = clear;
      if (delta < 0) g.grounded = true;
      return true;
    }
    g.pos.y = y;
  }
  return false;
}

function land(g, impact, inWater, ladder) {
  g.jumpActive = false; g.gliding = false;
  if (impact < 3.8 || inWater || ladder) return;
  const strength = Math.min(1, impact / 20);
  const surface = g.world.get(Math.floor(g.pos.x), Math.floor(g.pos.y - .03), Math.floor(g.pos.z));
  g.landingImpulse = strength; g.audio.play('land', surface || 'stone'); g.emit?.('land', { strength, velocity: impact });
  if (settings(g).particles !== false && settings(g).particles !== 'off' && impact > 8) {
    const block = BLOCKS[surface];
    g.renderer?.burst?.(g.pos.x, g.pos.y + .02, g.pos.z, block?.color || '#c3c6b0', 5);
  }
}

export function movePlayer(g, dt) {
  if (!(dt > 0) || !Number.isFinite(dt)) return;
  // Keep collision and jump behaviour stable even after an occasional long frame.
  if (dt > .025) { const parts = Math.ceil(dt / .025); for (let i = 0; i < parts; i++) movePlayer(g, dt / parts); return; }
  g.jumpBuffer = Math.max(0, (g.jumpBuffer || 0) - dt); g.jumpIntent = Math.max(0, (g.jumpIntent || 0) - dt);
  g.padFlight = Math.max(0, (g.padFlight || 0) - dt);
  g.coyote = g.grounded ? MOVEMENT.coyote : Math.max(0, (g.coyote || 0) - dt);
  g.cameraOffset = (g.cameraOffset || 0) * Math.exp(-dt * 14);
  if (g.mantle && tickMantle(g, dt)) return;
  let forward = (g.keys.has('KeyW') || g.keys.has('ArrowUp') ? 1 : 0) - (g.keys.has('KeyS') || g.keys.has('ArrowDown') ? 1 : 0) - g.touch.z;
  let sideways = (g.keys.has('KeyD') || g.keys.has('ArrowRight') ? 1 : 0) - (g.keys.has('KeyA') || g.keys.has('ArrowLeft') ? 1 : 0) + g.touch.x;
  if (g.gliding) { forward = 1; sideways *= .45; }
  const inputLength = Math.hypot(forward, sideways);
  if (inputLength > 1) { forward /= inputLength; sideways /= inputLength; }
  g.moving = inputLength > .05;
  const wantsCrouch = settings(g).crouchMode === 'toggle' ? !!g.crouchToggle : held(g, crouchKeys(g));
  g.crouching = wantsCrouch || g.world.intersects(g.pos.x, g.pos.y + .003, g.pos.z, 1.747);
  const inWater = g.world.waterAt(g.pos.x, g.pos.y + .8, g.pos.z), flying = g.creative && g.flying;
  if (inWater || g.grounded || !g.state.inv[g.state.glider]) g.gliding = false;
  const wantsSprint = g.touchSprint || (settings(g).sprintMode === 'toggle' ? !!g.sprintToggle : held(g, sprintKeys));
  g.sprinting = g.moving && !g.crouching && !inWater && !g.gliding && !g.eating && (g.creative || g.state.food >= 6) && g.stamina > 3 && wantsSprint;
  g.stamina = Math.max(0, Math.min(100, g.stamina + dt * (g.sprinting ? -9 : 22)));
  const wing = ITEMS[g.state.glider], boost = (g.effect('speed') ? 1.5 : 1) * (trapAt(g, g.pos)?.snare && !g.creative ? .25 : 1);
  const speed = g.gliding ? Math.max(7, wing.glideSpeed + Math.max(0, -g.pitch) * 7 - Math.max(0, g.pitch) * 4) : (inWater ? 3.1 : g.dashTime > 0 ? 15 : g.crouching ? 2.1 : g.sprinting ? MOVEMENT.sprint : MOVEMENT.walk) * boost * (g.eating ? .5 : g.drawState ? .75 : 1);
  if (g.dashTime > 0 && !g.moving) { forward = 1; g.moving = true; }
  const wishX = -Math.sin(g.yaw) * forward + Math.cos(g.yaw) * sideways, wishZ = -Math.cos(g.yaw) * forward - Math.sin(g.yaw) * sideways;
  if (g.gliding) { const current=Math.hypot(g.vx,g.vz),flightSpeed=current+(speed-current)*(1-Math.exp(-3*dt));g.vx=wishX*flightSpeed;g.vz=wishZ*flightSpeed; }
  else if (!g.grounded && !inWater && !flying && g.dashTime <= 0) airControl(g, wishX, wishZ, speed, dt);
  else approachHorizontal(g, wishX * speed, wishZ * speed, dt * (g.dashTime > 0 ? 85 : inWater ? 18 : !g.moving ? 72 : g.vx * wishX + g.vz * wishZ < 0 ? 72 : 55));
  if (g.grapple) {
    g.grapple.time -= dt; const dx = g.grapple.x - g.pos.x, dy = g.grapple.y - g.pos.y, dz = g.grapple.z - g.pos.z, distance = Math.hypot(dx, dy, dz);
    if (g.grapple.time <= 0 || distance < .8) g.grapple = null;
    else { g.vx = dx / Math.max(1, distance) * 16; g.vz = dz / Math.max(1, distance) * 16; g.velocity = Math.max(-8, Math.min(13, dy * 5)); g.grounded = false; }
  }
  const height = g.crouching ? 1.3 : 1.75, wasGrounded = g.grounded;
  for (const [axis, amount] of [['x', g.vx * dt], ['z', g.vz * dt]]) {
    const steps = Math.max(1, Math.ceil(Math.abs(amount) / .12));
    for (let i = 0; i < steps; i++) {
      const next = { ...g.pos, [axis]: g.pos[axis] + amount / steps };
      if (collides(g, next, height)) {
        if (g.grounded && !g.crouching && !flying && stepUp(g, next, height)) continue;
        if (g.jumpIntent > 0 && forward > .1 && startMantle(g, { x: wishX, z: wishZ })) return;
        if (axis === 'x') g.vx = 0; else g.vz = 0;
        break;
      }
      if (g.crouching && g.grounded && !flying && !supported(g, next, .12)) { if (axis === 'x') g.vx = 0; else g.vz = 0; break; }
      g.pos[axis] = next[axis];
    }
  }
  if (g.grounded && g.keys.has('Space')) { g.jumpBuffer = .1; g.jumpReleased = false; }
  tryJump(g);
  const ladder = [0, .5, 1].some(y => g.world.get(Math.floor(g.pos.x), Math.floor(g.pos.y + y), Math.floor(g.pos.z)) === 'ladder');
  if (flying) {
    const dy = (g.keys.has('Space') ? 1 : 0) - (wantsCrouch ? 1 : 0);
    verticalSweep(g, Math.min(WORLD_TOP - 2, g.pos.y + dy * 8 * dt) - g.pos.y, height); g.velocity = 0;
  } else {
    if (g.gliding) { const target = -Math.max(.65, wing.sink + Math.max(0, -g.pitch) * 7 - Math.max(0, g.pitch) * .7); g.velocity += (target-g.velocity)*(1-Math.exp(-18*dt)); }
    else { g.velocity -= dt * (inWater ? 7 : g.effect('slowfall') ? 6 : MOVEMENT.gravity); if (g.effect('slowfall')) g.velocity = Math.max(-2.4, g.velocity); }
    if (inWater && g.keys.has('Space')) g.velocity = 4.4;
    if (ladder) g.velocity = g.keys.has('Space') || forward > 0 ? 3.5 : wantsCrouch ? -3 : Math.max(-1, g.velocity);
    const impact = -g.velocity; g.grounded = false;
    if (verticalSweep(g, g.velocity * dt, height)) {
      if (g.grounded) {
        if (!wasGrounded) land(g, impact, inWater, ladder);
        g.gliding = false;
        if (impact > 17 && !inWater && !ladder && !g.effect('slowfall')) g.hurt(Math.floor((impact - 15) * .5));
      } else g.jumpActive = false;
      g.velocity = 0;
    } else if (wasGrounded && g.velocity <= 0 && !g.jumpActive && !inWater && !ladder && !g.grapple) {
      const before = g.pos.y;
      if (verticalSweep(g, -.51, height)) { g.cameraOffset += before - g.pos.y; g.velocity = 0; }
      else g.pos.y = before;
    }
    tryJump(g);
  }
  if (!g.multiplayer?.competitive && g.state.mode !== 'parkour' && g.pos.y < WORLD_BOTTOM - 3) { g.returnHome(); g.hurt(3); }
  if (g.moving) {
    g.walk += dt * (g.sprinting ? 1.35 : 1); g.stepTimer += dt;
    if (g.stepTimer > .42 && g.grounded) { g.stepTimer = 0; g.audio.play('step', g.world.get(Math.floor(g.pos.x), Math.floor(g.pos.y - .03), Math.floor(g.pos.z)) || 'stone'); }
  }
}
