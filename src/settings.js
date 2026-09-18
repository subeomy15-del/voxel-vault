// A single validated settings contract shared by persistence, controls and rendering.
export const GRAPHICS_PRESETS = Object.freeze({
  low: Object.freeze({ renderDistance: 3, shadows: false, ambientOcclusion: false, particles: 'low', antialias: false }),
  medium: Object.freeze({ renderDistance: 4, shadows: true, ambientOcclusion: true, particles: 'low', antialias: true }),
  high: Object.freeze({ renderDistance: 5, shadows: true, ambientOcclusion: true, particles: 'high', antialias: true })
});
export const defaultSettings = Object.freeze({
  sensitivity: 1, fov: 74, sprintMode: 'hold', crouchMode: 'hold', perspective: 0,
  quality: 'high', ...GRAPHICS_PRESETS.high,
  masterVolume: .45, musicVolume: .16, effectsVolume: 1, volume: .45,
  bobbing: true, cameraEffects: true, debugFPS: false
});
export const GRAPHICS_KEYS = Object.freeze(['renderDistance', 'shadows', 'ambientOcclusion', 'particles', 'antialias']);
const numeric = (value, fallback, min, max) => value !== null && value !== '' && Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
const choice = (value, values, fallback) => values.includes(value) ? value : fallback;
const flag = (value, fallback) => typeof value === 'boolean' ? value : fallback;

export function normalizeSettings(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  const quality = choice(raw.quality, ['low', 'medium', 'high', 'custom'], defaultSettings.quality);
  const preset = GRAPHICS_PRESETS[quality] || GRAPHICS_PRESETS.high;
  const masterVolume = numeric(raw.masterVolume ?? raw.volume, defaultSettings.masterVolume, 0, 1);
  return {
    sensitivity: numeric(raw.sensitivity, 1, .3, 2.5),
    fov: numeric(raw.fov, 74, 60, 100),
    sprintMode: choice(raw.sprintMode, ['hold', 'toggle'], 'hold'),
    crouchMode: choice(raw.crouchMode, ['hold', 'toggle'], 'hold'),
    perspective: Math.round(numeric(raw.perspective, 0, 0, 2)),
    quality,
    renderDistance: Math.round(numeric(raw.renderDistance, preset.renderDistance, 2, 6)),
    shadows: flag(raw.shadows, preset.shadows),
    ambientOcclusion: flag(raw.ambientOcclusion, preset.ambientOcclusion),
    particles: choice(raw.particles, ['off', 'low', 'high'], typeof raw.particles === 'boolean' ? raw.particles ? 'high' : 'off' : preset.particles),
    antialias: flag(raw.antialias, preset.antialias),
    masterVolume, musicVolume: numeric(raw.musicVolume, .16, 0, 1), effectsVolume: numeric(raw.effectsVolume, 1, 0, 1), volume: masterVolume,
    bobbing: flag(raw.bobbing, true), cameraEffects: flag(raw.cameraEffects, true), debugFPS: flag(raw.debugFPS, false)
  };
}

export function applyQualityPreset(settings, quality) {
  if (!Object.hasOwn(GRAPHICS_PRESETS, quality)) return settings;
  return Object.assign(settings, normalizeSettings({ ...settings, ...GRAPHICS_PRESETS[quality], quality }));
}

export function updateSetting(settings, key, value) {
  if (!Object.hasOwn(defaultSettings, key)) return settings;
  if (key === 'quality' && Object.hasOwn(GRAPHICS_PRESETS, value)) return applyQualityPreset(settings, value);
  const next = { ...settings, [key]: value };
  if (key === 'volume') next.masterVolume = value;
  if (GRAPHICS_KEYS.includes(key)) next.quality = 'custom';
  return Object.assign(settings, normalizeSettings(next));
}
