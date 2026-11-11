/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — effects.js
   PARTICLE SYSTEM + hiệu ứng chiến đấu theo nguyên tố
   + generator thành phố neon (dùng cho menu & đấu trường)
   + MenuBackground: nền thành phố Neo-Veyra động, parallax theo chuột.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const U = NS.U;
  const TAU = Math.PI * 2;

  const ELEM = {
    shadow: ['#a855f7', '#7c3aed', '#e9d5ff', '#c084fc'],
    electric: ['#22d3ee', '#fde047', '#e0f2fe', '#38bdf8'],
    heavy: ['#f97316', '#ef4444', '#fde68a', '#fb923c'],
    ice: ['#a5f3fc', '#e0f2fe', '#67e8f9', '#ffffff'],
    fire: ['#f97316', '#facc15', '#ef4444', '#fff7ed'],
    glitch: ['#ffffff', '#5eead4', '#22d3ee', '#f0abfc'],
    core: ['#fde68a', '#fff7d6', '#fbbf24', '#ffffff'],
    neutral: ['#ffffff', '#7dd3fc', '#e0f2fe', '#c4b5fd'],
  };

  /* ======================= PARTICLES ======================= */
  class Particles {
    constructor(max = 900) { this.list = []; this.max = max; this.density = 1; }
    setQuality(q, reduce) {
      this.density = reduce ? 0.35 : q === 'low' ? 0.45 : q === 'medium' ? 0.75 : 1;
      this.max = reduce ? 260 : q === 'low' ? 350 : q === 'medium' ? 650 : 1000;
    }
    n(count) { return Math.max(1, Math.round(count * this.density)); }
    add(p) {
      if (this.list.length >= this.max) this.list.splice(0, this.list.length - this.max + 1);
      const d = {
        x: 0, y: 0, vx: 0, vy: 0, life: 30, max: 30, size: 4, grow: 0, color: '#fff', type: 'dot',
        rot: 0, vr: 0, grav: 0, drag: 0.96, add: true, alpha: 1, w: 2,
      };
      Object.assign(d, p);
      d.max = d.life;
      this.list.push(d);
      return d;
    }
    update(scale = 1) {
      const L = this.list;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i];
        p.life -= scale;
        if (p.life <= 0) { L.splice(i, 1); continue; }
        p.vx *= Math.pow(p.drag, scale); p.vy = p.vy * Math.pow(p.drag, scale) + p.grav * scale;
        p.x += p.vx * scale; p.y += p.vy * scale; p.rot += p.vr * scale; p.size = Math.max(0, p.size + p.grow * scale);
        if (p.floor !== undefined && p.y > p.floor) { p.y = p.floor; p.vy *= -0.35; p.vx *= 0.7; }
        if (p.follow) { p.x += p.follow.dx || 0; }
        if (p.type === 'bolt' && (p.life | 0) % 3 === 0) p.pts = boltPoints(p.x1, p.y1, p.x2, p.y2, p.jag || 18);
      }
    }
    draw(ctx) {
      const L = this.list;
      // vẽ hạt thường trước, hạt cộng sáng sau
      for (let pass = 0; pass < 2; pass++) {
        if (pass === 1) ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < L.length; i++) {
          const p = L[i];
          if ((pass === 1) !== p.add) continue;
          const k = p.life / p.max;
          const a = p.alpha * (p.fadeIn ? Math.min(1, (1 - k) * 5) * k * 1.6 : k);
          if (a <= 0.01) continue;
          ctx.globalAlpha = Math.min(1, a);
          drawParticle(ctx, p, k);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    clear() { this.list.length = 0; }
  }

  function boltPoints(x1, y1, x2, y2, jag) {
    const pts = [[x1, y1], [x2, y2]];
    let d = jag;
    for (let it = 0; it < 4; it++) {
      for (let i = pts.length - 1; i > 0; i--) {
        const a = pts[i - 1], b = pts[i];
        const mx = (a[0] + b[0]) / 2 + (Math.random() - 0.5) * d, my = (a[1] + b[1]) / 2 + (Math.random() - 0.5) * d;
        pts.splice(i, 0, [mx, my]);
      }
      d *= 0.55;
    }
    return pts;
  }

  function drawParticle(ctx, p, k) {
    switch (p.type) {
      case 'dot': {
        const r = p.size;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, p.color); g.addColorStop(0.35, U.rgba(p.color, 0.6)); g.addColorStop(1, U.rgba(p.color, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
        break;
      }
      case 'solid': ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); break;
      case 'spark': {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.w * (0.4 + k * 0.6);
        const len = p.size;
        const sp = Math.hypot(p.vx, p.vy) || 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - (p.vx / sp) * len * (0.5 + k), p.y - (p.vy / sp) * len * (0.5 + k)); ctx.stroke();
        break;
      }
      case 'smoke': {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        g.addColorStop(0, U.rgba(p.color, 0.5)); g.addColorStop(1, U.rgba(p.color, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        break;
      }
      case 'shard': {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        const s = p.size;
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.45, 0); ctx.lineTo(0, s * 0.7); ctx.lineTo(-s * 0.4, 0); ctx.closePath(); ctx.fill();
        if (p.edge) { ctx.strokeStyle = p.edge; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.restore();
        break;
      }
      case 'rock': {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; const s = p.size;
        ctx.beginPath(); ctx.moveTo(-s, -s * 0.4); ctx.lineTo(-s * 0.2, -s); ctx.lineTo(s, -s * 0.5); ctx.lineTo(s * 0.7, s * 0.7); ctx.lineTo(-s * 0.6, s * 0.8); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case 'pixel': ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); break;
      case 'ring': {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.w * k + 0.5;
        ctx.beginPath();
        if (p.flat) ctx.ellipse(p.x, p.y, p.size, p.size * p.flat, 0, 0, TAU); else ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.stroke();
        break;
      }
      case 'flash': {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.2, U.rgba(p.color, 0.9)); g.addColorStop(1, U.rgba(p.color, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
        break;
      }
      case 'star': {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; const s = p.size;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.18 : s; const a = (i * Math.PI) / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); ctx.restore();
        break;
      }
      case 'bolt': {
        const pts = p.pts || (p.pts = boltPoints(p.x1, p.y1, p.x2, p.y2, p.jag || 18));
        ctx.lineJoin = 'round';
        [[p.w * 4, U.rgba(p.color, 0.25)], [p.w * 1.8, p.color], [p.w * 0.7, '#ffffff']].forEach(([w, c]) => {
          ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath();
          pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
          ctx.stroke();
        });
        break;
      }
      case 'slash': {
        // vệt chém hình lưỡi liềm
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.dir || 1, 1); ctx.rotate(p.rot);
        const r = p.size, sw = p.sweep || 2.2;
        const grow = 1 + (1 - k) * 0.25;
        ctx.scale(grow, grow);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, r, -sw / 2, sw / 2);
        ctx.arc(r * 0.22, 0, r * 0.86, sw / 2, -sw / 2, true);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc(0, 0, r, -sw / 3, sw / 3); ctx.arc(r * 0.1, 0, r * 0.95, sw / 3, -sw / 3, true); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case 'text': {
        ctx.font = `900 ${p.size}px Orbitron, 'Chakra Petch', sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(5,5,15,0.85)';
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
        break;
      }
      case 'hex': {
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.dir || 1, 1);
        ctx.strokeStyle = p.color; ctx.lineWidth = 2.5;
        const s = p.size * (1 + (1 - k) * 0.3);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + Math.PI / 6; ctx.lineTo(Math.cos(a) * s * 0.55, Math.sin(a) * s); }
        ctx.closePath(); ctx.stroke();
        ctx.fillStyle = U.rgba(p.color, 0.15); ctx.fill();
        ctx.restore();
        break;
      }
      case 'beam': {
        // chùm sáng ngang
        const h = p.size * (0.4 + k * 0.6);
        const g = ctx.createLinearGradient(0, p.y - h, 0, p.y + h);
        g.addColorStop(0, U.rgba(p.color, 0)); g.addColorStop(0.5, U.rgba(p.color, 0.9)); g.addColorStop(1, U.rgba(p.color, 0));
        ctx.fillStyle = g; ctx.fillRect(p.x, p.y - h, p.len, h * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(p.x, p.y - h * 0.18, p.len, h * 0.36);
        break;
      }
      case 'pillar': {
        const w = p.size * (0.5 + k * 0.5);
        const g = ctx.createLinearGradient(p.x - w, 0, p.x + w, 0);
        g.addColorStop(0, U.rgba(p.color, 0)); g.addColorStop(0.5, U.rgba(p.color, 0.85)); g.addColorStop(1, U.rgba(p.color, 0));
        ctx.fillStyle = g; ctx.fillRect(p.x - w, p.y - p.h, w * 2, p.h);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(p.x - w * 0.15, p.y - p.h, w * 0.3, p.h);
        break;
      }
      default: break;
    }
  }

  /* ======================= PRESET HIỆU ỨNG ======================= */
  const FX = {
    ELEM,
    hit(ps, x, y, dir, elem = 'neutral', power = 1) {
      const c = ELEM[elem] || ELEM.neutral;
      ps.add({ type: 'flash', x, y, size: 34 + power * 26, life: 7, color: c[0] });
      ps.add({ type: 'ring', x, y, size: 8, grow: 3.4 + power * 1.6, w: 4, life: 12, color: c[2] });
      const n = ps.n(8 + power * 8);
      for (let i = 0; i < n; i++) {
        const a = (dir > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 2.2;
        const sp = U.rand(5, 12 + power * 6);
        ps.add({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, size: U.rand(8, 18), w: U.rand(1.5, 3), life: U.rand(10, 20), color: U.pick(c), drag: 0.88, grav: 0.25 });
      }
      FX.element(ps, elem, x, y, dir, power);
    },
    element(ps, elem, x, y, dir, power = 1) {
      const c = ELEM[elem] || ELEM.neutral;
      const n = ps.n(5 + power * 5);
      switch (elem) {
        case 'shadow':
          for (let i = 0; i < n; i++) ps.add({ type: 'pixel', x: x + U.rand(-14, 14), y: y + U.rand(-20, 20), vx: dir * U.rand(1, 5), vy: U.rand(-3, 1), size: U.rand(3, 7), life: U.rand(18, 32), color: U.pick(c), drag: 0.92 });
          for (let i = 0; i < 3; i++) ps.add({ type: 'smoke', x, y, vx: dir * U.rand(0.5, 2), vy: U.rand(-1, 0), size: U.rand(18, 30), grow: 0.8, life: 26, color: '#2e1065', add: false });
          break;
        case 'electric':
          for (let i = 0; i < Math.min(4, 1 + power * 1.5); i++) {
            const a = U.rand(0, TAU), L = U.rand(30, 70 + power * 20);
            ps.add({ type: 'bolt', x1: x, y1: y, x2: x + Math.cos(a) * L, y2: y + Math.sin(a) * L, w: 1.6, jag: 16, life: U.rand(6, 11), color: U.pick([c[0], c[1]]) });
          }
          break;
        case 'heavy':
          for (let i = 0; i < n; i++) ps.add({ type: 'rock', x, y, vx: dir * U.rand(1, 6) + U.rand(-2, 2), vy: U.rand(-8, -2), size: U.rand(3, 7), vr: U.rand(-0.3, 0.3), life: U.rand(26, 40), color: U.pick(['#78716c', '#57534e', '#a8a29e']), grav: 0.45, add: false, drag: 0.98 });
          for (let i = 0; i < 3; i++) ps.add({ type: 'smoke', x, y, vx: U.rand(-1.5, 1.5), vy: U.rand(-1, 0), size: U.rand(20, 34), grow: 1, life: 30, color: '#a8a29e', add: false, alpha: 0.6 });
          break;
        case 'ice':
          for (let i = 0; i < n; i++) ps.add({ type: 'shard', x, y, vx: dir * U.rand(1, 7) + U.rand(-2, 2), vy: U.rand(-7, 2), size: U.rand(4, 10), vr: U.rand(-0.3, 0.3), life: U.rand(20, 34), color: U.pick(c), grav: 0.3, drag: 0.96, edge: '#ffffff' });
          for (let i = 0; i < 2; i++) ps.add({ type: 'smoke', x, y, vx: U.rand(-1, 1), vy: U.rand(-0.6, 0.2), size: U.rand(24, 36), grow: 0.7, life: 34, color: '#cffafe', add: false, alpha: 0.5 });
          break;
        case 'fire':
          for (let i = 0; i < n + 2; i++) ps.add({ type: 'dot', x: x + U.rand(-8, 8), y: y + U.rand(-8, 8), vx: dir * U.rand(0, 4) + U.rand(-1.5, 1.5), vy: U.rand(-4, -0.5), size: U.rand(6, 14), grow: -0.25, life: U.rand(16, 30), color: U.pick(c), drag: 0.95, grav: -0.08 });
          for (let i = 0; i < 2; i++) ps.add({ type: 'smoke', x, y: y - 10, vx: U.rand(-1, 1), vy: U.rand(-2, -0.6), size: U.rand(16, 26), grow: 0.9, life: 34, color: '#44403c', add: false, alpha: 0.6 });
          break;
        case 'glitch':
          for (let i = 0; i < n + 3; i++) ps.add({ type: 'pixel', x: x + U.rand(-24, 24), y: y + U.rand(-30, 30), vx: U.rand(-2, 2) + dir * 2, vy: 0, size: U.rand(3, 9), life: U.rand(8, 22), color: U.pick(c), drag: 0.8 });
          ps.add({ type: 'ring', x, y, size: 6, grow: 5, w: 2, life: 10, color: c[1] });
          break;
        case 'core':
          for (let i = 0; i < n; i++) ps.add({ type: 'star', x, y, vx: U.rand(-5, 5), vy: U.rand(-6, 2), size: U.rand(5, 10), vr: 0.1, life: U.rand(18, 28), color: U.pick(c), drag: 0.92 });
          ps.add({ type: 'ring', x, y, size: 10, grow: 4, w: 3, life: 16, color: c[0] });
          break;
        default:
          for (let i = 0; i < n; i++) ps.add({ type: 'dot', x, y, vx: U.rand(-3, 3), vy: U.rand(-3, 3), size: U.rand(3, 6), life: 16, color: U.pick(c) });
      }
    },
    block(ps, x, y, dir) {
      ps.add({ type: 'hex', x: x + dir * -6, y, size: 34, life: 14, color: '#7dd3fc', dir });
      for (let i = 0; i < ps.n(8); i++) {
        const a = (dir > 0 ? Math.PI : 0) + (Math.random() - 0.5) * 1.6;
        ps.add({ type: 'spark', x, y, vx: Math.cos(a) * U.rand(3, 8), vy: Math.sin(a) * U.rand(3, 8), size: 10, w: 2, life: 12, color: U.pick(['#e0f2fe', '#7dd3fc', '#ffffff']), drag: 0.86 });
      }
    },
    parry(ps, x, y) {
      ps.add({ type: 'flash', x, y, size: 120, life: 10, color: '#e0f2fe' });
      ps.add({ type: 'ring', x, y, size: 10, grow: 9, w: 6, life: 16, color: '#ffffff' });
      ps.add({ type: 'ring', x, y, size: 6, grow: 5, w: 3, life: 22, color: '#22d3ee' });
      ps.add({ type: 'star', x, y, size: 46, vr: 0.05, life: 14, color: '#ffffff' });
      for (let i = 0; i < ps.n(16); i++) {
        const a = U.rand(0, TAU);
        ps.add({ type: 'spark', x, y, vx: Math.cos(a) * U.rand(6, 13), vy: Math.sin(a) * U.rand(6, 13), size: 16, w: 2.4, life: 16, color: U.pick(['#ffffff', '#67e8f9', '#a5f3fc']), drag: 0.86 });
      }
    },
    dust(ps, x, y, n = 6, dir = 0, color = '#94a3b8') {
      for (let i = 0; i < ps.n(n); i++) ps.add({ type: 'smoke', x: x + U.rand(-10, 10), y: y - 4, vx: (dir || U.rand(-1, 1)) * U.rand(0.5, 3), vy: U.rand(-1.2, -0.2), size: U.rand(8, 16), grow: 0.6, life: U.rand(18, 30), color, add: false, alpha: 0.5 });
    },
    lightning(ps, x1, y1, x2, y2, color = '#22d3ee', w = 2.5, life = 10, jag = 30) {
      ps.add({ type: 'bolt', x1, y1, x2, y2, w, jag, life, color });
    },
    explosion(ps, x, y, r = 120, elem = 'fire') {
      const c = ELEM[elem] || ELEM.fire;
      ps.add({ type: 'flash', x, y, size: r * 1.6, life: 12, color: c[0] });
      ps.add({ type: 'ring', x, y, size: r * 0.2, grow: r * 0.09, w: 8, life: 18, color: c[1] });
      ps.add({ type: 'ring', x, y, size: r * 0.1, grow: r * 0.06, w: 4, life: 24, color: c[2], flat: 0.35 });
      for (let i = 0; i < ps.n(26); i++) {
        const a = U.rand(0, TAU), sp = U.rand(3, 13);
        ps.add({ type: 'dot', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, size: U.rand(8, 20), grow: -0.3, life: U.rand(18, 36), color: U.pick(c), drag: 0.92 });
      }
      for (let i = 0; i < ps.n(6); i++) ps.add({ type: 'smoke', x: x + U.rand(-30, 30), y: y + U.rand(-30, 10), vx: U.rand(-2, 2), vy: U.rand(-2, -0.5), size: U.rand(30, 50), grow: 1.2, life: 46, color: '#292524', add: false, alpha: 0.7 });
    },
    shatter(ps, x, y, r = 60) {
      ps.add({ type: 'flash', x, y, size: r * 2, life: 10, color: '#a5f3fc' });
      for (let i = 0; i < ps.n(30); i++) {
        const a = U.rand(0, TAU), sp = U.rand(3, 14);
        ps.add({ type: 'shard', x: x + U.rand(-r / 2, r / 2), y: y + U.rand(-r, r / 2), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, size: U.rand(6, 16), vr: U.rand(-0.4, 0.4), life: U.rand(30, 50), color: U.pick(ELEM.ice), grav: 0.4, edge: '#ffffff', drag: 0.97 });
      }
    },
    slash(ps, x, y, dir, color, size = 60, rot = 0, sweep = 2.2) {
      ps.add({ type: 'slash', x, y, dir, color, size, rot, sweep, life: 10 });
    },
    text(ps, x, y, text, color = '#fff', size = 22) {
      ps.add({ type: 'text', x, y, vy: -1.4, drag: 0.94, text, color, size, life: 46, add: false });
    },
    trailDots(ps, x, y, color, n = 2) {
      for (let i = 0; i < n; i++) ps.add({ type: 'dot', x: x + U.rand(-4, 4), y: y + U.rand(-4, 4), size: U.rand(3, 6), life: 14, color });
    },
  };

  /* ======================= THÀNH PHỐ NEON ======================= */
  /**
   * Sinh một lớp tòa nhà lên canvas offscreen.
   * o = { w, h, seed, base, top, colors:[neon], density, minH, maxH, windowP, signs }
   */
  function makeCity(o) {
    const cv = document.createElement('canvas');
    cv.width = o.w; cv.height = o.h;
    const ctx = cv.getContext('2d');
    const r = U.rng(o.seed || 1);
    let x = -20;
    while (x < o.w + 20) {
      const bw = (o.minW || 40) + r() * ((o.maxW || 120) - (o.minW || 40));
      const bh = o.minH + r() * (o.maxH - o.minH);
      const by = o.h - bh;
      const g = ctx.createLinearGradient(0, by, 0, o.h);
      g.addColorStop(0, o.top); g.addColorStop(1, o.base);
      ctx.fillStyle = g;
      ctx.fillRect(x, by, bw, bh);
      // mái/ăng-ten
      if (r() < 0.35) { ctx.fillRect(x + bw * 0.3, by - 10 - r() * 30, 3, 40); }
      if (r() < 0.25) { ctx.fillRect(x + bw * 0.15, by - 12, bw * 0.7, 12); }
      // cửa sổ
      const col = o.colors[Math.floor(r() * o.colors.length)];
      const ws = o.winSize || 3;
      for (let wy = by + 8; wy < o.h - 6; wy += ws * 3) {
        for (let wx = x + 5; wx < x + bw - 5; wx += ws * 2.6) {
          if (r() < (o.windowP || 0.22)) {
            ctx.fillStyle = U.rgba(r() < 0.75 ? col : '#fef3c7', 0.35 + r() * 0.55);
            ctx.fillRect(wx, wy, ws, ws * 1.3);
          }
        }
      }
      // biển hiệu neon dọc
      if (o.signs && r() < o.signs) {
        const sc = o.colors[Math.floor(r() * o.colors.length)];
        const sx = x + bw * (0.2 + r() * 0.5), sy = by + 10 + r() * bh * 0.3, sh = 30 + r() * 60;
        ctx.save();
        ctx.shadowColor = sc; ctx.shadowBlur = 12;
        ctx.fillStyle = U.rgba(sc, 0.9); ctx.fillRect(sx, sy, 6, sh);
        ctx.restore();
      }
      // đường viền neon mái
      if (r() < 0.3) {
        ctx.strokeStyle = U.rgba(col, 0.7); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, by + 0.5); ctx.lineTo(x + bw, by + 0.5); ctx.stroke();
      }
      x += bw + (o.gap || 0) + r() * (o.gapR || 6);
    }
    return cv;
  }

  /* ======================= MENU BACKGROUND ======================= */
  class MenuBackground {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.mx = 0; this.my = 0; this.tx = 0; this.ty = 0;
      this.t = 0;
      this.running = false;
      this.theme = 'default';
      this.particles = [];
      this.cars = [];
      this.resize();
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('mousemove', (e) => {
        this.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        this.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      });
      this.build();
    }
    resize() {
      const q = NS.Storage && NS.Storage.settings ? NS.Storage.settings.quality : 'high';
      const dpr = Math.min(window.devicePixelRatio || 1, q === 'high' ? 1.5 : 1);
      this.dpr = q === 'low' ? 0.6 : dpr;
      this.cv.width = Math.round(window.innerWidth * this.dpr);
      this.cv.height = Math.round(window.innerHeight * this.dpr);
      this.W = window.innerWidth; this.H = window.innerHeight;
    }
    build() {
      const W = 2200;
      this.layers = [
        makeCity({ w: W, h: 420, seed: 11, base: '#0b0820', top: '#130d33', colors: ['#7c3aed', '#22d3ee', '#db2777'], minH: 120, maxH: 380, windowP: 0.12, winSize: 2, minW: 30, maxW: 90 }),
        makeCity({ w: W, h: 500, seed: 23, base: '#070512', top: '#1a1240', colors: ['#22d3ee', '#a855f7', '#f472b6', '#60a5fa'], minH: 160, maxH: 470, windowP: 0.2, winSize: 3, signs: 0.35, minW: 50, maxW: 140 }),
        makeCity({ w: W, h: 420, seed: 37, base: '#030208', top: '#0d0920', colors: ['#f0abfc', '#22d3ee', '#facc15'], minH: 120, maxH: 400, windowP: 0.16, winSize: 4, signs: 0.5, minW: 80, maxW: 180, gap: 20 }),
      ];
      const r = U.rng(5);
      this.stars = Array.from({ length: 120 }, () => ({ x: r(), y: r() * 0.55, s: r() * 1.5 + 0.3, p: r() * TAU }));
      this.particles = Array.from({ length: 70 }, () => this._newParticle(true));
      this.cars = Array.from({ length: 10 }, () => this._newCar(true));
    }
    _newParticle(init) {
      return { x: Math.random(), y: init ? Math.random() : 1.05, vy: -U.rand(0.0004, 0.0016), vx: U.rand(-0.0003, 0.0003), s: U.rand(1, 3.2), c: U.pick(['#22d3ee', '#a855f7', '#f0abfc', '#60a5fa']), d: U.rand(0.2, 1) };
    }
    _newCar(init) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      return { x: init ? Math.random() : dir > 0 ? -0.1 : 1.1, y: U.rand(0.18, 0.5), v: dir * U.rand(0.0008, 0.0025), c: U.pick(['#f43f5e', '#22d3ee', '#fde047', '#ffffff']), d: U.rand(0.3, 1) };
    }
    start() { if (this.running) return; this.running = true; this.cv.style.opacity = '1'; const loop = () => { if (!this.running) return; this.frame(); this.raf = requestAnimationFrame(loop); }; loop(); }
    stop() { this.running = false; cancelAnimationFrame(this.raf); }
    frame() {
      const ctx = this.ctx, W = this.W, H = this.H;
      const reduce = NS.Storage.settings.reduceFx;
      this.t++;
      this.mx += (this.tx - this.mx) * 0.04; this.my += (this.ty - this.my) * 0.04;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      // bầu trời
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#03030c'); sky.addColorStop(0.45, '#0b0a2a'); sky.addColorStop(0.72, '#2a0f45'); sky.addColorStop(1, '#05040f');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // sao
      this.stars.forEach((s) => {
        const a = 0.3 + Math.sin(this.t * 0.02 + s.p) * 0.3;
        ctx.fillStyle = `rgba(200,220,255,${a})`;
        ctx.fillRect(s.x * W - this.mx * 6, s.y * H - this.my * 4, s.s, s.s);
      });
      // tháp CORE-9 ở xa với cột sáng
      const cx = W * 0.62 - this.mx * 14, horizon = H * 0.62;
      const beamA = 0.18 + Math.sin(this.t * 0.03) * 0.06;
      const bg = ctx.createLinearGradient(cx - 40, 0, cx + 40, 0);
      bg.addColorStop(0, 'rgba(34,211,238,0)'); bg.addColorStop(0.5, `rgba(125,211,252,${beamA})`); bg.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = bg; ctx.fillRect(cx - 40, 0, 80, horizon);
      ctx.fillStyle = '#0d0b26';
      ctx.beginPath(); ctx.moveTo(cx - 26, horizon); ctx.lineTo(cx - 8, horizon - H * 0.42); ctx.lineTo(cx + 8, horizon - H * 0.42); ctx.lineTo(cx + 26, horizon); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(cx, horizon - H * 0.42, 0, cx, horizon - H * 0.42, 90);
      halo.addColorStop(0, 'rgba(165,243,252,0.8)'); halo.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, horizon - H * 0.42, 90, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(34,211,238,0.35)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(cx, horizon - H * 0.42, 70, 14, Math.sin(this.t * 0.01) * 0.2, 0, TAU); ctx.stroke();
      ctx.restore();
      // các lớp thành phố (parallax)
      const depth = [10, 24, 46];
      this.layers.forEach((img, i) => {
        const scale = (H / 720) * (0.9 + i * 0.12);
        const iw = img.width * scale, ih = img.height * scale;
        const x = (W - iw) / 2 - this.mx * depth[i];
        const y = H - ih + (i === 0 ? -H * 0.16 : i === 1 ? -H * 0.06 : H * 0.04) - this.my * depth[i] * 0.3;
        ctx.drawImage(img, x, y, iw, ih);
        if (i === 0) {
          // xe bay giữa các lớp
          this.cars.forEach((c) => {
            c.x += c.v;
            if (c.x > 1.15 || c.x < -0.15) Object.assign(c, this._newCar(false));
            const px = c.x * W - this.mx * 18 * c.d, py = c.y * H - this.my * 5;
            ctx.fillStyle = U.rgba(c.c, 0.85);
            ctx.fillRect(px, py, 3 + c.d * 3, 1.5);
            ctx.fillStyle = U.rgba(c.c, 0.18);
            ctx.fillRect(px - Math.sign(c.v) * 26 * c.d, py, 26 * c.d, 1.5);
          });
        }
      });
      // sương phát sáng dưới chân
      const fog = ctx.createLinearGradient(0, H * 0.7, 0, H);
      fog.addColorStop(0, 'rgba(124,58,237,0)'); fog.addColorStop(1, 'rgba(76,29,149,0.45)');
      ctx.fillStyle = fog; ctx.fillRect(0, H * 0.7, W, H * 0.3);
      // tia năng lượng quét ngang
      if (!reduce) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const yy = ((this.t * (0.6 + i * 0.3) + i * 300) % (H + 200)) - 100;
          const lg = ctx.createLinearGradient(0, yy, W, yy);
          lg.addColorStop(0, 'rgba(34,211,238,0)'); lg.addColorStop(0.5, 'rgba(34,211,238,0.08)'); lg.addColorStop(1, 'rgba(34,211,238,0)');
          ctx.fillStyle = lg; ctx.fillRect(0, yy, W, 1.5);
        }
        // đèn pha quét
        const sweep = Math.sin(this.t * 0.006) * 0.5;
        ctx.translate(W * 0.2 - this.mx * 20, H);
        ctx.rotate(-Math.PI / 2 + sweep);
        const sg = ctx.createLinearGradient(0, 0, H * 1.1, 0);
        sg.addColorStop(0, 'rgba(168,85,247,0.16)'); sg.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(H * 1.1, -60); ctx.lineTo(H * 1.1, 60); ctx.fill();
        ctx.restore();
      }
      // hạt sáng
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      this.particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -0.05) Object.assign(p, this._newParticle(false));
        const px = p.x * W - this.mx * 30 * p.d, py = p.y * H - this.my * 12 * p.d;
        const g = ctx.createRadialGradient(px, py, 0, px, py, p.s * 4);
        g.addColorStop(0, U.rgba(p.c, 0.9)); g.addColorStop(1, U.rgba(p.c, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, p.s * 4, 0, TAU); ctx.fill();
      });
      ctx.restore();
      // mưa nhẹ
      if (!reduce) {
        ctx.strokeStyle = 'rgba(147,197,253,0.12)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 60; i++) {
          const x = ((i * 137.5 + this.t * 3) % (W + 100)) - 50, y = ((i * 89.3 + this.t * 14) % (H + 40)) - 20;
          ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 14);
        }
        ctx.stroke();
      }
    }
  }

  NS.Particles = Particles;
  NS.FX = FX;
  NS.makeCity = makeCity;
  NS.MenuBackground = MenuBackground;
})();
