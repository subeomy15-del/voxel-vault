const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
const frequency = note => 440 * 2 ** ((note - 69) / 12);
// An original, procedurally voiced sixteen-note phrase: no downloaded recordings.
const melody = [62, 69, 74, 78, 67, 74, 79, 83, 59, 66, 71, 74, 57, 64, 69, 73];
export class Audio {
  constructor(settings, { contextFactory } = {}) {
    this.settings = settings; this.context = null; this.contextFactory = contextFactory;
    this.ambientTimer = 0; this.birdTimer = 4; this.musicStep = 0; this.musicNextTime = 0;
    this.voices = new Set(); this.lastHover = -Infinity; this.musicDuck = .45;
  }
  start() {
    try {
      if (!this.context) {
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!this.contextFactory && !Context) return false;
        const c = this.context = this.contextFactory ? this.contextFactory() : new Context();
        this.masterGain = c.createGain(); this.effectsGain = c.createGain(); this.musicGain = c.createGain();
        this.limiter = c.createDynamicsCompressor();
        this.limiter.threshold.value = -12; this.limiter.knee.value = 16; this.limiter.ratio.value = 5;
        this.limiter.attack.value = .004; this.limiter.release.value = .16;
        this.effectsGain.connect(this.masterGain); this.musicGain.connect(this.masterGain);
        this.masterGain.connect(this.limiter); this.limiter.connect(c.destination);
        this.noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const data = this.noiseBuffer.getChannelData(0); let brown = 0;
        for (let i = 0; i < data.length; i++) { brown = (brown + (Math.random() * 2 - 1) * .02) / 1.02; data[i] = brown * 3.5; }
        this.windSource = c.createBufferSource(); this.windSource.buffer = this.noiseBuffer; this.windSource.loop = true;
        this.windFilter = c.createBiquadFilter(); this.windFilter.type = 'lowpass'; this.windFilter.frequency.value = 650;
        this.windGain = c.createGain(); this.windGain.gain.value = 0;
        this.windSource.connect(this.windFilter); this.windFilter.connect(this.windGain); this.windGain.connect(this.effectsGain); this.windSource.start();
        this.musicNextTime = c.currentTime + .2; this.applySettings();
      }
      this.context.resume()?.catch?.(() => {}); return true;
    } catch { return false; }
  }
  applySettings(settings = this.settings) {
    this.settings = settings;
    if (!this.context) return;
    const now = this.context.currentTime;
    this.masterGain.gain.setTargetAtTime(clamp(settings.masterVolume ?? settings.volume ?? .45), now, .04);
    this.effectsGain.gain.setTargetAtTime(clamp(settings.effectsVolume ?? 1), now, .04);
    this.musicGain.gain.setTargetAtTime(clamp(settings.musicVolume ?? .16) * this.musicDuck, now, .2);
  }
  quiet() {
    if (!this.context) return;
    this.windGain.gain.setTargetAtTime(0, this.context.currentTime, .12);
    this.musicGain.gain.setTargetAtTime(0, this.context.currentTime, .2);
  }
  update(game, dt) {
    if (!this.context) return;
    this.scheduleMusic(); this.ambientTimer -= dt; this.birdTimer -= dt;
    if (this.ambientTimer > 0) return; this.ambientTimer = .4;
    const c = this.context, active = !game.screen, column = game.world?.column?.(Math.floor(game.pos.x), Math.floor(game.pos.z));
    const surface = column && game.pos.y > column.h - 3, river = surface && column.river < 13;
    this.musicDuck = active ? 1 : .45; this.applySettings();
    this.windGain.gain.setTargetAtTime(active ? game.gliding ? .13 : river ? .095 : surface ? .033 : .006 : 0, c.currentTime, .8);
    this.windFilter.frequency.setTargetAtTime(game.gliding ? 1100 : river ? 1600 : surface ? 650 : 140, c.currentTime, .8);
    if (this.birdTimer <= 0) {
      this.birdTimer = 8 + Math.random() * 13;
      if (active && surface && game.state.time % 600 < 330 && !['desert', 'snow'].includes(column.biome)) {
        this.tone(1900, .09, 'sine', .016, 750); this.tone(2300, .09, 'sine', .01, -650, 'effects', .16);
      }
    }
  }
  scheduleMusic() {
    const c = this.context;
    if (!c || !clamp(this.settings.musicVolume ?? .16) || !clamp(this.settings.masterVolume ?? this.settings.volume ?? .45)) { if (c) this.musicNextTime = c.currentTime + .2; return; }
    if (this.musicNextTime < c.currentTime) this.musicNextTime = c.currentTime + .1;
    while (this.musicNextTime < c.currentTime + .65) {
      const step = this.musicStep++ % melody.length, delay = this.musicNextTime - c.currentTime;
      this.tone(frequency(melody[step]), 2.8, 'sine', .075, 0, 'music', delay);
      if (step % 4 === 0) {
        this.tone(frequency(melody[step] - 12), 6.3, 'sine', .08, 0, 'music', delay);
        this.tone(frequency(melody[step] + 7), 5.5, 'triangle', .018, 0, 'music', delay);
      }
      this.musicNextTime += 1.65;
    }
  }
  tone(freq = 440, duration = .1, type = 'sine', volume = .15, slide = 0, bus = 'effects', delay = 0) {
    if (!this.context || this.voices.size >= 48) return;
    const c = this.context, oscillator = c.createOscillator(), gain = c.createGain(), start = c.currentTime + Math.max(0, delay), end = start + duration;
    oscillator.type = type; oscillator.frequency.setValueAtTime(freq, start);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), end);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.linearRampToValueAtTime(Math.max(.0001, volume), start + Math.min(duration * .22, bus === 'music' ? .35 : .008));
    gain.gain.exponentialRampToValueAtTime(.0001, end);
    oscillator.connect(gain); gain.connect(bus === 'music' ? this.musicGain : this.effectsGain);
    this.voices.add(oscillator); oscillator.start(start); oscillator.stop(end);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(oscillator); };
  }
  noise(duration = .1, volume = .1, cutoff = 1300) {
    if (!this.context || this.voices.size >= 48) return;
    const c = this.context, source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    source.buffer = this.noiseBuffer; filter.type = 'highpass'; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, c.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, c.currentTime + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.effectsGain); this.voices.add(source);
    source.start(c.currentTime, Math.random(), duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); this.voices.delete(source); };
  }
  play(name, surface = 'stone') {
    if (!this.context) return;
    const wood = /wood|plank|birch|pine|oak|chest|bench/.test(surface), soft = /grass|dirt|sand|snow|leaf|leaves|fern|wool/.test(surface);
    const metal = /iron|gold|metal|copper/.test(surface), glass = /glass|ice/.test(surface), pitch = 1 + (Math.random() - .5) * .13;
    if (name === 'mine' || name === 'break') { this.noise(name === 'break' ? .21 : .12, soft ? .22 : .4, soft ? 650 : 1800); this.tone((wood ? 175 : soft ? 95 : metal ? 390 : 260) * pitch, .065, 'triangle', .11, -65); if (glass) this.tone(1800 * pitch, .17, 'sine', .06, -180); }
    else if (name === 'step') { this.noise(.07, soft ? .15 : .10, soft ? 800 : 2200); this.tone((wood ? 110 : soft ? 65 : metal ? 230 : 155) * pitch, .045, 'triangle', .045, -40); }
    else if (name === 'place') { this.noise(.07, .16, 900); this.tone((wood ? 165 : soft ? 95 : 220) * pitch, .08, 'triangle', .11, -80); }
    else if (name === 'land') { this.noise(.15, soft ? .17 : .22, soft ? 500 : 1200); this.tone(wood ? 92 : 72, .12, 'triangle', .075, -30); }
    else if (name === 'jump') { this.noise(.06, .07, 650); this.tone(170, .075, 'sine', .035, 80); }
    else if (name === 'hover') { if (this.context.currentTime - this.lastHover < .08) return; this.lastHover = this.context.currentTime; this.tone(670, .027, 'sine', .022); }
    else if (name === 'click') this.tone(510, .035, 'sine', .06);
    else if (name === 'checkpoint') { [523.25, 659.25, 783.99].forEach((note, i) => this.tone(note, .35, 'sine', .075, 0, 'effects', i * .075)); }
    else if (name === 'finish') { [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => this.tone(note, i === 3 ? .8 : .25, 'triangle', .065, 0, 'effects', i * .13)); }
    else if (name === 'hit') { this.noise(.11, .35, 180); this.tone(95, .1, 'triangle', .13, -55); }
    else if (name === 'portal') { this.tone(110, .7, 'sine', .1, 440); this.tone(220, .8, 'triangle', .04, 330); }
    else if (name === 'launch' || name === 'pad') { this.tone(220, .35, 'sine', .09, 550); this.noise(.2, .1, 900); }
    else if (name === 'hurt') this.tone(125, .17, 'triangle', .16, -80);
    else if (name === 'shoot') { this.noise(.13, .28, 900); this.tone(340, .07, 'triangle', .08, -180); }
    else if (name === 'craft') { this.tone(310, .1, 'triangle', .1, -70); this.tone(620, .13, 'sine', .05, 0, 'effects', .07); }
    else if (name === 'heal') this.tone(380, .22, 'sine', .065, 130);
    else if (name === 'reward') this.tone(660, .22, 'sine', .06, 110);
    else if (name === 'warning') this.tone(110, .5, 'triangle', .07, 50);
    else if (name === 'firecracker') { this.noise(.22, .35, 1200); this.tone(180, .18, 'triangle', .12, 720); this.tone(720, .22, 'sine', .08, -90, 'effects', .09); }
    else if (name === 'fuse') { this.tone(640, .08, 'square', .04, -80); this.tone(820, .08, 'square', .035, -80, 'effects', .13); }
    else if (name === 'explosion') { this.noise(.5, .6, 180); this.tone(72, .4, 'sawtooth', .13, -40); }
  }
  dispose() {
    for (const voice of this.voices) { try { voice.stop(); } catch {} voice.disconnect(); }
    this.voices.clear(); try { this.windSource?.stop(); } catch {}
    this.windSource?.disconnect(); this.context?.close?.(); this.context = null;
  }
}
