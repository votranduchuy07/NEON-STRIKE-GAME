/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — engine.js
   GAME ENGINE: vòng lặp cố định 60Hz (requestAnimationFrame + accumulator),
   luồng hiệp đấu (intro → READY → FIGHT → KO → kết quả), camera động,
   hitstop, slow-motion, superflash Ultimate, rung màn hình, render.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const U = NS.U;
  const STEP = 1000 / 60;
  const VW = 1280, VH = 720;

  class Game {
    /**
     * opts = { canvas, hud, mode, arena, rounds, time, training,
     *          p1:{char,costume,controller,name,hp,hpMul}, p2:{...}, onEnd(result) }
     */
    constructor(opts) {
      this.opts = opts;
      this.canvas = opts.canvas;
      this.ctx = this.canvas.getContext('2d');
      this.hud = opts.hud;
      this.mode = opts.mode || 'quick';
      this.training = !!opts.training;
      this.roundsTotal = opts.rounds || 3;
      this.timeLimit = opts.time === undefined ? 99 : opts.time;
      const S = NS.Storage.settings;
      this.quality = S.quality;
      this.reduce = S.reduceFx;
      this.particles = new NS.Particles();
      this.particles.setQuality(this.quality, this.reduce);
      this.arena = new NS.Arenas.Arena(opts.arena, this.quality, this.reduce);
      this.projectiles = [];
      this.ghosts = [];
      this.frame = 0;
      this.running = false;
      this.paused = false;
      this.resize = this.resize.bind(this);
      window.addEventListener('resize', this.resize);
      this.resize();
      this.createFighters();
      this.resetMatch();
    }

    createFighters() {
      const o = this.opts;
      const mk = (side, p) => {
        const f = new NS.Fighter(this, { side, charId: p.char, costume: p.costume, controller: p.controller, name: p.name, hpMul: p.hpMul });
        if (p.controller && p.controller.attach) p.controller.attach(this, f);
        return f;
      };
      this.fighters = [mk(0, o.p1), mk(1, o.p2)];
      this.p1 = this.fighters[0]; this.p2 = this.fighters[1];
    }
    opponent(f) { return f === this.p1 ? this.p2 : this.p1; }

    resize() {
      const q = NS.Storage.settings.quality;
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      const cssW = rect.width || window.innerWidth;
      let scale = (cssW / VW) * (q === 'high' ? Math.min(dpr, 2) : q === 'medium' ? Math.min(dpr, 1.25) : 0.75);
      scale = U.clamp(scale, 0.5, 2.5);
      this.rs = scale;
      this.canvas.width = Math.round(VW * scale);
      this.canvas.height = Math.round(VH * scale);
    }

    /* ---------------- Luồng trận đấu ---------------- */
    resetMatch() {
      this.round = 1;
      this.matchFrames = 0;
      this.fighters.forEach((f) => { f.roundsWon = 0; f.ult = 0; f.energy = 30; f.stats = { damage: 0, hits: 0, maxCombo: 0, combos: 0, combos3: 0, counters: 0, parries: 0, blocked: 0, throws: 0, ults: 0, skills: 0, perfects: 0 }; });
      if (this.opts.p1.hp) this.p1.hp = this.opts.p1.hp;
      this.roundLog = [];
      this.result = null;
      this.startRound(true);
    }
    startRound(first) {
      const cx = NS.Collision.STAGE.W / 2;
      const keep1 = first && !!this.opts.p1.hp;
      this.p1.resetRound(cx - 180, 1, keep1);
      this.p2.resetRound(cx + 180, -1, false);
      if (keep1) this.p1.hp = this.opts.p1.hp;
      this.projectiles = []; this.ghosts = [];
      this.particles.clear();
      this.timeLeft = this.timeLimit;
      this.timeAcc = 0;
      this.hitstop = 0; this.freeze = 0; this.timeScale = 1; this.slowT = 0;
      this.shakeAmt = 0; this.shakeT = 0; this.flashCol = null; this.flashA = 0;
      this.cine = null; this.zoomExtra = 0; this.timeStop = 0; this.superInfo = null;
      this.cam = { x: cx, y: 390, zoom: 1.02 };
      this.koInfo = null;
      if (first && !this.training) {
        this.phase = 'intro';
        this.p1.x = cx - 700; this.p2.x = cx + 700;
        this.p1.introX = cx - 180; this.p2.introX = cx + 180;
        this.p1.setState('intro'); this.p2.setState('intro');
        this.cam.zoom = 0.9;
        this.hud.introBanner(this.p1, this.p2, NS.Arenas.DEFS[this.arena.id]);
      } else {
        this.phase = this.training ? 'fight' : 'ready';
      }
      this.phaseT = 0;
      this.hud.resetRound(this);
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      this.acc = 0;
      NS.Audio.playMusic(NS.Arenas.DEFS[this.arena.id].music);
      NS.Audio.setAmbience(NS.Arenas.DEFS[this.arena.id].amb);
      NS.Input.Keyboard.captureGame = true;
      NS.Input.Keyboard.flush();
      const loop = (now) => {
        if (!this.running) return;
        this.raf = requestAnimationFrame(loop);
        let dt = now - this.last;
        this.last = now;
        if (dt > 100) dt = 100;
        if (!this.paused) {
          this.acc += dt * this.timeScale;
          let n = 0;
          while (this.acc >= STEP && n < 5) { this.step(); this.acc -= STEP; n++; }
          if (this.slowT > 0) { this.slowT -= dt / STEP; if (this.slowT <= 0) { this.timeScale = 1; NS.Audio.muffle(false); } }
        } else {
          NS.Input.Keyboard.flush();
          NS.Input.Touch.flush();
        }
        this.render();
      };
      this.raf = requestAnimationFrame(loop);
    }
    destroy() {
      this.running = false;
      cancelAnimationFrame(this.raf);
      window.removeEventListener('resize', this.resize);
      NS.Input.Keyboard.captureGame = false;
      NS.Audio.muffle(false);
      NS.Audio.setIntensity(0);
    }
    pause(on) {
      this.paused = on;
      NS.Audio.muffle(on);
      if (!on) { this.last = performance.now(); NS.Input.Keyboard.flush(); }
    }
    restart() {
      this.pause(false);
      this.resetMatch();
    }

    /* ---------------- Hiệu ứng toàn cục ---------------- */
    sfx(name, f, opts = {}) {
      const pan = f && this.cam ? U.clamp((f.x - this.cam.x) / 800, -0.8, 0.8) : 0;
      NS.Audio.sfx(name, Object.assign({ pan }, opts));
    }
    shake(amt, frames = 8) {
      if (!NS.Storage.settings.shake) return;
      const k = this.reduce ? 0.4 : 1;
      this.shakeAmt = Math.max(this.shakeAmt, amt * k);
      this.shakeT = Math.max(this.shakeT, frames);
    }
    flashScreen(col, a) { if (this.reduce) a *= 0.4; this.flashCol = col; this.flashA = Math.max(this.flashA, a); }
    zoomPulse(z, frames) { this.zoomExtra = Math.max(this.zoomExtra, z - 1); this.zoomT = frames; }
    cinematic(zoom, frames, focusX) { this.cine = { zoom, frames, x: focusX }; }
    slowmo(scale, frames) {
      if (this.timeScale < scale && this.slowT > 0) return;
      this.timeScale = scale; this.slowT = frames;
      if (scale < 0.5) NS.Audio.muffle(true);
    }
    ghost(f, o = {}) {
      let skel = f.skel;
      if (o.pose) skel = NS.Anim.skeleton(NS.Anim.pose(o.pose, f.def.id), true);
      this.ghosts.push({ def: f.def, pal: f.pal, skel, x: o.x !== undefined ? o.x : f.x, y: o.y !== undefined ? o.y : f.y, facing: o.facing || f.facing, color: o.color || f.pal.accent, life: o.life || 14, max: o.life || 14, t: f.t });
    }
    superFlash(f, move) {
      this.freeze = 44;
      this.superInfo = { f, t: 0, dur: 44 };
      this.cinematic(1.3, 60, f.x);
      this.sfx('superflash', f);
      NS.Audio.announce(move.name);
      this.hud.cutin(f, move.name);
      this.flashScreen(f.pal.accent, 0.25);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        this.particles.add({ type: 'spark', x: f.x + Math.cos(a) * 200, y: f.y - 100 + Math.sin(a) * 200, vx: -Math.cos(a) * 9, vy: -Math.sin(a) * 9, size: 20, w: 2.5, life: 22, color: f.pal.glow, drag: 0.95 });
      }
      this.particles.add({ type: 'ring', x: f.x, y: f.y - 100, size: 220, grow: -9, w: 4, life: 24, color: f.pal.accent });
    }

    /* ---------------- Một bước mô phỏng (1/60 s) ---------------- */
    step() {
      this.frame++;
      this.phaseT++;
      const inA = this.p1.controller.poll(), inB = this.p2.controller.poll();
      NS.Input.Keyboard.flush();
      NS.Input.Touch.flush();
      this.arena.update();
      // superflash: đóng băng toàn bộ trừ hiệu ứng
      if (this.freeze > 0) {
        this.freeze--;
        if (this.superInfo) this.superInfo.t++;
        if (this.freeze === 0) this.superInfo = null;
        this.p1.readInput(inA); this.p2.readInput(inB);
        this.particles.update(1);
        this.updateCamera();
        this.hud.update(this);
        return;
      }
      // hitstop: ngưng chuyển động, vẫn ghi nhận nút bấm
      if (this.hitstop > 0) {
        this.hitstop--;
        this.p1.readInput(inA); this.p2.readInput(inB);
        this.particles.update(0.4);
        this.updateCamera();
        this.hud.update(this);
        return;
      }
      this.updatePhase();
      const [a, b] = this.fighters;
      a.update(this, inA);
      b.update(this, inB);
      NS.Collision.resolvePush(a, b);
      NS.Collision.clampSeparation(a, b);
      this.projectiles.forEach((p) => p.update());
      if (this.phase === 'fight' || this.training) NS.Combat.resolve(this);
      // lưu vệt mờ (motion blur / trail)
      this.fighters.forEach((f) => {
        if (!f.trailHist) f.trailHist = [];
        if (f.trailOn && f.skel) { f.trailHist.push({ x: f.x, y: f.y, skel: f.skel, facing: f.facing }); if (f.trailHist.length > 6) f.trailHist.shift(); }
        else if (f.trailHist.length) f.trailHist.shift();
      });
      this.ghosts.forEach((g) => g.life--);
      this.ghosts = this.ghosts.filter((g) => g.life > 0);
      this.particles.update(1);
      if (this.timeStop > 0) this.timeStop--;
      if (this.shakeT > 0) { this.shakeT--; if (this.shakeT <= 0) this.shakeAmt = 0; }
      if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - 0.05);
      if (this.zoomT > 0) { this.zoomT--; if (this.zoomT <= 0) this.zoomExtra = 0; }
      if (this.cine) { this.cine.frames--; if (this.cine.frames <= 0) this.cine = null; }
      this.updateCamera();
      // nhạc gấp gáp khi máu thấp
      const danger = this.fighters.some((f) => f.hp > 0 && f.hp < f.maxHp * 0.25);
      NS.Audio.setIntensity(danger ? 1 : 0);
      if (this.training) this.updateTraining();
      this.hud.update(this);
    }

    updatePhase() {
      const t = this.phaseT;
      switch (this.phase) {
        case 'intro':
          if ((this.p1.state === 'intro_idle' && this.p2.state === 'intro_idle') || t > 180) {
            this.p1.x = this.p1.introX; this.p2.x = this.p2.introX;
            this.p1.setState('intro_idle'); this.p2.setState('intro_idle');
            if (t > 200 || (this.p1.state === 'intro_idle' && t > 120)) { this.phase = 'ready'; this.phaseT = 0; }
          }
          break;
        case 'ready':
          if (t === 1) {
            const final = this.fighters.every((f) => f.roundsWon === Math.ceil(this.roundsTotal / 2) - 1) && this.roundsTotal > 1;
            this.hud.announce(final ? 'FINAL ROUND' : `ROUND ${this.round}`, 'round');
            this.sfx('round'); NS.Audio.announce(final ? 'Final round' : `Round ${this.round}`);
            this.fighters.forEach((f) => { if (f.state === 'intro_idle' || f.state === 'intro') f.setState('idle'); });
          }
          if (t === 70) { this.hud.announce('READY', 'ready'); this.sfx('ready'); }
          if (t === 115) { this.hud.announce('FIGHT!', 'fight'); this.sfx('fight'); NS.Audio.announce('Fight!'); this.shake(6, 10); }
          if (t >= 125) { this.phase = 'fight'; this.phaseT = 0; }
          break;
        case 'fight':
          if (this.training) return;
          this.matchFrames++;
          if (isFinite(this.timeLimit)) {
            this.timeAcc++;
            if (this.timeAcc >= 60) {
              this.timeAcc = 0;
              this.timeLeft--;
              if (this.timeLeft <= 10 && this.timeLeft > 0) this.sfx('tick');
              if (this.timeLeft <= 0) { this.timeLeft = 0; this.timeOver(); }
            }
          }
          break;
        case 'ko': {
          const loser = this.koInfo.loser, winner = this.koInfo.winner;
          const settled = !loser || loser.state === 'ko_down' || loser.grounded || this.koInfo.double;
          if (t > 90 && settled && !this.koInfo.posed) {
            this.koInfo.posed = true;
            if (winner) { winner.move = null; winner.setState('victory'); winner.faceOpponent(); }
            if (this.koInfo.double) this.fighters.forEach((f) => f.setState('defeat'));
            this.hud.announce(this.koInfo.text2, this.koInfo.perfect ? 'perfect' : 'win');
            if (this.koInfo.perfect) { this.sfx('win'); NS.Audio.announce('Perfect!'); }
          }
          if (t > 230) this.endRound();
          break;
        }
        case 'matchEnd':
          if (t === 30) this.hud.announce(this.result.winnerSide >= 0 ? `${this.fighters[this.result.winnerSide].name} WINS` : 'DRAW', 'match');
          if (t > 200 && !this.result.sent) { this.result.sent = true; this.opts.onEnd && this.opts.onEnd(this.result); }
          break;
        default: break;
      }
    }

    onKO(att, def, hit, ctx) {
      if (this.training) {
        def.hp = 0;
        this._trainKO = 40;
        return;
      }
      if (this.phase !== 'fight') return;
      const double = att.hp <= 0;
      const finisher = (ctx.move && (ctx.move.kind === 'ult' || ctx.move.kind === 'skill')) || ctx.proj || hit.finisher;
      const perfect = !double && att.hp >= att.maxHp;
      this.phase = 'ko';
      this.phaseT = 0;
      this.koInfo = {
        winner: double ? null : att, loser: def, double, finisher, perfect,
        text2: double ? 'DOUBLE K.O.' : perfect ? 'PERFECT' : `${att.name} WINS`,
      };
      this.projectiles = [];
      this.sfx('ko', def);
      this.slowmo(0.25, 45);
      this.cinematic(1.35, 110, def.x);
      this.flashScreen('#ffffff', 0.6);
      this.shake(14, 20);
      this.hud.announce(double ? 'DOUBLE K.O.' : finisher ? 'FINISHER' : 'K.O.', finisher ? 'finisher' : 'ko');
      NS.Audio.announce(finisher ? 'Finisher!' : 'K.O.');
    }
    timeOver() {
      const a = this.p1, b = this.p2;
      const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
      const winner = Math.abs(ra - rb) < 0.001 ? null : ra > rb ? a : b;
      this.phase = 'ko';
      this.phaseT = 0;
      this.koInfo = { winner, loser: winner ? this.opponent(winner) : null, double: !winner, perfect: false, timeover: true, text2: winner ? `${winner.name} WINS` : 'DRAW' };
      this.hud.announce('TIME OVER', 'ko');
      this.sfx('timeup');
      NS.Audio.announce('Time over');
      this.fighters.forEach((f) => { if (f.state !== 'down') { f.move = null; f.setState('idle'); } });
    }
    endRound() {
      const k = this.koInfo;
      const need = Math.ceil(this.roundsTotal / 2);
      if (k.winner) {
        k.winner.roundsWon++;
        if (k.perfect) k.winner.stats.perfects++;
      } else {
        this.fighters.forEach((f) => f.roundsWon++);
      }
      this.roundLog.push({ winner: k.winner ? k.winner.side : -1, perfect: k.perfect, timeover: !!k.timeover });
      const a = this.p1.roundsWon >= need, b = this.p2.roundsWon >= need;
      if ((a && b) && this.round < this.roundsTotal + 2) { this.p1.roundsWon = need - 1; this.p2.roundsWon = need - 1; }
      else if (a || b) { this.finishMatch(a && b ? -1 : a ? 0 : 1); return; }
      this.round++;
      this.startRound(false);
    }
    finishMatch(winnerSide) {
      this.phase = 'matchEnd';
      this.phaseT = 0;
      const w = winnerSide >= 0 ? this.fighters[winnerSide] : null;
      if (w) { w.move = null; w.setState('victory'); this.cinematic(1.4, 260, w.x); }
      const l = w ? this.opponent(w) : null;
      if (l && l.state !== 'ko_down') l.setState('defeat');
      this.result = {
        winnerSide, rounds: this.roundLog.slice(), duration: this.matchFrames / 60,
        p1: { char: this.p1.charId, hp: this.p1.hp, maxHp: this.p1.maxHp, stats: Object.assign({}, this.p1.stats), roundsWon: this.p1.roundsWon },
        p2: { char: this.p2.charId, hp: this.p2.hp, maxHp: this.p2.maxHp, stats: Object.assign({}, this.p2.stats), roundsWon: this.p2.roundsWon },
      };
      this.sfx(w && !w.isAI ? 'win' : 'lose');
      if (w) this.victoryFx(w);
    }
    /** Hiệu ứng chiến thắng điện ảnh (tùy chọn trang trí của người chơi) */
    victoryFx(w) {
      const fx = w.isAI ? 'neon' : NS.Storage.data.equipped.fx;
      const ps = this.particles, x = w.x, y = w.y - 100;
      this.victoryKind = fx;
      if (fx === 'glitch') { for (let i = 0; i < 80; i++) ps.add({ type: 'pixel', x: x + U.rand(-300, 300), y: y + U.rand(-250, 200), vx: U.rand(-3, 3), vy: 0, size: U.rand(4, 14), life: U.rand(30, 90), color: U.pick(NS.FX.ELEM.glitch) }); }
      else if (fx === 'storm') { for (let i = 0; i < 6; i++) NS.FX.lightning(ps, x + U.rand(-200, 200), 0, x + U.rand(-40, 40), y - 80, U.pick(['#22d3ee', '#fde047']), 3, 30, 60); this.sfx('thunder', w); }
      else if (fx === 'phoenix') { for (let i = 0; i < 60; i++) { const s = i % 2 ? 1 : -1; ps.add({ type: 'dot', x: x + s * U.rand(10, 40), y: y - 20, vx: s * U.rand(2, 9), vy: U.rand(-7, -2), size: U.rand(10, 20), grow: -0.2, life: U.rand(40, 70), color: U.pick(NS.FX.ELEM.fire), drag: 0.97 }); } }
      else if (fx === 'void') { ps.add({ type: 'ring', x, y, size: 400, grow: -6, w: 6, life: 60, color: '#a855f7' }); for (let i = 0; i < 50; i++) { const a = U.rand(0, Math.PI * 2); ps.add({ type: 'dot', x: x + Math.cos(a) * 300, y: y + Math.sin(a) * 200, vx: -Math.cos(a) * 5, vy: -Math.sin(a) * 3.5, size: 8, life: 60, color: '#c084fc', drag: 1 }); } }
      else { NS.FX.explosion(ps, x, y, 160, w.def.element === 'neutral' ? 'core' : w.def.element); ps.add({ type: 'ring', x, y, size: 20, grow: 10, w: 6, life: 40, color: w.pal.accent }); }
    }

    updateTraining() {
      // hồi đầy máu & năng lượng cho chế độ luyện tập
      const t = this.opts.training || {};
      this.fighters.forEach((f) => {
        if (t.refill !== false) { f.energy = 100; if (f.side === 0) f.ult = 100; }
        f.koed = false;
      });
      if (this._trainKO > 0 && --this._trainKO === 0) this.fighters.forEach((f) => (f.hp = f.maxHp));
      const d = this.p2;
      if (!d.inHitstun() && d.state !== 'down' && d.state !== 'getup' && d.hp < d.maxHp) { this._trainRegen = (this._trainRegen || 0) + 1; if (this._trainRegen > 70) { d.hp = d.maxHp; this._trainRegen = 0; } }
      else this._trainRegen = 0;
    }

    /* ---------------- Camera ---------------- */
    updateCamera() {
      const [a, b] = this.fighters;
      const S = NS.Collision.STAGE;
      const dist = Math.abs(a.x - b.x);
      let tx = (a.x + b.x) / 2;
      let tz = U.clamp(1.14 - (dist - 180) / 1500, 0.86, 1.12);
      const minY = Math.min(a.y, b.y);
      let ty = 390 - Math.max(0, S.GROUND - minY - 190) * 0.55;
      if (this.phase === 'intro') { tz = 0.92; }
      if (this.cine) { tz = this.cine.zoom; tx = this.cine.x; ty = 370; }
      tz += this.zoomExtra;
      const c = this.cam;
      const k = this.cine ? 0.08 : 0.1;
      c.zoom += (tz - c.zoom) * k;
      c.x += (tx - c.x) * k * 1.3;
      c.y += (ty - c.y) * k;
      const half = VW / 2 / c.zoom;
      c.x = U.clamp(c.x, half - 60, S.W - half + 60);
    }

    /* ---------------- Render ---------------- */
    render() {
      const ctx = this.ctx, c = this.cam;
      ctx.setTransform(this.rs, 0, 0, this.rs, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      let sx = 0, sy = 0;
      if (this.shakeT > 0 && this.shakeAmt > 0) { sx = U.rand(-1, 1) * this.shakeAmt; sy = U.rand(-1, 1) * this.shakeAmt * 0.7; }
      ctx.save();
      ctx.translate(sx * 0.4, sy * 0.4);
      this.arena.drawBack(ctx, c);
      ctx.restore();
      ctx.save();
      ctx.translate(VW / 2 + sx, VH / 2 + sy);
      ctx.scale(c.zoom, c.zoom);
      ctx.translate(-c.x, -c.y);
      this.arena.drawFloor(ctx, c);
      // bóng đổ + ánh sàn
      this.fighters.forEach((f) => {
        const h = Math.max(0, NS.Collision.STAGE.GROUND - f.y);
        const k = U.clamp(1 - h / 400, 0.3, 1);
        ctx.fillStyle = `rgba(0,0,0,${0.45 * k})`;
        ctx.beginPath(); ctx.ellipse(f.x, NS.Collision.STAGE.GROUND + 2, 52 * k * f.def.scale, 10 * k, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(f.x, NS.Collision.STAGE.GROUND, 0, f.x, NS.Collision.STAGE.GROUND, 90);
        g.addColorStop(0, U.rgba(f.pal.accent, 0.22 * k)); g.addColorStop(1, U.rgba(f.pal.accent, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(f.x, NS.Collision.STAGE.GROUND + 4, 90, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      // bóng ma / phân thân
      this.ghosts.forEach((gh) => {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        NS.Anim.drawFighter(ctx, { def: gh.def, pal: gh.pal, skel: gh.skel, x: gh.x, y: gh.y, facing: gh.facing, t: gh.t, flash: 0 }, { flat: gh.color, alpha: 0.55 * (gh.life / gh.max) });
        ctx.restore();
      });
      // vệt chuyển động (motion blur khi lướt)
      this.fighters.forEach((f) => {
        if (!f.trailHist || !f.trailHist.length) return;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        f.trailHist.forEach((h, i) => {
          NS.Anim.drawFighter(ctx, f, { skel: h.skel, x: h.x, y: h.y, facing: h.facing, flat: f.pal.accent, alpha: (0.08 + (i / f.trailHist.length) * 0.22) });
        });
        ctx.restore();
      });
      // chiến binh: người đang tấn công vẽ sau cùng
      const order = this.fighters.slice().sort((p, q) => (p.state === 'attack' ? 1 : 0) - (q.state === 'attack' ? 1 : 0));
      order.forEach((f) => {
        if (f.invisible) return;
        const jx = this.hitstop > 0 && f.flash > 0 ? U.rand(-3, 3) : 0;
        if (this.superInfo && this.superInfo.f === f) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(f.x, f.y - 100, 0, f.x, f.y - 100, 220);
          g.addColorStop(0, U.rgba(f.pal.glow, 0.6)); g.addColorStop(1, U.rgba(f.pal.accent, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y - 100, 220, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        NS.Anim.drawFighter(ctx, f, { x: f.x + jx });
        this.drawStatus(ctx, f);
      });
      this.projectiles.forEach((p) => p.draw(ctx, this.frame));
      this.particles.draw(ctx);
      if (NS.Storage.settings.showHitbox || (this.training && this.opts.training && this.opts.training.hitbox)) this.drawBoxes(ctx);
      ctx.restore();
      this.arena.drawFront(ctx, c);
      this.drawOverlays(ctx);
    }

    drawStatus(ctx, f) {
      if (f.state === 'frozen' || f.status.encased > 0) {
        ctx.save();
        const s = f.def.scale;
        const w = 86 * s, h = 196 * s;
        const g = ctx.createLinearGradient(f.x - w / 2, 0, f.x + w / 2, 0);
        g.addColorStop(0, 'rgba(165,243,252,0.35)'); g.addColorStop(0.5, 'rgba(240,249,255,0.55)'); g.addColorStop(1, 'rgba(103,232,249,0.35)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(f.x - w / 2, f.y); ctx.lineTo(f.x - w / 2 - 6, f.y - h * 0.6); ctx.lineTo(f.x - w * 0.2, f.y - h); ctx.lineTo(f.x + w * 0.3, f.y - h - 8); ctx.lineTo(f.x + w / 2 + 4, f.y - h * 0.5); ctx.lineTo(f.x + w / 2, f.y);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(f.x - w * 0.2, f.y - h); ctx.lineTo(f.x, f.y - h * 0.5); ctx.lineTo(f.x + w * 0.3, f.y - h * 0.3); ctx.stroke();
        ctx.restore();
      }
      if (f.status.corrupt > 0 && f.t % 6 < 3 && !this.reduce) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) { ctx.fillStyle = U.rgba(U.pick(['#5eead4', '#f0abfc']), 0.35); ctx.fillRect(f.x - 40 + U.rand(-10, 10), f.y - U.rand(20, 190), 80, U.rand(2, 6)); }
        ctx.restore();
      }
    }

    drawBoxes(ctx) {
      ctx.save();
      ctx.lineWidth = 1.5;
      this.fighters.forEach((f) => {
        NS.Collision.hurtboxes(f).forEach((b) => { ctx.strokeStyle = 'rgba(56,189,248,0.9)'; ctx.fillStyle = 'rgba(56,189,248,0.12)'; ctx.fillRect(b.cx - b.w / 2, b.cy - b.h / 2, b.w, b.h); ctx.strokeRect(b.cx - b.w / 2, b.cy - b.h / 2, b.w, b.h); });
        NS.Collision.activeHits(f).forEach((h) => { const b = h.box; ctx.strokeStyle = 'rgba(244,63,94,1)'; ctx.fillStyle = 'rgba(244,63,94,0.25)'; ctx.fillRect(b.cx - b.w / 2, b.cy - b.h / 2, b.w, b.h); ctx.strokeRect(b.cx - b.w / 2, b.cy - b.h / 2, b.w, b.h); });
        const pb = NS.Collision.pushbox(f);
        ctx.strokeStyle = 'rgba(74,222,128,0.8)'; ctx.strokeRect(pb.cx - pb.w / 2, f.y - 4, pb.w, 4);
      });
      this.projectiles.forEach((p) => { if (!p.active) return; const b = p.box(); ctx.strokeStyle = 'rgba(250,204,21,0.9)'; ctx.strokeRect(b.cx - b.w / 2, b.cy - b.h / 2, b.w, b.h); });
      ctx.restore();
    }

    drawOverlays(ctx) {
      // Superflash: nền tối + tia sáng
      if (this.superInfo) {
        const k = Math.min(1, this.superInfo.t / 8) * (this.freeze < 8 ? this.freeze / 8 : 1);
        ctx.fillStyle = `rgba(2,2,10,${0.55 * k})`;
        ctx.fillRect(0, 0, VW, VH);
        const f = this.superInfo.f;
        const px = (f.x - this.cam.x) * this.cam.zoom + VW / 2, py = (f.y - 100 - this.cam.y) * this.cam.zoom + VH / 2;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.translate(px, py);
        for (let i = 0; i < 12; i++) {
          ctx.rotate(Math.PI / 6 + this.superInfo.t * 0.002);
          const g = ctx.createLinearGradient(0, 0, 900, 0);
          g.addColorStop(0, U.rgba(f.pal.glow, 0.35 * k)); g.addColorStop(1, U.rgba(f.pal.accent, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -26); ctx.lineTo(900, 26); ctx.fill();
        }
        ctx.restore();
        // re-draw fighter on top of darkening
        ctx.save();
        ctx.translate(VW / 2, VH / 2); ctx.scale(this.cam.zoom, this.cam.zoom); ctx.translate(-this.cam.x, -this.cam.y);
        NS.Anim.drawFighter(ctx, f);
        ctx.restore();
      }
      // Dừng thời gian (Zero): khử màu
      if (this.timeStop > 0 && !this.reduce) {
        ctx.save();
        ctx.globalCompositeOperation = 'saturation';
        ctx.fillStyle = 'rgba(128,128,128,0.85)';
        ctx.fillRect(0, 0, VW, VH);
        ctx.restore();
        ctx.fillStyle = 'rgba(45,212,191,0.06)'; ctx.fillRect(0, 0, VW, VH);
      }
      // Cảnh báo nguy hiểm khi máu thấp
      const danger = this.phase === 'fight' && this.fighters.some((f) => f.hp > 0 && f.hp < f.maxHp * 0.25);
      if (danger) {
        const a = 0.12 + Math.sin(this.frame * 0.12) * 0.08;
        const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.7);
        g.addColorStop(0, 'rgba(244,63,94,0)'); g.addColorStop(1, `rgba(244,63,94,${a})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      }
      // Viền đen điện ảnh
      const bars = this.phase === 'intro' || this.phase === 'matchEnd' || (this.cine && this.phase !== 'fight') || this.superInfo;
      this.barK = (this.barK || 0) + ((bars ? 1 : 0) - (this.barK || 0)) * 0.12;
      if (this.barK > 0.01) {
        const h = 56 * this.barK;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, h); ctx.fillRect(0, VH - h, VW, h);
      }
      // Kết thúc trận: tối dần quanh người thắng
      if (this.phase === 'matchEnd' && this.result && this.result.winnerSide >= 0) {
        const w = this.fighters[this.result.winnerSide];
        const k = Math.min(1, this.phaseT / 60);
        const px = (w.x - this.cam.x) * this.cam.zoom + VW / 2, py = (w.y - 100 - this.cam.y) * this.cam.zoom + VH / 2;
        const g = ctx.createRadialGradient(px, py, 120, px, py, 700);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,8,${0.7 * k})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const sg = ctx.createLinearGradient(px - 120, 0, px + 120, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, U.rgba(w.pal.glow, 0.18 * k)); sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg; ctx.fillRect(px - 120, 0, 240, py + 120);
        ctx.restore();
      }
      if (this.flashA > 0 && this.flashCol) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = U.rgba(this.flashCol, this.flashA * 0.6); ctx.fillRect(0, 0, VW, VH);
        ctx.restore();
      }
    }
  }

  NS.Game = Game;
})();
