'use strict';

class AudioManager {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.ambientGain = null;
    this.noiseBuffer = null;
  }

  ensure() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this._makeNoise();
      this._startAmbient();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setEnabled(v) {
    this.enabled = v;
    if (this.master) this.master.gain.value = v ? 0.45 : 0;
  }

  _makeNoise() {
    const length = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  _blip(freq, dur, type = 'sine', vol = 0.2, slide = 0) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  _noise(dur, vol, filterFreq, type = 'lowpass', slide = 0) {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(filterFreq, t);
    if (slide !== 0) filter.frequency.exponentialRampToValueAtTime(Math.max(40, filterFreq + slide), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  _startAmbient() {
    if (!this.ctx || !this.master || !this.noiseBuffer || this.ambientGain) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    const g = this.ctx.createGain();
    g.gain.value = 0.012;
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start();
    this.ambientGain = g;
  }

  uiHover() { this._blip(700, 0.06, 'sine', 0.05); }
  uiClick() { this._blip(880, 0.12, 'triangle', 0.15, 220); }
  pickup() { this._blip(520, 0.1, 'sine', 0.14, 300); this._blip(1040, 0.12, 'sine', 0.08, 200); }
  craft() { this._blip(440, 0.08, 'triangle', 0.12, 160); setTimeout(() => this._blip(660, 0.12, 'triangle', 0.12, 220), 80); setTimeout(() => this._blip(880, 0.16, 'triangle', 0.12, 220), 160); }
  mine() { this._noise(0.06, 0.12, 1500, 'bandpass'); this._blip(180, 0.05, 'square', 0.04, -30); }
  breakBlock() { this._noise(0.18, 0.25, 700, 'lowpass'); this._blip(120, 0.1, 'sine', 0.12, -40); }
  placeBlock() { this._noise(0.1, 0.2, 500, 'lowpass'); this._blip(220, 0.08, 'sine', 0.08, -60); }
  scan() {
    this._blip(1200, 0.08, 'sine', 0.1, 300);
    setTimeout(() => this._blip(1600, 0.1, 'sine', 0.1, 500), 120);
    setTimeout(() => this._blip(2100, 0.2, 'sine', 0.08, 800), 260);
  }
  launch() {
    this._noise(1.8, 0.3, 200, 'lowpass', 900);
    this._blip(80, 1.5, 'sawtooth', 0.12, 160);
    setTimeout(() => this._blip(60, 1.0, 'sawtooth', 0.08, 120), 200);
  }
  landing() {
    this._noise(1.6, 0.35, 1200, 'lowpass', -900);
    this._blip(160, 0.8, 'sine', 0.1, -80);
  }
  pulse() {
    this._noise(0.8, 0.25, 400, 'bandpass', 1800);
    this._blip(300, 0.4, 'sine', 0.12, 500);
  }
  warning() { this._blip(300, 0.12, 'square', 0.12, 0); setTimeout(() => this._blip(300, 0.12, 'square', 0.12, 0), 200); }
  hit() { this._noise(0.15, 0.2, 900, 'lowpass'); this._blip(160, 0.1, 'sawtooth', 0.1, -60); }

  startEngine() {
    if (!this.ctx || !this.master || this.engineOsc) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 50;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    osc.connect(filter); filter.connect(g); g.connect(this.master);
    osc.start();
    this.engineOsc = osc;
    this.engineFilter = filter;
    this.engineGain = g;
  }

  setEngine(throttle) {
    if (!this.engineOsc || !this.engineGain || !this.engineFilter) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(0.02 + throttle * 0.12, t, 0.08);
    this.engineOsc.frequency.setTargetAtTime(40 + throttle * 90, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(200 + throttle * 1200, t, 0.08);
  }

  stopEngine() {
    if (this.engineOsc) {
      try { this.engineOsc.stop(); } catch(e) {}
      this.engineOsc.disconnect();
      this.engineOsc = null;
    }
    if (this.engineFilter) this.engineFilter.disconnect();
    if (this.engineGain) this.engineGain.disconnect();
    this.engineFilter = null;
    this.engineGain = null;
  }
}
