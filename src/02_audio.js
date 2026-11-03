/* =====================================================================
   2. AUDIO: sintetizador procedural (Web Audio) + micrófono (AnalyserNode)
   ===================================================================== */
const Audio = {
  ctx: null, master: null, amb: null, ambNodes: [], noiseBuf: null,
  analyser: null, micData: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(this.ctx.destination);
    this.amb = this.ctx.createGain(); this.amb.gain.value = 0.0; this.amb.connect(this.master);
    const len = this.ctx.sampleRate * 2; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  get t() { return this.ctx ? this.ctx.currentTime : 0; },

  /* ---- bloques básicos ---- */
  osc(type, f, dur, vol, out, f2, attack = 0.005) {
    if (!this.ctx) return; const t = this.t;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol, filterType, freq, q = 1, out, freq2) {
    if (!this.ctx) return; const t = this.t;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = filterType; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out || this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  /** salida panoramizada según posición en el mundo respecto de la cámara */
  spatial(pos) {
    if (!this.ctx) return null;
    const rel = pos.clone().sub(camera.position); const dist = rel.length();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    const g = this.ctx.createGain(); g.gain.value = clamp(3 / (1 + dist * 0.6), 0.03, 1.4);
    if (pan) { pan.pan.value = clamp(rel.normalize().dot(right), -1, 1); g.connect(pan); pan.connect(this.master); }
    else g.connect(this.master);
    return g;
  },

  /* ---- ambientes continuos por mundo ---- */
  ambient(kind) {
    if (!this.ctx) return;
    this.ambNodes.forEach((n) => { try { n.stop(); } catch (e) {} }); this.ambNodes = [];
    const t = this.t; this.amb.gain.cancelScheduledValues(t); this.amb.gain.setValueAtTime(0, t); this.amb.gain.linearRampToValueAtTime(1, t + 2.5);
    const addNoise = (type, f, q, vol, lfoRate = 0, lfoDepth = 0) => {
      const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const fl = this.ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = this.ctx.createGain(); g.gain.value = vol; s.connect(fl); fl.connect(g); g.connect(this.amb); s.start();
      this.ambNodes.push(s);
      if (lfoRate) { const l = this.ctx.createOscillator(); const lg = this.ctx.createGain(); l.frequency.value = lfoRate; lg.gain.value = lfoDepth; l.connect(lg); lg.connect(fl.frequency); l.start(); this.ambNodes.push(l); }
    };
    const addTone = (type, f, vol, detune = 0) => {
      const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
      const g = this.ctx.createGain(); g.gain.value = vol; o.connect(g); g.connect(this.amb); o.start(); this.ambNodes.push(o);
    };
    if (kind === 'title') { addTone('sine', 55, 0.05); addTone('sine', 82.4, 0.03, 6); addNoise('bandpass', 900, 6, 0.012, 0.07, 500); }
    if (kind === 'intro') { addTone('sine', 49, 0.06); addTone('triangle', 98.3, 0.015); addNoise('bandpass', 400, 3, 0.03, 0.2, 250); }
    if (kind === 'ocean') { addNoise('lowpass', 380, 0.7, 0.22, 0.09, 160); addTone('sine', 41, 0.06); addNoise('bandpass', 1400, 12, 0.01, 0.3, 600); }
    if (kind === 'museum') { addTone('sine', 60, 0.025); addTone('sine', 120.5, 0.01); addNoise('lowpass', 250, 0.5, 0.04); }
    if (kind === 'house') { addTone('sine', 36.7, 0.09); addTone('sawtooth', 73.1, 0.006, 9); addNoise('lowpass', 180, 1, 0.12, 0.05, 90); addNoise('bandpass', 2600, 18, 0.006, 0.13, 1200); }
    if (kind === 'final') { addTone('sine', 65.4, 0.04); addTone('sine', 98, 0.03, 4); addTone('sine', 130.8, 0.015); }
    if (kind === 'reality') { addNoise('lowpass', 900, 0.4, 0.015); }
  },

  /* ---- efectos ---- */
  sfx: {
    click: () => Audio.osc('square', 1400, 0.04, 0.08),
    ping: () => { Audio.osc('sine', 1180, 1.6, 0.12); Audio.osc('sine', 1770, 1.0, 0.03); },
    bubble: (p) => Audio.osc('sine', rand(300, 600), 0.12, 0.08, p ? Audio.spatial(p) : null, rand(900, 1400)),
    clawOpen: () => { Audio.noise(0.25, 0.08, 'bandpass', 1800, 4); Audio.osc('sawtooth', 120, 0.25, 0.03, null, 200); },
    clawClose: () => { Audio.osc('square', 180, 0.12, 0.1, null, 70); Audio.noise(0.1, 0.15, 'highpass', 3000, 1); },
    catch: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => Audio.osc('triangle', f, 0.35, 0.09), i * 70)); },
    collect: () => { [784, 988, 1175, 1568, 1976].forEach((f, i) => setTimeout(() => { Audio.osc('sine', f, 1.2, 0.1); Audio.osc('triangle', f * 2, 0.5, 0.02); }, i * 90)); },
    snap: () => { Audio.osc('square', 900, 0.05, 0.12, null, 300); Audio.noise(0.06, 0.12, 'highpass', 2500); },
    pick: () => Audio.osc('sine', 500, 0.08, 0.06, null, 700),
    denied: () => { Audio.osc('square', 140, 0.5, 0.12); Audio.osc('square', 147, 0.5, 0.08); },
    press: () => { Audio.noise(0.08, 0.2, 'lowpass', 900); Audio.osc('sine', 220, 0.12, 0.1, null, 110); },
    powerDown: () => { Audio.osc('sawtooth', 440, 1.4, 0.08, null, 30); Audio.noise(1.0, 0.08, 'lowpass', 3000, 1, null, 100); },
    alarm: () => { for (let i = 0; i < 3; i++) setTimeout(() => Audio.osc('square', 880, 0.18, 0.09, null, 660), i * 220); },
    laserHum: () => Audio.osc('sawtooth', 60, 0.4, 0.03),
    whoosh: () => { Audio.noise(1.6, 0.35, 'bandpass', 200, 2, null, 4000); Audio.osc('sine', 80, 1.6, 0.2, null, 600); },
    portalOpen: () => { Audio.osc('sine', 110, 2.5, 0.15, null, 440); Audio.noise(2.2, 0.08, 'bandpass', 300, 5, null, 2500); },
    slam: (p) => { const o = p ? Audio.spatial(p) : null; Audio.noise(0.35, 0.9, 'lowpass', 500, 1, o); Audio.osc('sine', 70, 0.4, 0.6, o, 35); },
    creak: (p) => { const o = p ? Audio.spatial(p) : null; Audio.osc('sawtooth', rand(90, 140), 1.1, 0.05, o, rand(160, 260), 0.3); },
    knock: (p) => { const o = p ? Audio.spatial(p) : null; for (let i = 0; i < 3; i++) setTimeout(() => Audio.noise(0.09, 0.6, 'lowpass', 350, 2, o), i * 260); },
    step: (p, v = 0.25) => { const o = p ? Audio.spatial(p) : null; Audio.noise(0.12, v, 'lowpass', 260, 1.5, o); Audio.osc('sine', 60, 0.12, v * 0.5, o, 40); },
    whisper: (p) => { const o = p ? Audio.spatial(p) : null; Audio.noise(1.6, 0.06, 'bandpass', 2400, 9, o, 1300); Audio.noise(1.2, 0.04, 'bandpass', 3400, 11, o, 1900); },
    heartbeat: (v = 0.4) => { Audio.osc('sine', 55, 0.15, v, null, 40); setTimeout(() => Audio.osc('sine', 50, 0.18, v * 0.8, null, 35), 170); },
    breath: (p) => { const o = p ? Audio.spatial(p) : null; Audio.noise(1.4, 0.12, 'bandpass', 700, 2, o, 400); },
    scream: () => { Audio.osc('sawtooth', 640, 1.1, 0.35, null, 220); Audio.osc('square', 910, 1.0, 0.18, null, 300); Audio.noise(1.1, 0.5, 'bandpass', 1800, 1); },
    rumble: (d = 3) => { Audio.noise(d, 0.6, 'lowpass', 120, 1); Audio.osc('sine', 32, d, 0.4); },
    drop: (p) => { const o = p ? Audio.spatial(p) : null; Audio.noise(0.25, 0.5, 'lowpass', 1200, 1, o); },
    roar: (p) => { const o = p ? Audio.spatial(p) : null; Audio.osc('sawtooth', 90, 1.6, 0.18, o, 50, 0.2); Audio.noise(1.6, 0.25, 'bandpass', 400, 3, o, 150); },
    dial: () => Audio.osc('square', 2200, 0.03, 0.06),
    unlock: () => { Audio.osc('square', 300, 0.1, 0.15, null, 150); setTimeout(() => Audio.noise(0.4, 0.3, 'lowpass', 800), 120); },
    glitch: () => { for (let i = 0; i < 6; i++) setTimeout(() => Audio.osc('square', rand(80, 2000), 0.05, 0.08), i * 45); },
  },

  /* ---- micrófono ---- */
  async startMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const src = this.ctx.createMediaStreamSource(stream);
      this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 128; this.analyser.smoothingTimeConstant = 0.6;
      src.connect(this.analyser); // NO se conecta a la salida (sin realimentación)
      this.micData = new Uint8Array(this.analyser.frequencyBinCount);
      return true;
    } catch (e) { return false; }
  },
  /** volumen promedio normalizado 0..1 y nivel de graves */
  readMic() {
    if (!this.analyser) return;
    this.analyser.getByteFrequencyData(this.micData);
    let s = 0, b = 0; const n = this.micData.length;
    for (let i = 0; i < n; i++) { s += this.micData[i]; if (i < 6) b += this.micData[i]; }
    const vol = clamp((s / n / 255) * 2.6, 0, 1);
    State.audioMetrics.volume = damp(State.audioMetrics.volume, vol, 10, 1 / 60);
    State.audioMetrics.bassLevel = clamp(b / 6 / 255, 0, 1);
  },
};
