/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — storage.js
   SAVE SYSTEM: hồ sơ người chơi, cài đặt, mở khóa, nhiệm vụ, kỷ lục.
   Toàn bộ dữ liệu lưu trong LocalStorage (key: neonstrike.save.v1).
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const KEY = 'neonstrike.save.v1';
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------------- Phím điều khiển mặc định (event.code) ---------------- */
  const DEFAULT_BINDINGS = {
    p1: {
      up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
      lp: ['KeyF'], hp: ['KeyG'], lk: ['KeyV'], hk: ['KeyB'],
      block: ['KeyH'], dodge: ['KeyQ'], s1: ['KeyR'], s2: ['KeyT'], s3: ['KeyC'], ult: ['KeyE'],
    },
    p2: {
      up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
      lp: ['KeyK', 'Numpad4'], hp: ['KeyL', 'Numpad5'], lk: ['Comma', 'Numpad1'], hk: ['Period', 'Numpad2'],
      block: ['Semicolon', 'Numpad6'], dodge: ['Slash', 'Numpad0'],
      s1: ['KeyI', 'Numpad7'], s2: ['KeyO', 'Numpad8'], s3: ['KeyP', 'Numpad3'], ult: ['KeyU', 'Numpad9'],
    },
  };
  const ACTIONS = ['up', 'down', 'left', 'right', 'lp', 'hp', 'lk', 'hk', 'block', 'dodge', 's1', 's2', 's3', 'ult'];
  const ACTION_LABELS = {
    up: 'Nhảy', down: 'Cúi người', left: 'Sang trái', right: 'Sang phải',
    lp: 'Đấm nhanh', hp: 'Đấm mạnh', lk: 'Đá nhanh', hk: 'Đá mạnh',
    block: 'Đỡ đòn', dodge: 'Né tránh', s1: 'Kỹ năng 1', s2: 'Kỹ năng 2', s3: 'Kỹ năng 3 (di chuyển/phòng thủ)', ult: 'Ultimate',
  };

  /* ---------------- Danh mục vật phẩm mở khóa ---------------- */
  const CHAR_ORDER = ['raven', 'volt', 'titan', 'frost', 'pyra', 'zero', 'axiom'];
  const CATALOG = [
    { id: 'char_pyra', type: 'char', ref: 'pyra', name: 'PYRA — The Inferno', cost: 600, req: { level: 3 }, desc: 'Đạt Level 3 hoặc mua bằng Credits.' },
    { id: 'char_zero', type: 'char', ref: 'zero', name: 'ZERO — The Unknown', cost: 1000, req: { any: [{ level: 5 }, { storyClear: 1 }] }, desc: 'Đạt Level 5, hoàn thành Story Mode, hoặc mua bằng Credits.' },
    { id: 'char_axiom', type: 'char', ref: 'axiom', name: 'AXIOM — The Core Warden', cost: 0, req: { storyClear: 1 }, desc: 'Đánh bại AXIOM ở trận cuối Story Mode.' },

    { id: 'fx_neon', type: 'fx', ref: 'neon', name: 'NEON BURST', cost: 0, req: null, desc: 'Vụ nổ ánh sáng neon kinh điển.' },
    { id: 'fx_glitch', type: 'fx', ref: 'glitch', name: 'GLITCH STORM', cost: 500, req: { level: 4 }, desc: 'Màn hình vỡ vụn thành dữ liệu.' },
    { id: 'fx_storm', type: 'fx', ref: 'storm', name: 'THUNDER CROWN', cost: 700, req: { level: 7 }, desc: 'Vương miện sấm sét giáng xuống người thắng.' },
    { id: 'fx_phoenix', type: 'fx', ref: 'phoenix', name: 'PHOENIX RISE', cost: 900, req: { level: 10 }, desc: 'Đôi cánh lửa bùng lên sau lưng.' },
    { id: 'fx_void', type: 'fx', ref: 'void', name: 'VOID COLLAPSE', cost: 0, req: { stat: 'perfects', min: 1 }, desc: 'Thắng một hiệp PERFECT để mở khóa.' },

    { id: 'bg_grid', type: 'bg', ref: 'grid', name: 'NEON GRID', cost: 0, req: null, desc: 'Lưới năng lượng mặc định.' },
    { id: 'bg_city', type: 'bg', ref: 'city', name: 'NEO-VEYRA NIGHT', cost: 300, req: { level: 2 }, desc: 'Đường chân trời Neo-Veyra lúc nửa đêm.' },
    { id: 'bg_rain', type: 'bg', ref: 'rain', name: 'MAGENTA RAIN', cost: 400, req: { level: 6 }, desc: 'Mưa neon hồng tím.' },
    { id: 'bg_reactor', type: 'bg', ref: 'reactor', name: 'REACTOR PULSE', cost: 500, req: { level: 8 }, desc: 'Nhịp đập của lò phản ứng.' },
    { id: 'bg_aurora', type: 'bg', ref: 'aurora', name: 'CRYO AURORA', cost: 600, req: { level: 9 }, desc: 'Cực quang trên Frozen Core.' },
    { id: 'bg_core', type: 'bg', ref: 'core', name: 'CORE-9 HALO', cost: 0, req: { storyClear: 1 }, desc: 'Hoàn thành Story Mode.' },

    { id: 'title_rookie', type: 'title', ref: 'ROOKIE', name: 'ROOKIE', cost: 0, req: null, desc: 'Danh hiệu khởi đầu.' },
    { id: 'title_brawler', type: 'title', ref: 'STREET BRAWLER', name: 'STREET BRAWLER', cost: 0, req: { stat: 'wins', min: 10 }, desc: 'Thắng 10 trận.' },
    { id: 'title_combo', type: 'title', ref: 'COMBO ARTIST', name: 'COMBO ARTIST', cost: 0, req: { stat: 'maxCombo', min: 10 }, desc: 'Đạt combo 10 hit.' },
    { id: 'title_perfect', type: 'title', ref: 'UNBREAKABLE', name: 'UNBREAKABLE', cost: 0, req: { stat: 'perfects', min: 1 }, desc: 'Thắng một hiệp PERFECT.' },
    { id: 'title_parry', type: 'title', ref: 'PARRY MASTER', name: 'PARRY MASTER', cost: 0, req: { stat: 'parries', min: 25 }, desc: 'Thực hiện 25 Perfect Block.' },
    { id: 'title_machine', type: 'title', ref: 'MACHINE BREAKER', name: 'MACHINE BREAKER', cost: 0, req: { stat: 'expertWins', min: 1 }, desc: 'Đánh bại AI cấp Expert.' },
    { id: 'title_survivor', type: 'title', ref: 'SURVIVOR', name: 'SURVIVOR', cost: 0, req: { record: 'survivalBest', min: 10 }, desc: 'Hạ 10 đối thủ trong một lượt Survival.' },
    { id: 'title_speed', type: 'title', ref: 'SPEEDRUNNER', name: 'SPEEDRUNNER', cost: 0, req: { record: 'taBest', max: 240 }, desc: 'Hoàn thành Time Attack dưới 4 phút.' },
    { id: 'title_veteran', type: 'title', ref: 'VETERAN', name: 'VETERAN', cost: 0, req: { level: 10 }, desc: 'Đạt Level 10.' },
    { id: 'title_light', type: 'title', ref: 'THE LAST LIGHT', name: 'THE LAST LIGHT', cost: 0, req: { storyClear: 1 }, desc: 'Hoàn thành Story Mode.' },
    { id: 'title_legend', type: 'title', ref: 'LEGEND OF NEO-VEYRA', name: 'LEGEND OF NEO-VEYRA', cost: 0, req: { storyChars: 3 }, desc: 'Hoàn thành Story với 3 nhân vật khác nhau.' },
  ];
  // Trang phục: mỗi nhân vật có 3 bộ (0 mặc định, 1 mua/level, 2 hoàn thành Story)
  CHAR_ORDER.forEach((c, i) => {
    CATALOG.push({ id: `cos_${c}_1`, type: 'costume', ref: c, idx: 1, cost: 350, req: { level: 2 + (i % 4) }, desc: `Đạt Level ${2 + (i % 4)} hoặc mua bằng Credits.` });
    CATALOG.push({ id: `cos_${c}_2`, type: 'costume', ref: c, idx: 2, cost: 0, req: c === 'axiom' ? { level: 12 } : { storyChar: c }, desc: c === 'axiom' ? 'Đạt Level 12.' : `Hoàn thành Story Mode với ${c.toUpperCase()}.` });
  });

  /* ---------------- Nhiệm vụ (Contracts) theo bậc ---------------- */
  const QUESTS = [
    { id: 'win', event: 'win', icon: '◆', name: 'CHIẾN THẮNG', tiers: [3, 6, 10, 15, 25], text: (n) => `Thắng ${n} trận` },
    { id: 'combo', event: 'combo', icon: '✦', name: 'COMBO MASTER', tiers: [10, 25, 50, 100], text: (n) => `Thực hiện ${n} combo (từ 3 hit)` },
    { id: 'ult', event: 'ult', icon: '✸', name: 'ULTIMATE', tiers: [5, 12, 25, 50], text: (n) => `Sử dụng Ultimate ${n} lần` },
    { id: 'hard', event: 'hardWin', icon: '▲', name: 'THỬ THÁCH', tiers: [1, 3, 6, 10], text: (n) => `Đánh bại ${n} đối thủ AI cấp Hard trở lên` },
    { id: 'parry', event: 'parry', icon: '⬡', name: 'PERFECT GUARD', tiers: [5, 15, 30, 60], text: (n) => `Thực hiện ${n} Perfect Block` },
    { id: 'counter', event: 'counter', icon: '⟲', name: 'PHẢN CÔNG', tiers: [10, 25, 50], text: (n) => `Thực hiện ${n} đòn COUNTER` },
    { id: 'survival', event: 'survivalKO', icon: '☗', name: 'SINH TỒN', tiers: [5, 12, 20, 35], text: (n) => `Hạ ${n} đối thủ trong Survival` },
    { id: 'story', event: 'storyClear', icon: '✧', name: 'HÀNH TRÌNH', tiers: [1, 3, 6], text: (n) => `Hoàn thành Story Mode ${n} lần` },
  ];
  function questTarget(q, tier) {
    if (tier < q.tiers.length) return q.tiers[tier];
    const last = q.tiers[q.tiers.length - 1];
    return Math.round(last * Math.pow(1.5, tier - q.tiers.length + 1));
  }
  function questReward(tier) {
    return { exp: 150 + tier * 60, credits: 120 + tier * 60 };
  }

  /* ---------------- Dữ liệu mặc định ---------------- */
  function defaults() {
    return {
      version: 1,
      profile: {
        name: 'PLAYER', level: 1, exp: 0, credits: 300,
        matches: 0, wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0,
        charUsage: {}, totalDamage: 0, maxCombo: 0, totalCombos: 0, ultsUsed: 0, parries: 0,
        perfects: 0, counters: 0, hardWins: 0, expertWins: 0, playTime: 0,
        created: Date.now(), introSeen: false, tutorialSeen: false,
      },
      unlocks: { chars: ['raven', 'volt', 'titan', 'frost'], items: ['fx_neon', 'bg_grid', 'title_rookie'] },
      equipped: { costume: {}, fx: 'neon', bg: 'grid', title: 'ROOKIE' },
      quests: {},
      records: { survival: [], timeAttack: [], story: {}, storyClears: 0 },
      settings: {
        master: 0.8, music: 0.55, sfx: 0.85, muted: false, announcer: true,
        quality: 'high', shake: true, reduceFx: false, showHitbox: false, showDamage: true,
        roundTime: 99, rounds: 3, touch: 'auto', bindings: clone(DEFAULT_BINDINGS),
      },
    };
  }

  function deepMerge(base, over) {
    if (Array.isArray(base)) return Array.isArray(over) ? over : base;
    if (typeof base !== 'object' || base === null) return over === undefined ? base : over;
    const out = {};
    const keys = new Set([...Object.keys(base), ...Object.keys(over || {})]);
    keys.forEach((k) => {
      if (over && k in over) {
        if (typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k])) out[k] = deepMerge(base[k], over[k]);
        else out[k] = over[k];
      } else out[k] = clone(base[k] === undefined ? null : base[k]);
    });
    return out;
  }

  /* ======================================================================= */
  const Storage = {
    data: null,
    DEFAULT_BINDINGS, ACTIONS, ACTION_LABELS, CATALOG, QUESTS, CHAR_ORDER,
    listeners: [],

    load() {
      let raw = null;
      try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = null; }
      this.data = raw ? deepMerge(defaults(), raw) : defaults();
      // đảm bảo bindings đủ hành động
      ['p1', 'p2'].forEach((p) => {
        ACTIONS.forEach((a) => {
          const b = this.data.settings.bindings[p];
          if (!b[a] || !b[a].length) b[a] = clone(DEFAULT_BINDINGS[p][a]);
        });
      });
      QUESTS.forEach((q) => { if (!this.data.quests[q.id]) this.data.quests[q.id] = { tier: 0, progress: 0 }; });
      this.checkUnlocks();
      this.save();
      return this.data;
    },
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { console.warn('Save failed', e); }
      this.listeners.forEach((fn) => fn(this.data));
    },
    onChange(fn) { this.listeners.push(fn); },
    resetAll() {
      localStorage.removeItem(KEY);
      this.load();
    },
    get profile() { return this.data.profile; },
    get settings() { return this.data.settings; },

    /* ---------- Level / EXP ---------- */
    expToNext(level) { return 200 + (level - 1) * 130; },
    addExp(n) {
      const p = this.data.profile;
      const ups = [];
      p.exp += Math.round(n);
      while (p.level < 60 && p.exp >= this.expToNext(p.level)) {
        p.exp -= this.expToNext(p.level);
        p.level++;
        p.credits += 100;
        ups.push(p.level);
      }
      return ups;
    },
    addCredits(n) { this.data.profile.credits = Math.max(0, this.data.profile.credits + Math.round(n)); },

    /* ---------- Mở khóa ---------- */
    meets(req) {
      if (!req) return true;
      const p = this.data.profile, r = this.data.records;
      if (req.any) return req.any.some((x) => this.meets(x));
      if (req.level !== undefined) return p.level >= req.level;
      if (req.storyClear !== undefined) return r.storyClears >= req.storyClear;
      if (req.storyChar) return !!(r.story[req.storyChar] && r.story[req.storyChar].cleared);
      if (req.storyChars) return Object.values(r.story).filter((s) => s.cleared).length >= req.storyChars;
      if (req.stat) return (p[req.stat] || 0) >= req.min;
      if (req.record === 'survivalBest') return this.survivalBest() >= req.min;
      if (req.record === 'taBest') { const b = this.taBest(); return b > 0 && b <= req.max; }
      return false;
    },
    item(id) { return CATALOG.find((c) => c.id === id); },
    isOwned(id) {
      const it = this.item(id);
      if (!it) return false;
      if (it.type === 'char') return this.data.unlocks.chars.includes(it.ref);
      return this.data.unlocks.items.includes(id);
    },
    isCharUnlocked(c) { return this.data.unlocks.chars.includes(c); },
    isCostumeUnlocked(c, idx) { return idx === 0 || this.data.unlocks.items.includes(`cos_${c}_${idx}`); },
    grant(id) {
      const it = this.item(id);
      if (!it || this.isOwned(id)) return false;
      if (it.type === 'char') this.data.unlocks.chars.push(it.ref);
      else this.data.unlocks.items.push(id);
      return true;
    },
    /** Tự động mở khóa các vật phẩm đã đủ điều kiện. Trả về danh sách mới mở */
    checkUnlocks() {
      const fresh = [];
      CATALOG.forEach((it) => {
        if (!this.isOwned(it.id) && it.req !== undefined && this.meets(it.req)) {
          if (this.grant(it.id)) fresh.push(it);
        }
      });
      return fresh;
    },
    buy(id) {
      const it = this.item(id);
      if (!it || this.isOwned(id) || !it.cost) return { ok: false, msg: 'Không thể mua vật phẩm này.' };
      if (this.data.profile.credits < it.cost) return { ok: false, msg: 'Không đủ Credits.' };
      this.data.profile.credits -= it.cost;
      this.grant(id);
      this.save();
      return { ok: true };
    },
    equip(type, ref, charId) {
      const e = this.data.equipped;
      if (type === 'costume') e.costume[charId] = ref;
      else if (type === 'fx') e.fx = ref;
      else if (type === 'bg') e.bg = ref;
      else if (type === 'title') e.title = ref;
      this.save();
    },
    costumeFor(c) { return this.data.equipped.costume[c] || 0; },

    /* ---------- Nhiệm vụ ---------- */
    questList() {
      return QUESTS.map((q) => {
        const st = this.data.quests[q.id];
        const target = questTarget(q, st.tier);
        return { ...q, tier: st.tier, progress: Math.min(st.progress, target), target, done: st.progress >= target, reward: questReward(st.tier), desc: q.text(target) };
      });
    },
    questEvent(event, amount = 1) {
      const done = [];
      QUESTS.forEach((q) => {
        if (q.event !== event) return;
        const st = this.data.quests[q.id];
        const target = questTarget(q, st.tier);
        const before = st.progress;
        st.progress += amount;
        if (before < target && st.progress >= target) done.push(q.name);
      });
      return done;
    },
    claimQuest(id) {
      const q = QUESTS.find((x) => x.id === id);
      const st = this.data.quests[id];
      if (!q || !st) return null;
      const target = questTarget(q, st.tier);
      if (st.progress < target) return null;
      const reward = questReward(st.tier);
      const ups = this.addExp(reward.exp);
      this.addCredits(reward.credits);
      st.tier++;
      st.progress = 0;
      const unlocked = this.checkUnlocks();
      this.save();
      return { reward, ups, unlocked };
    },

    /* ---------- Sự kiện hằng ngày (xoay vòng theo ngày) ---------- */
    dailyEvent() {
      const pool = ['raven', 'volt', 'titan', 'frost', 'pyra', 'zero'];
      const d = NS.U.dayIndex();
      const c = pool[d % pool.length];
      return { char: c, bonus: 1.5, title: `FOCUS WEEK: ${c.toUpperCase()}`, text: `Nhận +50% EXP khi chiến đấu bằng ${c.toUpperCase()} hôm nay.` };
    },

    /* ---------- Kỷ lục ---------- */
    survivalBest() { return this.data.records.survival.reduce((m, r) => Math.max(m, r.defeated), 0); },
    taBest() {
      const t = this.data.records.timeAttack;
      return t.length ? Math.min(...t.map((r) => r.time)) : 0;
    },
    addSurvival(entry) {
      const list = this.data.records.survival;
      list.push(entry);
      list.sort((a, b) => b.score - a.score);
      this.data.records.survival = list.slice(0, 10);
      const rank = this.data.records.survival.indexOf(entry);
      this.save();
      return rank;
    },
    addTimeAttack(entry) {
      const list = this.data.records.timeAttack;
      list.push(entry);
      list.sort((a, b) => a.time - b.time);
      this.data.records.timeAttack = list.slice(0, 10);
      const rank = this.data.records.timeAttack.indexOf(entry);
      this.save();
      return rank;
    },
    storyCleared(charId, difficulty) {
      const r = this.data.records;
      const prev = r.story[charId] || { cleared: false, clears: 0 };
      prev.cleared = true;
      prev.clears = (prev.clears || 0) + 1;
      prev.best = difficulty;
      r.story[charId] = prev;
      r.storyClears++;
      const q = this.questEvent('storyClear', 1);
      const unlocked = this.checkUnlocks();
      this.save();
      return { quests: q, unlocked };
    },

    /**
     * Ghi nhận kết quả một trận đấu và tính phần thưởng.
     * s = { mode, won, draw, charId, aiLevel, vsHuman, stats:{damage,maxCombo,combos3,counters,parries,ults,perfects}, duration }
     */
    recordMatch(s) {
      const p = this.data.profile;
      const st = s.stats;
      p.matches++;
      p.charUsage[s.charId] = (p.charUsage[s.charId] || 0) + 1;
      p.totalDamage += st.damage;
      p.maxCombo = Math.max(p.maxCombo, st.maxCombo);
      p.totalCombos += st.combos3;
      p.ultsUsed += st.ults;
      p.parries += st.parries;
      p.counters += st.counters;
      p.perfects += st.perfects;
      p.playTime += s.duration;
      if (s.draw) { p.draws++; }
      else if (s.won) {
        p.wins++; p.streak++; p.bestStreak = Math.max(p.bestStreak, p.streak);
        if (s.aiLevel === 'hard' || s.aiLevel === 'expert') p.hardWins++;
        if (s.aiLevel === 'expert') p.expertWins++;
      } else { p.losses++; p.streak = 0; }

      // EXP
      const diffMul = { easy: 0.8, normal: 1, hard: 1.3, expert: 1.6 }[s.aiLevel] || 1.1;
      let exp = s.draw ? 70 : s.won ? 120 : 45;
      exp *= diffMul;
      exp += st.maxCombo * 3 + st.perfects * 50 + st.counters * 4 + st.parries * 5;
      if (s.mode === 'story') exp *= 1.2;
      const ev = this.dailyEvent();
      const eventBonus = ev.char === s.charId;
      if (eventBonus) exp *= ev.bonus;
      if (s.mode === 'training') exp = 0;
      exp = Math.round(exp);
      const credits = Math.round(exp * 0.6);
      const levelBefore = p.level;
      const ups = this.addExp(exp);
      this.addCredits(credits);

      // Nhiệm vụ
      let quests = [];
      if (s.mode !== 'training') {
        if (s.won) quests = quests.concat(this.questEvent('win'));
        if (st.combos3) quests = quests.concat(this.questEvent('combo', st.combos3));
        if (st.ults) quests = quests.concat(this.questEvent('ult', st.ults));
        if (st.parries) quests = quests.concat(this.questEvent('parry', st.parries));
        if (st.counters) quests = quests.concat(this.questEvent('counter', st.counters));
        if (s.won && (s.aiLevel === 'hard' || s.aiLevel === 'expert')) quests = quests.concat(this.questEvent('hardWin'));
      }
      const unlocked = this.checkUnlocks();
      this.save();
      return { exp, credits, levelBefore, levelAfter: p.level, ups, quests, unlocked, eventBonus };
    },
  };

  NS.Storage = Storage;
})();
