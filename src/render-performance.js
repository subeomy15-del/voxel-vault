import {GRAPHICS_PRESETS} from './settings.js?v=38';
import {initialQuality,deviceProfile} from './auto-quality.js?v=38';
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export function renderOptions(settings = {},autoLevel=initialQuality(deviceProfile())) {
  if(settings.quality==='auto')settings={...settings,...GRAPHICS_PRESETS[autoLevel],quality:autoLevel};
  const quality = ['low', 'medium', 'high', 'custom'].includes(settings.quality) ? settings.quality : 'high';
  const low = quality === 'low', medium = quality === 'medium';
  return {
    quality,
    renderDistance: clamp(Math.round(Number(settings.renderDistance) || (low ? 3 : medium ? 4 : 5)), 2, 6),
    shadows: settings.shadows ?? !low,
    ambientOcclusion: settings.ambientOcclusion ?? !low,
    particles: ['off', 'low', 'high'].includes(settings.particles) ? settings.particles : settings.particles === false ? 'off' : low || medium ? 'low' : 'high',
    antialias: settings.antialias ?? !low,
    fov: clamp(Number(settings.fov) || 74, 60, 100),
    cameraEffects: settings.cameraEffects !== false,
    bobbing: settings.bobbing !== false,
    debugFPS: settings.debugFPS === true,
    maxPixelRatio: low ? 1 : medium ? 1.25 : 1.5,
  };
}

/** Smooth wall-clock frame timing, with slow adaptation to avoid quality oscillation. */
export class FrameBudget {
  constructor() { this.frameMs = 16.67; this.fps = 60; this.scale = 1; this.elapsed = 0; this.slow = 0; this.fast = 0; this.frames = 0; }
  record(seconds) {
    // Background-tab pauses are not a useful estimate of rendering performance.
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > .5) return false;
    const dt = Math.min(seconds, .1);
    this.elapsed += dt;
    this.frames++;
    this.frameMs += (seconds * 1000 - this.frameMs) * (1 - Math.exp(-dt * 2));
    this.fps = 1000 / Math.max(1, this.frameMs);
    if (this.elapsed < 5) return false;
    this.slow = this.fps < 40 ? this.slow + dt : Math.max(0, this.slow - dt * 2);
    this.fast = this.fps > 57 ? this.fast + dt : 0;
    const before = this.scale;
    if (this.slow >= 4 && this.scale > .7) { this.scale = Math.max(.7, Math.round((this.scale - .1) * 10) / 10); this.slow = 0; this.fast = 0; }
    if (this.fast >= 12 && this.scale < 1) { this.scale = Math.min(1, Math.round((this.scale + .1) * 10) / 10); this.fast = 0; }
    return before !== this.scale;
  }
}
