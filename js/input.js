/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — input.js
   PLAYER CONTROLLER (phần đầu vào): bàn phím, gamepad, cảm ứng.
   Mỗi controller trả về InputFrame {held:{...}, pressed:{...}} mỗi frame.
   P1 và P2 dùng hai bộ phím tách biệt → không thể điều khiển nhầm nhau.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const ACTIONS = ['up', 'down', 'left', 'right', 'lp', 'hp', 'lk', 'hk', 'block', 'dodge', 's1', 's2', 's3', 'ult'];

  function emptyFrame() {
    const held = {}, pressed = {};
    ACTIONS.forEach((a) => { held[a] = false; pressed[a] = false; });
    return { held, pressed };
  }

  /* ---------------- Keyboard (toàn cục) ---------------- */
  const Keyboard = {
    down: new Set(),
    since: new Set(), // phím được nhấn kể từ lần flush trước (bắt cả phím nhấn rất nhanh)
    gameKeys: new Set(),
    captureGame: false,
    init() {
      window.addEventListener('keydown', (e) => {
        if (e.repeat) { if (this.captureGame && this.gameKeys.has(e.code)) e.preventDefault(); return; }
        this.down.add(e.code);
        this.since.add(e.code);
        if (this.captureGame && this.gameKeys.has(e.code)) e.preventDefault();
      });
      window.addEventListener('keyup', (e) => { this.down.delete(e.code); });
      window.addEventListener('blur', () => { this.down.clear(); });
      this.refreshGameKeys();
    },
    refreshGameKeys() {
      this.gameKeys.clear();
      const b = NS.Storage.settings.bindings;
      ['p1', 'p2'].forEach((p) => ACTIONS.forEach((a) => (b[p][a] || []).forEach((c) => this.gameKeys.add(c))));
      this.gameKeys.add('Space');
    },
    isDown(code) { return this.down.has(code) || this.since.has(code); },
    wasPressed(code) { return this.since.has(code); },
    flush() { this.since.clear(); },
  };

  class KeyboardController {
    constructor(slot) { this.slot = slot; this.prev = {}; this.type = 'keyboard'; }
    poll() {
      const f = emptyFrame();
      const b = NS.Storage.settings.bindings[this.slot];
      ACTIONS.forEach((a) => {
        const codes = b[a] || [];
        let held = false, pressed = false;
        for (const c of codes) {
          if (Keyboard.down.has(c)) held = true;
          if (Keyboard.since.has(c)) { pressed = true; held = true; }
        }
        f.held[a] = held;
        f.pressed[a] = pressed;
      });
      return f;
    }
  }

  /* ---------------- Gamepad ----------------
     Chuẩn Xbox: X=Đấm nhanh, Y=Đấm mạnh, A=Đá nhanh, B=Đá mạnh,
     RB=Đỡ, LB=Né, LT=Kỹ năng 1, RT=Kỹ năng 2, R3 hoặc LB+RB=Kỹ năng 3, LT+RT=Ultimate */
  class GamepadController {
    constructor(index) { this.index = index; this.prev = emptyFrame().held; this.type = 'gamepad'; }
    connected() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      return !!pads[this.index];
    }
    poll() {
      const f = emptyFrame();
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = pads[this.index];
      if (!gp) return f;
      const btn = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      const h = f.held;
      h.left = ax < -0.45 || btn(14);
      h.right = ax > 0.45 || btn(15);
      h.up = ay < -0.6 || btn(12);
      h.down = ay > 0.6 || btn(13);
      h.lp = btn(2); h.hp = btn(3); h.lk = btn(0); h.hk = btn(1);
      const lt = btn(6), rt = btn(7), lb = btn(4), rb = btn(5);
      h.ult = lt && rt;
      h.s1 = lt && !rt; h.s2 = rt && !lt;
      h.s3 = btn(11) || (lb && rb);
      h.block = rb && !lb; h.dodge = lb && !rb;
      ACTIONS.forEach((a) => { f.pressed[a] = h[a] && !this.prev[a]; });
      this.prev = Object.assign({}, h);
      this.start = btn(9);
      return f;
    }
  }

  /* ---------------- Touch (điện thoại) ---------------- */
  const Touch = {
    held: {}, since: new Set(),
    set(a, v) { if (v && !this.held[a]) this.since.add(a); this.held[a] = v; },
    flush() { this.since.clear(); },
    reset() { this.held = {}; this.since.clear(); },
  };
  class TouchController {
    constructor() { this.type = 'touch'; }
    poll() {
      const f = emptyFrame();
      ACTIONS.forEach((a) => { f.held[a] = !!Touch.held[a] || Touch.since.has(a); f.pressed[a] = Touch.since.has(a); });
      return f;
    }
  }

  /* ---------------- Gộp nhiều nguồn ---------------- */
  class CompositeController {
    constructor(list) { this.list = list.filter(Boolean); this.type = 'composite'; }
    poll() {
      const f = emptyFrame();
      this.list.forEach((c) => {
        const g = c.poll();
        ACTIONS.forEach((a) => { f.held[a] = f.held[a] || g.held[a]; f.pressed[a] = f.pressed[a] || g.pressed[a]; });
      });
      return f;
    }
  }

  /** Controller trống (ví dụ dummy ở Training) */
  class NullController { constructor() { this.type = 'null'; } poll() { return emptyFrame(); } }

  /** Tạo controller cho người chơi. solo = true → P1 nhận cả hai bộ phím + gamepad + touch */
  function createHuman(slot, solo) {
    const list = [new KeyboardController(slot)];
    if (solo) list.push(new KeyboardController('p2'));
    list.push(new GamepadController(slot === 'p1' ? 0 : 1));
    if (slot === 'p1') list.push(new TouchController());
    return new CompositeController(list);
  }

  function keyName(code) {
    if (!code) return '—';
    const map = {
      ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'SPACE', Comma: ',', Period: '.', Slash: '/',
      Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=',
      ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT',
      Enter: 'ENTER', Backspace: 'BKSP', Tab: 'TAB', Backquote: '`',
    };
    if (map[code]) return map[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
    return code.toUpperCase();
  }

  NS.Input = { ACTIONS, Keyboard, Touch, KeyboardController, GamepadController, TouchController, CompositeController, NullController, createHuman, emptyFrame, keyName };
})();
