/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — animation.js
   ANIMATION SYSTEM: khung xương 2D (skeletal rig) vẽ bằng Canvas.
   - Thư viện tư thế (pose) dùng góc khớp + IK 2 xương cho chân chạm đất
   - Nội suy keyframe cho từng đòn, chu kỳ đi/chạy thủ tục, thở khi đứng
   - Renderer vẽ ngoại hình riêng cho từng nhân vật (mũ trùm, giáp, tóc lửa...)
   - Tạo ảnh đại diện (portrait) từ chính rig → đồng nhất phong cách
   Quy ước: hệ tọa độ cục bộ hướng mặt sang phải, y âm = lên trên.
   Góc tính bằng độ, 0 = chỉ thẳng xuống, dương = hướng về phía trước.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const U = NS.U;
  const D = Math.PI / 180;
  const TH = 44, SH = 46, TORSO = 60, NECK = 6, HR = 14, UA = 30, FA = 29;
  const KEYS = ['bx', 'hh', 't', 'hd', 'sf', 'ef', 'sb', 'eb', 'hf', 'kf', 'hb', 'kb', 'rot'];
  const BASE = { bx: 0, hh: 86, t: 8, hd: 0, sf: 30, ef: 100, sb: 20, eb: 100, hf: 20, kf: 20, hb: -20, kb: 20, rot: 0 };

  /* ---------------- Thư viện tư thế ----------------
     ff / fb: [x, độ nhấc] bàn chân trước/sau → giải IK                */
  const RAW = {
    guard: { hh: 84, ff: [20, 0], fb: [-26, 0], t: 10, hd: -6, sf: 38, ef: 108, sb: 22, eb: 112 },
    crouch: { hh: 54, ff: [28, 0], fb: [-24, 0], t: 26, hd: -18, sf: 46, ef: 104, sb: 34, eb: 112 },
    land: { hh: 66, ff: [24, 0], fb: [-26, 0], t: 18, hd: -10, sf: 50, ef: 90, sb: 40, eb: 90 },
    jump: { hh: 84, hf: 62, kf: 96, hb: 16, kb: 74, t: 6, hd: -4, sf: 52, ef: 100, sb: 30, eb: 110 },
    fall: { hh: 84, hf: 34, kf: 46, hb: -6, kb: 34, t: 4, hd: 0, sf: 64, ef: 80, sb: 44, eb: 74 },
    block: { hh: 80, ff: [18, 0], fb: [-30, 0], t: -4, hd: 8, sf: 64, ef: 132, sb: 58, eb: 138 },
    cblock: { hh: 52, ff: [26, 0], fb: [-26, 0], t: 16, hd: 6, sf: 66, ef: 130, sb: 60, eb: 136 },
    hit: { hh: 82, ff: [26, 0], fb: [-30, 0], t: -24, hd: -24, sf: 18, ef: 40, sb: -18, eb: 50 },
    hit2: { hh: 76, ff: [22, 0], fb: [-30, 0], t: 36, hd: 22, sf: 8, ef: 28, sb: 2, eb: 30 },
    airhit: { hh: 84, hf: 44, kf: 34, hb: 12, kb: 46, t: -34, hd: -26, sf: 150, ef: 20, sb: 118, eb: 32, rot: -18 },
    down: { hh: 9, hf: 88, kf: 6, hb: 82, kb: 14, t: -90, hd: -6, sf: 150, ef: 14, sb: 172, eb: 8 },
    dizzy: { hh: 80, ff: [22, 0], fb: [-26, 0], t: 18, hd: 24, sf: 6, ef: 14, sb: 0, eb: 10 },
    dodgeB: { hh: 70, ff: [30, 8], fb: [-12, 0], t: -20, hd: -6, sf: 50, ef: 124, sb: 18, eb: 100 },
    roll: { hh: 60, hf: 90, kf: 120, hb: 60, kb: 110, t: 50, hd: 20, sf: 80, ef: 90, sb: 70, eb: 90 },
    // Đòn thường
    jabW: { hh: 84, ff: [20, 0], fb: [-26, 0], t: 6, hd: -6, sf: 44, ef: 120, sb: 22, eb: 112 },
    jab: { hh: 82, ff: [28, 0], fb: [-26, 0], t: 14, hd: -6, sf: 88, ef: 4, sb: 18, eb: 118 },
    hpW: { hh: 84, ff: [18, 0], fb: [-30, 0], t: -4, hd: -4, sf: 54, ef: 110, sb: -8, eb: 128 },
    hp: { bx: 10, hh: 78, ff: [40, 0], fb: [-34, 0], t: 24, hd: -10, sf: 28, ef: 118, sb: 92, eb: 2 },
    lkW: { hh: 86, hf: 72, kf: 104, fb: [-20, 0], t: 2, hd: -4, sf: 46, ef: 110, sb: 18, eb: 104 },
    lk: { hh: 86, hf: 84, kf: 6, fb: [-22, 0], t: -8, hd: -6, sf: 40, ef: 116, sb: 8, eb: 96 },
    hkW: { hh: 86, hf: 64, kf: 112, fb: [-16, 0], t: -8, hd: -2, sf: 40, ef: 100, sb: 34, eb: 90 },
    hk: { hh: 86, hf: 128, kf: 4, fb: [-18, 0], t: -28, hd: 8, sf: 62, ef: 90, sb: -30, eb: 60 },
    cjabW: { hh: 54, ff: [28, 0], fb: [-24, 0], t: 26, hd: -18, sf: 46, ef: 120, sb: 34, eb: 112 },
    cjab: { hh: 52, ff: [32, 0], fb: [-24, 0], t: 30, hd: -20, sf: 72, ef: 0, sb: 30, eb: 116 },
    clkW: { hh: 52, hf: 44, kf: 70, fb: [-24, 0], t: 24, hd: -16, sf: 46, ef: 104, sb: 34, eb: 112 },
    clk: { hh: 50, hf: 66, kf: -2, fb: [-24, 0], t: 20, hd: -14, sf: 50, ef: 104, sb: 40, eb: 112 },
    upperW: { hh: 50, ff: [26, 0], fb: [-26, 0], t: 30, hd: -16, sf: 50, ef: 110, sb: -14, eb: 126 },
    upper: { hh: 88, ff: [18, 0], fb: [-24, 0], t: -6, hd: -16, sf: 38, ef: 110, sb: 160, eb: 6 },
    sweepW: { hh: 44, hf: 30, kf: 60, fb: [-22, 0], t: 32, hd: -12, sf: 40, ef: 90, sb: 20, eb: 80 },
    sweep: { hh: 38, hf: 70, kf: 0, fb: [-24, 0], t: 36, hd: -10, sf: 20, ef: 40, sb: -40, eb: 20 },
    jlp: { hh: 84, hf: 62, kf: 96, hb: 16, kb: 74, t: 14, hd: -6, sf: 100, ef: 6, sb: 30, eb: 110 },
    jlk: { hh: 84, hf: 96, kf: 122, hb: 10, kb: 60, t: -6, hd: -4, sf: 60, ef: 100, sb: 30, eb: 100 },
    jhpW: { hh: 84, hf: 50, kf: 80, hb: 10, kb: 60, t: -10, hd: -10, sf: 172, ef: 20, sb: 150, eb: 30 },
    jhp: { hh: 84, hf: 60, kf: 90, hb: 20, kb: 70, t: 24, hd: 6, sf: 74, ef: -4, sb: 60, eb: 10 },
    jhkW: { hh: 84, hf: 40, kf: 100, hb: 20, kb: 80, t: 4, hd: -4, sf: 60, ef: 100, sb: 40, eb: 100 },
    jhk: { hh: 84, hf: 62, kf: 0, hb: 6, kb: 50, t: -18, hd: -8, sf: 70, ef: 60, sb: -20, eb: 40 },
    grab: { hh: 82, ff: [30, 0], fb: [-26, 0], t: 14, hd: -4, sf: 84, ef: 30, sb: 72, eb: 40 },
    toss: { hh: 84, ff: [20, 0], fb: [-34, 0], t: -16, hd: -10, sf: 154, ef: 30, sb: 132, eb: 40 },
    // Kỹ năng
    castW: { hh: 82, ff: [20, 0], fb: [-30, 0], t: -6, hd: -6, sf: 8, ef: 120, sb: -24, eb: 100 },
    cast: { bx: 6, hh: 80, ff: [36, 0], fb: [-30, 0], t: 14, hd: -6, sf: 92, ef: -6, sb: 60, eb: 70 },
    cast2: { bx: 6, hh: 80, ff: [36, 0], fb: [-30, 0], t: 14, hd: -6, sf: 60, ef: 70, sb: 94, eb: -4 },
    raise: { hh: 86, ff: [16, 0], fb: [-24, 0], t: -6, hd: -18, sf: 176, ef: 6, sb: 40, eb: 60 },
    raise2: { hh: 86, ff: [18, 0], fb: [-22, 0], t: -10, hd: -22, sf: 170, ef: 8, sb: 168, eb: 10 },
    slamW: { hh: 88, ff: [18, 0], fb: [-22, 0], t: -14, hd: -14, sf: 176, ef: 20, sb: 170, eb: 20 },
    slam: { hh: 54, ff: [36, 0], fb: [-30, 0], t: 52, hd: 22, sf: 64, ef: 4, sb: 58, eb: 4 },
    dash: { hh: 70, ff: [42, 0], fb: [-48, 6], t: 38, hd: -26, sf: 110, ef: 8, sb: -52, eb: 22 },
    slashW: { hh: 80, ff: [22, 0], fb: [-28, 0], t: -4, hd: -6, sf: 150, ef: 70, sb: -30, eb: 60 },
    slash: { bx: 8, hh: 74, ff: [38, 0], fb: [-34, 0], t: 26, hd: -10, sf: 70, ef: -10, sb: -40, eb: 40 },
    slash2: { bx: 8, hh: 74, ff: [38, 0], fb: [-34, 0], t: 22, hd: -10, sf: -20, ef: 40, sb: 110, eb: -10 },
    stance: { hh: 76, ff: [26, 0], fb: [-34, 0], t: -2, hd: -4, sf: 70, ef: 70, sb: 96, eb: 50 },
    float: { hh: 84, hf: 22, kf: 34, hb: -10, kb: 42, t: -4, hd: -12, sf: 120, ef: 20, sb: 120, eb: 24 },
    kneel: { hh: 44, ff: [30, 0], fb: [-46, 0], t: 30, hd: -6, sf: 80, ef: -4, sb: 30, eb: 60 },
    // Thắng / thua
    vicFist: { hh: 86, ff: [16, 0], fb: [-22, 0], t: -4, hd: -12, sf: 174, ef: 8, sb: 26, eb: 96 },
    vicCross: { hh: 86, ff: [16, 0], fb: [-22, 0], t: -2, hd: 4, sf: 70, ef: 150, sb: 68, eb: 152 },
    vicBlade: { hh: 50, ff: [30, 0], fb: [-42, 0], t: 22, hd: 6, sf: 70, ef: -10, sb: -40, eb: 10 },
    vicOpen: { hh: 88, ff: [14, 0], fb: [-20, 0], t: -8, hd: -16, sf: 120, ef: 10, sb: 125, eb: 10 },
    vicPoint: { hh: 86, ff: [18, 0], fb: [-22, 0], t: 0, hd: -4, sf: 92, ef: 0, sb: 10, eb: 40 },
    defeat: { hh: 46, ff: [32, 0], fb: [-48, 0], t: 40, hd: 32, sf: 8, ef: 6, sb: 4, eb: 6 },
    portrait: { hh: 84, ff: [20, 0], fb: [-26, 0], t: 4, hd: -4, sf: 30, ef: 120, sb: 18, eb: 118 },
  };

  /* Tư thế đứng riêng của từng nhân vật (ghi đè lên guard) */
  const STANCE = {
    raven: { hh: 76, t: 20, hd: -16, sf: 62, ef: 66, sb: -28, eb: 56, ff: [26, 0], fb: [-30, 0] },
    volt: { hh: 80, t: 14, sf: 46, ef: 112, sb: 30, eb: 118 },
    titan: { hh: 82, ff: [24, 0], fb: [-32, 0], t: 8, sf: 30, ef: 96, sb: 20, eb: 98 },
    frost: { hh: 84, t: 6, sf: 56, ef: 88, sb: 12, eb: 120 },
    pyra: { hh: 82, t: 8, sf: 70, ef: 82, sb: -12, eb: 120 },
    zero: { hh: 86, t: 2, hd: 0, sf: 12, ef: 20, sb: 6, eb: 16, ff: [18, 0], fb: [-22, 0] },
    axiom: { hh: 86, t: 0, hd: -4, sf: 20, ef: 30, sb: 18, eb: 34, ff: [16, 0], fb: [-22, 0] },
  };
  const VICTORY = { raven: 'vicBlade', volt: 'vicFist', titan: 'vicCross', frost: 'vicPoint', pyra: 'raise2', zero: 'vicOpen', axiom: 'vicOpen' };

  /* ---------------- IK & giải tư thế ---------------- */
  function ik(hx, hy, tx, ty) {
    const dx = tx - hx, dy = ty - hy;
    let d = Math.hypot(dx, dy);
    d = U.clamp(d, Math.abs(TH - SH) + 0.5, TH + SH - 0.05);
    const base = Math.atan2(dx, dy);
    const A = Math.acos(U.clamp((TH * TH + d * d - SH * SH) / (2 * TH * d), -1, 1));
    const h = base + A;
    const kx = hx + Math.sin(h) * TH, ky = hy + Math.cos(h) * TH;
    const s = Math.atan2(tx - kx, ty - ky);
    return { h: h / D, k: (h - s) / D };
  }
  function resolve(raw) {
    const p = Object.assign({}, BASE, raw);
    const hy = -p.hh;
    if (raw.ff) { const a = ik(p.bx, hy, raw.ff[0], -raw.ff[1]); p.hf = a.h; p.kf = a.k; }
    if (raw.fb) { const a = ik(p.bx, hy, raw.fb[0], -raw.fb[1]); p.hb = a.h; p.kb = a.k; }
    const o = {};
    KEYS.forEach((k) => (o[k] = p[k]));
    return o;
  }
  const cache = {};
  function pose(name, charId) {
    const key = (charId || '') + ':' + name;
    if (cache[key]) return cache[key];
    let raw = RAW[name] || RAW.guard;
    if (name === 'guard' && charId && STANCE[charId]) raw = Object.assign({}, RAW.guard, STANCE[charId]);
    return (cache[key] = resolve(raw));
  }
  function lerpPose(a, b, k) {
    const o = {};
    for (let i = 0; i < KEYS.length; i++) { const key = KEYS[i]; o[key] = a[key] + (b[key] - a[key]) * k; }
    return o;
  }
  function addPose(p, d) {
    const o = Object.assign({}, p);
    Object.keys(d).forEach((k) => (o[k] = (o[k] || 0) + d[k]));
    return o;
  }
  /** Đánh giá timeline keyframe [[frame, poseName|object], ...] */
  function evalTimeline(anim, f, charId) {
    if (!anim || !anim.length) return pose('guard', charId);
    const get = (r) => (typeof r === 'string' ? pose(r, charId) : r.__resolved || (r.__resolved = resolve(r)));
    if (f <= anim[0][0]) return get(anim[0][1]);
    for (let i = 0; i < anim.length - 1; i++) {
      const a = anim[i], b = anim[i + 1];
      if (f >= a[0] && f < b[0]) {
        const k = (f - a[0]) / Math.max(1, b[0] - a[0]);
        return lerpPose(get(a[1]), get(b[1]), U.easeOut(k));
      }
    }
    return get(anim[anim.length - 1][1]);
  }

  /* ---------------- Khung xương (forward kinematics) ---------------- */
  function rotP(p, cx, cy, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const x = p.x - cx, y = p.y - cy;
    p.x = cx + x * c - y * s; p.y = cy + x * s + y * c;
  }
  function skeleton(p, grounded) {
    const hip = { x: p.bx, y: -p.hh };
    const ta = p.t * D;
    const ux = Math.sin(ta), uy = -Math.cos(ta);
    const neck = { x: hip.x + ux * TORSO, y: hip.y + uy * TORSO };
    const ha = (p.t + p.hd) * D;
    const head = { x: neck.x + Math.sin(ha) * (NECK + HR), y: neck.y - Math.cos(ha) * (NECK + HR) };
    const sh = { x: hip.x + ux * TORSO * 0.86, y: hip.y + uy * TORSO * 0.86 };
    const af = (p.sf + p.t) * D, ab = (p.sb + p.t) * D;
    const eF = { x: sh.x + Math.sin(af) * UA, y: sh.y + Math.cos(af) * UA };
    const hF = { x: eF.x + Math.sin(af + p.ef * D) * FA, y: eF.y + Math.cos(af + p.ef * D) * FA };
    const eB = { x: sh.x + Math.sin(ab) * UA, y: sh.y + Math.cos(ab) * UA };
    const hB = { x: eB.x + Math.sin(ab + p.eb * D) * FA, y: eB.y + Math.cos(ab + p.eb * D) * FA };
    const tf = p.hf * D, tb = p.hb * D;
    const kF = { x: hip.x + Math.sin(tf) * TH, y: hip.y + Math.cos(tf) * TH };
    const fF = { x: kF.x + Math.sin(tf - p.kf * D) * SH, y: kF.y + Math.cos(tf - p.kf * D) * SH };
    const kB = { x: hip.x + Math.sin(tb) * TH, y: hip.y + Math.cos(tb) * TH };
    const fB = { x: kB.x + Math.sin(tb - p.kb * D) * SH, y: kB.y + Math.cos(tb - p.kb * D) * SH };
    const S = { hip, neck, head, sh, eF, hF, eB, hB, kF, fF, kB, fB, ta, ha, af, ab, rot: p.rot * D };
    const pts = [neck, head, sh, eF, hF, eB, hB, kF, fF, kB, fB];
    if (p.rot) pts.forEach((q) => rotP(q, hip.x, hip.y, p.rot * D));
    if (p.rot) { S.ta += p.rot * D; S.ha += p.rot * D; }
    if (grounded) {
      let maxY = -999;
      [hip, neck, kF, fF, kB, fB, hF, hB].forEach((q) => { if (q.y > maxY) maxY = q.y; });
      maxY = Math.max(maxY, head.y + HR * 0.6);
      const off = -maxY;
      if (Math.abs(off) > 0.01) [hip].concat(pts).forEach((q) => { q.y += off; });
    }
    return S;
  }

  /* ---------------- Ngoại hình ---------------- */
  const LOOKS = {
    raven: { ua: 9, fa: 8.5, th: 13, sh: 11, chest: 30, waist: 21, head: 13, fist: 5 },
    volt: { ua: 11, fa: 11, th: 14.5, sh: 12.5, chest: 34, waist: 24, head: 13.5, fist: 7.5 },
    titan: { ua: 17, fa: 18, th: 20, sh: 19, chest: 50, waist: 36, head: 14, fist: 11 },
    frost: { ua: 9.5, fa: 9, th: 13.5, sh: 11.5, chest: 30, waist: 21, head: 13, fist: 5.5 },
    pyra: { ua: 9.5, fa: 9, th: 13.5, sh: 11.5, chest: 29, waist: 20, head: 13, fist: 5.5 },
    zero: { ua: 10, fa: 10, th: 14, sh: 12, chest: 31, waist: 21, head: 13, fist: 6 },
    axiom: { ua: 12, fa: 11, th: 15, sh: 13, chest: 40, waist: 26, head: 14, fist: 7 },
  };

  function seg(ctx, a, b, w, fill, edge) {
    ctx.strokeStyle = edge; ctx.lineWidth = w + 3;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = fill; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  function piping(ctx, a, b, w, col, side = 0.3, from = 0.15, to = 0.85) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * w * side, ny = (dx / L) * w * side;
    ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(a.x + nx + dx * from, a.y + ny + dy * from); ctx.lineTo(a.x + nx + dx * to, a.y + ny + dy * to); ctx.stroke();
  }
  function plate(ctx, a, b, w, from, to, fill, edge) {
    const p1 = { x: a.x + (b.x - a.x) * from, y: a.y + (b.y - a.y) * from };
    const p2 = { x: a.x + (b.x - a.x) * to, y: a.y + (b.y - a.y) * to };
    seg(ctx, p1, p2, w, fill, edge);
  }
  function dot(ctx, p, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); }
  function glowDot(ctx, p, r, col, a = 0.6) {
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, U.rgba(col, a)); g.addColorStop(1, U.rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  }

  /** Chuẩn bị bảng màu (tối hơn cho chi phía sau) */
  function palSet(pal, flat) {
    if (flat) {
      const c = flat;
      return { flat: true, suit: c, armor: c, accent: c, glow: c, skin: c, hair: c, visor: c, blade: c, edge: c, suitB: c, armorB: c, skinB: c, edgeB: c };
    }
    if (pal.__set) return pal.__set;
    const s = {
      suit: pal.suit, armor: pal.armor, accent: pal.accent, glow: pal.glow, skin: pal.skin, hair: pal.hair, visor: pal.visor, blade: pal.blade,
      edge: U.shade(pal.suit, 0.45),
      suitB: U.shade(pal.suit, 0.72), armorB: U.shade(pal.armor, 0.7), skinB: U.shade(pal.skin, 0.75), edgeB: U.shade(pal.suit, 0.35),
      accentB: U.shade(pal.accent, 0.7),
    };
    pal.__set = s;
    return s;
  }

  /* ---------- Vẽ các bộ phận ---------- */
  function drawArm(ctx, S, front, L, c, look, t, f) {
    const sh = S.sh, e = front ? S.eF : S.eB, h = front ? S.hF : S.hB;
    const suit = front ? c.suit : c.suitB, armor = front ? c.armor : c.armorB, edge = front ? c.edge : c.edgeB;
    seg(ctx, sh, e, L.ua, suit, edge);
    seg(ctx, e, h, L.fa, suit, edge);
    if (!c.flat) {
      // găng tay / giáp tay
      plate(ctx, e, h, L.fa + 2, 0.25, 0.85, armor, edge);
      piping(ctx, e, h, L.fa, front ? c.accent : c.accentB, 0.25);
      // vai
      if (look === 'titan') {
        ctx.fillStyle = armor; ctx.strokeStyle = edge; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(sh.x, sh.y + 2, 19, 14, S.ta, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = front ? c.accent : c.accentB; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(sh.x, sh.y + 2, 13, 8, S.ta, Math.PI, Math.PI * 2); ctx.stroke();
      } else if (look === 'volt') {
        dot(ctx, sh, 8.5, armor); ctx.strokeStyle = front ? c.accent : c.accentB; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sh.x, sh.y, 6, 0, Math.PI * 2); ctx.stroke();
      } else if (look === 'axiom') {
        ctx.fillStyle = armor; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 12, 9, S.ta, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        dot(ctx, sh, L.ua * 0.62, armor);
      }
    }
    // nắm tay
    const fistCol = look === 'titan' || look === 'zero' || look === 'axiom' ? armor : look === 'raven' ? c.suit : front ? c.armor : c.armorB;
    if (look === 'titan') {
      ctx.fillStyle = fistCol; ctx.strokeStyle = edge; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(h.x, h.y, L.fist, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (!c.flat) { ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(h.x, h.y, L.fist * 0.55, 0, Math.PI * 2); ctx.stroke(); }
    } else {
      ctx.fillStyle = fistCol; ctx.strokeStyle = edge; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, L.fist, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    if (c.flat) return;
    // vũ khí / hiệu ứng tay
    const fa = Math.atan2(h.y - e.y, h.x - e.x);
    if (look === 'raven') {
      // lưỡi kiếm tay (tonfa blade) kéo dài qua nắm tay
      const len = 40, bx = Math.cos(fa), by = Math.sin(fa);
      const base = { x: e.x + (h.x - e.x) * 0.35, y: e.y + (h.y - e.y) * 0.35 };
      const tip = { x: h.x + bx * len, y: h.y + by * len };
      ctx.fillStyle = front ? c.blade : U.shade(c.blade, 0.7);
      ctx.beginPath();
      ctx.moveTo(base.x - by * 2.5, base.y + bx * 2.5); ctx.lineTo(tip.x, tip.y); ctx.lineTo(base.x + by * 3.5, base.y - bx * 3.5);
      ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.rgba(c.glow, 0.55); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.restore();
    } else if (look === 'frost' && front) {
      ctx.fillStyle = c.blade;
      for (let i = -1; i <= 1; i++) {
        const a = fa + i * 0.35;
        ctx.beginPath();
        ctx.moveTo(h.x + Math.cos(a + 1.4) * 3, h.y + Math.sin(a + 1.4) * 3);
        ctx.lineTo(h.x + Math.cos(a) * 15, h.y + Math.sin(a) * 15);
        ctx.lineTo(h.x + Math.cos(a - 1.4) * 3, h.y + Math.sin(a - 1.4) * 3);
        ctx.fill();
      }
    } else if (look === 'volt') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glowDot(ctx, h, 13, c.accent, 0.5);
      if (((t / 3) | 0) % 3 !== 0) {
        ctx.strokeStyle = U.rgba(c.glow, 0.9); ctx.lineWidth = 1.4; ctx.beginPath();
        let x = h.x, y = h.y; ctx.moveTo(x, y);
        for (let i = 0; i < 4; i++) { x += (Math.random() - 0.5) * 16; y += (Math.random() - 0.5) * 16; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.restore();
    } else if (look === 'pyra' && front) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const a = t * 0.12 + i * Math.PI;
        const o = { x: h.x + Math.cos(a) * 13, y: h.y + Math.sin(a) * 7 };
        glowDot(ctx, o, 9, c.accent, 0.8); dot(ctx, o, 2.6, c.glow);
      }
      ctx.restore();
    }
  }

  function drawLeg(ctx, S, front, L, c, look) {
    const hip = S.hip, k = front ? S.kF : S.kB, f = front ? S.fF : S.fB;
    const suit = front ? c.suit : c.suitB, armor = front ? c.armor : c.armorB, edge = front ? c.edge : c.edgeB;
    seg(ctx, hip, k, L.th, suit, edge);
    seg(ctx, k, f, L.sh, suit, edge);
    if (c.flat) { dot(ctx, f, L.sh * 0.55, suit); return; }
    plate(ctx, k, f, L.sh + 2.5, 0.3, 0.95, armor, edge); // ống chân / giày
    dot(ctx, k, L.th * 0.42, armor); // đầu gối
    piping(ctx, hip, k, L.th, front ? c.accent : c.accentB, 0.32, 0.2, 0.8);
    // bàn chân
    const ang = Math.atan2(f.y - k.y, f.x - k.x) - Math.PI / 2;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(ang * 0.35);
    ctx.fillStyle = armor; ctx.strokeStyle = edge; ctx.lineWidth = 2;
    const fl = look === 'titan' ? 16 : 12;
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(fl, -2); ctx.lineTo(fl, 4); ctx.lineTo(-7, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawTorso(ctx, S, L, c, look, t) {
    const hip = S.hip, ta = S.ta;
    const fx = Math.cos(ta), fy = Math.sin(ta); // hướng "phía trước" vuông góc thân
    const ux = Math.sin(ta), uy = -Math.cos(ta);
    const top = { x: hip.x + ux * TORSO * 0.95, y: hip.y + uy * TORSO * 0.95 };
    const mid = { x: hip.x + ux * TORSO * 0.55, y: hip.y + uy * TORSO * 0.55 };
    const cw = L.chest / 2, ww = L.waist / 2;
    ctx.fillStyle = c.suit; ctx.strokeStyle = c.edge; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hip.x + fx * ww, hip.y + fy * ww);
    ctx.lineTo(mid.x + fx * cw * 1.02, mid.y + fy * cw * 1.02);
    ctx.lineTo(top.x + fx * cw * 0.8, top.y + fy * cw * 0.8);
    ctx.quadraticCurveTo(top.x + ux * 8, top.y + uy * 8, top.x - fx * cw * 0.8, top.y - fy * cw * 0.8);
    ctx.lineTo(mid.x - fx * cw * 0.9, mid.y - fy * cw * 0.9);
    ctx.lineTo(hip.x - fx * ww, hip.y - fy * ww);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (c.flat) return;
    // giáp ngực
    ctx.fillStyle = c.armor;
    ctx.beginPath();
    ctx.moveTo(mid.x + fx * cw * 0.95, mid.y + fy * cw * 0.95);
    ctx.lineTo(top.x + fx * cw * 0.78, top.y + fy * cw * 0.78);
    ctx.lineTo(top.x - fx * cw * 0.2, top.y - fy * cw * 0.2);
    ctx.lineTo(mid.x + fx * cw * 0.05 - ux * 6, mid.y + fy * cw * 0.05 - uy * 6);
    ctx.closePath(); ctx.fill();
    // đường neon
    ctx.strokeStyle = c.accent; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(hip.x + fx * ww * 0.8 + ux * 6, hip.y + fy * ww * 0.8 + uy * 6);
    ctx.lineTo(mid.x + fx * cw * 0.7, mid.y + fy * cw * 0.7);
    ctx.lineTo(top.x + fx * cw * 0.5, top.y + fy * cw * 0.5);
    ctx.stroke();
    // thắt lưng
    const b1 = { x: hip.x + ux * 7, y: hip.y + uy * 7 };
    ctx.strokeStyle = c.armor; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(b1.x + fx * ww * 1.05, b1.y + fy * ww * 1.05); ctx.lineTo(b1.x - fx * ww * 1.05, b1.y - fy * ww * 1.05); ctx.stroke();
    dot(ctx, { x: b1.x + fx * ww * 0.7, y: b1.y + fy * ww * 0.7 }, 2.6, c.accent);
    // lõi năng lượng
    const core = { x: mid.x + fx * cw * 0.55 + ux * 6, y: mid.y + fy * cw * 0.55 + uy * 6 };
    const pulse = 0.55 + Math.sin(t * 0.08) * 0.25;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glowDot(ctx, core, look === 'titan' || look === 'axiom' ? 16 : 10, c.accent, pulse);
    ctx.restore();
    dot(ctx, core, look === 'titan' || look === 'axiom' ? 4.5 : 2.8, c.glow);
  }

  function drawHead(ctx, S, L, c, look, t) {
    const h = S.head, a = S.ha, r = L.head;
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(a);
    const ed = c.edge;
    if (c.flat) {
      ctx.fillStyle = c.suit; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      if (look === 'raven') { ctx.beginPath(); ctx.moveTo(-r, -2); ctx.lineTo(-r - 12, -r - 2); ctx.lineTo(4, -r - 1); ctx.fill(); }
      ctx.restore(); return;
    }
    switch (look) {
      case 'raven': {
        // mũ trùm nhọn
        ctx.fillStyle = c.hair; ctx.strokeStyle = ed; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(r + 2, -2); ctx.quadraticCurveTo(r, -r - 4, -2, -r - 3);
        ctx.lineTo(-r - 14, -r + 2); ctx.quadraticCurveTo(-r - 2, 2, -r + 1, r); ctx.lineTo(r - 2, r - 1); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = U.shade(c.suit, 0.6);
        ctx.beginPath(); ctx.ellipse(r * 0.35, 2, r * 0.62, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        // mặt nạ + mắt phát sáng
        ctx.fillStyle = c.armor; ctx.fillRect(r * 0.05, 3, r * 0.9, r * 0.55);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = c.visor; ctx.fillRect(r * 0.2, -2, r * 0.75, 2.6);
        glowDot(ctx, { x: r * 0.6, y: -1 }, 9, c.accent, 0.7);
        ctx.restore();
        break;
      }
      case 'volt': {
        // tóc dựng điện
        ctx.fillStyle = c.hair; ctx.strokeStyle = ed; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.6);
        const spikes = [[0.3, -1.9], [-0.2, -1.2], [-0.5, -2.0], [-0.8, -1.1], [-1.4, -1.6], [-1.2, -0.6], [-1.7, -0.5], [-1, 0.1]];
        spikes.forEach(([x, y]) => ctx.lineTo(x * r, y * r + Math.sin(t * 0.3 + x * 5) * 1.2));
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.skin; ctx.strokeStyle = ed; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.hair; ctx.beginPath(); ctx.arc(-2, -3, r * 0.9, Math.PI * 1.05, Math.PI * 1.9); ctx.fill();
        // kính bảo hộ
        ctx.fillStyle = c.armor; ctx.fillRect(-r * 0.2, -4, r * 1.15, 6);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = c.visor; ctx.fillRect(r * 0.25, -3, r * 0.7, 4);
        glowDot(ctx, { x: r * 0.6, y: -1 }, 8, c.accent, 0.6);
        ctx.restore();
        break;
      }
      case 'titan': {
        ctx.fillStyle = c.armor; ctx.strokeStyle = ed; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-r, r * 0.9); ctx.lineTo(-r * 1.05, -r * 0.4); ctx.quadraticCurveTo(-r * 0.6, -r * 1.25, r * 0.4, -r * 1.1);
        ctx.lineTo(r * 1.1, -r * 0.3); ctx.lineTo(r * 1.05, r * 0.6); ctx.lineTo(r * 0.4, r * 1.05); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = U.shade(c.suit, 0.5); ctx.fillRect(r * 0.1, -r * 0.25, r * 1.0, r * 0.5);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = c.visor; ctx.fillRect(r * 0.25, -r * 0.1, r * 0.85, 3.4);
        glowDot(ctx, { x: r * 0.7, y: 0 }, 12, c.accent, 0.7);
        ctx.restore();
        ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r); ctx.lineTo(-r * 1.1, -r * 1.7); ctx.stroke();
        dot(ctx, { x: -r * 1.1, y: -r * 1.7 }, 2.2, c.glow);
        break;
      }
      case 'frost': {
        ctx.fillStyle = c.hair; ctx.beginPath(); ctx.arc(-1, -1, r * 1.05, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.skin; ctx.strokeStyle = ed; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(1.5, 1, r * 0.88, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.hair;
        ctx.beginPath(); ctx.moveTo(r * 0.9, -r * 0.4); ctx.quadraticCurveTo(0, -r * 1.4, -r * 1.05, -r * 0.1); ctx.lineTo(-r * 0.3, -r * 0.5); ctx.closePath(); ctx.fill();
        // visor băng
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = U.rgba(c.visor, 0.8); ctx.fillRect(r * 0.15, -3, r * 0.85, 4.4);
        glowDot(ctx, { x: r * 0.6, y: -1 }, 9, c.accent, 0.55);
        ctx.restore();
        // tinh thể trên tai
        ctx.fillStyle = c.blade; ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-6, -r * 1.5); ctx.lineTo(2, -r * 0.6); ctx.fill();
        break;
      }
      case 'pyra': {
        // tóc lửa động
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 7; i++) {
          const ph = t * 0.22 + i * 1.3;
          const len = r * (2.0 + Math.sin(ph) * 0.45 + i * 0.16);
          const ang = -1.75 - i * 0.24 + Math.sin(ph * 0.7) * 0.14;
          const tip = { x: Math.cos(ang) * len - 3, y: Math.sin(ang) * len - 2 };
          const g = ctx.createLinearGradient(0, 0, tip.x, tip.y);
          g.addColorStop(0, U.rgba(c.accent, 0.95)); g.addColorStop(0.55, U.rgba(c.glow, 0.7)); g.addColorStop(1, U.rgba(c.glow, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(Math.cos(ang + 1.3) * r * 0.85, Math.sin(ang + 1.3) * r * 0.85);
          ctx.quadraticCurveTo(tip.x * 0.6 + 5, tip.y * 0.6, tip.x, tip.y);
          ctx.quadraticCurveTo(tip.x * 0.5 - 5, tip.y * 0.5, Math.cos(ang - 1.3) * r * 0.85, Math.sin(ang - 1.3) * r * 0.85);
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = c.skin; ctx.strokeStyle = ed; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(1, 1, r * 0.88, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.hair;
        ctx.beginPath(); ctx.moveTo(r * 0.95, -r * 0.2); ctx.quadraticCurveTo(r * 0.3, -r * 1.3, -r * 0.9, -r * 0.5); ctx.lineTo(-r * 0.6, r * 0.2); ctx.quadraticCurveTo(0, -r * 0.5, r * 0.95, -r * 0.2); ctx.fill();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        dot(ctx, { x: r * 0.55, y: 0 }, 2, c.glow); glowDot(ctx, { x: r * 0.55, y: 0 }, 7, c.accent, 0.6);
        ctx.restore();
        break;
      }
      case 'zero': {
        ctx.fillStyle = c.armor; ctx.strokeStyle = ed; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.ellipse(1, -1, r * 0.95, r * 1.08, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = U.shade(c.suit, 0.25); ctx.beginPath(); ctx.ellipse(r * 0.45, 0, r * 0.55, r * 0.6, 0, -1.4, 1.4); ctx.fill();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = c.visor; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(-r * 0.5, -1); ctx.lineTo(r * 0.95, -1); ctx.stroke();
        glowDot(ctx, { x: r * 0.6, y: -1 }, 11, c.accent, 0.6);
        ctx.restore();
        break;
      }
      case 'axiom': {
        ctx.fillStyle = c.armor; ctx.strokeStyle = ed; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 1.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // vương miện
        ctx.fillStyle = c.accent;
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, -r * 0.6);
        [[-0.7, -1.7], [-0.4, -0.9], [0, -2.1], [0.4, -0.9], [0.7, -1.6], [0.9, -0.6]].forEach(([x, y]) => ctx.lineTo(x * r, y * r));
        ctx.closePath(); ctx.fill();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = c.visor; ctx.fillRect(r * 0.05, -2.5, r * 0.85, 3.5);
        glowDot(ctx, { x: r * 0.5, y: -1 }, 12, c.accent, 0.65);
        ctx.restore();
        break;
      }
      default:
        ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /** Chi tiết phía sau thân: khăn, áo choàng, hào quang... */
  function drawBack(ctx, S, L, c, look, t, f) {
    const vx = (f && f.vx ? f.vx * (f.facing || 1) : 0);
    if (look === 'raven') {
      const n = S.neck;
      ctx.strokeStyle = c.flat ? c.suit : c.accentB || c.accent; ctx.lineCap = 'round';
      let px = n.x - 2, py = n.y + 4;
      for (let i = 1; i <= 7; i++) {
        const x = n.x - i * (9 + Math.abs(vx) * 0.9), y = n.y + 4 + i * 2.6 + Math.sin(t * 0.18 + i * 0.9) * i * 1.3 - Math.abs(vx) * i * 0.4;
        ctx.lineWidth = 7 - i * 0.7;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        px = x; py = y;
      }
    } else if (look === 'frost') {
      // đuôi tóc
      const h = S.head;
      ctx.strokeStyle = c.hair; ctx.lineCap = 'round';
      let px = h.x - 8, py = h.y - 4;
      for (let i = 1; i <= 5; i++) {
        const x = h.x - 8 - i * 7 - Math.abs(vx) * i * 0.6, y = h.y - 4 + i * 5 + Math.sin(t * 0.12 + i) * 2;
        ctx.lineWidth = 7 - i;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); px = x; py = y;
      }
      // vạt áo khoác
      const hip = S.hip, sway = Math.sin(t * 0.1) * 4 - vx * 1.5;
      ctx.fillStyle = c.flat ? c.suit : c.armorB; ctx.strokeStyle = c.edgeB; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hip.x - 10, hip.y - 14); ctx.lineTo(hip.x + 6, hip.y - 10);
      ctx.lineTo(hip.x - 8 + sway * 0.4, hip.y + 42); ctx.lineTo(hip.x - 30 + sway, hip.y + 38); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (look === 'axiom') {
      const sh = S.sh, hip = S.hip, sway = Math.sin(t * 0.07) * 6 - vx * 2;
      ctx.fillStyle = c.flat ? c.suit : U.shade(c.accent, 0.55); ctx.strokeStyle = c.flat ? c.suit : c.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sh.x + 6, sh.y - 4); ctx.lineTo(sh.x - 16, sh.y - 2);
      ctx.quadraticCurveTo(hip.x - 40 + sway, hip.y + 20, hip.x - 52 + sway * 1.5, hip.y + 80);
      ctx.lineTo(hip.x - 4 + sway * 0.5, hip.y + 82); ctx.quadraticCurveTo(hip.x - 6, hip.y + 20, sh.x + 6, sh.y - 4);
      ctx.fill(); ctx.stroke();
      if (!c.flat) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = U.rgba(c.glow, 0.5); ctx.lineWidth = 2;
        const hd = S.head;
        ctx.beginPath(); ctx.ellipse(hd.x - 4, hd.y - 2, 26, 26, 0, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = t * 0.01 + (i * Math.PI) / 4;
          ctx.beginPath(); ctx.moveTo(hd.x - 4 + Math.cos(a) * 26, hd.y - 2 + Math.sin(a) * 26); ctx.lineTo(hd.x - 4 + Math.cos(a) * 34, hd.y - 2 + Math.sin(a) * 34); ctx.stroke();
        }
        ctx.restore();
      }
    } else if (look === 'zero' && !c.flat) {
      const hd = S.head;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = U.rgba(c.accent, 0.75); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(hd.x - 6, hd.y - 4, 7 + Math.sin(t * 0.05) * 1, 22, 0.25, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    } else if (look === 'titan' && !c.flat) {
      const sh = S.sh, ta = S.ta;
      ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(ta);
      ctx.fillStyle = c.armorB; ctx.strokeStyle = c.edgeB; ctx.lineWidth = 2.5;
      ctx.fillRect(-36, -4, 18, 44); ctx.strokeRect(-36, -4, 18, 44);
      ctx.fillStyle = c.suitB; ctx.fillRect(-42, -14, 7, 18); ctx.fillRect(-32, -18, 7, 20);
      ctx.restore();
    }
  }

  /** Chi tiết trước thân */
  function drawFront(ctx, S, L, c, look, t) {
    if (c.flat) return;
    if (look === 'zero') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const m = { x: (S.hip.x + S.neck.x) / 2, y: (S.hip.y + S.neck.y) / 2 };
      for (let i = 0; i < 5; i++) {
        const a = t * 0.04 + (i * Math.PI * 2) / 5;
        const x = m.x + Math.cos(a) * 34, y = m.y + Math.sin(a) * 14 + Math.sin(t * 0.07 + i) * 6;
        ctx.fillStyle = U.rgba(i % 2 ? c.accent : c.glow, 0.85);
        ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
      }
      ctx.restore();
    } else if (look === 'axiom') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const m = { x: (S.hip.x + S.neck.x) / 2, y: (S.hip.y + S.neck.y) / 2 };
      ctx.strokeStyle = U.rgba(c.accent, 0.45); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(m.x, m.y, 44, 12, Math.sin(t * 0.02) * 0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Vẽ một chiến binh.
   * f: { def, pal, skel, x, y, facing, flash, status, vx, t, alpha }
   * opts: { flat: màu đặc (afterimage), alpha, scaleMul }
   */
  function drawFighter(ctx, f, opts = {}) {
    const def = f.def, look = def.look, L = LOOKS[look];
    const S = opts.skel || f.skel;
    if (!S) return;
    const t = f.t || 0;
    const flash = !opts.flat && f.flash > 0 ? '#ffffff' : null;
    const c = palSet(f.pal, opts.flat || flash);
    const sc = def.scale * (opts.scaleMul || 1);
    ctx.save();
    ctx.translate(opts.x !== undefined ? opts.x : f.x, opts.y !== undefined ? opts.y : f.y);
    ctx.scale((opts.facing || f.facing) * sc, sc);
    ctx.globalAlpha = (opts.alpha !== undefined ? opts.alpha : 1) * (f.alpha !== undefined ? f.alpha : 1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    drawBack(ctx, S, L, c, look, t, f);
    drawArm(ctx, S, false, L, c, look, t, f);
    drawLeg(ctx, S, false, L, c, look);
    drawTorso(ctx, S, L, c, look, t);
    drawHead(ctx, S, L, c, look, t);
    drawLeg(ctx, S, true, L, c, look);
    drawArm(ctx, S, true, L, c, look, t, f);
    drawFront(ctx, S, L, c, look, t);
    ctx.restore();
  }

  /* ---------------- Tư thế theo trạng thái chiến binh ---------------- */
  function breath(p, t, amt = 1) {
    const s = Math.sin(t * 0.075);
    return addPose(p, { hh: s * 1.4 * amt, t: s * 1.2 * amt, sf: s * 2 * amt, sb: -s * 2 * amt, hd: -s * 1.2 * amt });
  }
  function guardRaw(cid) { return Object.assign({}, RAW.guard, STANCE[cid] || {}); }
  function walkPose(cid, ph, dir) {
    const g = guardRaw(cid);
    const s = Math.sin(ph), c = Math.cos(ph);
    const ff = g.ff || [20, 0], fb = g.fb || [-26, 0];
    return resolve(Object.assign({}, g, {
      ff: [ff[0] + s * 15, Math.max(0, c) * 9],
      fb: [fb[0] - s * 15, Math.max(0, -c) * 9],
      hh: g.hh - Math.abs(s) * 2.2, t: g.t + (dir > 0 ? 3 : -3),
      sf: g.sf + s * 6, sb: g.sb - s * 6,
    }));
  }
  function runPose(ph) {
    const s = Math.sin(ph), c = Math.cos(ph);
    return resolve({
      hh: 80 - Math.abs(c) * 4, t: 30, hd: -24,
      ff: [26 + s * 34, Math.max(0, c) * 22], fb: [-24 - s * 34, Math.max(0, -c) * 22],
      sf: 50 - s * 55, ef: 80, sb: 50 + s * 55, eb: 80,
    });
  }

  /** Tư thế mục tiêu dựa trên trạng thái hiện tại */
  function poseFor(f) {
    const cid = f.def.id, t = f.t || 0;
    switch (f.state) {
      case 'idle': case 'intro_idle': return breath(pose('guard', cid), t, f.lowHp ? 1.8 : 1);
      case 'walk': return walkPose(cid, f.walkPhase || 0, f.walkDir || 1);
      case 'intro': return walkPose(cid, f.walkPhase || 0, 1);
      case 'run': return runPose(f.walkPhase || 0);
      case 'crouch': return breath(pose('crouch', cid), t, 0.6);
      case 'prejump': case 'land': return pose('land', cid);
      case 'air': {
        if (f.flip) return addPose(pose('jump', cid), { rot: f.flip });
        return f.vy < 1 ? pose('jump', cid) : pose('fall', cid);
      }
      case 'attack': case 'skill': {
        const m = f.move;
        if (!m) return pose('guard', cid);
        let p = evalTimeline(m.anim, f.moveFrame, cid);
        if (m.spin) p = addPose(p, { rot: m.spin(f.moveFrame) });
        return p;
      }
      case 'block': return f.crouching ? pose('cblock', cid) : pose('block', cid);
      case 'blockstun': {
        const p = f.crouching ? pose('cblock', cid) : pose('block', cid);
        return addPose(p, { t: -5, bx: -3 });
      }
      case 'hitstun': {
        if (!f.grounded) return addPose(pose('airhit', cid), { rot: f.spinRot || 0 });
        return f.hitLow ? pose('hit2', cid) : pose('hit', cid);
      }
      case 'locked': case 'thrown': return addPose(pose('airhit', cid), { rot: f.spinRot || 0 });
      case 'down': case 'ko_down': return pose('down', cid);
      case 'getup': {
        const k = U.clamp(f.stateTimer / Math.max(1, f.stateDur), 0, 1);
        return lerpPose(pose('crouch', cid), pose('down', cid), k);
      }
      case 'dodge': {
        if (f.dodgeFwd) {
          const k = 1 - f.stateTimer / Math.max(1, f.stateDur);
          return addPose(pose('roll', cid), { rot: k * 360 });
        }
        return pose('dodgeB', cid);
      }
      case 'dizzy': return addPose(pose('dizzy', cid), { t: Math.sin(t * 0.12) * 8, hd: Math.cos(t * 0.1) * 10 });
      case 'frozen': return f.frozenPose || pose('guard', cid);
      case 'victory': {
        const k = U.clamp((f.stateTime || 0) / 20, 0, 1);
        return breath(lerpPose(pose('guard', cid), pose(VICTORY[cid] || 'vicFist', cid), U.easeOut(k)), t, 0.6);
      }
      case 'defeat': return breath(pose('defeat', cid), t, 0.4);
      case 'ko': return f.grounded ? pose('down', cid) : addPose(pose('airhit', cid), { rot: f.spinRot || 0 });
      default: return pose('guard', cid);
    }
  }

  /** Cập nhật tư thế render (có nội suy mượt giữa các trạng thái) */
  function updatePose(f) {
    const target = poseFor(f);
    const snappy = f.state === 'attack' || f.state === 'hitstun' || f.state === 'blockstun' || f.state === 'dodge' || f.state === 'locked';
    if (!f.renderPose || f.state === 'frozen') f.renderPose = target;
    else f.renderPose = lerpPose(f.renderPose, target, snappy ? 0.6 : 0.32);
    if (f.state === 'dodge' && f.dodgeFwd) f.renderPose.rot = target.rot;
    if ((f.state === 'hitstun' || f.state === 'locked' || f.state === 'ko' || f.state === 'thrown') && !f.grounded) f.renderPose.rot = target.rot;
    const grounded = f.grounded !== false && f.state !== 'air' && !(f.move && f.move.air);
    f.skel = skeleton(f.renderPose, grounded);
  }

  /** Vị trí thế giới của một khớp (dùng cho trail, hạt...) */
  function jointWorld(f, name) {
    const S = f.skel;
    if (!S || !S[name]) return { x: f.x, y: f.y - 100 };
    const sc = f.def.scale;
    return { x: f.x + S[name].x * sc * f.facing, y: f.y + S[name].y * sc };
  }

  /* ---------------- Preview & Portrait ---------------- */
  function fakeFighter(charId, costume, state) {
    const def = NS.Chars.get(charId);
    return { def, pal: NS.Chars.palette(charId, costume), state: state || 'idle', t: 0, x: 0, y: 0, facing: 1, flash: 0, status: {}, vx: 0, grounded: true, stateTime: 99 };
  }
  function drawPreview(ctx, f, x, y, scale, facing = 1) {
    updatePose(f);
    ctx.save();
    ctx.translate(x, y); ctx.scale(scale, scale);
    f.x = 0; f.y = 0; f.facing = facing;
    // bóng đổ & ánh sáng sàn
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 90);
    g.addColorStop(0, U.rgba(f.pal.accent, 0.35)); g.addColorStop(1, U.rgba(f.pal.accent, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 90, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawFighter(ctx, f);
    ctx.restore();
  }

  const portraitCache = {};
  function portrait(charId, costume = 0, w = 256, h = 256) {
    const key = `${charId}_${costume}_${w}x${h}`;
    if (portraitCache[key]) return portraitCache[key];
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const f = fakeFighter(charId, costume, 'idle');
    const pal = f.pal;
    // nền
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, U.shade(pal.accent, 0.35)); bg.addColorStop(0.55, '#0a0a1a'); bg.addColorStop(1, '#05050c');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = U.rgba(pal.accent, 0.18); ctx.lineWidth = 1;
    for (let i = -h; i < w; i += 14) { ctx.beginPath(); ctx.moveTo(i, h); ctx.lineTo(i + h, 0); ctx.stroke(); }
    const rg = ctx.createRadialGradient(w * 0.55, h * 0.45, 0, w * 0.55, h * 0.45, w * 0.6);
    rg.addColorStop(0, U.rgba(pal.accent, 0.5)); rg.addColorStop(1, U.rgba(pal.accent, 0));
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    // nhân vật (khung ngực trở lên)
    f.renderPose = pose('portrait', charId);
    f.skel = skeleton(f.renderPose, true);
    f.t = 40;
    const S = f.skel;
    const sc = (h / 120) * (charId === 'titan' ? 0.92 : 1);
    ctx.save();
    ctx.translate(w * 0.5 - S.neck.x * sc * f.def.scale, h * 0.6 - S.neck.y * sc * f.def.scale);
    ctx.scale(sc, sc);
    drawFighter(ctx, f);
    ctx.restore();
    // scanline
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    const vg = ctx.createLinearGradient(0, h * 0.7, 0, h);
    vg.addColorStop(0, 'rgba(5,5,12,0)'); vg.addColorStop(1, 'rgba(5,5,12,0.85)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    const url = cv.toDataURL('image/png');
    portraitCache[key] = url;
    return url;
  }

  NS.Anim = {
    RAW, STANCE, KEYS, pose, resolve, lerpPose, addPose, evalTimeline, skeleton, drawFighter, poseFor, updatePose,
    jointWorld, fakeFighter, drawPreview, portrait, LOOKS, VICTORY, palSet,
  };
})();
