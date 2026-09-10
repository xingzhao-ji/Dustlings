/** Original procedural score and tactile sound for the Dustlings courtyard. */
const clamp = (value, fallback = 0) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
const note = midi => 440 * 2 ** ((midi - 69) / 12);
const BEAT = 60 / 72;
const HALF_BEAT = BEAT / 2;
const MOTIF = [[0, 74], [3, 78], [5, 76], [8, 69], [12, 74]]; // D, F♯, E, A, D
const CHORDS = [[50, 57, 64, 66], [43, 50, 57, 59], [47, 54, 57, 62], [45, 52, 59, 62]];
const COOLDOWNS = { brush: .16, birth: .65, assign: .18, blocked: .7, upgrade: .6, landmark: 4, complete: 5 };

export class DustAudio {
  constructor(context = null) {
    this.context = context?.context || context;
    this.ownsContext = !this.context;
    this.mix = { music: .6, sfx: .8, ambience: .55, muted: false, reducedMotion: false };
    this.progress = 0;
    this.ready = false;
    this.paused = false;
    this.destroyed = false;
    this.lastEvents = new Map();
    this.voices = [];
    this.maxVoices = 48;
    this.peakVoices = 0;
    this.birthIndex = 0;
    this.tick = 0;
    this.brushing = false;
    this.lastAudioProgress = -1;
    this.lastBrushState = null;
    this.continuous = [];
  }

  /** Call from a click/tap/keyboard gesture. Returns false if audio is unavailable. */
  async start() {
    if (this.destroyed) return false;
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) return false;
      this.context = new Context({ latencyHint: 'interactive' });
    }
    if (!this.ready) this._buildGraph();
    await this.resume();
    return true;
  }

  _buildGraph() {
    const ctx = this.context;
    this.offline = typeof ctx.startRendering === 'function';
    this.master = ctx.createGain();
    this.master.gain.value = this.mix.muted ? 0 : .58;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -12;
    this.limiter.knee.value = 12;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = .004;
    this.limiter.release.value = .18;
    this.master.connect(this.limiter);
    this.limiter.connect(ctx.destination);
    if (typeof ctx.createMediaStreamDestination === 'function') {
      this.capture = ctx.createMediaStreamDestination();
      this.limiter.connect(this.capture);
    }
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.ambienceBus = ctx.createGain();
    this.musicDuck = ctx.createGain();
    this.musicBus.gain.value = this.mix.music;
    this.sfxBus.gain.value = this.mix.sfx;
    this.ambienceBus.gain.value = this.mix.ambience;
    this.musicBus.connect(this.musicDuck);
    this.musicDuck.connect(this.master);
    this.sfxBus.connect(this.master);
    this.ambienceBus.connect(this.master);

    // Short, dark room tail gives the miniature stone court a shared acoustic space.
    const reverb = ctx.createConvolver();
    reverb.buffer = this._impulse(1.45);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = .16;
    this.reverbSend.connect(reverb);
    const reverbLowpass = ctx.createBiquadFilter();
    reverbLowpass.type = 'lowpass';
    reverbLowpass.frequency.value = 3400;
    reverb.connect(reverbLowpass);
    reverbLowpass.connect(this.master);
    // Send after volume controls, so setting music/sfx to zero also removes their tails.
    this.musicDuck.connect(this.reverbSend);
    this.sfxBus.connect(this.reverbSend);
    this.noise = this._noiseBuffer(4);
    this.wind = this._texture('lowpass', 680, .016, this.ambienceBus);
    this.water = this._texture('bandpass', 1500, 0, this.ambienceBus, .45);
    this.brush = this._texture('bandpass', 2100, 0, this.sfxBus, .55);
    this.ready = true;
    this._setProgressAt(this.progress, ctx.currentTime);
  }

  _noiseBuffer(seconds) {
    const ctx = this.context;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const out = buffer.getChannelData(0);
    let seed = 0x5d17, smooth = 0;
    for (let i = 0; i < out.length; i++) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      const white = seed / 2147483648 - 1;
      smooth = .96 * smooth + .04 * white;
      out[i] = .58 * white + 1.8 * smooth;
    }
    // A short crossfade across the loop boundary removes a periodic click.
    const fade = Math.min(1600, Math.floor(out.length / 8));
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      out[out.length - fade + i] = out[out.length - fade + i] * (1 - t) + out[i] * t;
    }
    return buffer;
  }

  _impulse(seconds) {
    const ctx = this.context;
    const buffer = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    let seed = 5831;
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let smooth = 0;
      for (let i = 0; i < data.length; i++) {
        seed = (1664525 * seed + 1013904223) >>> 0;
        smooth = .55 * smooth + .45 * (seed / 2147483648 - 1);
        data[i] = smooth * Math.exp(-i / (ctx.sampleRate * .29)) * Math.min(1, i / 90);
      }
    }
    return buffer;
  }

  _texture(type, frequency, volume, destination, q = .7) {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start();
    this.continuous.push(source);
    return { source, filter, gain };
  }

  _ramp(param, value, time, duration = .06) {
    // Holding the current interpolated value avoids clicks during rapid setting changes.
    if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(time);
    else { param.cancelScheduledValues(time); param.setValueAtTime(param.value, time); }
    param.linearRampToValueAtTime(value, time + duration);
  }

  setMix(values = {}) {
    for (const key of ['music', 'sfx', 'ambience']) {
      if (key in values) this.mix[key] = clamp(values[key], this.mix[key]);
    }
    for (const key of ['muted', 'reducedMotion']) if (key in values) this.mix[key] = Boolean(values[key]);
    if (!this.ready || this.destroyed) return;
    const now = this.context.currentTime;
    this._ramp(this.musicBus.gain, this.mix.music, now);
    this._ramp(this.sfxBus.gain, this.mix.sfx, now);
    this._ramp(this.ambienceBus.gain, this.mix.ambience, now);
    this._ramp(this.master.gain, this.mix.muted || this.paused ? 0 : .58, now);
  }

  setProgress(progress) {
    this.progress = clamp(progress);
    if (this.ready && !this.destroyed && (Math.abs(this.progress - this.lastAudioProgress) >= .002 || this.progress === 1 && this.lastAudioProgress !== 1)) {
      this._setProgressAt(this.progress, this.context.currentTime);
    }
  }

  _setProgressAt(progress, time) {
    this.lastAudioProgress = progress;
    // Birdlike pitched accents remain musical notes: no repeating creature chatter.
    this.wind.gain.gain.setTargetAtTime(.016 - progress * .005, time, .6);
    this.water.gain.gain.setTargetAtTime(Math.max(0, (progress - .78) / .22) * .046, time, 1.1);
    this.water.filter.frequency.setTargetAtTime(1250 + progress * 500, time, .8);
  }

  _claimVoice(time, duration) {
    this.voices = this.voices.filter(voice => voice.end > this.context.currentTime);
    const concurrent = this.voices.reduce((count, voice) => count + Number(voice.start <= time && voice.end > time), 0);
    if (concurrent >= this.maxVoices) return false;
    this.voices.push({ start: time, end: time + duration + .03 });
    this.peakVoices = Math.max(this.peakVoices, concurrent + 1);
    return true;
  }

  _tone(midi, time, duration, volume, destination = this.sfxBus, kind = 'pluck', pan = 0) {
    if (!this._claimVoice(time, duration)) return;
    const ctx = this.context;
    const frequency = note(midi);
    const oscillator = ctx.createOscillator();
    const partial = ctx.createOscillator();
    const partialGain = ctx.createGain();
    const gain = ctx.createGain();
    gain.gain.value = .0001;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = kind === 'pad' ? 1050 : kind === 'wood' ? 1900 : 3800;
    oscillator.type = kind === 'wood' ? 'triangle' : 'sine';
    oscillator.frequency.value = frequency;
    partial.type = 'sine';
    partial.frequency.value = frequency * (kind === 'pad' ? 1.002 : kind === 'wood' ? 2 : 3);
    partialGain.gain.value = kind === 'pad' ? .22 : kind === 'wood' ? .1 : .085;
    oscillator.connect(filter);
    partial.connect(partialGain);
    partialGain.connect(filter);
    filter.connect(gain);
    const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (panner) { panner.pan.value = this.mix.reducedMotion ? 0 : Math.max(-.65, Math.min(.65, pan)); gain.connect(panner); panner.connect(destination); }
    else gain.connect(destination);
    const attack = kind === 'pad' ? Math.min(.7, duration * .2) : kind === 'wood' ? .007 : .016;
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), time + attack);
    if (kind === 'pad') {
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume * .8), time + duration * .65);
    }
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.start(time);
    partial.start(time);
    oscillator.stop(time + duration + .02);
    partial.stop(time + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); partial.disconnect(); partialGain.disconnect(); filter.disconnect(); gain.disconnect(); panner?.disconnect(); };
  }

  _noiseHit(time, duration, volume, frequency = 2200) {
    if (!this._claimVoice(time, duration)) return;
    const ctx = this.context;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = .5;
    const gain = ctx.createGain();
    // A future start can round one sample before its first automation event.
    // Keep the unscheduled gain silent too, especially for offset noise buffers.
    gain.gain.value = .0001;
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), time + .014);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.sfxBus);
    source.start(time, (this.birthIndex * .137) % 2);
    source.stop(time + duration + .02);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  _musicTick(tick, time, progress = this.progress) {
    const position = tick % 32;
    const phrase = Math.floor(tick / 32);
    const chord = CHORDS[phrase % CHORDS.length];
    const motifNote = MOTIF.find(([step]) => step === position);
    if (motifNote) this._tone(motifNote[1], time, 1.6, .095, this.musicBus, 'pluck', -.15);
    if (position === 0) {
      this._tone(chord[0] - 12, time, 3.8, .055, this.musicBus, 'pad');
      if (progress > .2) chord.slice(1).forEach((midi, index) => this._tone(midi, time + index * .07, 5.7, .019 + progress * .01, this.musicBus, 'pad', (index - 1) * .22));
    }
    if (position === 16 && progress > .35) this._tone(chord[0], time, 2.8, .045, this.musicBus, 'pad', .1);
    if (progress > .48 && [18, 22, 26].includes(position)) {
      this._tone(chord[1 + [18, 22, 26].indexOf(position)] + 12, time, 1.3, .04, this.musicBus, 'pluck', .25);
    }
    if (progress > .84 && position === 28) this._tone(86, time, 2.2, .025, this.musicBus, 'pluck', .3);
  }

  _schedule() {
    if (!this.ready || this.paused || this.destroyed) return;
    const now = this.context.currentTime;
    if (this.nextTick < now - HALF_BEAT) this.nextTick = now + .04;
    while (this.nextTick < now + .22) {
      this._musicTick(this.tick++, this.nextTick);
      this.nextTick += HALF_BEAT;
    }
  }

  event(name, intensity = 1) {
    if (!this.ready || this.paused || this.destroyed || !(name in COOLDOWNS)) return false;
    const now = this.context.currentTime;
    if (now - (this.lastEvents.get(name) ?? -Infinity) < COOLDOWNS[name]) return false;
    this.lastEvents.set(name, now);
    this._eventAt(name, now + .005, clamp(intensity, 1));
    return true;
  }

  _eventAt(name, time, intensity = 1) {
    const level = .5 + .5 * intensity;
    if (name === 'brush') this._noiseHit(time, .12, .025 * level, 1900);
    if (name === 'birth') {
      const pitch = [74, 76, 78, 81, 78][this.birthIndex++ % 5];
      this._tone(pitch - 12, time, .23, .095 * level, this.sfxBus, 'wood', -.12);
      this._tone(pitch, time + .1, .85, .1 * level, this.sfxBus, 'pluck', .12);
      this._noiseHit(time, .15, .017 * level, 3200);
    }
    if (name === 'assign') {
      this._tone(62, time, .14, .15 * level, this.sfxBus, 'wood');
      this._tone(69, time + .09, .28, .085 * level, this.sfxBus, 'wood');
    }
    if (name === 'blocked') {
      this._tone(57, time, .13, .1 * level, this.sfxBus, 'wood');
      this._tone(54, time + .13, .18, .075 * level, this.sfxBus, 'wood');
    }
    if (name === 'upgrade') {
      [74, 78, 81, 86].forEach((pitch, index) => this._tone(pitch, time + index * .15, 1.2, .105 * level, this.sfxBus, 'pluck', (index - 1.5) * .09));
      this._tone(50, time, 1.9, .08 * level, this.sfxBus, 'pad');
    }
    if (name === 'landmark') {
      [62, 69, 74, 78].forEach((pitch, index) => this._tone(pitch, time + index * .16, 2.6, .073 * level, this.sfxBus, index < 2 ? 'pad' : 'pluck', (index - 1.5) * .12));
      this._noiseHit(time + .1, 1.7, .06 * level, 1300);
    }
    if (name === 'complete') {
      this.musicDuck.gain.setTargetAtTime(.38, time, .15);
      this.musicDuck.gain.setTargetAtTime(1, time + 4.2, 1);
      [50, 57, 62, 66].forEach((pitch, index) => this._tone(pitch, time + index * .1, 4.7, .055 * level, this.sfxBus, 'pad', (index - 1.5) * .15));
      [[0, 74], [.55, 78], [.95, 76], [1.65, 69], [2.5, 74], [2.54, 86]].forEach(([offset, pitch]) => this._tone(pitch, time + offset, 2.2, (pitch > 80 ? .045 : .135) * level, this.sfxBus, 'pluck', .08));
      this._noiseHit(time + .25, 2.4, .07 * level, 1100);
    }
  }

  setBrushing(active, intensity = 1) {
    this.brushing = Boolean(active);
    if (!this.ready || this.destroyed) return;
    this._setBrushingAt(active && !this.paused, intensity, this.context.currentTime);
  }

  _setBrushingAt(active, intensity, time) {
    const amount = clamp(intensity, 1);
    if (this.lastBrushState?.active === Boolean(active) && (!active || Math.abs(this.lastBrushState.amount - amount) < .015)) return;
    this.lastBrushState = { active: Boolean(active), amount };
    this.brush.gain.gain.setTargetAtTime(active ? .028 + .045 * amount : 0, time, active ? .055 : .045);
    this.brush.filter.frequency.setTargetAtTime(1500 + amount * 1400, time, .1);
  }

  pause() {
    this.paused = true;
    clearInterval(this.timer);
    this.timer = null;
    if (!this.ready || this.destroyed) return;
    this._setBrushingAt(false, 0, this.context.currentTime);
    this._ramp(this.master.gain, 0, this.context.currentTime, .07);
    clearTimeout(this.suspendTimer);
    if (!this.offline) this.suspendTimer = setTimeout(() => {
      if (this.paused && !this.destroyed && this.context.state === 'running') this.context.suspend().catch(() => {});
    }, 100);
  }

  async resume() {
    if (!this.ready || this.destroyed) return false;
    clearTimeout(this.suspendTimer);
    this.paused = false;
    if (!this.offline && this.context.state === 'suspended') await this.context.resume();
    this._ramp(this.master.gain, this.mix.muted ? 0 : .58, this.context.currentTime, .1);
    if (!this.offline && !this.timer) {
      this.nextTick = this.context.currentTime + .1;
      this._schedule();
      this.timer = setInterval(() => this._schedule(), 100);
    }
    return true;
  }

  getCaptureStream() { return this.capture?.stream || null; }

  getDiagnostics() {
    return { ready: this.ready, paused: this.paused, contextState: this.context?.state || 'uninitialized', maxVoices: this.maxVoices, peakVoices: this.peakVoices, continuousSources: this.continuous.length, progress: this.progress, mix: { ...this.mix } };
  }

  /** Schedule a reproducible 36-second audition on an injected OfflineAudioContext. */
  scheduleAudition(duration = 36) {
    if (!this.ready || !this.offline) throw new Error('Call start() with an OfflineAudioContext before scheduleAudition().');
    const segments = [[0, 0], [9, .36], [18, .72], [27, 1]];
    segments.forEach(([time, progress]) => { if (time < duration) this._setProgressAt(progress, time); });
    for (let tick = 0, time = .2; time < duration - 3; tick++, time += HALF_BEAT) {
      const progress = segments.filter(([at]) => at <= time).at(-1)[1];
      this._musicTick(tick, time, progress);
    }
    const cues = [[1, 'brush'], [2.2, 'birth'], [4.5, 'birth'], [7, 'assign'], [10, 'upgrade'], [13, 'blocked'], [16, 'birth'], [24, 'landmark'], [28, 'complete']];
    cues.forEach(([time, name]) => { if (time < duration - 4) this._eventAt(name, time); });
    [[.8, true, .45], [3.3, false, 0], [14.3, true, .8], [16.8, false, 0]].forEach(([time, active, intensity]) => { if (time < duration) this._setBrushingAt(active, intensity, time); });
    this.progress = segments.filter(([time]) => time < duration).at(-1)?.[1] || 0;
    this.master.gain.setTargetAtTime(0, Math.max(0, duration - 1.3), .3);
    return { duration, segments, cues };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    clearInterval(this.timer);
    clearTimeout(this.suspendTimer);
    if (this.ready) {
      this.master.gain.value = 0;
      for (const source of this.continuous) { try { source.stop(); } catch {} source.disconnect(); }
      this.limiter.disconnect();
      this.master.disconnect();
      this.capture?.stream.getTracks().forEach(track => track.stop());
      if (this.ownsContext && this.context.state !== 'closed') this.context.close().catch(() => {});
    }
    this.ready = false;
  }
}
