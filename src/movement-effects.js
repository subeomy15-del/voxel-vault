import * as THREE from '../vendor/three.module.js';
import { BLOCKS } from './data.js?v=32';

/** Bounded movement feedback, sharing the existing particle pool. */
export class MovementEffects {
  constructor(camera, particles) {
    this.camera = camera; this.particles = particles; this.time = 0; this.trailTime = 0; this.intensity = 0;
    this.positions = new Float32Array(20 * 6);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#d5efff', transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }));
    this.lines.frustumCulled = false; this.lines.renderOrder = 15; this.lines.visible = false; camera.add(this.lines);
  }
  reset() { this.trailTime = 0; this.intensity = 0; this.lines.visible = false; }
  update(game, dt, settings) {
    this.time += dt;
    const enabled = settings.cameraEffects && settings.particles !== 'off' && !game.screen;
    if (!enabled) { this.reset(); return; }
    const horizontal = Math.hypot(game.vx || 0, game.vz || 0);
    const speed = Math.hypot(horizontal, game.grounded ? 0 : Math.min(22, Math.abs(game.velocity || 0)) * .45);
    const target = Math.max(0, Math.min(1, (speed - 7.8) / 9));
    this.intensity += (target - this.intensity) * (1 - Math.exp(-dt * 9));
    this.lines.visible = this.intensity > .025;
    if (this.lines.visible) {
      const height = Math.tan(this.camera.fov * Math.PI / 360) * .8, width = height * this.camera.aspect;
      for (let i = 0; i < 20; i++) {
        const angle = i * 2.399963, x = Math.cos(angle), y = Math.sin(angle), edge = 1 / Math.max(Math.abs(x), Math.abs(y));
        const inner = .79 + ((this.time * 1.6 + i * .37) % 1) * .12, outer = inner + .055 + this.intensity * .035;
        const offset = i * 6;
        this.positions[offset] = x * edge * inner * width; this.positions[offset + 1] = y * edge * inner * height; this.positions[offset + 2] = -.8;
        this.positions[offset + 3] = x * edge * outer * width; this.positions[offset + 4] = y * edge * outer * height; this.positions[offset + 5] = -.8;
      }
      this.lines.geometry.attributes.position.needsUpdate = true;
      this.lines.material.opacity = this.intensity * (settings.particles === 'low' ? .075 : .12);
    }
    const groundY = Math.floor(game.pos.y - .5), surface = game.world.get(Math.floor(game.pos.x), groundY, Math.floor(game.pos.z));
    const color = BLOCKS[surface]?.color || '#d3e6de';
    if (game.jumpImpulse > 0 && !game.flying && !game.gliding) this.particles.dust(game.pos.x, groundY + 1.04, game.pos.z, color, settings.particles === 'low' ? 3 : 6);
    this.trailTime -= dt;
    if (horizontal > 6.8 && this.trailTime <= 0 && !game.flying) {
      this.trailTime = settings.particles === 'low' ? .11 : .075;
      this.particles.dust(game.pos.x - game.vx / horizontal * .3, game.pos.y + .08, game.pos.z - game.vz / horizontal * .3, game.grounded ? color : '#c0e9f3', 1);
    }
  }
}
