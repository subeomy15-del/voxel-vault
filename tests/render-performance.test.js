import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { CameraMotion } from '../src/camera-motion.js?v=31';
import { FrameBudget, renderOptions } from '../src/render-performance.js?v=31';
import { ParticlePool } from '../src/particles.js?v=31';
import { MovementEffects } from '../src/movement-effects.js?v=31';
import { World } from '../src/world.js?v=31';
import { meshChunk } from '../src/mesh.js?v=31';

test('render settings respect explicit custom fields and clamp expensive ranges', () => {
  const settings = renderOptions({ quality: 'custom', renderDistance: 50, fov: 140, shadows: false, ambientOcclusion: false, particles: 'off', antialias: false, cameraEffects: false });
  assert.equal(settings.renderDistance, 6);
  assert.equal(settings.fov, 100);
  assert.equal(settings.shadows, false);
  assert.equal(settings.ambientOcclusion, false);
  assert.equal(settings.particles, 'off');
  assert.equal(settings.antialias, false);
  assert.equal(settings.cameraEffects, false);
  assert.equal(renderOptions({ quality: 'low' }).renderDistance, 3);
  assert.equal(renderOptions({ quality: 'medium' }).renderDistance, 4);
});

test('adaptive resolution ignores a pause, responds to sustained slow frames and recovers gradually', () => {
  const budget = new FrameBudget();
  budget.record(5);
  assert.equal(budget.frames, 0);
  for (let i = 0; i < 300; i++) budget.record(1 / 60);
  assert.equal(budget.scale, 1);
  for (let i = 0; i < 210; i++) budget.record(1 / 30);
  assert.ok(budget.scale < 1 && budget.scale >= .7);
  assert.ok(budget.fps < 35);
  const lowered = budget.scale;
  for (let i = 0; i < 120; i++) budget.record(1 / 60);
  assert.equal(budget.scale, lowered, 'a short fast period must not oscillate resolution');
  for (let i = 0; i < 2400; i++) budget.record(1 / 60);
  assert.equal(budget.scale, 1);
});

test('camera impulses settle and reduced effects preserve the configured view', () => {
  const motion = new CameraMotion(), settings = renderOptions({ fov: 90 });
  const game = { keys: new Set(), yaw: 0, walk: 0, moving: false, grounded: true, landingImpulse: 1 };
  const landed = motion.update(game, 1 / 60, settings);
  assert.ok(landed.y < 0);
  assert.equal(game.landingImpulse, 0);
  for (let i = 0; i < 180; i++) motion.update(game, 1 / 60, settings);
  assert.ok(Math.abs(motion.offset) < .001);
  assert.ok(Math.abs(motion.fov - 90) < .01);
  game.sprinting = true;
  for (let i = 0; i < 60; i++) motion.update(game, 1 / 60, settings);
  assert.ok(motion.fov > 92.9);
  game.jumpImpulse = 1;
  game.landingImpulse = 1;
  game.moving = true;
  const reduced = { ...settings, cameraEffects: false };
  let view;
  for (let i = 0; i < 120; i++) view = motion.update(game, 1 / 60, reduced);
  assert.equal(view.y, 0);
  assert.equal(view.pitch, 0);
  assert.ok(Math.abs(view.roll) < .001);
  assert.ok(Math.abs(view.fov - 90) < .001);
});

test('particles reuse one draw object and typed storage through bursts, fades and expiry', () => {
  const scene = new THREE.Scene(), particles = new ParticlePool(scene);
  const positions = particles.position, matrices = particles.mesh.instanceMatrix.array, geometry = particles.mesh.geometry;
  particles.burst(1, 2, 3, '#ff9900', 500);
  particles.update(.016);
  assert.equal(particles.count, 320);
  assert.equal(scene.children.length, 1);
  assert.equal(particles.mesh.count, particles.count);
  assert.ok(particles.alpha[0] > 0 && particles.alpha[0] < 1);
  for (let i = 0; i < 80; i++) particles.update(.05);
  assert.equal(particles.count, 0);
  for (let round = 0; round < 20; round++) { particles.firework(0, 10, 0, '#66ccff'); particles.update(.016); }
  assert.equal(particles.position, positions);
  assert.equal(particles.mesh.instanceMatrix.array, matrices);
  assert.equal(particles.mesh.geometry, geometry);
  assert.ok(particles.mesh.instanceMatrix.array.every(Number.isFinite));
  particles.configure('off');
  particles.burst(0, 0, 0, '#ffffff', 12);
  assert.equal(particles.count, 0);
  particles.configure('low');
  particles.burst(0, 0, 0, '#ffffff', 500);
  assert.equal(particles.count, 112);
  particles.dispose();
  assert.equal(scene.children.length, 0);
});

test('movement dust and speed lines stay pooled and respect motion preferences', () => {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(74, 1.6), particles = new ParticlePool(scene);
  const effects = new MovementEffects(camera, particles), settings = renderOptions({ particles: 'high' });
  const game = { pos: { x: 0, y: 10, z: 0 }, world: { get: () => 'grass' }, grounded: true, vx: 4.8, vz: 0, jumpImpulse: 0 };
  effects.update(game, 1 / 60, settings);
  assert.equal(effects.lines.visible, false);
  assert.equal(particles.count, 0);
  game.jumpImpulse = 1;
  effects.update(game, 1 / 60, settings);
  assert.equal(particles.count, 6);
  game.jumpImpulse = 0; game.vx = 15;
  for (let i = 0; i < 30; i++) effects.update(game, 1 / 60, settings);
  assert.equal(effects.lines.visible, true);
  assert.ok(effects.lines.material.opacity > 0 && effects.lines.material.opacity <= .12);
  assert.ok(effects.positions.every(Number.isFinite));
  assert.ok(particles.count > 6 && particles.count < 20);
  const count = particles.count;
  effects.update(game, 1 / 60, { ...settings, cameraEffects: false });
  assert.equal(effects.lines.visible, false);
  assert.equal(particles.count, count);
  effects.update(game, 1 / 60, { ...settings, particles: 'off' });
  assert.equal(effects.lines.visible, false);
  assert.equal(particles.count, count);
});

test('disabling ambient occlusion preserves chunk topology and brightens shaded corners', () => {
  const world = new World(7821);
  const shaded = meshChunk(world, 0, 0, false, { ambientOcclusion: true }).solid;
  const plain = meshChunk(world, 0, 0, false, { ambientOcclusion: false }).solid;
  assert.deepEqual(shaded.position, plain.position);
  assert.deepEqual(shaded.index, plain.index);
  assert.deepEqual(shaded.uv, plain.uv);
  assert.ok(shaded.color.some((value, index) => value < plain.color[index] - .05));
  assert.ok(shaded.color.every((value, index) => value <= plain.color[index] + .0001));
});
