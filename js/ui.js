/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — ui.js
   UI MANAGER: điều hướng màn hình + chuyển cảnh, menu chính điện ảnh,
   chọn chế độ, chọn nhân vật (2P), chọn đấu trường, màn VS, kết quả,
   hội thoại, kết thúc Story, hồ sơ nhân vật, bộ sưu tập, hồ sơ người chơi,
   cài đặt (âm thanh/đồ họa/phím), tạm dừng, điều khiển cảm ứng.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const U = NS.U;
  const $ = (s, r) => U.$(s, r), $$ = (s, r) => U.$$(s, r);
  const S = () => NS.Storage;

  /* ======================= ICONS (SVG inline) ======================= */
  const ICON = {
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    vs: '<svg viewBox="0 0 24 24"><path d="M3 5l4 14L11 5M14 17c1 1.5 2.5 2 4 2 2 0 3-1 3-2.5S19.5 12 17.5 12 14 11 14 8.5 15 5 17 5c1.5 0 3 .5 4 2"/></svg>',
    chip: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/><rect x="9.5" y="9.5" width="5" height="5"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.1 14H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.7 3.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    map: '<svg viewBox="0 0 24 24"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
    trophy: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 2l3 7 7 .6-5.3 4.7 1.6 7.2L12 17.8 5.7 21.5l1.6-7.2L2 9.6 9 9z"/></svg>',
  };
  const DIFF_LABEL = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD', expert: 'EXPERT' };

  /* ======================= PREVIEW NHÂN VẬT ======================= */
  const DEMO_MOVES = ['lp', 'hp', 'lk', 'hk', 'clk', 'chp', 'chk', 's1', 's2', 's3', 'throw'];
  class Preview {
    constructor(canvas, o) { this.cv = canvas; this.ctx = canvas.getContext('2d'); this.set(o); }
    set(o) {
      this.o = Object.assign({ state: 'idle', scale: 1, facing: 1, anchor: 0.93, glow: true, alpha: 1 }, this.o || {}, o);
      if (!this.f || this.f.def.id !== this.o.char || this.f.costume !== this.o.costume) {
        this.f = NS.Anim.fakeFighter(this.o.char, this.o.costume || 0, 'idle');
        this.f.costume = this.o.costume || 0;
        this.moves = NS.Chars.buildMoves(this.o.char);
        this.f.renderPose = null;
      }
      this.demoIdx = 0;
      this.f.state = this.o.state === 'attack' ? 'attack' : this.o.state;
      this.f.stateTime = 0;
      this.jumpT = 0;
      if (this.o.state === 'attack' || this.o.state === 'skills') this.nextDemo();
    }
    nextDemo() {
      const list = this.o.state === 'skills' ? ['s1', 's2', 's3', 'ult'] : this.o.demoList || DEMO_MOVES;
      const id = list[this.demoIdx % list.length];
      this.demoIdx++;
      this.f.move = this.moves[id];
      this.f.moveFrame = 0;
      this.f.state = 'attack';
      this.pause = 18;
      this.curName = this.f.move ? this.f.move.name : '';
      if (this.o.onMove) this.o.onMove(this.curName);
    }
    draw() {
      const cv = this.cv;
      const r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const q = S().settings.quality;
      const dpr = Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : 1);
      const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const ctx = this.ctx, f = this.f, o = this.o;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      f.t++; f.stateTime++;
      let yOff = 0;
      switch (o.state) {
        case 'walk': f.state = 'walk'; f.walkPhase = (f.walkPhase || 0) + 0.16; f.walkDir = 1; break;
        case 'run': f.state = 'run'; f.walkPhase = (f.walkPhase || 0) + 0.3; break;
        case 'air': {
          this.jumpT = (this.jumpT + 1) % 70;
          const k = this.jumpT / 46;
          if (this.jumpT < 46) { f.state = 'air'; f.grounded = false; f.vy = k < 0.5 ? -5 : 5; yOff = -Math.sin(k * Math.PI) * 120; }
          else { f.state = 'land'; f.grounded = true; }
          break;
        }
        case 'attack': case 'skills':
          if (f.move) {
            if (this.pause > 0 && f.moveFrame === 0) { this.pause--; f.state = 'idle'; }
            else { f.state = 'attack'; f.moveFrame += 0.6; if (f.moveFrame >= f.move.total) { f.move = null; this.nextDemo(); } }
          }
          break;
        case 'hitstun': f.state = 'hitstun'; f.grounded = true; if (f.t % 60 === 0) f.hitLow = !f.hitLow; break;
        default: f.state = o.state;
      }
      ctx.save();
      ctx.globalAlpha = o.alpha;
      const sc = (H / 300) * o.scale * dpr / dpr;
      ctx.translate(0, yOff * sc);
      if (o.silhouette) {
        NS.Anim.updatePose(f);
        ctx.translate(W / 2, H * o.anchor); ctx.scale(sc, sc);
        f.x = 0; f.y = 0; f.facing = o.facing;
        NS.Anim.drawFighter(ctx, f, { flat: '#0b0b18' });
        ctx.restore();
        return;
      }
      NS.Anim.drawPreview(ctx, f, W / 2, H * o.anchor, sc, o.facing);
      ctx.restore();
    }
  }

  /* ======================= UI MANAGER ======================= */
  const UI = {
    screens: {},
    current: null,
    history: [],
    previews: new Set(),
    game: null,

    init() {
      this.root = $('#screens');
      this.trans = $('#transition');
      this.toasts = $('#toasts');
      this.modalEl = $('#modal');
      this.bg = new NS.MenuBackground($('#bg-canvas'));
      this.bg.start();
      this.applyBodyFlags();
      // âm thanh hover/click toàn cục
      document.addEventListener('mouseover', (e) => {
        const t = e.target.closest('.nav-item, button, .card');
        if (t && t !== this._lastHover && !t.disabled) { this._lastHover = t; NS.Audio.sfx('hover'); this.setFocus(t, true); }
      });
      document.addEventListener('click', (e) => {
        const t = e.target.closest('button, .nav-item');
        if (t && !t.classList.contains('nosfx')) NS.Audio.sfx('click');
      }, true);
      document.addEventListener('keydown', (e) => this.onKey(e));
      // preview loop
      const loop = () => {
        this.previews.forEach((p) => {
          if (!p.cv.isConnected) { this.previews.delete(p); return; }
          if (p.cv.offsetParent === null) return;
          p.draw();
        });
        this.arenaPreviewTick && this.arenaPreviewTick();
        this.pollPadMenu();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      Object.keys(SCREENS).forEach((k) => { this.screens[k] = SCREENS[k]; });
      NS.Storage.onChange(() => { if (this.current === 'menu') SCREENS.menu.refreshCard && SCREENS.menu.refreshCard(); });
      this.buildTouch();
    },
    applyBodyFlags() {
      const s = S().settings;
      document.body.classList.toggle('reduce-fx', !!s.reduceFx);
      document.body.classList.toggle('q-low', s.quality === 'low');
      const touch = s.touch === 'on' || (s.touch === 'auto' && U.isTouch());
      document.body.classList.toggle('touch', touch);
    },
    preview(canvas, o) { const p = new Preview(canvas, o); this.previews.add(p); return p; },

    /** Chuyển màn hình với hiệu ứng glitch-wipe */
    go(id, params = {}, opts = {}) {
      if (this._going) { this._queued = [id, params, opts]; return; }
      const from = this.current;
      const doSwap = () => {
        if (from && SCREENS[from] && SCREENS[from].leave) SCREENS[from].leave();
        $$('.screen', this.root).forEach((s) => s.classList.remove('active'));
        const el = $(`#screen-${id}`);
        if (!el) { console.error('Missing screen', id); return; }
        el.classList.add('active');
        if (!opts.back && from && from !== id && !NO_HISTORY.includes(from)) this.history.push(from);
        if (this.history.length > 20) this.history.shift();
        this.current = id;
        el.scrollTop = 0;
        SCREENS[id].enter(el, params);
        this._focusEl = null;
        setTimeout(() => { const first = $('.screen.active [data-autofocus]') || null; if (first && !U.isTouch()) this.setFocus(first, true); }, 30);
      };
      if (opts.instant || S().settings.reduceFx) { doSwap(); return; }
      this._going = true;
      NS.Audio.sfx('transition');
      this.trans.className = 'cover';
      setTimeout(() => {
        try { doSwap(); } catch (err) { console.error('[UI] screen error', id, err); }
        this.trans.className = 'reveal';
        setTimeout(() => {
          this.trans.className = '';
          this._going = false;
          if (this._queued) { const q = this._queued; this._queued = null; this.go(q[0], q[1], q[2]); }
        }, 380);
      }, 330);
    },
    back() {
      if (SCREENS[this.current] && SCREENS[this.current].onBack && SCREENS[this.current].onBack() === false) return;
      const prev = this.history.pop() || 'menu';
      NS.Audio.sfx('back');
      this.go(prev, {}, { back: true });
    },

    /* ---------- Thông báo nhỏ & hộp thoại ---------- */
    toast(title, text = '', kind = 'info') {
      const d = U.el('div', `toast toast-${kind}`, `<b>${U.esc(title)}</b>${text ? `<span>${U.esc(text)}</span>` : ''}`);
      this.toasts.appendChild(d);
      setTimeout(() => d.classList.add('out'), 3200);
      setTimeout(() => d.remove(), 3700);
    },
    confirm(text, onYes, onNo, yes = 'ĐỒNG Ý', no = 'HỦY') {
      this.modal(`<div class="modal-title">XÁC NHẬN</div><p>${U.esc(text)}</p>
        <div class="modal-actions"><button class="nbtn nav-item" data-r="no">${no}</button><button class="nbtn primary nav-item" data-r="yes" data-autofocus>${yes}</button></div>`,
      (r) => { if (r === 'yes') onYes && onYes(); else onNo && onNo(); });
    },
    modal(html, cb, cls = '') {
      const m = this.modalEl;
      m.innerHTML = `<div class="modal-box glass ${cls}">${html}</div>`;
      m.classList.add('show');
      const close = (r) => { m.classList.remove('show'); m.innerHTML = ''; this._modalClose = null; cb && cb(r); };
      this._modalClose = close;
      $$('[data-r]', m).forEach((b) => b.addEventListener('click', () => close(b.dataset.r)));
      m.onclick = (e) => { if (e.target === m) close('no'); };
      setTimeout(() => { const f = $('[data-autofocus]', m); if (f) this.setFocus(f, true); }, 20);
      return close;
    },
    notifyRewards(list) {
      (list || []).forEach((it, i) => setTimeout(() => {
        NS.Audio.sfx('unlock');
        this.toast('MỞ KHÓA MỚI', it.name || (it.type === 'costume' ? `Trang phục ${NS.Chars.get(it.ref).palettes[it.idx].name}` : it.ref), 'unlock');
      }, i * 500));
    },

    /* ---------- Điều hướng bàn phím / gamepad trong menu ---------- */
    setFocus(el, silent) {
      if (this._focusEl === el) return;
      if (this._focusEl) this._focusEl.classList.remove('focus');
      this._focusEl = el;
      if (el) { el.classList.add('focus'); if (!silent) NS.Audio.sfx('hover'); }
    },
    navItems() {
      const scope = this.modalEl.classList.contains('show') ? this.modalEl : $('.screen.active .overlay.show') || $('.screen.active');
      return $$('.nav-item', scope).filter((e) => e.offsetParent !== null && !e.disabled);
    },
    moveFocus(dx, dy) {
      const items = this.navItems();
      if (!items.length) return;
      const cur = this._focusEl && items.includes(this._focusEl) ? this._focusEl : null;
      if (!cur) { this.setFocus(items[0]); return; }
      const a = cur.getBoundingClientRect();
      const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
      let best = null, bestS = Infinity;
      items.forEach((e) => {
        if (e === cur) return;
        const b = e.getBoundingClientRect();
        const bx = b.left + b.width / 2, by = b.top + b.height / 2;
        const vx = bx - ax, vy = by - ay;
        const along = vx * dx + vy * dy;
        if (along <= 4) return;
        const perp = Math.abs(vx * dy - vy * dx);
        const s = along + perp * 2.2;
        if (s < bestS) { bestS = s; best = e; }
      });
      if (best) { this.setFocus(best); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    },
    onKey(e) {
      if (e.repeat && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) return;
      if (this._capture) { this._capture(e); return; }
      NS.Audio.init();
      const scr = SCREENS[this.current];
      if (scr && scr.onKey && scr.onKey(e) === true) return;
      if (document.activeElement && document.activeElement.tagName === 'INPUT') { if (e.code === 'Escape' || e.code === 'Enter') document.activeElement.blur(); return; }
      const map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (map[e.code]) { e.preventDefault(); this.moveFocus(...map[e.code]); return; }
      if (e.code === 'Enter' || e.code === 'Space') {
        if (this._focusEl && this._focusEl.offsetParent !== null) { e.preventDefault(); this._focusEl.click(); }
        return;
      }
      if (e.code === 'Escape' || e.code === 'Backspace') {
        e.preventDefault();
        if (this.modalEl.classList.contains('show')) { this._modalClose && this._modalClose('no'); return; }
        if (scr && scr.noBack) return;
        this.back();
      }
    },
    pollPadMenu() {
      if (this.current === 'hud' && this.game && !this.game.paused) {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of pads) if (gp && gp.buttons[9] && gp.buttons[9].pressed) { if (!this._padStart) { this._padStart = true; SCREENS.hud.togglePause(true); } return; }
        this._padStart = false;
        return;
      }
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = Array.from(pads).find((p) => p);
      if (!gp) return;
      const st = { up: gp.buttons[12]?.pressed || gp.axes[1] < -0.6, down: gp.buttons[13]?.pressed || gp.axes[1] > 0.6, left: gp.buttons[14]?.pressed || gp.axes[0] < -0.6, right: gp.buttons[15]?.pressed || gp.axes[0] > 0.6, a: gp.buttons[0]?.pressed, b: gp.buttons[1]?.pressed, start: gp.buttons[9]?.pressed };
      const prev = this._pad || {};
      const fire = (k, code) => { if (st[k] && !prev[k]) this.onKey({ code, repeat: false, preventDefault() {} }); };
      fire('up', 'ArrowUp'); fire('down', 'ArrowDown'); fire('left', 'ArrowLeft'); fire('right', 'ArrowRight');
      fire('a', 'Enter'); fire('b', 'Escape'); fire('start', 'Enter');
      this._pad = st;
    },

    /* ---------- Bắt đầu trận đấu ---------- */
    startGame(cfg) {
      this.go('hud', { cfg });
    },

    /* ---------- Điều khiển cảm ứng ---------- */
    buildTouch() {
      const el = $('#touch');
      el.innerHTML = `
        <div class="tc-pad">
          <button data-a="up" class="tc-d up">▲</button><button data-a="left" class="tc-d left">◀</button>
          <button data-a="right" class="tc-d right">▶</button><button data-a="down" class="tc-d down">▼</button>
        </div>
        <div class="tc-btns">
          <button data-a="lp" class="tc-b">LP</button><button data-a="hp" class="tc-b">HP</button>
          <button data-a="lk" class="tc-b">LK</button><button data-a="hk" class="tc-b">HK</button>
          <button data-a="block" class="tc-b alt">BLK</button><button data-a="dodge" class="tc-b alt">DGE</button>
          <button data-a="s1" class="tc-b sk">S1</button><button data-a="s2" class="tc-b sk">S2</button>
          <button data-a="s3" class="tc-b sk">S3</button><button data-a="ult" class="tc-b ult">ULT</button>
        </div>`;
      $$('button', el).forEach((b) => {
        const a = b.dataset.a;
        const on = (e) => { e.preventDefault(); NS.Input.Touch.set(a, true); b.classList.add('on'); };
        const off = (e) => { e.preventDefault(); NS.Input.Touch.set(a, false); b.classList.remove('on'); };
        b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
      });
    },
  };
  const SCREENS = {};
  const NO_HISTORY = ['boot', 'intro', 'vs', 'hud', 'results', 'dialogue', 'ending'];

  /* ======================= HELPERS ======================= */
  function statBars(def) {
    const L = { power: 'SỨC MẠNH', speed: 'TỐC ĐỘ', defense: 'PHÒNG THỦ', energy: 'NĂNG LƯỢNG' };
    return Object.keys(L).map((k) => `<div class="stat"><span>${L[k]}</span><div class="stat-bar"><i style="--v:${def.stats[k] / 10}"></i></div><b>${def.stats[k]}</b></div>`).join('');
  }
  function skillList(def, keys) {
    const K = keys || {};
    return ['s1', 's2', 's3', 'ult'].map((s) => `<div class="skill ${s === 'ult' ? 'ult' : ''}"><div class="sk-ico">${{ s1: 'I', s2: 'II', s3: 'III', ult: '✸' }[s]}</div><div><b>${U.esc(def.skills[s].name)}${K[s] ? ` <kbd>${K[s]}</kbd>` : ''}</b><p>${U.esc(def.skills[s].desc)}</p></div></div>`).join('');
  }
  function keysFor(slot) {
    const b = S().settings.bindings[slot];
    const o = {};
    Object.keys(b).forEach((a) => (o[a] = NS.Input.keyName(b[a][0])));
    return o;
  }
  function charLockText(c) {
    const it = S().CATALOG.find((x) => x.type === 'char' && x.ref === c);
    return it ? it.desc : '';
  }
  function playerCard(compact) {
    const p = S().profile;
    const fav = Object.keys(p.charUsage).sort((a, b) => p.charUsage[b] - p.charUsage[a])[0] || 'raven';
    const wr = p.matches ? Math.round((p.wins / p.matches) * 100) : 0;
    const need = S().expToNext(p.level);
    return `<div class="pc-avatar"><img src="${NS.Anim.portrait(fav, S().costumeFor(fav), 128, 128)}" alt=""><span class="pc-lv">${p.level}</span></div>
      <div class="pc-body">
        <div class="pc-name">${U.esc(p.name)}<small>${U.esc(S().data.equipped.title)}</small></div>
        <div class="pc-exp"><div class="pc-exp-bar"><i style="--v:${p.exp / need}"></i></div><span>LV ${p.level} • ${p.exp}/${need} EXP</span></div>
        ${compact ? '' : `<div class="pc-stats"><div><b>${p.wins}</b><span>THẮNG</span></div><div><b>${wr}%</b><span>TỶ LỆ</span></div><div><b>${p.streak}</b><span>CHUỖI</span></div><div><b>${U.fmtNum(p.credits)}</b><span>CREDITS</span></div></div>`}
      </div>`;
  }
  function header(title, sub, extra = '') {
    return `<header class="scr-head"><button class="btn-back nav-item" data-act="back">${ICON.back}<span>BACK</span></button>
      <div class="scr-title"><small>${U.esc(sub || '')}</small><h2 data-text="${U.esc(title)}">${U.esc(title)}</h2></div>${extra}</header>`;
  }
  function bindBack(el) { $$('[data-act="back"]', el).forEach((b) => b.addEventListener('click', () => UI.back())); }
  function arenaUnlocked(id) { return id !== 'sanctum' || S().data.records.storyClears > 0; }

  UI.Preview = Preview;
  UI.SCREENS = SCREENS;
  NS.UI = UI;
  NS.UIH = { ICON, DIFF_LABEL, statBars, skillList, keysFor, charLockText, playerCard, header, bindBack, arenaUnlocked, NO_HISTORY };
})();
