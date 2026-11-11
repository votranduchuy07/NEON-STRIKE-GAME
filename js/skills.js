/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — skills.js
   SKILL SYSTEM: 2 kỹ năng đặc biệt + 1 kỹ năng di chuyển/phòng thủ
   + 1 Ultimate cho mỗi nhân vật; đạn (projectile), bẫy mặt đất,
   chuỗi đòn kết liễu điện ảnh (lock sequence).
   Mọi sát thương đều đi qua Combat.applyHit → cùng luật cho người & AI.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const U = NS.U;
  const TAU = Math.PI * 2;
  const G = () => NS.Collision.STAGE.GROUND;

  /* ======================= PROJECTILE ======================= */
  class Projectile {
    constructor(game, owner, o) {
      Object.assign(this, {
        x: owner.x, y: owner.y - 110, vx: 0, vy: 0, w: 40, h: 40, life: 60, delay: 0, hits: 1, interval: 12, power: 1,
        grav: 0, ground: false, type: 'orb', color: owner.pal.accent, hit: { dmg: 40, hs: 16, bs: 10, kb: 3 }, pierceProj: false,
      }, o);
      this.owner = owner; this.game = game; this.facing = owner.facing;
      this.age = 0; this.hitCount = 0; this.cd = 0; this.dead = false; this.hitTargets = 0;
      this.maxLife = this.life + this.delay;
      if (!this.hit.element) this.hit.element = owner.def.element;
    }
    get active() { return !this.dead && this.age >= this.delay; }
    box() { return { cx: this.x, cy: this.y, w: this.w, h: this.h }; }
    update() {
      this.age++;
      if (this.cd > 0) this.cd--;
      if (this.onUpdate) this.onUpdate(this, this.game);
      if (this.age >= this.delay) {
        this.x += this.vx; this.y += this.vy; this.vy += this.grav;
        this.life--;
        if (this.age === this.delay && this.onActivate) this.onActivate(this, this.game);
      }
      const W = NS.Collision.STAGE.W;
      if (this.life <= 0 || this.x < -200 || this.x > W + 200) { this.dead = true; if (this.onDeath) this.onDeath(this, this.game); }
    }
    draw(ctx, t) { (RENDER[this.type] || RENDER.orb)(ctx, this, t); }
  }

  /* ---------------- Vẽ đạn ---------------- */
  function glow(ctx, x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, U.rgba(col, a)); g.addColorStop(1, U.rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  function bolt(ctx, x1, y1, x2, y2, col, w, jag = 30) {
    const pts = [[x1, y1]], n = 10;
    for (let i = 1; i < n; i++) pts.push([U.lerp(x1, x2, i / n) + (Math.random() - 0.5) * jag, U.lerp(y1, y2, i / n) + (Math.random() - 0.5) * jag * 0.3]);
    pts.push([x2, y2]);
    [[w * 4, U.rgba(col, 0.25)], [w * 1.6, col], [w * 0.6, '#fff']].forEach(([lw, c]) => {
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    });
  }
  const RENDER = {
    orb(ctx, p, t) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, p.x, p.y, p.w * 1.1, p.color, 0.6);
      glow(ctx, p.x, p.y, p.w * 0.55, '#fde047', 0.9);
      for (let i = 0; i < 4; i++) {
        const a = t * 0.2 + (i * TAU) / 4;
        glow(ctx, p.x + Math.cos(a) * p.w * 0.4, p.y + Math.sin(a) * p.w * 0.4, 10, '#fff7ed', 0.6);
      }
      ctx.restore();
    },
    spear(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1);
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, 0, 50, '#67e8f9', 0.35);
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath(); ctx.moveTo(44, 0); ctx.lineTo(10, -8); ctx.lineTo(-40, -3); ctx.lineTo(-40, 3); ctx.lineTo(10, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#67e8f9'; ctx.beginPath(); ctx.moveTo(44, 0); ctx.lineTo(14, -4); ctx.lineTo(-30, 0); ctx.lineTo(14, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
    spike(ctx, p) {
      if (!p.active) {
        ctx.fillStyle = 'rgba(165,243,252,0.4)'; ctx.beginPath(); ctx.ellipse(p.x, G(), 30, 6, 0, 0, TAU); ctx.fill();
        return;
      }
      const k = Math.min(1, (p.age - p.delay + 1) / 4);
      const h = p.h * 1.1 * k;
      ctx.save();
      const g = ctx.createLinearGradient(p.x - 30, 0, p.x + 30, 0);
      g.addColorStop(0, '#38bdf8'); g.addColorStop(0.5, '#f0f9ff'); g.addColorStop(1, '#0ea5e9');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(p.x - 30, G()); ctx.lineTo(p.x - 8, G() - h * 0.7); ctx.lineTo(p.x, G() - h); ctx.lineTo(p.x + 12, G() - h * 0.6); ctx.lineTo(p.x + 30, G()); ctx.fill();
      ctx.fillStyle = 'rgba(224,242,254,0.8)';
      ctx.beginPath(); ctx.moveTo(p.x - 44, G()); ctx.lineTo(p.x - 32, G() - h * 0.4); ctx.lineTo(p.x - 20, G()); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x + 22, G()); ctx.lineTo(p.x + 36, G() - h * 0.45); ctx.lineTo(p.x + 46, G()); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, p.x, G() - h / 2, 60, '#67e8f9', 0.3);
      ctx.restore();
    },
    strike(ctx, p, t) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (!p.active) {
        const k = p.age / Math.max(1, p.delay);
        ctx.strokeStyle = U.rgba('#fde047', 0.4 + k * 0.5); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(p.x, G(), p.w * (1.2 - k * 0.5), 10, 0, 0, TAU); ctx.stroke();
        glow(ctx, p.x, G(), p.w * 1.3, '#22d3ee', 0.2 + k * 0.3);
        if (t % 3 === 0) bolt(ctx, p.x + U.rand(-30, 30), G() - 40, p.x, G(), '#22d3ee', 0.8, 10);
      } else {
        const top = p.y - p.h / 2;
        bolt(ctx, p.x + U.rand(-20, 20), top - 60, p.x, G(), '#22d3ee', p.w * 0.12 + 2, 40);
        bolt(ctx, p.x + U.rand(-40, 40), top, p.x + U.rand(-10, 10), G(), '#fde047', p.w * 0.06 + 1, 50);
        glow(ctx, p.x, G() - 20, p.w * 2, '#a5f3fc', 0.6);
      }
      ctx.restore();
    },
    wave(ctx, p, t) {
      ctx.save(); ctx.translate(p.x, G()); ctx.scale(p.facing, 1);
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, -10, 70, '#f97316', 0.4);
      ctx.fillStyle = 'rgba(253,186,116,0.85)';
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.quadraticCurveTo(0, -60 - Math.sin(t * 0.5) * 8, 34, 0); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(10, -36, 30, 0); ctx.fill();
      ctx.restore();
    },
    frostwave(ctx, p) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, G() - 140, 0, G());
      g.addColorStop(0, 'rgba(165,243,252,0)'); g.addColorStop(1, 'rgba(165,243,252,0.45)');
      ctx.fillStyle = g; ctx.fillRect(p.x - p.w / 2, G() - 140, p.w, 140);
      ctx.strokeStyle = 'rgba(240,249,255,0.9)'; ctx.lineWidth = 4;
      [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(p.x + (s * p.w) / 2, G()); ctx.lineTo(p.x + (s * p.w) / 2, G() - 150); ctx.stroke(); });
      ctx.restore();
    },
    flame(ctx, p, t) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const k = Math.min(1, p.life / 30);
      for (let i = 0; i < 3; i++) {
        const fx = p.x + (i - 1) * 12, fh = (28 + Math.sin(t * 0.4 + i * 2 + p.x) * 10) * k;
        const g = ctx.createLinearGradient(0, G() - fh, 0, G());
        g.addColorStop(0, 'rgba(250,204,21,0)'); g.addColorStop(0.5, 'rgba(249,115,22,0.7)'); g.addColorStop(1, 'rgba(239,68,68,0.8)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(fx - 10, G()); ctx.quadraticCurveTo(fx - 6, G() - fh * 0.6, fx, G() - fh); ctx.quadraticCurveTo(fx + 6, G() - fh * 0.6, fx + 10, G()); ctx.fill();
      }
      ctx.restore();
    },
    sun(ctx, p, t) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const r = 70 + Math.sin(t * 0.2) * 5;
      glow(ctx, p.x, p.y, r * 3, '#f97316', 0.4);
      glow(ctx, p.x, p.y, r * 1.4, '#facc15', 0.9);
      ctx.fillStyle = '#fff7ed'; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.55, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(253,224,71,0.6)'; ctx.lineWidth = 3;
      for (let i = 0; i < 10; i++) {
        const a = t * 0.05 + (i * TAU) / 10;
        ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); ctx.lineTo(p.x + Math.cos(a) * r * 1.8, p.y + Math.sin(a) * r * 1.8); ctx.stroke();
      }
      if (!p.active) {
        ctx.strokeStyle = 'rgba(249,115,22,0.5)'; ctx.setLineDash([10, 10]);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, G()); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(250,204,21,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(p.x, G(), 150, 14, 0, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    },
    lance(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(-90, 0, 50, 0);
      g.addColorStop(0, 'rgba(45,212,191,0)'); g.addColorStop(1, p.color);
      ctx.fillStyle = g; ctx.fillRect(-90, -4, 140, 8);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-20, -1.5, 70, 3);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = U.rgba(p.color, 0.8); ctx.fillRect(-90 + Math.random() * 120, -10 + Math.random() * 20, 4, 4); }
      ctx.restore();
    },
    beamShot(ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.facing, 1);
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 40, 0, 60, '#fbbf24', 0.5);
      const g = ctx.createLinearGradient(-110, 0, 70, 0);
      g.addColorStop(0, 'rgba(251,191,36,0)'); g.addColorStop(1, '#fde68a');
      ctx.fillStyle = g; ctx.fillRect(-110, -8, 180, 16);
      ctx.fillStyle = '#fff'; ctx.fillRect(-40, -3, 110, 6);
      ctx.restore();
    },
    well(ctx, p, t) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const k = p.active ? 1.6 : 1;
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = U.rgba(i % 2 ? '#fbbf24' : '#fde68a', 0.6 - i * 0.1);
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, (60 - i * 12) * k, (60 - i * 12) * k * 0.45, t * 0.08 * (i % 2 ? -1 : 1), 0, TAU); ctx.stroke();
      }
      glow(ctx, p.x, p.y, 80 * k, '#fbbf24', 0.4);
      ctx.fillStyle = '#0c0a09'; ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, TAU); ctx.fill();
      ctx.restore();
    },
    bigbeam(ctx, p, t) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const h = p.h * (0.8 + Math.sin(t * 0.6) * 0.1);
      const g = ctx.createLinearGradient(0, p.y - h / 2, 0, p.y + h / 2);
      g.addColorStop(0, 'rgba(251,191,36,0)'); g.addColorStop(0.3, 'rgba(251,191,36,0.6)'); g.addColorStop(0.5, 'rgba(255,251,235,0.95)'); g.addColorStop(0.7, 'rgba(251,191,36,0.6)'); g.addColorStop(1, 'rgba(251,191,36,0)');
      ctx.fillStyle = g; ctx.fillRect(p.x - p.w / 2, p.y - h / 2, p.w, h);
      glow(ctx, p.owner.x + p.facing * 60, p.y, 160, '#fde68a', 0.7);
      ctx.restore();
    },
  };

  /* ======================= HELPER ======================= */
  const H = (f, len, box, o) => Object.assign({ f, len, box: { x: box[0], y: box[1], w: box[2], h: box[3] }, level: 'mid', hitstop: 8, energy: 2 }, o);
  const mk = (o) => Object.assign({ kind: 'skill', hits: [], startup: o.hits && o.hits[0] ? o.hits[0].f : 8 }, o);
  function proj(g, f, o) { const p = new Projectile(g, f, o); g.projectiles.push(p); return p; }
  function opp(g, f) { return g.opponent(f); }
  function stageClamp(x) { const S = NS.Collision.STAGE; return U.clamp(x, S.WALL, S.W - S.WALL); }
  function hand(f) { return f.jointWorld('hF'); }

  /** Đòn trong chuỗi khóa (luôn trúng, không gây giật lùi) */
  function seqHit(g, att, def, dmg, o = {}) {
    NS.Combat.applyHit(g, att, def, Object.assign({ dmg, hs: 80, kb: 0, hitstop: 4, energy: 1, element: att.def.element, sfx: 'hitL', shake: 2 }, o), { forced: true, keepLock: true });
  }
  function seqFinal(g, att, def, dmg, o = {}) {
    NS.Combat.applyHit(g, att, def, Object.assign({ dmg, hs: 40, kb: 6, launch: 13, kd: true, hitstop: 16, energy: 0, element: att.def.element, sfx: 'hitH', shake: 14, finisher: true }, o), { forced: true });
  }
  /** Bắt đầu chuỗi đòn kết liễu */
  function lock(g, att, def, seq) {
    if (def.hp <= 0 && !seq.allowKO) return;
    def.setLocked(att);
    const mv = {
      id: (att.move ? att.move.id : 'ult') + '_seq', name: att.move ? att.move.name : 'ULT', kind: 'ult', scripted: true, sequence: true,
      total: seq.total, anim: seq.anim, hits: [], inv: [0, seq.total], noGravity: !!seq.noGravity, passThrough: [0, seq.total],
      onFrame: (f, game, fr) => {
        if (seq.hold) seq.hold(f, def, game, fr);
        seq.events.forEach((e) => { if (e[0] === fr) e[1](f, def, game); });
      },
      onEnd: (f, game) => { if (def.lockedBy === f) def.release(game); if (seq.onEnd) seq.onEnd(f, def, game); },
    };
    att.startMove(mv, { free: true });
    g.cinematic(seq.zoom || 1.25, seq.total, (att.x + def.x) / 2);
  }

  /* ======================= BỘ KỸ NĂNG ======================= */
  const BUILDERS = {
    /* ---------------- RAVEN ---------------- */
    raven() {
      const SEQ = {
        total: 84, noGravity: true, zoom: 1.32,
        anim: [[0, 'dash'], [84, 'slash']],
        hold: (f, d, g, fr) => {
          f.invisible = fr < 66;
          d.y = Math.min(d.y, G() - 30); d.vx = 0; d.vy = 0;
          if (fr === 66) { f.x = stageClamp(d.x - f.facing * 90); f.facing = Math.sign(d.x - f.x) || f.facing; }
        },
        events: [6, 14, 22, 30, 38, 46, 54, 62].map((fr, i) => [fr, (f, d, g) => {
          const ang = (i * 2.4) % TAU, gx = d.x + Math.cos(ang) * 90, gy = d.y - 60 + Math.sin(ang) * 50;
          g.ghost(f, { x: gx, y: gy + 80, facing: gx < d.x ? 1 : -1, pose: i % 2 ? 'slash' : 'slash2', color: f.pal.accent, life: 16 });
          NS.FX.slash(g.particles, d.x, d.y - 90, gx < d.x ? 1 : -1, f.pal.blade, 70, U.rand(-1, 1), 2.4);
          NS.FX.element(g.particles, 'shadow', d.x, d.y - 90, 1, 0.8);
          seqHit(g, f, d, 20, { sfx: 'slash', element: 'shadow' });
          g.sfx('slash', f, { pitch: 1 + i * 0.05 });
        }]).concat([[72, (f, d, g) => {
          NS.FX.slash(g.particles, d.x, d.y - 90, 1, '#ffffff', 120, 0.8, 2.6);
          NS.FX.slash(g.particles, d.x, d.y - 90, -1, f.pal.blade, 120, -0.8, 2.6);
          NS.FX.explosion(g.particles, d.x, d.y - 90, 110, 'shadow');
          seqFinal(g, f, d, 110, { sfx: 'shadow', element: 'shadow' });
          g.sfx('ko', f);
        }]]),
      };
      return {
        s1: mk({
          id: 's1', slot: 's1', name: 'Shadow Dash', cost: 20, cd: 150, total: 34, limb: 'hF',
          anim: [[0, 'crouch'], [5, 'dash'], [20, 'dash'], [34, 'guard']],
          vel: [[6, 18, 21]], passThrough: [6, 22], projInv: [4, 20], trail: [4, 24],
          hits: [H(7, 12, [30, 110, 100, 150], { dmg: 62, hs: 22, bs: 12, kb: 4, sfx: 'slash', shake: 3, element: 'shadow' })],
          onStart: (f, g) => g.sfx('shadow', f),
          onFrame: (f, g, fr) => { if (fr >= 6 && fr <= 18 && fr % 2 === 0) NS.FX.element(g.particles, 'shadow', f.x - f.facing * 20, f.y - 90, -f.facing, 0.6); },
        }),
        s2: mk({
          id: 's2', slot: 's2', name: 'Twin Fang', cost: 25, cd: 240, total: 46, limb: 'hF',
          anim: [[0, 'guard'], [4, 'slashW'], [7, 'slash'], [11, 'slash2'], [15, 'slash'], [20, 'slashW'], [24, 'upper'], [46, 'guard']],
          vel: [[5, 24, 2.8]],
          hits: [
            H(7, 3, [60, 120, 88, 70], { dmg: 24, hs: 18, bs: 10, kb: 1.2, hitstop: 4, sfx: 'slash', element: 'shadow' }),
            H(11, 3, [60, 120, 88, 70], { dmg: 24, hs: 18, bs: 10, kb: 1.2, hitstop: 4, sfx: 'slash', element: 'shadow' }),
            H(15, 3, [60, 120, 88, 70], { dmg: 24, hs: 18, bs: 10, kb: 1.2, hitstop: 4, sfx: 'slash', element: 'shadow' }),
            H(24, 4, [50, 150, 84, 120], { dmg: 50, hs: 28, bs: 14, kb: 3, launch: 12, hitstop: 10, sfx: 'hitH', shake: 5, element: 'shadow' }),
          ],
          onFrame: (f, g, fr) => {
            if ([7, 11, 15].includes(fr)) { const h = hand(f); NS.FX.slash(g.particles, h.x, h.y, f.facing, f.pal.blade, 54, fr === 11 ? 0.6 : -0.5, 2); g.sfx('swingL', f, { pitch: 1.3 }); }
            if (fr === 24) { const h = hand(f); NS.FX.slash(g.particles, h.x, h.y - 30, f.facing, f.pal.blade, 80, -1.4, 2.4); }
          },
        }),
        s3: mk({
          id: 's3', slot: 's3', name: 'Phase Shift', cost: 15, cd: 300, total: 30, mobility: true,
          anim: [[0, 'crouch'], [9, 'crouch'], [12, 'slashW'], [30, 'guard']],
          inv: [0, 16], invisible: [3, 11], hits: [],
          onFrame: (f, g, fr) => {
            if (fr === 2) { NS.FX.element(g.particles, 'shadow', f.x, f.y - 90, 1, 2); g.sfx('shadow', f); }
            if (fr === 9) {
              const o = opp(g, f);
              let nx = o.x - o.facing * 88;
              if (nx < NS.Collision.STAGE.WALL + 10 || nx > NS.Collision.STAGE.W - NS.Collision.STAGE.WALL - 10) nx = o.x + o.facing * 88;
              f.x = stageClamp(nx); f.y = G(); f.grounded = true;
              f.facing = Math.sign(o.x - f.x) || 1;
              f.backstab = 40;
              NS.FX.element(g.particles, 'shadow', f.x, f.y - 90, f.facing, 2);
            }
          },
        }),
        ult: mk({
          id: 'ult', slot: 'ult', kind: 'ult', name: 'Phantom Execution', total: 58,
          anim: [[0, 'crouch'], [10, 'dash'], [30, 'dash'], [58, 'guard']],
          vel: [[10, 28, 24]], passThrough: [10, 32], inv: [0, 30], trail: [8, 34],
          hits: [H(10, 18, [40, 110, 120, 170], { dmg: 60, hs: 40, bs: 20, kb: 2, hitstop: 10, sfx: 'slash', chip: 0.25, element: 'shadow', lockOnHit: true })],
          onHit: (f, d, g) => lock(g, f, d, SEQ),
        }),
      };
    },

    /* ---------------- VOLT ---------------- */
    volt() {
      const strike = (g, f, x, o = {}) => proj(g, f, Object.assign({
        type: 'strike', x: stageClamp(x), y: G() - 300, w: 70, h: 600, delay: 18, life: 8, hits: 1, power: 99,
        hit: { dmg: 70, hs: 34, bs: 14, kb: 2, hitstop: 9, status: { shock: 40 }, element: 'electric', sfx: 'thunder', shake: 6 },
        onActivate: (p, game) => { game.shake(5, 8); game.sfx('thunder', p.owner, { gap: 0.05 }); NS.FX.element(game.particles, 'electric', p.x, G() - 20, 1, 2); NS.FX.dust(game.particles, p.x, G(), 4, 0, '#67e8f9'); },
      }, o));
      return {
        s1: mk({
          id: 's1', slot: 's1', name: 'Lightning Strike', cost: 20, cd: 180, total: 36, projectile: true,
          anim: [[0, 'guard'], [6, 'raise'], [30, 'raise'], [36, 'guard']],
          onFrame: (f, g, fr) => {
            if (fr === 4) g.sfx('charge', f);
            if (fr === 12) { const o = opp(g, f); strike(g, f, U.clamp(o.x, f.x - 620, f.x + 620)); }
            if (fr >= 6 && fr <= 12) NS.FX.lightning(g.particles, hand(f).x, hand(f).y, hand(f).x + U.rand(-20, 20), hand(f).y - 60, '#fde047', 1.4, 4, 14);
          },
        }),
        s2: mk({
          id: 's2', slot: 's2', name: 'Arc Burst', cost: 25, cd: 240, total: 42, limb: 'hF',
          anim: [[0, 'castW'], [8, 'cast'], [26, 'cast'], [42, 'guard']],
          hits: [
            H(10, 3, [72, 115, 140, 150], { dmg: 24, hs: 18, bs: 10, kb: 1, hitstop: 4, sfx: 'electric', element: 'electric' }),
            H(15, 3, [72, 115, 140, 150], { dmg: 24, hs: 18, bs: 10, kb: 1, hitstop: 4, sfx: 'electric', element: 'electric' }),
            H(20, 4, [72, 115, 150, 160], { dmg: 46, hs: 30, bs: 14, kb: 6, hitstop: 10, sfx: 'thunder', status: { shock: 24 }, element: 'electric', shake: 5 }),
          ],
          onFrame: (f, g, fr) => {
            if (fr >= 9 && fr <= 24 && fr % 2 === 0) {
              const h = hand(f);
              for (let i = 0; i < 2; i++) NS.FX.lightning(g.particles, h.x, h.y, h.x + f.facing * U.rand(60, 140), h.y + U.rand(-60, 60), U.pick(['#22d3ee', '#fde047']), 1.8, 5, 26);
            }
          },
        }),
        s3: mk({
          id: 's3', slot: 's3', name: 'Volt Step', cost: 15, cd: 240, total: 22, mobility: true,
          anim: [[0, 'crouch'], [10, 'dash'], [22, 'guard']],
          inv: [0, 12], invisible: [2, 9], hits: [],
          onFrame: (f, g, fr) => {
            if (fr === 5) {
              const dir = f.input && f.input.back ? -1 : 1;
              const ox = f.x, oy = f.y - 100;
              f.x = stageClamp(f.x + f.facing * dir * 250);
              NS.FX.lightning(g.particles, ox, oy, f.x, f.y - 100, '#22d3ee', 3, 12, 40);
              NS.FX.lightning(g.particles, ox, oy + 20, f.x, f.y - 80, '#fde047', 1.5, 10, 30);
              NS.FX.element(g.particles, 'electric', f.x, f.y - 100, 1, 1.5);
              g.sfx('electric', f);
            }
          },
        }),
        ult: mk({
          id: 'ult', slot: 'ult', kind: 'ult', name: 'Thunder Collapse', total: 94, projectile: true,
          anim: [[0, 'raise2'], [94, 'raise2']],
          onFrame: (f, g, fr) => {
            const list = [14, 20, 26, 32, 38, 44];
            const idx = list.indexOf(fr);
            if (idx >= 0) {
              strike(g, f, f.x + f.facing * (120 + idx * 170), { delay: 8, hit: { dmg: 34, hs: 32, bs: 12, kb: 1, hitstop: 6, chip: 0.2, status: { shock: 30 }, element: 'electric', sfx: 'electric', shake: 4 } });
            }
            if (fr === 46) f._ultTarget = opp(g, f).x;
            if (fr === 48) {
              strike(g, f, f._ultTarget, {
                delay: 10, w: 150, life: 10,
                hit: { dmg: 120, hs: 40, bs: 20, kb: 6, launch: 12, kd: true, hitstop: 14, chip: 0.25, element: 'electric', sfx: 'thunder', shake: 14, finisher: true },
                onActivate: (p, game) => { game.shake(14, 18); game.flashScreen('#a5f3fc', 0.5); game.sfx('thunder', p.owner); NS.FX.explosion(game.particles, p.x, G() - 40, 140, 'electric'); },
              });
            }
            if (fr % 4 === 0 && fr < 60) NS.FX.lightning(g.particles, f.x + U.rand(-300, 300), 40, f.x + U.rand(-400, 400), U.rand(100, 300), '#22d3ee', 1.4, 6, 30);
          },
        }),
      };
    },

    /* ---------------- TITAN ---------------- */
    titan() {
      const counter = mk({
        id: 'bastionCounter', name: 'Iron Retaliation', total: 32, limb: 'hB',
        anim: [[0, 'upperW'], [4, 'upper'], [20, 'upper'], [32, 'guard']], armor: { from: 0, to: 10, hits: 3 },
        hits: [H(5, 5, [50, 140, 90, 130], { dmg: 80, hs: 28, bs: 14, kb: 4, launch: 12, hitstop: 12, shake: 8, sfx: 'hitH', element: 'heavy' })],
      });
      const SEQ = {
        total: 64, zoom: 1.3,
        anim: [[0, 'slam'], [8, 'slamW'], [12, 'slam'], [20, 'slamW'], [24, 'slam'], [32, 'slamW'], [36, 'slam'], [44, 'upperW'], [50, 'upper'], [64, 'guard']],
        hold: (f, d) => { d.vx = 0; d.vy = 0; d.y = G(); },
        events: [12, 24, 36].map((fr) => [fr, (f, d, g) => {
          g.shake(10, 10); g.sfx('quake', f);
          NS.FX.element(g.particles, 'heavy', d.x, G() - 10, 1, 2); NS.FX.dust(g.particles, d.x, G(), 10, 0, '#a8a29e');
          for (let i = 0; i < 4; i++) g.particles.add({ type: 'rock', x: U.rand(d.x - 300, d.x + 300), y: -50, vx: 0, vy: U.rand(4, 9), grav: 0.5, size: U.rand(6, 12), vr: 0.2, life: 60, color: '#57534e', add: false, floor: G() });
          seqHit(g, f, d, 35, { sfx: 'hitH', element: 'heavy', shake: 8 });
        }]).concat([[50, (f, d, g) => { g.flashScreen('#fca5a5', 0.4); NS.FX.explosion(g.particles, d.x, d.y - 80, 120, 'heavy'); seqFinal(g, f, d, 120, { launch: 17, element: 'heavy' }); }]]),
      };
      return {
        bastionCounter: counter,
        s1: mk({
          id: 's1', slot: 's1', name: 'Ground Smash', cost: 20, cd: 180, total: 48, limb: 'hF', projectile: true,
          anim: [[0, 'guard'], [4, 'slamW'], [15, 'slam'], [36, 'slam'], [48, 'guard']], armor: { from: 2, to: 15, hits: 1 },
          hits: [H(15, 4, [70, 40, 130, 80], { dmg: 64, hs: 24, bs: 14, kb: 4, level: 'low', launch: 7, hitstop: 10, shake: 8, sfx: 'quake', element: 'heavy' })],
          onFrame: (f, g, fr) => {
            if (fr === 15) {
              g.shake(8, 10);
              NS.FX.element(g.particles, 'heavy', f.x + f.facing * 70, G() - 6, f.facing, 2);
              NS.FX.dust(g.particles, f.x + f.facing * 70, G(), 10, f.facing, '#a8a29e');
              proj(g, f, {
                type: 'wave', x: f.x + f.facing * 130, y: G() - 25, vx: f.facing * 9, w: 60, h: 50, life: 46, ground: true, power: 2,
                hit: { dmg: 46, hs: 22, bs: 12, kb: 3, level: 'low', launch: 6, hitstop: 7, element: 'heavy', sfx: 'kickH' },
                onUpdate: (p, game) => { if (p.age % 3 === 0) NS.FX.dust(game.particles, p.x, G(), 2, -p.facing, '#fdba74'); },
              });
            }
          },
        }),
        s2: mk({
          id: 's2', slot: 's2', name: 'Rocket Knuckle', cost: 25, cd: 240, total: 52, limb: 'hB', stopOnHit: true,
          anim: [[0, 'hpW'], [14, 'dash'], [18, 'hp'], [30, 'hp'], [52, 'guard']], armor: { from: 0, to: 26, hits: 2 },
          vel: [[14, 28, 15]],
          hits: [H(14, 13, [70, 130, 96, 80], { dmg: 110, hs: 30, bs: 18, kb: 15, kd: true, launch: 6, hitstop: 14, shake: 10, sfx: 'hitH', element: 'heavy' })],
          onFrame: (f, g, fr) => {
            if (fr === 12) g.sfx('charge', f);
            if (fr >= 10 && fr <= 28) {
              g.particles.add({ type: 'dot', x: f.x - f.facing * 40, y: f.y - 130, vx: -f.facing * U.rand(3, 7), vy: U.rand(-1, 1), size: U.rand(10, 18), grow: -0.4, life: 18, color: U.pick(['#f97316', '#facc15', '#ef4444']) });
            }
          },
        }),
        s3: mk({
          id: 's3', slot: 's3', name: 'Iron Bastion', cost: 15, cd: 360, total: 54, defensive: true,
          anim: [[0, 'vicCross'], [54, 'vicCross']], hits: [],
          guard: { from: 2, to: 44, type: 'bastion' },
          onFrame: (f, g, fr) => {
            if (fr === 2) g.sfx('armor', f);
            if (fr >= 2 && fr <= 44 && fr % 4 === 0) g.particles.add({ type: 'hex', x: f.x + f.facing * 30, y: f.y - 110, size: 70, life: 8, color: '#fca5a5', dir: f.facing });
          },
          counterMove: 'bastionCounter',
        }),
        ult: mk({
          id: 'ult', slot: 'ult', kind: 'ult', name: 'Cataclysm', total: 100, noGravity: true,
          anim: [[0, 'crouch'], [12, 'jump'], [36, 'slamW'], [50, 'slam'], [80, 'slam'], [100, 'guard']],
          inv: [10, 50], passThrough: [10, 52],
          hits: [H(50, 5, [0, 40, 600, 84], { dmg: 90, hs: 40, bs: 20, kb: 2, level: 'low', hitstop: 12, chip: 0.25, element: 'heavy', sfx: 'quake', lockOnHit: true, radial: true })],
          onFrame: (f, g, fr) => {
            if (fr === 12) { f._x0 = f.x; f._tx = opp(g, f).x; f.grounded = false; g.sfx('jump', f); NS.FX.dust(g.particles, f.x, G(), 12, 0); }
            if (fr > 12 && fr <= 30) f._tx = U.lerp(f._tx, opp(g, f).x, 0.15);
            if (fr > 12 && fr < 50) {
              const k = (fr - 12) / 38;
              f.x = stageClamp(U.lerp(f._x0, f._tx, U.easeInOut(k)));
              f.y = G() - Math.sin(k * Math.PI) * 320;
              f.grounded = false;
            }
            if (fr === 50) {
              f.y = G(); f.grounded = true;
              g.shake(18, 22); g.flashScreen('#fdba74', 0.35); g.sfx('quake', f); g.sfx('explosion', f);
              NS.FX.explosion(g.particles, f.x, G() - 20, 150, 'heavy');
              for (let i = 0; i < 18; i++) g.particles.add({ type: 'rock', x: f.x + U.rand(-60, 60), y: G() - 10, vx: U.rand(-9, 9), vy: U.rand(-14, -5), grav: 0.55, size: U.rand(5, 12), vr: 0.3, life: 60, color: U.pick(['#57534e', '#78716c', '#a8a29e']), add: false, floor: G() });
            }
          },
          onHit: (f, d, g) => lock(g, f, d, SEQ),
        }),
      };
    },

    /* ---------------- FROST ---------------- */
    frost() {
      const SEQ = {
        total: 78, zoom: 1.3,
        anim: [[0, 'raise2'], [10, 'dash'], [16, 'slash'], [26, 'slash2'], [36, 'slash'], [46, 'slash2'], [54, 'castW'], [60, 'cast'], [78, 'guard']],
        hold: (f, d, g, fr) => {
          d.vx = 0; d.vy = 0; d.y = G(); d.status.encased = fr < 60 ? 2 : 0;
          if (fr === 10) { f.x = stageClamp(d.x - Math.sign(d.x - f.x || 1) * 74); f.facing = Math.sign(d.x - f.x) || f.facing; NS.FX.element(g.particles, 'ice', f.x, f.y - 90, f.facing, 1.5); }
        },
        events: [16, 26, 36, 46].map((fr, i) => [fr, (f, d, g) => {
          NS.FX.slash(g.particles, d.x, d.y - 90, f.facing, '#e0f2fe', 70, i % 2 ? 0.6 : -0.6, 2.2);
          NS.FX.element(g.particles, 'ice', d.x, d.y - 90, f.facing, 1.2);
          seqHit(g, f, d, 30, { sfx: 'ice', element: 'ice' });
        }]).concat([[60, (f, d, g) => {
          d.status.encased = 0;
          g.sfx('shatter', f); g.flashScreen('#e0f2fe', 0.5);
          NS.FX.shatter(g.particles, d.x, d.y - 90, 70);
          seqFinal(g, f, d, 130, { element: 'ice', launch: 13 });
        }]]),
      };
      return {
        s1: mk({
          id: 's1', slot: 's1', name: 'Ice Spear', cost: 20, cd: 150, total: 34, projectile: true,
          anim: [[0, 'castW'], [8, 'cast'], [24, 'cast'], [34, 'guard']],
          onFrame: (f, g, fr) => {
            if (fr === 10) {
              g.sfx('ice', f);
              proj(g, f, {
                type: 'spear', x: f.x + f.facing * 60, y: f.y - 122 * f.def.scale, vx: f.facing * 13, w: 76, h: 20, life: 70, power: 1,
                hit: { dmg: 52, hs: 18, bs: 11, kb: 3, hitstop: 7, status: { slow: 150 }, element: 'ice', sfx: 'ice' },
                onUpdate: (p, game) => { if (p.age % 2 === 0) game.particles.add({ type: 'shard', x: p.x - p.facing * 30, y: p.y + U.rand(-6, 6), vx: -p.facing * 1, vy: U.rand(-0.5, 0.5), size: 4, life: 16, color: '#e0f2fe' }); },
              });
            }
          },
        }),
        s2: mk({
          id: 's2', slot: 's2', name: 'Glacial Spikes', cost: 25, cd: 240, total: 50, projectile: true,
          anim: [[0, 'guard'], [6, 'slamW'], [12, 'kneel'], [40, 'kneel'], [50, 'guard']],
          onFrame: (f, g, fr) => {
            const idx = [12, 18, 24].indexOf(fr);
            if (idx >= 0) {
              const last = idx === 2;
              g.sfx('ice', f, { gap: 0 });
              proj(g, f, {
                type: 'spike', x: stageClamp(f.x + f.facing * (110 + idx * 92)), y: G() - 50, w: 58, h: 100, delay: 3, life: 14, power: 3,
                hit: { dmg: last ? 40 : 30, hs: 22, bs: 12, kb: 2, launch: last ? 13 : 4, hitstop: 7, element: 'ice', sfx: 'ice', shake: 3 },
                onActivate: (p, game) => NS.FX.element(game.particles, 'ice', p.x, G() - 30, 1, 1),
              });
            }
          },
        }),
        s3: mk({
          id: 's3', slot: 's3', name: 'Crystal Guard', cost: 15, cd: 300, total: 42, defensive: true,
          anim: [[0, 'stance'], [42, 'stance']], hits: [],
          guard: { from: 2, to: 24, type: 'freeze' },
          onFrame: (f, g, fr) => {
            if (fr === 2) g.sfx('ice', f);
            if (fr >= 2 && fr <= 24 && fr % 3 === 0) g.particles.add({ type: 'shard', x: f.x + f.facing * 36 + U.rand(-10, 10), y: f.y - U.rand(30, 170), vx: 0, vy: -0.5, size: 8, life: 12, color: '#a5f3fc', edge: '#fff' });
          },
        }),
        ult: mk({
          id: 'ult', slot: 'ult', kind: 'ult', name: 'Absolute Zero', total: 72, projectile: true,
          anim: [[0, 'raise2'], [16, 'kneel'], [60, 'kneel'], [72, 'guard']],
          onFrame: (f, g, fr) => {
            if (fr === 16) {
              g.sfx('ice', f); g.sfx('shatter', f); g.flashScreen('#e0f2fe', 0.3);
              proj(g, f, {
                type: 'frostwave', x: f.x, y: G() - 60, w: 20, h: 120, life: 24, power: 99, hits: 1, ground: true,
                hit: { dmg: 40, hs: 40, bs: 20, kb: 0, hitstop: 10, chip: 0.2, element: 'ice', sfx: 'ice', lockOnHit: true },
                onUpdate: (p, game) => {
                  p.w += 72; p.x = p.owner.x;
                  if (p.age % 2 === 0) for (let s = -1; s <= 1; s += 2) game.particles.add({ type: 'shard', x: p.x + (s * p.w) / 2, y: G() - U.rand(10, 120), vx: s * 2, vy: -1, size: 7, life: 18, color: '#e0f2fe' });
                },
                onHitTarget: (p, target, game) => lock(game, p.owner, target, SEQ),
              });
            }
          },
        }),
      };
    },

    /* ---------------- PYRA ---------------- */
    pyra() {
      const SEQ = {
        total: 74, zoom: 1.28,
        anim: [[0, 'raise2'], [74, 'raise2']],
        hold: (f, d) => { d.vx = 0; d.vy = 0; d.y = Math.min(d.y, G() - 40); },
        events: [12, 22, 32, 42].map((fr, i) => [fr, (f, d, g) => {
          g.particles.add({ type: 'pillar', x: d.x + (i % 2 ? 30 : -30), y: G(), h: 520, size: 70, life: 16, color: '#f97316' });
          NS.FX.element(g.particles, 'fire', d.x, d.y - 80, 1, 2);
          g.shake(6, 6); g.sfx('fire', f);
          seqHit(g, f, d, 32, { sfx: 'hitL', element: 'fire' });
        }]).concat([[58, (f, d, g) => {
          g.flashScreen('#fde047', 0.6); g.sfx('explosion', f);
          NS.FX.explosion(g.particles, d.x, d.y - 80, 200, 'fire');
          seqFinal(g, f, d, 120, { element: 'fire', launch: 15, status: { burn: 120 } });
        }]]),
      };
      return {
        s1: mk({
          id: 's1', slot: 's1', name: 'Flame Burst', cost: 20, cd: 180, total: 44,
          anim: [[0, 'castW'], [10, 'raise2'], [30, 'raise2'], [44, 'guard']],
          hits: [H(12, 6, [0, 100, 290, 220], { dmg: 70, hs: 24, bs: 14, kb: 8, launch: 9, hitstop: 10, shake: 7, radial: true, status: { burn: 120 }, element: 'fire', sfx: 'explosion', noExtend: true })],
          onFrame: (f, g, fr) => {
            if (fr === 6) g.sfx('charge', f);
            if (fr === 12) { NS.FX.explosion(g.particles, f.x, f.y - 100, 140, 'fire'); g.shake(6, 8); }
            if (fr < 12) g.particles.add({ type: 'dot', x: f.x + U.rand(-50, 50), y: f.y - U.rand(40, 160), vx: 0, vy: -1, size: 8, life: 10, color: '#f97316' });
          },
        }),
        s2: mk({
          id: 's2', slot: 's2', name: 'Plasma Orb', cost: 25, cd: 240, total: 38, projectile: true,
          anim: [[0, 'castW'], [10, 'cast'], [26, 'cast'], [38, 'guard']],
          onFrame: (f, g, fr) => {
            if (fr === 13) {
              g.sfx('fire', f);
              proj(g, f, {
                type: 'orb', x: f.x + f.facing * 74, y: f.y - 110, vx: f.facing * 6.5, w: 64, h: 64, life: 120, hits: 3, interval: 9, power: 3,
                color: f.pal.accent,
                hit: { dmg: 28, hs: 16, bs: 9, kb: 1.6, hitstop: 5, status: { burn: 90 }, element: 'fire', sfx: 'fire' },
                onUpdate: (p, game) => { if (p.age % 2 === 0) game.particles.add({ type: 'dot', x: p.x - p.facing * 20 + U.rand(-10, 10), y: p.y + U.rand(-14, 14), vx: -p.facing * 1.5, vy: -0.6, size: U.rand(6, 12), grow: -0.3, life: 16, color: U.pick(['#f97316', '#facc15']) }); },
              });
            }
          },
        }),
        s3: mk({
          id: 's3', slot: 's3', name: 'Blaze Rush', cost: 15, cd: 240, total: 30, mobility: true, limb: 'fF',
          anim: [[0, 'crouch'], [4, 'dash'], [17, 'dash'], [30, 'guard']],
          vel: [[4, 17, 15]], passThrough: [4, 18], projInv: [2, 16], trail: [2, 20],
          hits: [H(5, 12, [30, 100, 80, 160], { dmg: 40, hs: 18, bs: 10, kb: 5, hitstop: 6, status: { burn: 60 }, element: 'fire', sfx: 'fire' })],
          onFrame: (f, g, fr) => {
            if (fr === 3) g.sfx('dash', f);
            if (fr >= 4 && fr <= 17 && fr % 3 === 0) {
              proj(g, f, {
                type: 'flame', x: f.x, y: G() - 20, w: 44, h: 40, life: 90, hits: 3, interval: 25, power: 0, ground: true, hazard: true,
                hit: { dmg: 8, hs: 10, bs: 4, kb: 1, hitstop: 2, status: { burn: 40 }, element: 'fire', sfx: 'fire', noCombo: true },
              });
            }
          },
        }),
        ult: mk({
          id: 'ult', slot: 'ult', kind: 'ult', name: 'Solar Eruption', total: 96, projectile: true,
          anim: [[0, 'raise2'], [96, 'raise2']],
          onFrame: (f, g, fr) => {
            if (fr === 6) {
              g.sfx('charge', f);
              proj(g, f, {
                type: 'sun', x: f.x, y: G() - 430, w: 300, h: 300, delay: 50, life: 8, power: 99, hits: 1,
                hit: { dmg: 90, hs: 40, bs: 20, kb: 3, hitstop: 12, chip: 0.25, element: 'fire', sfx: 'explosion', lockOnHit: true, radial: true },
                onUpdate: (p, game) => {
                  const o = opp(game, p.owner);
                  if (p.age < 36) p.x = U.lerp(p.x, o.x, 0.08);
                  if (p.age >= 36 && p.age < p.delay) p.y = U.lerp(p.y, G() - 130, 0.25);
                  if (p.age % 2 === 0) game.particles.add({ type: 'dot', x: p.x + U.rand(-60, 60), y: p.y + U.rand(-60, 60), vx: 0, vy: U.rand(-2, 2), size: 10, life: 14, color: '#facc15' });
                },
                onActivate: (p, game) => { game.shake(14, 16); game.flashScreen('#fde047', 0.45); NS.FX.explosion(game.particles, p.x, G() - 120, 180, 'fire'); game.sfx('explosion', p.owner); },
                onHitTarget: (p, target, game) => lock(game, p.owner, target, SEQ),
              });
            }
          },
        }),
      };
    },

    /* ---------------- ZERO ---------------- */
    zero() {
      const counter = mk({
        id: 'zeroCounter', name: 'Counter Protocol', total: 30, limb: 'hF',
        anim: [[0, 'castW'], [4, 'cast'], [18, 'cast'], [30, 'guard']], inv: [0, 8],
        hits: [H(4, 5, [60, 120, 100, 130], { dmg: 85, hs: 28, bs: 14, kb: 7, launch: 8, hitstop: 12, shake: 6, sfx: 'glitch', element: 'glitch', counterHit: true })],
      });
      const SEQ = {
        total: 76, zoom: 1.3, noGravity: true,
        anim: [[0, 'cast'], [76, 'cast']],
        hold: (f, d, g, fr) => { d.vx = 0; d.vy = 0; d.y = Math.min(d.y, G() - 20); g.timeStop = fr < 62 ? 3 : 0; f.invisible = fr > 4 && fr < 58 && (fr % 8) < 5; },
        events: [8, 16, 24, 32, 40, 48].map((fr, i) => [fr, (f, d, g) => {
          const ang = i * 1.9, gx = d.x + Math.cos(ang) * 100, gy = d.y + Math.sin(ang) * 40;
          g.ghost(f, { x: gx, y: gy, facing: gx < d.x ? 1 : -1, pose: 'cast', color: f.pal.accent, life: 14 });
          NS.FX.element(g.particles, 'glitch', d.x, d.y - 90, 1, 2);
          seqHit(g, f, d, 24, { sfx: 'glitch', element: 'glitch' });
        }]).concat([[62, (f, d, g) => {
          f.invisible = false; g.timeStop = 0;
          NS.FX.text(g.particles, d.x, d.y - 220, 'DELETE', '#5eead4', 44);
          for (let i = 0; i < 60; i++) g.particles.add({ type: 'pixel', x: d.x + U.rand(-60, 60), y: d.y - U.rand(0, 180), vx: U.rand(-6, 6), vy: U.rand(-6, 2), size: U.rand(4, 10), life: U.rand(20, 40), color: U.pick(NS.FX.ELEM.glitch) });
          g.flashScreen('#ffffff', 0.5); g.sfx('glitch', f); g.sfx('ko', f);
          seqFinal(g, f, d, 130, { element: 'glitch' });
        }]]),
      };
      return {
        zeroCounter: counter,
        s1: mk({
          id: 's1', slot: 's1', name: 'System Break', cost: 20, cd: 200, total: 38, limb: 'hF',
          anim: [[0, 'castW'], [6, 'cast'], [12, 'cast2'], [26, 'cast2'], [38, 'guard']],
          vel: [[4, 12, 8]],
          hits: [
            H(8, 3, [62, 120, 86, 90], { dmg: 28, hs: 16, bs: 10, kb: 1, hitstop: 5, sfx: 'glitch', element: 'glitch' }),
            H(14, 4, [66, 120, 92, 90], { dmg: 44, hs: 24, bs: 12, kb: 5, hitstop: 9, status: { corrupt: 220 }, drain: 25, sfx: 'glitch', element: 'glitch', shake: 3 }),
          ],
          onFrame: (f, g, fr) => { if (fr >= 4 && fr <= 16) g.particles.add({ type: 'pixel', x: f.x + U.rand(-30, 30), y: f.y - U.rand(40, 170), vx: -f.facing * 3, vy: 0, size: U.rand(3, 7), life: 12, color: U.pick(NS.FX.ELEM.glitch) }); },
        }),
        s2: mk({
          id: 's2', slot: 's2', name: 'Data Lance', cost: 20, cd: 160, total: 30, projectile: true,
          anim: [[0, 'castW'], [7, 'cast'], [20, 'cast'], [30, 'guard']],
          onFrame: (f, g, fr) => {
            if (fr === 9) {
              g.sfx('projectile', f, { pitch: 1.6 });
              proj(g, f, {
                type: 'lance', x: f.x + f.facing * 70, y: f.y - 128 * f.def.scale, vx: f.facing * 19, w: 96, h: 14, life: 50, power: 5, pierceProj: true,
                hit: { dmg: 48, hs: 16, bs: 10, kb: 3, hitstop: 6, element: 'glitch', sfx: 'glitch' },
              });
            }
          },
        }),
        s3: mk({
          id: 's3', slot: 's3', name: 'Counter Protocol', cost: 15, cd: 300, total: 40, defensive: true,
          anim: [[0, 'stance'], [40, 'stance']], hits: [],
          guard: { from: 2, to: 26, type: 'zero' }, counterMove: 'zeroCounter',
          onFrame: (f, g, fr) => {
            if (fr === 2) g.sfx('glitch', f);
            if (fr >= 2 && fr <= 26 && fr % 3 === 0) g.particles.add({ type: 'ring', x: f.x, y: f.y - 100, size: 60, grow: -1, w: 2, life: 8, color: f.pal.accent });
          },
        }),
        ult: mk({
          id: 'ult', slot: 'ult', kind: 'ult', name: 'Absolute Override', total: 66, limb: 'hF',
          anim: [[0, 'vicOpen'], [12, 'castW'], [16, 'cast'], [40, 'cast'], [66, 'guard']], inv: [0, 22],
          hits: [H(16, 6, [60, 120, 100, 170], { dmg: 40, hs: 40, bs: 20, kb: 2, hitstop: 10, chip: 0.2, element: 'glitch', sfx: 'glitch', lockOnHit: true })],
          onFrame: (f, g, fr) => {
            if (fr === 12) {
              const o = opp(g, f);
              if (Math.abs(o.x - f.x) < 900) {
                NS.FX.element(g.particles, 'glitch', f.x, f.y - 100, 1, 2.5);
                const side = Math.sign(o.x - f.x) || 1;
                f.x = stageClamp(o.x - side * 74); f.facing = side;
                if (o.grounded) f.y = G();
                NS.FX.element(g.particles, 'glitch', f.x, f.y - 100, 1, 2.5);
                g.sfx('glitch', f);
              }
            }
          },
          onHit: (f, d, g) => lock(g, f, d, SEQ),
        }),
      };
    },

    /* ---------------- AXIOM ---------------- */
    axiom() {
      return {
        s1: mk({
          id: 's1', slot: 's1', name: 'Core Lance', cost: 20, cd: 160, total: 36, projectile: true,
          anim: [[0, 'castW'], [9, 'cast'], [26, 'cast'], [36, 'guard']],
          onFrame: (f, g, fr) => {
            if (fr === 12) {
              g.sfx('beam', f);
              proj(g, f, { type: 'beamShot', x: f.x + f.facing * 80, y: f.y - 130 * f.def.scale, vx: f.facing * 21, w: 130, h: 18, life: 45, power: 3, hit: { dmg: 58, hs: 18, bs: 11, kb: 4, hitstop: 7, element: 'core', sfx: 'hitH' } });
            }
          },
        }),
        s2: mk({
          id: 's2', slot: 's2', name: 'Gravity Well', cost: 25, cd: 260, total: 44, projectile: true,
          anim: [[0, 'guard'], [8, 'raise'], [36, 'raise'], [44, 'guard']],
          onFrame: (f, g, fr) => {
            if (fr === 12) {
              g.sfx('core', f);
              proj(g, f, {
                type: 'well', x: stageClamp(f.x + f.facing * 230), y: G() - 110, w: 150, h: 200, delay: 40, life: 6, power: 99,
                hit: { dmg: 72, hs: 28, bs: 14, kb: 2, launch: 12, hitstop: 10, radial: true, element: 'core', sfx: 'explosion', shake: 8 },
                onUpdate: (p, game) => {
                  if (!p.active) {
                    const o = opp(game, p.owner);
                    if (Math.abs(o.x - p.x) < 460 && !o.invuln && o.state !== 'down') { o.x += Math.sign(p.x - o.x) * 2.4; NS.Collision.clampStage(o); }
                  }
                },
                onActivate: (p, game) => { NS.FX.explosion(game.particles, p.x, p.y, 120, 'core'); game.shake(8, 10); },
              });
            }
          },
        }),
        s3: mk({
          id: 's3', slot: 's3', name: 'Aegis', cost: 15, cd: 300, total: 40, defensive: true,
          anim: [[0, 'stance'], [40, 'stance']], hits: [], guard: { from: 2, to: 30, type: 'aegis' },
          onFrame: (f, g, fr) => { if (fr >= 2 && fr <= 30 && fr % 4 === 0) g.particles.add({ type: 'hex', x: f.x + f.facing * 40, y: f.y - 110, size: 80, life: 8, color: '#fde68a', dir: f.facing }); },
        }),
        ult: mk({
          id: 'ult', slot: 'ult', kind: 'ult', name: 'Last Light', total: 96, projectile: true,
          anim: [[0, 'raise2'], [24, 'cast'], [96, 'cast']],
          onFrame: (f, g, fr) => {
            if (fr === 8) g.sfx('charge', f);
            if (fr === 26) {
              g.sfx('beam', f); g.flashScreen('#fde68a', 0.4);
              proj(g, f, {
                type: 'bigbeam', x: f.x + f.facing * 790, y: f.y - 120, w: 1500, h: 150, life: 54, hits: 10, interval: 5, power: 99,
                hit: { dmg: 24, hs: 14, bs: 8, kb: 1.2, hitstop: 3, chip: 0.15, element: 'core', sfx: 'hitL', shake: 3 },
                onUpdate: (p, game) => { p.x = p.owner.x + p.facing * 790; if (p.age % 3 === 0) game.shake(3, 3); },
              });
            }
          },
        }),
      };
    },
  };

  const cacheBuilt = {};
  const Skills = {
    Projectile, RENDER, lock, seqHit, seqFinal,
    build(charId) {
      if (!cacheBuilt[charId]) cacheBuilt[charId] = BUILDERS[charId] ? BUILDERS[charId]() : {};
      return cacheBuilt[charId];
    },
  };
  NS.Skills = Skills;
})();
