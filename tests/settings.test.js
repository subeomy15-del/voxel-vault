import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, normalizeSettings, applyQualityPreset, updateSetting } from '../src/settings.js?v=35';
import { loadSettings, saveSettings } from '../src/save.js?v=35';
const memory = initial => { const data = new Map(Object.entries(initial || {})); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };
const key = 'voxel-vault-v2-settings';

test('legacy settings migrate volume and populate the selected graphics preset', () => {
  const settings = loadSettings(memory({ [key]: JSON.stringify({ volume: .27, quality: 'low', sensitivity: 1.3, perspective: '2', bobbing: false }) }));
  assert.equal(settings.masterVolume, .27); assert.equal(settings.volume, .27);
  assert.equal(settings.quality, 'low'); assert.equal(settings.renderDistance, 3); assert.equal(settings.shadows, false);
  assert.equal(settings.ambientOcclusion, false); assert.equal(settings.antialias, false); assert.equal(settings.particles, 'low');
  assert.equal(settings.perspective, 2); assert.equal(settings.bobbing, false); assert.equal(settings.sensitivity, 1.3);
});
test('settings reject unsafe values and discard unknown fields', () => {
  const settings = normalizeSettings({ masterVolume: 5, musicVolume: -2, effectsVolume: Infinity, renderDistance: 200, fov: 900, sensitivity: NaN, sprintMode: 'forever', crouchMode: 'toggle', quality: 'ultra', shadows: 'false', injected: true });
  assert.equal(settings.masterVolume, 1); assert.equal(settings.musicVolume, 0); assert.equal(settings.effectsVolume, 1);
  assert.equal(settings.renderDistance, 6); assert.equal(settings.fov, 100); assert.equal(settings.sensitivity, 1);
  assert.equal(settings.sprintMode, 'hold'); assert.equal(settings.crouchMode, 'toggle'); assert.equal(settings.shadows, true);
  assert.equal(Object.hasOwn(settings, 'injected'), false); assert.deepEqual(normalizeSettings(null), defaultSettings);
});
test('presets and individual graphics changes preserve the live settings object', () => {
  const settings = normalizeSettings({ masterVolume: .21, fov: 91, crouchMode: 'toggle' });
  assert.equal(applyQualityPreset(settings, 'medium'), settings);
  assert.equal(settings.renderDistance, 4); assert.equal(settings.particles, 'low'); assert.equal(settings.masterVolume, .21); assert.equal(settings.fov, 91);
  updateSetting(settings, 'shadows', false); assert.equal(settings.quality, 'custom'); assert.equal(settings.shadows, false);
  updateSetting(settings, 'masterVolume', .4); assert.equal(settings.volume, .4);
  updateSetting(settings, 'volume', .1); assert.equal(settings.masterVolume, .1);
  updateSetting(settings, 'quality', 'high'); assert.equal(settings.quality, 'high'); assert.equal(settings.shadows, true);
});
test('settings persist and corrupt or unavailable storage fails gracefully', () => {
  const storage = memory(), settings = normalizeSettings({ musicVolume: 0, cameraEffects: false, debugFPS: true, sprintMode: 'toggle', particles: 'off' });
  assert.equal(saveSettings(storage, settings), true); assert.deepEqual(loadSettings(storage), settings);
  assert.deepEqual(loadSettings(memory({ [key]: '{invalid' })), defaultSettings);
  const denied = { getItem() { throw Error('disabled'); }, setItem() { throw Error('quota'); } };
  assert.deepEqual(loadSettings(denied), defaultSettings); assert.equal(saveSettings(denied, settings), false);
  const fresh = loadSettings(denied); fresh.masterVolume = 0; assert.equal(defaultSettings.masterVolume, .45);
});
