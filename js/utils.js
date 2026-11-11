/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — utils.js
   Tiện ích dùng chung: toán học, màu sắc, random có seed, DOM helpers.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});

  const U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, k) => a + (b - a) * k,
    invLerp: (a, b, v) => (v - a) / (b - a || 1),
    rand: (a = 0, b = 1) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    chance: (p) => Math.random() < p,
    sign: (v) => (v < 0 ? -1 : 1),
    approach(v, target, step) {
      if (v < target) return Math.min(v + step, target);
      return Math.max(v - step, target);
    },
    easeOut: (k) => 1 - (1 - k) * (1 - k),
    easeOut3: (k) => 1 - Math.pow(1 - k, 3),
    easeIn: (k) => k * k,
    easeInOut: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
    smooth: (k) => k * k * (3 - 2 * k),

    /** Random có seed (mulberry32) — dùng để sinh thành phố/đấu trường ổn định */
    rng(seed) {
      let a = seed >>> 0;
      return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    hexToRgb(hex) {
      let h = hex.replace('#', '');
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      const n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    },
    rgbToHex(r, g, b) {
      const c = (v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
      return '#' + c(r) + c(g) + c(b);
    },
    rgba(hex, a) {
      const c = U.hexToRgb(hex);
      return `rgba(${c.r},${c.g},${c.b},${a})`;
    },
    /** f < 1: tối hơn, f > 1: sáng hơn (trộn với trắng) */
    shade(hex, f) {
      const c = U.hexToRgb(hex);
      if (f <= 1) return U.rgbToHex(c.r * f, c.g * f, c.b * f);
      const k = f - 1;
      return U.rgbToHex(c.r + (255 - c.r) * k, c.g + (255 - c.g) * k, c.b + (255 - c.b) * k);
    },
    mix(h1, h2, k) {
      const a = U.hexToRgb(h1), b = U.hexToRgb(h2);
      return U.rgbToHex(a.r + (b.r - a.r) * k, a.g + (b.g - a.g) * k, a.b + (b.b - a.b) * k);
    },

    $(sel, root = document) { return root.querySelector(sel); },
    $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); },
    el(tag, cls, html) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html !== undefined) e.innerHTML = html;
      return e;
    },
    esc(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    fmtTime(sec) {
      if (!isFinite(sec)) return '--:--';
      const m = Math.floor(sec / 60), s = Math.floor(sec % 60), cs = Math.floor((sec * 100) % 100);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    },
    fmtNum(n) { return Math.round(n).toLocaleString('en-US'); },
    dayIndex() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); },
    isTouch() { return 'ontouchstart' in window || navigator.maxTouchPoints > 0; },
    wait(ms) { return new Promise((r) => setTimeout(r, ms)); },
  };

  NS.U = U;
})();
