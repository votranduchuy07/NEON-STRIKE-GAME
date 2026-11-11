/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — audio.js
   AUDIO MANAGER: 100% âm thanh tổng hợp bằng Web Audio API
   - Nhạc nền cyberpunk (step sequencer: trống, bass, arp, pad, lead)
   - SFX riêng cho từng loại đòn, nguyên tố, UI
   - Âm thanh môi trường riêng cho từng đấu trường
   - Announcer (SpeechSynthesis, có thể tắt)
   AudioContext chỉ được tạo sau tương tác đầu tiên của người chơi.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    harmonic: [0, 2, 3, 5, 7, 8, 11],
    lydian: [0, 2, 4, 6, 7, 9, 11],
  };

  /* ---------------- Định nghĩa các bản nhạc ----------------
     drums: chuỗi 16 bước ('x' = đánh, 'o' = nhấn mạnh)
     bass/arp: chỉ số nốt trong hợp âm (null = nghỉ)          */
  const TRACKS = {
    menu: {
      bpm: 94, root: 45, scale: 'minor', prog: [0, 5, 2, 6], swing: 0.04,
      kick: 'x.........x.....', snare: '....x.......x...', hat: '..x...x...x...x.', clap: '',
      bass: [0, null, null, 0, null, null, 0, null, 0, null, null, 0, null, 2, null, null],
      arp: [0, 1, 2, 4, 2, 1, 0, 2, 0, 1, 2, 4, 5, 4, 2, 1], arpWave: 'square', arpOct: 2, arpVol: 0.05,
      pad: true, lead: 0.7, leadWave: 'sawtooth', cutoff: 1800,
    },
    select: {
      bpm: 118, root: 43, scale: 'dorian', prog: [0, 3, 4, 2], swing: 0,
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xo', clap: '............x...',
      bass: [0, 0, null, 0, null, 0, 2, null, 0, 0, null, 0, null, 3, 2, null],
      arp: [0, 2, 4, 2, 1, 2, 4, 5, 0, 2, 4, 2, 1, 2, 5, 4], arpWave: 'sawtooth', arpOct: 2, arpVol: 0.04,
      pad: true, lead: 0, cutoff: 2400,
    },
    neon_city: {
      bpm: 128, root: 41, scale: 'minor', prog: [0, 5, 3, 4], swing: 0,
      kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', clap: '....x.......x..x',
      bass: [0, null, 0, 0, null, 0, null, 0, 0, null, 0, 0, null, 2, null, 3],
      arp: [0, 2, 4, 5, 4, 2, 0, 2, 1, 2, 4, 5, 4, 2, 1, 2], arpWave: 'square', arpOct: 2, arpVol: 0.045,
      pad: true, lead: 0.55, leadWave: 'square', cutoff: 2600,
    },
    underground: {
      bpm: 136, root: 38, scale: 'phrygian', prog: [0, 1, 0, 6], swing: 0,
      kick: 'x..x..x...x..x..', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', clap: '',
      bass: [0, 0, 0, null, 0, 0, null, 0, 0, 0, 0, null, 1, null, 0, null],
      arp: [0, null, 3, null, 1, null, 3, null, 0, null, 3, null, 2, null, 1, null], arpWave: 'sawtooth', arpOct: 1, arpVol: 0.05,
      pad: false, lead: 0.3, leadWave: 'sawtooth', cutoff: 1400, distort: true,
    },
    skyline: {
      bpm: 112, root: 44, scale: 'dorian', prog: [0, 3, 5, 4], swing: 0.05,
      kick: 'x.......x.x.....', snare: '....x.......x...', hat: '..x...x...x...x.', clap: '',
      bass: [0, null, null, 0, null, null, 2, null, 0, null, null, 0, null, null, 3, null],
      arp: [0, 2, 4, 6, 4, 2, 0, 2, 0, 2, 4, 6, 7, 6, 4, 2], arpWave: 'triangle', arpOct: 2, arpVol: 0.07,
      pad: true, lead: 0.6, leadWave: 'triangle', cutoff: 3000,
    },
    frozen: {
      bpm: 104, root: 46, scale: 'harmonic', prog: [0, 5, 3, 4], swing: 0,
      kick: 'x.........x.....', snare: '........x.......', hat: 'x...x...x...x...', clap: '',
      bass: [0, null, null, null, 0, null, null, null, 0, null, null, null, 2, null, 1, null],
      arp: [4, 2, 0, 2, 5, 2, 0, 2, 4, 2, 0, 2, 6, 4, 2, 1], arpWave: 'sine', arpOct: 3, arpVol: 0.06,
      pad: true, lead: 0.4, leadWave: 'sine', cutoff: 2000,
    },
    reactor: {
      bpm: 142, root: 40, scale: 'minor', prog: [0, 0, 5, 6], swing: 0,
      kick: 'x...x...x...x...', snare: '....x.......x.x.', hat: 'xxxxxxxxxxxxxxxx', clap: '',
      bass: [0, 0, 3, 0, 0, 3, 0, 0, 0, 0, 3, 0, 2, 0, 1, 0],
      arp: [0, 3, 1, 4, 2, 5, 3, 6, 0, 3, 1, 4, 2, 5, 3, 6], arpWave: 'square', arpOct: 2, arpVol: 0.04,
      pad: false, lead: 0.45, leadWave: 'sawtooth', cutoff: 2200, distort: true,
    },
    sanctum: {
      bpm: 100, root: 42, scale: 'lydian', prog: [0, 4, 5, 3], swing: 0,
      kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', clap: '',
      bass: [0, null, null, null, null, null, 0, null, 0, null, null, null, 2, null, null, null],
      arp: [0, 2, 4, 7, 4, 2, 0, 4, 1, 3, 5, 7, 5, 3, 1, 3], arpWave: 'triangle', arpOct: 2, arpVol: 0.06,
      pad: true, lead: 0.65, leadWave: 'triangle', cutoff: 3200,
    },
    results: {
      bpm: 90, root: 47, scale: 'dorian', prog: [0, 3, 4, 3], swing: 0.03,
      kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', clap: '',
      bass: [0, null, null, null, 0, null, null, null, 2, null, null, null, 0, null, null, null],
      arp: [0, 2, 4, 2, 0, 2, 4, 2, 1, 3, 5, 3, 1, 3, 5, 3], arpWave: 'triangle', arpOct: 2, arpVol: 0.05,
      pad: true, lead: 0, cutoff: 2000,
    },
  };

  /** Sinh giai điệu lead ổn định theo seed (64 bước = 4 nhịp) */
  function makeLead(track, seed) {
    const r = NS.U.rng(seed);
    const steps = [];
    for (let i = 0; i < 64; i++) {
      const strong = i % 4 === 0;
      if ((strong && r() < track.lead + 0.2) || (!strong && r() < track.lead * 0.35)) {
        steps.push({ idx: Math.floor(r() * 5), len: strong && r() < 0.5 ? 3 : 1 });
      } else steps.push(null);
    }
    return steps;
  }

  /* ======================================================================= */
  class AudioManager {
    constructor() {
      this.ctx = null;
      this.ready = false;
      this.music = null;
      this.step = 0;
      this.nextTime = 0;
      this.timer = null;
      this.intensity = 0;
      this.amb = null;
      this.lastPlay = {};
      this.voice = null;
    }

    /** Gọi sau cú click/phím đầu tiên */
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC());
      this.master = ctx.createGain();
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -14; this.comp.knee.value = 12; this.comp.ratio.value = 4;
      this.master.connect(this.comp); this.comp.connect(ctx.destination);
      this.musicBus = ctx.createGain(); this.musicBus.connect(this.master);
      this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);
      this.ambBus = ctx.createGain(); this.ambBus.connect(this.master);
      // Bộ lọc nhạc (dùng cho hiệu ứng "slow motion"/pause)
      this.musicFilter = ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass'; this.musicFilter.frequency.value = 20000;
      this.trackGain = ctx.createGain();
      this.trackGain.connect(this.musicFilter); this.musicFilter.connect(this.musicBus);
      // Reverb nhân tạo
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this._impulse(2.4, 2.6);
      this.reverbSend = ctx.createGain(); this.reverbSend.gain.value = 0.35;
      this.reverbSend.connect(this.reverb); this.reverb.connect(this.master);
      // Delay cho arp
      this.delay = ctx.createDelay(1); this.delayFb = ctx.createGain(); this.delayOut = ctx.createGain();
      this.delayFb.gain.value = 0.35; this.delayOut.gain.value = 0.3;
      this.delay.connect(this.delayFb); this.delayFb.connect(this.delay); this.delay.connect(this.delayOut); this.delayOut.connect(this.trackGain);
      // Noise buffer
      const len = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.distCurve = this._curve(40);
      this.ready = true;
      this.applySettings();
      if (this._pendingMusic) { const m = this._pendingMusic; this._pendingMusic = null; this.playMusic(m); }
      if (this._pendingAmb) { const a = this._pendingAmb; this._pendingAmb = null; this.setAmbience(a); }
    }

    _impulse(sec, decay) {
      const ctx = this.ctx, rate = ctx.sampleRate, len = rate * sec;
      const buf = ctx.createBuffer(2, len, rate);
      for (let c = 0; c < 2; c++) {
        const ch = buf.getChannelData(c);
        for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }
    _curve(k) {
      const n = 1024, c = new Float32Array(n);
      for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x)); }
      return c;
    }

    applySettings() {
      if (!this.ctx) return;
      const s = NS.Storage.settings;
      const t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(s.muted ? 0 : s.master, t, 0.05);
      this.musicBus.gain.setTargetAtTime(s.music, t, 0.05);
      this.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.05);
      this.ambBus.gain.setTargetAtTime(s.sfx * 0.7, t, 0.05);
    }

    /* ---------------- Primitive ---------------- */
    _tone(o) {
      const ctx = this.ctx, t = (o.t || ctx.currentTime) + (o.delay || 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.f, t);
      if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + (o.glide || o.dur));
      if (o.detune) osc.detune.value = o.detune;
      const a = o.a || 0.004, vol = o.vol || 0.3;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      let node = osc;
      if (o.filter) {
        const f = ctx.createBiquadFilter();
        f.type = o.filter; f.frequency.setValueAtTime(o.ff || 2000, t);
        if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, t + o.dur);
        f.Q.value = o.q || 1;
        node.connect(f); node = f;
      }
      if (o.dist) { const ws = ctx.createWaveShaper(); ws.curve = this.distCurve; node.connect(ws); node = ws; }
      node.connect(g);
      if (o.pan !== undefined && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner(); p.pan.value = NS.U.clamp(o.pan, -1, 1); g.connect(p); p.connect(o.dest || this.sfxBus);
      } else g.connect(o.dest || this.sfxBus);
      if (o.rev) { const rs = ctx.createGain(); rs.gain.value = o.rev; g.connect(rs); rs.connect(this.reverbSend); }
      osc.start(t); osc.stop(t + o.dur + 0.05);
      return osc;
    }
    _noise(o) {
      const ctx = this.ctx, t = (o.t || ctx.currentTime) + (o.delay || 0);
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.playbackRate.value = o.rate || 1;
      const f = ctx.createBiquadFilter();
      f.type = o.filter || 'bandpass';
      f.frequency.setValueAtTime(o.ff || 1500, t);
      if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, t + o.dur);
      f.Q.value = o.q || 1;
      const g = ctx.createGain();
      const a = o.a || 0.003, vol = o.vol || 0.3;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      src.connect(f); f.connect(g); g.connect(o.dest || this.sfxBus);
      if (o.rev) { const rs = ctx.createGain(); rs.gain.value = o.rev; g.connect(rs); rs.connect(this.reverbSend); }
      src.start(t, Math.random() * 1.5); src.stop(t + o.dur + 0.05);
    }

    /* ---------------- Hiệu ứng âm thanh ---------------- */
    sfx(name, opt = {}) {
      if (!this.ready) return;
      const now = this.ctx.currentTime;
      // chống trùng lặp quá dày
      const minGap = opt.gap !== undefined ? opt.gap : 0.025;
      if (this.lastPlay[name] && now - this.lastPlay[name] < minGap) return;
      this.lastPlay[name] = now;
      const p = opt.pitch || 1, v = opt.vol || 1, pan = opt.pan;
      const T = (o) => this._tone(Object.assign({ pan }, o));
      const N = (o) => this._noise(o);
      switch (name) {
        /* ---- UI ---- */
        case 'hover': T({ type: 'triangle', f: 1800 * p, f2: 2400 * p, dur: 0.05, vol: 0.05 * v }); break;
        case 'click': T({ type: 'square', f: 900, f2: 1400, dur: 0.07, vol: 0.06 * v, filter: 'lowpass', ff: 3000 }); T({ type: 'sine', f: 1800, dur: 0.12, vol: 0.05, delay: 0.03 }); break;
        case 'back': T({ type: 'triangle', f: 900, f2: 400, dur: 0.12, vol: 0.08 * v }); break;
        case 'error': T({ type: 'square', f: 180, dur: 0.15, vol: 0.08, filter: 'lowpass', ff: 900 }); T({ type: 'square', f: 140, dur: 0.18, vol: 0.08, delay: 0.09, filter: 'lowpass', ff: 900 }); break;
        case 'select': [0, 4, 7].forEach((n, i) => T({ type: 'triangle', f: midiToFreq(76 + n) * p, dur: 0.25, vol: 0.06, delay: i * 0.035, rev: 0.4 })); break;
        case 'lock':
          T({ type: 'sawtooth', f: 220, f2: 880, dur: 0.25, vol: 0.08, filter: 'lowpass', ff: 600, ff2: 5000 });
          N({ ff: 3000, ff2: 8000, dur: 0.3, vol: 0.1, filter: 'highpass' });
          [0, 7, 12].forEach((n, i) => T({ type: 'square', f: midiToFreq(69 + n), dur: 0.4, vol: 0.05, delay: 0.08 + i * 0.05, filter: 'lowpass', ff: 3500, rev: 0.5 }));
          break;
        case 'confirm': T({ type: 'sine', f: 660, dur: 0.12, vol: 0.08 }); T({ type: 'sine', f: 990, dur: 0.2, vol: 0.08, delay: 0.08, rev: 0.4 }); break;
        case 'unlock': [0, 4, 7, 12, 16].forEach((n, i) => T({ type: 'triangle', f: midiToFreq(72 + n), dur: 0.5, vol: 0.06, delay: i * 0.07, rev: 0.6 })); break;
        case 'levelup': [0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) => T({ type: 'square', f: midiToFreq(67 + n), dur: 0.22, vol: 0.05, delay: i * 0.06, filter: 'lowpass', ff: 4000, rev: 0.5 })); break;
        case 'type': T({ type: 'square', f: 1200 + Math.random() * 300, dur: 0.02, vol: 0.02 }); break;
        case 'whoosh': N({ ff: 400, ff2: 3000, dur: 0.4, vol: 0.12, q: 2 }); break;
        case 'transition': N({ ff: 6000, ff2: 300, dur: 0.35, vol: 0.08, q: 1.2 }); T({ type: 'sine', f: 120, f2: 60, dur: 0.3, vol: 0.12 }); break;

        /* ---- Di chuyển ---- */
        case 'step': N({ ff: 900 * p, dur: 0.05, vol: 0.05 * v, q: 3 }); break;
        case 'jump': N({ ff: 600, ff2: 2200, dur: 0.15, vol: 0.08 }); T({ type: 'sine', f: 200, f2: 420, dur: 0.12, vol: 0.06 }); break;
        case 'land': T({ type: 'sine', f: 120, f2: 50, dur: 0.12, vol: 0.18 * v }); N({ ff: 500, dur: 0.08, vol: 0.08, filter: 'lowpass' }); break;
        case 'dash': N({ ff: 800, ff2: 4000, dur: 0.22, vol: 0.13, q: 1.5 }); break;
        case 'dodge': N({ ff: 3000, ff2: 600, dur: 0.25, vol: 0.12, q: 1.2 }); T({ type: 'sine', f: 900, f2: 300, dur: 0.18, vol: 0.04 }); break;

        /* ---- Đòn đánh ---- */
        case 'swingL': N({ ff: 1600 * p, ff2: 3200 * p, dur: 0.09, vol: 0.09 * v, q: 1.5 }); break;
        case 'swingH': N({ ff: 500 * p, ff2: 2200 * p, dur: 0.18, vol: 0.13 * v, q: 1.2 }); break;
        case 'hitL':
          T({ type: 'sine', f: 190 * p, f2: 70, dur: 0.1, vol: 0.32 * v });
          N({ ff: 2200, dur: 0.06, vol: 0.2 * v, q: 0.8 });
          T({ type: 'square', f: 1400 * p, dur: 0.02, vol: 0.04 });
          break;
        case 'hitH':
          T({ type: 'sine', f: 150 * p, f2: 40, dur: 0.22, vol: 0.45 * v, dist: true });
          N({ ff: 1400, ff2: 400, dur: 0.16, vol: 0.28 * v, q: 0.7 });
          N({ ff: 5000, dur: 0.04, vol: 0.12 * v, filter: 'highpass' });
          break;
        case 'kickL':
          T({ type: 'sine', f: 160 * p, f2: 55, dur: 0.12, vol: 0.34 * v });
          N({ ff: 1600, dur: 0.07, vol: 0.2 * v });
          break;
        case 'kickH':
          T({ type: 'sine', f: 130 * p, f2: 35, dur: 0.26, vol: 0.5 * v, dist: true });
          N({ ff: 900, ff2: 250, dur: 0.2, vol: 0.3 * v, q: 0.6 });
          break;
        case 'block':
          T({ type: 'triangle', f: 1300 * p, f2: 900, dur: 0.12, vol: 0.1 * v });
          T({ type: 'square', f: 2600 * p, dur: 0.05, vol: 0.04 * v, filter: 'bandpass', ff: 3000 });
          N({ ff: 4000, dur: 0.07, vol: 0.12 * v, filter: 'highpass' });
          break;
        case 'parry':
          [1, 1.5, 2.01].forEach((m, i) => T({ type: 'sine', f: 1046 * m, dur: 0.6, vol: 0.09, delay: i * 0.01, rev: 0.8 }));
          N({ ff: 7000, dur: 0.12, vol: 0.15, filter: 'highpass' });
          T({ type: 'sine', f: 300, f2: 80, dur: 0.2, vol: 0.2 });
          break;
        case 'guardBreak':
          T({ type: 'sawtooth', f: 400, f2: 60, dur: 0.5, vol: 0.2, dist: true, filter: 'lowpass', ff: 2000 });
          N({ ff: 3000, ff2: 200, dur: 0.5, vol: 0.25 });
          break;
        case 'throw': T({ type: 'sine', f: 100, f2: 40, dur: 0.35, vol: 0.5, dist: true }); N({ ff: 700, dur: 0.25, vol: 0.25, filter: 'lowpass' }); break;
        case 'grab': N({ ff: 1200, dur: 0.08, vol: 0.15 }); T({ type: 'square', f: 300, dur: 0.06, vol: 0.06 }); break;
        case 'tech': T({ type: 'triangle', f: 880, dur: 0.15, vol: 0.1 }); T({ type: 'triangle', f: 1320, dur: 0.15, vol: 0.08, delay: 0.05 }); break;
        case 'armor': T({ type: 'square', f: 300, f2: 200, dur: 0.12, vol: 0.12, filter: 'lowpass', ff: 1400 }); T({ type: 'triangle', f: 1800, dur: 0.1, vol: 0.06 }); break;
        case 'counter':
          T({ type: 'sawtooth', f: 880, f2: 1760, dur: 0.15, vol: 0.07, filter: 'lowpass', ff: 5000 });
          T({ type: 'sine', f: 1760, dur: 0.3, vol: 0.06, delay: 0.06, rev: 0.6 });
          break;
        case 'evade': T({ type: 'sine', f: 1500, f2: 600, dur: 0.3, vol: 0.07, rev: 0.8 }); N({ ff: 5000, ff2: 1000, dur: 0.3, vol: 0.06 }); break;
        case 'combo': T({ type: 'square', f: midiToFreq(72 + Math.min(opt.n || 0, 16)), dur: 0.08, vol: 0.035, filter: 'lowpass', ff: 4000 }); break;

        /* ---- Nguyên tố ---- */
        case 'shadow':
          N({ ff: 3000, ff2: 300, dur: 0.35, vol: 0.18, q: 2 });
          T({ type: 'sawtooth', f: 90, f2: 45, dur: 0.35, vol: 0.12, filter: 'lowpass', ff: 600 });
          break;
        case 'slash':
          N({ ff: 5000 * p, ff2: 1500, dur: 0.16, vol: 0.14, q: 3 });
          T({ type: 'sawtooth', f: 2400 * p, f2: 900, dur: 0.1, vol: 0.03 });
          break;
        case 'electric':
          for (let i = 0; i < 6; i++) T({ type: 'sawtooth', f: 200 + Math.random() * 1600, dur: 0.04, vol: 0.06 * v, delay: i * 0.03, filter: 'bandpass', ff: 3000 });
          N({ ff: 6000, dur: 0.25, vol: 0.12 * v, filter: 'highpass' });
          break;
        case 'thunder':
          N({ ff: 3000, ff2: 100, dur: 1.0, vol: 0.4, filter: 'lowpass', rev: 0.5 });
          T({ type: 'sawtooth', f: 80, f2: 30, dur: 0.6, vol: 0.25, dist: true });
          for (let i = 0; i < 5; i++) T({ type: 'square', f: 300 + Math.random() * 2000, dur: 0.03, vol: 0.06, delay: i * 0.02 });
          break;
        case 'quake':
          T({ type: 'sine', f: 70, f2: 25, dur: 0.8, vol: 0.6, dist: true });
          N({ ff: 400, ff2: 80, dur: 0.9, vol: 0.4, filter: 'lowpass' });
          break;
        case 'ice':
          [0, 7, 12, 19].forEach((n, i) => T({ type: 'sine', f: midiToFreq(84 + n + Math.random() * 2), dur: 0.35, vol: 0.05, delay: i * 0.025, rev: 0.7 }));
          N({ ff: 7000, dur: 0.2, vol: 0.12, filter: 'highpass' });
          break;
        case 'shatter':
          for (let i = 0; i < 8; i++) T({ type: 'triangle', f: 2000 + Math.random() * 4000, dur: 0.12, vol: 0.05, delay: i * 0.018 });
          N({ ff: 5000, ff2: 1500, dur: 0.5, vol: 0.3, filter: 'highpass', rev: 0.6 });
          T({ type: 'sine', f: 140, f2: 50, dur: 0.3, vol: 0.3 });
          break;
        case 'fire':
          N({ ff: 800, ff2: 2500, dur: 0.45, vol: 0.25 * v, filter: 'lowpass', q: 0.5 });
          T({ type: 'sawtooth', f: 110, f2: 70, dur: 0.4, vol: 0.08, filter: 'lowpass', ff: 500 });
          break;
        case 'explosion':
          T({ type: 'sine', f: 110, f2: 28, dur: 0.9, vol: 0.6 * v, dist: true });
          N({ ff: 2500, ff2: 120, dur: 1.0, vol: 0.45 * v, filter: 'lowpass', rev: 0.4 });
          break;
        case 'glitch':
          for (let i = 0; i < 7; i++) T({ type: 'square', f: [220, 440, 880, 1760, 3520][Math.floor(Math.random() * 5)], dur: 0.035, vol: 0.06, delay: i * 0.028 });
          N({ ff: 2500, dur: 0.1, vol: 0.1, q: 8 });
          break;
        case 'core':
          [0, 4, 7, 11, 14].forEach((n, i) => T({ type: 'sine', f: midiToFreq(62 + n), dur: 1.0, vol: 0.05, delay: i * 0.03, rev: 0.9 }));
          T({ type: 'sawtooth', f: 60, f2: 30, dur: 0.6, vol: 0.15, filter: 'lowpass', ff: 400 });
          break;
        case 'beam':
          T({ type: 'sawtooth', f: 220, f2: 440, dur: 0.6, vol: 0.12, filter: 'lowpass', ff: 3000 });
          T({ type: 'sawtooth', f: 223, f2: 443, dur: 0.6, vol: 0.12, filter: 'lowpass', ff: 3000 });
          N({ ff: 3000, dur: 0.6, vol: 0.12 });
          break;
        case 'projectile': T({ type: 'sawtooth', f: 600 * p, f2: 200 * p, dur: 0.2, vol: 0.08, filter: 'lowpass', ff: 2500 }); N({ ff: 2000 * p, dur: 0.15, vol: 0.08 }); break;
        case 'charge': T({ type: 'sawtooth', f: 100, f2: 900, dur: 0.6, vol: 0.08, filter: 'lowpass', ff: 400, ff2: 5000 }); break;

        /* ---- Khoảnh khắc lớn ---- */
        case 'superflash':
          T({ type: 'sawtooth', f: 60, f2: 1200, dur: 0.7, vol: 0.12, filter: 'lowpass', ff: 300, ff2: 6000 });
          N({ ff: 200, ff2: 9000, dur: 0.7, vol: 0.18, filter: 'bandpass', q: 2 });
          T({ type: 'sine', f: 55, dur: 1.2, vol: 0.35, delay: 0.6, rev: 0.6 });
          [0, 7, 12].forEach((n, i) => T({ type: 'square', f: midiToFreq(57 + n), dur: 1.0, vol: 0.04, delay: 0.62 + i * 0.02, filter: 'lowpass', ff: 3000, rev: 0.8 }));
          break;
        case 'ko':
          T({ type: 'sine', f: 90, f2: 25, dur: 1.4, vol: 0.7, dist: true });
          N({ ff: 3000, ff2: 80, dur: 1.5, vol: 0.4, filter: 'lowpass', rev: 0.8 });
          T({ type: 'sawtooth', f: 440, f2: 55, dur: 1.2, vol: 0.08, filter: 'lowpass', ff: 2000 });
          break;
        case 'round': T({ type: 'square', f: 440, dur: 0.15, vol: 0.06 }); T({ type: 'square', f: 660, dur: 0.3, vol: 0.06, delay: 0.12, rev: 0.5 }); break;
        case 'ready': N({ ff: 1000, ff2: 6000, dur: 0.6, vol: 0.1 }); T({ type: 'sawtooth', f: 110, f2: 220, dur: 0.6, vol: 0.06, filter: 'lowpass', ff: 1200 }); break;
        case 'fight':
          T({ type: 'sine', f: 80, f2: 40, dur: 0.6, vol: 0.5, dist: true });
          N({ ff: 6000, ff2: 400, dur: 0.5, vol: 0.25, rev: 0.6 });
          [0, 7, 12, 19].forEach((n) => T({ type: 'sawtooth', f: midiToFreq(57 + n), dur: 0.7, vol: 0.04, filter: 'lowpass', ff: 4000, rev: 0.6 }));
          break;
        case 'timeup': [0, -3, -7].forEach((n, i) => T({ type: 'square', f: midiToFreq(76 + n), dur: 0.25, vol: 0.06, delay: i * 0.15 })); break;
        case 'tick': T({ type: 'square', f: 2000, dur: 0.03, vol: 0.03 }); break;
        case 'win': [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => T({ type: 'sawtooth', f: midiToFreq(60 + n), dur: 0.5, vol: 0.05, delay: i * 0.09, filter: 'lowpass', ff: 3500, rev: 0.7 })); break;
        case 'lose': [12, 8, 5, 0].forEach((n, i) => T({ type: 'triangle', f: midiToFreq(57 + n), dur: 0.6, vol: 0.07, delay: i * 0.22, rev: 0.7 })); break;
        default: break;
      }
    }

    /* ---------------- Nhạc nền ---------------- */
    playMusic(id) {
      if (!this.ready) { this._pendingMusic = id; return; }
      if (this.music && this.music.id === id) return;
      const tr = TRACKS[id];
      if (!tr) return;
      const t = this.ctx.currentTime;
      this.trackGain.gain.cancelScheduledValues(t);
      this.trackGain.gain.setValueAtTime(this.trackGain.gain.value, t);
      this.trackGain.gain.linearRampToValueAtTime(0.0001, t + 0.35);
      setTimeout(() => {
        this.music = { id, tr, lead: makeLead(tr, id.length * 977 + tr.bpm) };
        this.step = 0;
        this.nextTime = this.ctx.currentTime + 0.06;
        const t2 = this.ctx.currentTime;
        this.trackGain.gain.cancelScheduledValues(t2);
        this.trackGain.gain.setValueAtTime(0.0001, t2);
        this.trackGain.gain.linearRampToValueAtTime(0.9, t2 + 1.2);
        this.delay.delayTime.value = (60 / tr.bpm) * 0.75;
        if (!this.timer) this.timer = setInterval(() => this._schedule(), 25);
      }, 380);
    }
    stopMusic() {
      if (!this.ready) { this._pendingMusic = null; return; }
      const t = this.ctx.currentTime;
      this.trackGain.gain.cancelScheduledValues(t);
      this.trackGain.gain.setValueAtTime(this.trackGain.gain.value, t);
      this.trackGain.gain.linearRampToValueAtTime(0.0001, t + 0.5);
      setTimeout(() => { this.music = null; }, 520);
    }
    setIntensity(v) { this.intensity = v; }
    /** Làm "nghẹt" nhạc (pause, slow-mo) */
    muffle(on) {
      if (!this.ready) return;
      this.musicFilter.frequency.setTargetAtTime(on ? 700 : 20000, this.ctx.currentTime, 0.15);
    }

    _schedule() {
      if (!this.music || !this.ctx) return;
      const tr = this.music.tr;
      const stepDur = 60 / tr.bpm / 4;
      while (this.nextTime < this.ctx.currentTime + 0.12) {
        const s = this.step;
        let t = this.nextTime;
        if (s % 2 === 1) t += tr.swing * stepDur * 2;
        this._playStep(s, t, stepDur);
        this.nextTime += stepDur;
        this.step++;
      }
    }
    _chord(tr, bar) {
      const sc = SCALES[tr.scale];
      const deg = tr.prog[bar % tr.prog.length];
      const notes = [];
      for (let i = 0; i < 8; i++) {
        const d = deg + i * 2;
        notes.push(tr.root + sc[d % 7] + 12 * Math.floor(d / 7));
      }
      return notes; // root, 3rd, 5th, 7th, 9th...
    }
    _playStep(s, t, stepDur) {
      const tr = this.music.tr;
      const i = s % 16, bar = Math.floor(s / 16);
      const chord = this._chord(tr, bar);
      const D = this.trackGain;
      const hit = (pat) => pat && pat[i] && pat[i] !== '.';
      // Trống
      if (hit(tr.kick)) {
        this._tone({ t, type: 'sine', f: 150, f2: 42, glide: 0.12, dur: 0.32, vol: 0.55, dest: D });
        this._noise({ t, ff: 3000, dur: 0.02, vol: 0.06, dest: D });
      }
      if (hit(tr.snare)) {
        this._noise({ t, ff: 1900, dur: 0.16, vol: 0.18, q: 0.8, dest: D, rev: 0.2 });
        this._tone({ t, type: 'triangle', f: 190, f2: 120, dur: 0.1, vol: 0.12, dest: D });
      }
      if (hit(tr.clap)) this._noise({ t, ff: 1400, dur: 0.12, vol: 0.12, q: 1.4, dest: D, rev: 0.4 });
      const hatOn = hit(tr.hat) || (this.intensity > 0.5 && i % 2 === 1);
      if (hatOn) this._noise({ t, ff: 9000, filter: 'highpass', dur: tr.hat[i] === 'o' ? 0.18 : 0.035, vol: 0.06, dest: D });
      // Bass
      const b = tr.bass[i];
      if (b !== null && b !== undefined) {
        const f = midiToFreq(chord[b] - 12);
        const ctx = this.ctx, osc = ctx.createOscillator(), osc2 = ctx.createOscillator(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
        osc.type = 'sawtooth'; osc2.type = 'square'; osc.frequency.value = f; osc2.frequency.value = f / 2;
        flt.type = 'lowpass'; flt.Q.value = 6;
        flt.frequency.setValueAtTime(tr.cutoff * 0.5 + this.intensity * 600, t);
        flt.frequency.exponentialRampToValueAtTime(140, t + stepDur * 1.8);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + stepDur * 1.9);
        osc.connect(flt); osc2.connect(flt);
        if (tr.distort) { const ws = ctx.createWaveShaper(); ws.curve = this.distCurve; flt.connect(ws); ws.connect(g); } else flt.connect(g);
        g.connect(D);
        osc.start(t); osc2.start(t); osc.stop(t + stepDur * 2); osc2.stop(t + stepDur * 2);
      }
      // Arp
      const a = tr.arp[i];
      if (a !== null && a !== undefined) {
        const f = midiToFreq(chord[a % chord.length] + 12 * (tr.arpOct - 1));
        const ctx = this.ctx, osc = ctx.createOscillator(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
        osc.type = tr.arpWave; osc.frequency.value = f;
        flt.type = 'lowpass'; flt.frequency.value = tr.cutoff + this.intensity * 1500; flt.Q.value = 3;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(tr.arpVol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + stepDur * 0.9);
        osc.connect(flt); flt.connect(g); g.connect(D); g.connect(this.delay);
        osc.start(t); osc.stop(t + stepDur);
      }
      // Pad (mỗi nhịp)
      if (tr.pad && i === 0) {
        const dur = stepDur * 16;
        [0, 1, 2].forEach((k) => {
          const f = midiToFreq(chord[k]);
          [-8, 8].forEach((det) => this._tone({ t, type: 'sawtooth', f, detune: det, dur: dur * 1.02, a: dur * 0.3, vol: 0.022, filter: 'lowpass', ff: 900, dest: D, rev: 0.5 }));
        });
      }
      // Lead melody
      if (tr.lead > 0) {
        const st = this.music.lead[s % 64];
        if (st && bar % 8 >= 4) {
          const f = midiToFreq(chord[st.idx] + 24);
          this._tone({ t, type: tr.leadWave || 'square', f, dur: stepDur * (st.len + 0.6), vol: 0.035, filter: 'lowpass', ff: 3000, dest: D, rev: 0.45 });
        }
      }
    }

    /* ---------------- Âm thanh môi trường ---------------- */
    setAmbience(id) {
      if (!this.ready) { this._pendingAmb = id; return; }
      this._stopAmb();
      if (!id) return;
      const ctx = this.ctx;
      const nodes = [];
      const intervals = [];
      const out = ctx.createGain(); out.gain.value = 0; out.connect(this.ambBus);
      out.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);
      const loopNoise = (type, freq, q, vol, rate = 1) => {
        const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true; src.playbackRate.value = rate;
        const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
        const g = ctx.createGain(); g.gain.value = vol;
        src.connect(f); f.connect(g); g.connect(out); src.start();
        nodes.push(src); return { src, f, g };
      };
      const drone = (type, freq, vol, lp = 400) => {
        const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
        const g = ctx.createGain(); g.gain.value = vol;
        o.connect(f); f.connect(g); g.connect(out); o.start();
        nodes.push(o); return { o, f, g };
      };
      const lfo = (param, rate, depth) => {
        const l = ctx.createOscillator(); l.frequency.value = rate;
        const g = ctx.createGain(); g.gain.value = depth;
        l.connect(g); g.connect(param); l.start(); nodes.push(l);
      };
      const every = (ms, fn) => intervals.push(setInterval(() => { if (this.ctx.state === 'running') fn(); }, ms));
      const blip = (o) => this._tone(Object.assign({ dest: out }, o));
      const nz = (o) => this._noise(Object.assign({ dest: out }, o));
      switch (id) {
        case 'rain': {
          loopNoise('bandpass', 2500, 0.6, 0.06);
          loopNoise('highpass', 7000, 0.5, 0.025);
          drone('sawtooth', 48, 0.03, 160);
          every(140, () => { if (Math.random() < 0.5) nz({ ff: 3000 + Math.random() * 4000, dur: 0.02, vol: 0.03, q: 6 }); });
          every(9000, () => { if (Math.random() < 0.45) nz({ ff: 600, ff2: 60, dur: 2.5, vol: 0.12, filter: 'lowpass', rev: 0.6 }); });
          break;
        }
        case 'factory': {
          const h = drone('sawtooth', 55, 0.05, 220); lfo(h.f.frequency, 0.3, 80);
          drone('square', 110.5, 0.01, 300);
          every(1700, () => { if (Math.random() < 0.6) { blip({ type: 'triangle', f: 300 + Math.random() * 200, dur: 0.3, vol: 0.04, rev: 0.7 }); nz({ ff: 1500, dur: 0.06, vol: 0.05 }); } });
          every(4300, () => { if (Math.random() < 0.6) nz({ ff: 5000, filter: 'highpass', dur: 1.4, a: 0.2, vol: 0.05 }); });
          break;
        }
        case 'wind': {
          const w = loopNoise('lowpass', 500, 1, 0.08); lfo(w.f.frequency, 0.13, 300);
          const w2 = loopNoise('bandpass', 1200, 3, 0.02); lfo(w2.f.frequency, 0.21, 600);
          every(7000, () => { if (Math.random() < 0.5) blip({ type: 'sine', f: 700, f2: 500, glide: 2, dur: 2.2, a: 0.5, vol: 0.015, rev: 0.8 }); });
          break;
        }
        case 'frost': {
          const w = loopNoise('bandpass', 900, 2, 0.05); lfo(w.f.frequency, 0.09, 500);
          drone('sine', 98, 0.02, 600);
          every(1300, () => { if (Math.random() < 0.55) blip({ type: 'sine', f: midiToFreq(88 + Math.floor(Math.random() * 12)), dur: 1.4, vol: 0.02, rev: 0.9 }); });
          break;
        }
        case 'reactor': {
          const d1 = drone('sawtooth', 41, 0.06, 300); lfo(d1.g.gain, 0.5, 0.03);
          drone('sine', 82.4, 0.04, 800);
          const hm = drone('square', 164.8, 0.006, 1200); lfo(hm.f.frequency, 4, 400);
          every(700, () => { if (Math.random() < 0.35) for (let i = 0; i < 4; i++) blip({ type: 'sawtooth', f: 300 + Math.random() * 2500, dur: 0.03, vol: 0.02, delay: i * 0.02 }); });
          break;
        }
        case 'sanctum': {
          [0, 7, 12, 16].forEach((n) => { const d = drone('sine', midiToFreq(50 + n), 0.018, 1500); lfo(d.g.gain, 0.1 + n * 0.01, 0.01); });
          every(3000, () => blip({ type: 'triangle', f: midiToFreq(86 + [0, 4, 7, 11][Math.floor(Math.random() * 4)]), dur: 2, vol: 0.015, rev: 1 }));
          break;
        }
        case 'menu': {
          loopNoise('bandpass', 2500, 0.6, 0.015);
          drone('sawtooth', 55, 0.015, 200);
          break;
        }
        default: break;
      }
      this.amb = { id, nodes, intervals, out };
    }
    _stopAmb() {
      if (!this.amb) return;
      const a = this.amb;
      this.amb = null;
      a.intervals.forEach(clearInterval);
      const t = this.ctx.currentTime;
      a.out.gain.cancelScheduledValues(t);
      a.out.gain.setValueAtTime(a.out.gain.value, t);
      a.out.gain.linearRampToValueAtTime(0, t + 0.6);
      setTimeout(() => { a.nodes.forEach((n) => { try { n.stop(); } catch (e) { /* noop */ } }); a.out.disconnect(); }, 700);
    }

    /* ---------------- Announcer ---------------- */
    announce(text) {
      const s = NS.Storage.settings;
      if (!s.announcer || s.muted || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        if (!this.voice) {
          const vs = window.speechSynthesis.getVoices();
          this.voice = vs.find((v) => /en-(US|GB)/i.test(v.lang) && /male|david|guy|daniel|mark/i.test(v.name)) || vs.find((v) => /^en/i.test(v.lang)) || null;
        }
        if (this.voice) u.voice = this.voice;
        u.lang = 'en-US'; u.rate = 0.92; u.pitch = 0.55;
        u.volume = Math.min(1, s.master * s.sfx * 1.1);
        window.speechSynthesis.speak(u);
      } catch (e) { /* không hỗ trợ */ }
    }
  }

  NS.Audio = new AudioManager();
  NS.Audio.TRACKS = TRACKS;
})();
