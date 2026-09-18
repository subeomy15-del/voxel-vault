import test from 'node:test';
import assert from 'node:assert/strict';
import { Audio } from '../src/audio.js?v=31';
import { normalizeSettings } from '../src/settings.js?v=31';
class Parameter {
  constructor() { this.value = 0; this.events = []; }
  setValueAtTime(value, time) { this.value = value; this.events.push({ type: 'set', value, time }); }
  setTargetAtTime(value, time, duration) { this.value = value; this.events.push({ type: 'target', value, time, duration }); }
  exponentialRampToValueAtTime(value, time) { this.events.push({ type: 'exponential', value, time }); }
  linearRampToValueAtTime(value, time) { this.events.push({ type: 'linear', value, time }); }
}
class Node {
  constructor(kind) { this.kind = kind; this.connections = []; this.gain = new Parameter(); this.frequency = new Parameter(); }
  connect(other) { this.connections.push(other); }
  disconnect() { this.disconnected = true; }
  start(...args) { this.started = args; }
  stop(...args) { this.stopped = args; }
}
class Context {
  constructor() { this.currentTime = 0; this.sampleRate = 100; this.destination = new Node('destination'); this.nodes = []; }
  node(kind) { const node = new Node(kind); this.nodes.push(node); return node; }
  createGain() { return this.node('gain'); }
  createOscillator() { return this.node('oscillator'); }
  createBufferSource() { return this.node('source'); }
  createBiquadFilter() { return this.node('filter'); }
  createDynamicsCompressor() { const node = this.node('compressor'); for (const key of ['threshold', 'knee', 'ratio', 'attack', 'release']) node[key] = new Parameter(); return node; }
  createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  resume() { return Promise.resolve(); }
  close() { this.closed = true; return Promise.resolve(); }
}
function setup(settings = {}) { const context = new Context(), audio = new Audio(normalizeSettings(settings), { contextFactory: () => context }); assert.equal(audio.start(), true); return { context, audio }; }

test('master, effects and music use independent real gain buses', () => {
  const { audio, context } = setup({ masterVolume: .5, effectsVolume: .25, musicVolume: .4 });
  assert.equal(audio.masterGain.gain.value, .5); assert.equal(audio.effectsGain.gain.value, .25);
  assert.equal(audio.musicGain.gain.value, .4 * .45);
  assert.equal(audio.effectsGain.connections[0], audio.masterGain); assert.equal(audio.musicGain.connections[0], audio.masterGain);
  assert.equal(audio.masterGain.connections[0], audio.limiter); assert.equal(audio.limiter.connections[0], context.destination);
  audio.applySettings({ masterVolume: 0, effectsVolume: 1, musicVolume: 1 }); assert.equal(audio.masterGain.gain.value, 0);
  audio.applySettings({ masterVolume: 1, effectsVolume: 0, musicVolume: 1 }); assert.equal(audio.effectsGain.gain.value, 0); assert.ok(audio.musicGain.gain.value > 0);
});
test('ambient music schedules original notes only when enabled and stays on the music bus', () => {
  const { audio, context } = setup({ musicVolume: .3 });
  context.currentTime = .3; audio.scheduleMusic();
  const voices = [...audio.voices]; assert.equal(voices.length, 3);
  for (const voice of voices) assert.equal(voice.connections[0].connections[0], audio.musicGain);
  audio.settings.musicVolume = 0; context.currentTime = 5; audio.scheduleMusic(); assert.equal(audio.voices.size, 3);
  audio.settings.musicVolume = .3; audio.scheduleMusic(); assert.equal(audio.voices.size, 4);
});
test('feedback is distinct, material aware, throttled and bounded', () => {
  const { audio, context } = setup();
  audio.play('step', 'oak_plank'); const wood = [...audio.voices].at(-1).frequency.value;
  audio.play('step', 'stone'); const stone = [...audio.voices].at(-1).frequency.value; assert.ok(wood < stone);
  const before = audio.voices.size; audio.play('checkpoint'); assert.equal(audio.voices.size, before + 3);
  audio.play('finish'); assert.equal(audio.voices.size, before + 7);
  const hoverBefore = audio.voices.size; audio.play('hover'); audio.play('hover'); assert.equal(audio.voices.size, hoverBefore + 1);
  context.currentTime += .1; audio.play('hover'); assert.equal(audio.voices.size, hoverBefore + 2);
  for (let i = 0; i < 100; i++) audio.play('land', 'grass'); assert.equal(audio.voices.size, 48);
  const ended = [...audio.voices][0]; ended.onended(); assert.equal(audio.voices.size, 47); assert.equal(ended.disconnected, true);
});
test('sound initialization failure is nonfatal and disposal releases audio resources', () => {
  const blocked = new Audio({}, { contextFactory: () => { throw Error('No audio'); } }); assert.equal(blocked.start(), false); assert.doesNotThrow(() => blocked.play('click'));
  const { audio, context } = setup(); audio.play('pad'); audio.quiet();
  assert.equal(audio.windGain.gain.value, 0); assert.equal(audio.musicGain.gain.value, 0);
  audio.dispose(); assert.equal(audio.voices.size, 0); assert.equal(audio.context, null); assert.equal(context.closed, true);
});
