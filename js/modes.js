/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — modes.js
   Điều phối các chế độ chơi: Quick Match, Versus, AI Challenge, Story,
   Survival, Time Attack, Training. Quản lý "session" giữa các trận.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const U = NS.U;

  const MODES = {
    quick: { id: 'quick', name: 'QUICK MATCH', icon: 'bolt', desc: 'Chọn nhân vật, đối thủ (CPU hoặc người chơi 2), đấu trường — vào trận ngay.', tags: ['1P / 2P', 'BO3'] },
    versus: { id: 'versus', name: 'VERSUS', icon: 'vs', desc: 'Hai người chơi trên cùng một máy với hai bộ phím riêng. Tùy chỉnh thời gian & số hiệp.', tags: ['2P LOCAL', 'TÙY CHỈNH'] },
    ai: { id: 'ai', name: 'AI CHALLENGE', icon: 'chip', desc: 'Đối đầu AI với 4 cấp độ: Easy, Normal, Hard, Expert — mỗi cấp một chiến thuật riêng.', tags: ['1P', '4 CẤP ĐỘ'] },
    story: { id: 'story', name: 'STORY MODE', icon: 'book', desc: 'Hành trình tới lõi CORE-9. Hội thoại trước/sau trận, trùm cuối AXIOM, kết thúc riêng cho từng nhân vật.', tags: ['1P', '6 TRẬN', 'ENDING'] },
    survival: { id: 'survival', name: 'SURVIVAL', icon: 'shield', desc: 'Đánh bại càng nhiều đối thủ càng tốt. Máu không hồi đầy, đối thủ mạnh dần. Có bảng xếp hạng.', tags: ['1P', 'BẢNG XẾP HẠNG'] },
    timeattack: { id: 'timeattack', name: 'TIME ATTACK', icon: 'clock', desc: 'Hạ gục 5 đối thủ trong thời gian ngắn nhất. Thành tích cá nhân được ghi lại.', tags: ['1P', '5 TRẬN', 'KỶ LỤC'] },
    training: { id: 'training', name: 'TRAINING', icon: 'target', desc: 'Phòng tập: hình nộm tùy chỉnh, hiển thị hitbox & frame data, năng lượng vô hạn.', tags: ['LUYỆN TẬP', 'FRAME DATA'] },
  };

  const Modes = {
    MODES,
    session: null,

    /** Bắt đầu một chế độ → màn chọn nhân vật */
    begin(mode, opts = {}) {
      const S = NS.Storage.settings;
      this.session = Object.assign({
        mode, aiLevel: opts.aiLevel || 'normal',
        rounds: mode === 'survival' || mode === 'timeattack' ? 1 : opts.rounds || S.rounds,
        time: mode === 'timeattack' ? 60 : opts.time !== undefined ? opts.time : S.roundTime,
        arena: opts.arena || null,
        vsHuman: mode === 'versus' || !!opts.vsHuman,
      }, opts);
      NS.UI.go('select', { mode, session: this.session });
    },

    /** Sau khi chọn nhân vật */
    afterSelect(picks) {
      const s = this.session;
      s.p1 = picks.p1; s.p2 = picks.p2;
      if (picks.aiLevel) s.aiLevel = picks.aiLevel;
      if (picks.vsHuman !== undefined) s.vsHuman = picks.vsHuman;
      switch (s.mode) {
        case 'story': return this.storyStart();
        case 'survival': return this.survivalStart();
        case 'timeattack': return this.taStart();
        default:
          if (s.arena) return this.launch(this.matchCfg(s.arena));
          NS.UI.go('arena', { mode: 'pick', session: s });
      }
    },
    afterArena(arenaId) {
      const s = this.session;
      s.arenaPick = arenaId;
      this.launch(this.matchCfg(arenaId));
    },
    matchCfg(arena) {
      const s = this.session;
      return {
        mode: s.mode, arena, rounds: s.rounds, time: s.mode === 'training' ? Infinity : s.time,
        p1: { char: s.p1.char, costume: s.p1.costume, human: true, name: s.p1.char === 'axiom' ? 'AXIOM' : undefined },
        p2: { char: s.p2.char, costume: s.p2.costume, human: s.vsHuman && s.mode !== 'training', ai: s.vsHuman ? null : s.aiLevel },
        training: s.mode === 'training' ? { dummy: 'stand', hitbox: true, refill: true } : null,
      };
    },
    launch(cfg) {
      this.current = cfg;
      if (cfg.mode === 'training') return NS.UI.startGame(cfg);
      NS.UI.go('vs', { cfg, onDone: () => NS.UI.startGame(cfg) });
    },
    rematch() { if (this.current) { this.current.p1.hp = undefined; NS.UI.startGame(this.current); } },

    /* ------------------- Kết thúc trận ------------------- */
    onMatchEnd(result) {
      const s = this.session, cfg = this.current;
      const won = result.winnerSide === 0, draw = result.winnerSide === -1;
      let rewards = null;
      if (cfg.mode !== 'training') {
        rewards = NS.Storage.recordMatch({
          mode: cfg.mode, won, draw, charId: cfg.p1.char, aiLevel: cfg.p2.ai, vsHuman: !cfg.p2.ai,
          stats: result.p1.stats, duration: result.duration,
        });
      }
      const info = { result, rewards, cfg, won, draw, mode: cfg.mode, buttons: [] };
      switch (cfg.mode) {
        case 'story': return this.storyAfter(info);
        case 'survival': return this.survivalAfter(info);
        case 'timeattack': return this.taAfter(info);
        default:
          info.buttons = [
            { label: 'REMATCH', act: () => this.rematch(), primary: true },
            { label: 'ĐỔI NHÂN VẬT', act: () => this.begin(s.mode, { aiLevel: s.aiLevel, rounds: s.rounds, time: s.time, vsHuman: s.vsHuman }) },
            { label: 'MAIN MENU', act: () => NS.UI.go('menu') },
          ];
          NS.UI.go('results', info);
      }
    },

    /* ------------------- STORY ------------------- */
    storyStart() {
      const s = this.session;
      const ladder = NS.Story.ladder(s.p1.char).concat(['axiom']);
      const diff = NS.Story.DIFFICULTY[s.storyDiff || 'standard'];
      s.story = { ladder, stage: 0, diff: s.storyDiff || 'standard', levels: diff.ladder, continues: 0 };
      NS.UI.go('dialogue', {
        lines: [[s.p1.char, NS.Story.PROLOGUE[s.p1.char]]], title: 'PROLOGUE', bg: NS.Chars.get(s.p1.char).home,
        onDone: () => this.storyStage(),
      });
    },
    storyStage() {
      const s = this.session, st = s.story;
      const opp = st.ladder[st.stage];
      const isBoss = opp === 'axiom';
      const oppDef = NS.Chars.get(opp);
      const arena = isBoss ? 'sanctum' : oppDef.home;
      const level = st.levels[Math.min(st.stage, st.levels.length - 1)];
      const cfg = {
        mode: 'story', arena, rounds: s.rounds, time: s.time,
        p1: { char: s.p1.char, costume: s.p1.costume, human: true },
        p2: { char: opp, costume: 0, ai: level, hpMul: isBoss ? 1.25 : 1 },
        stageLabel: isBoss ? 'FINAL BOSS' : `STAGE ${st.stage + 1} / ${st.ladder.length}`,
      };
      NS.UI.go('dialogue', {
        lines: NS.Story.pre(s.p1.char, opp), title: cfg.stageLabel, sub: `${oppDef.name} — ${level.toUpperCase()}`, bg: arena,
        onDone: () => this.launch(cfg),
      });
    },
    storyAfter(info) {
      const s = this.session, st = s.story;
      const opp = st.ladder[st.stage];
      if (info.won) {
        info.buttons = [{
          label: st.stage + 1 >= st.ladder.length ? 'XEM KẾT THÚC' : 'TIẾP TỤC', primary: true, act: () => {
            const post = NS.Story.post(s.p1.char, opp);
            const next = () => {
              st.stage++;
              if (st.stage >= st.ladder.length) this.storyEnding();
              else this.storyStage();
            };
            if (post.length) NS.UI.go('dialogue', { lines: post, title: 'AFTER BATTLE', bg: info.cfg.arena, onDone: next });
            else next();
          },
        }, { label: 'BỎ HÀNH TRÌNH', act: () => NS.UI.confirm('Thoát Story Mode? Tiến trình hành trình hiện tại sẽ mất.', () => NS.UI.go('menu')) }];
        info.storyLine = `${info.cfg.stageLabel} — HOÀN THÀNH`;
      } else {
        info.buttons = [
          { label: 'THỬ LẠI', primary: true, act: () => { st.continues++; this.launch(info.cfg); } },
          { label: 'MAIN MENU', act: () => NS.UI.go('menu') },
        ];
        info.storyLine = `${info.cfg.stageLabel} — THẤT BẠI`;
      }
      NS.UI.go('results', info);
    },
    storyEnding() {
      const s = this.session;
      const r = NS.Storage.storyCleared(s.p1.char, s.story.diff);
      NS.Storage.addCredits(300);
      NS.Storage.save();
      NS.UI.go('ending', { char: s.p1.char, costume: s.p1.costume, unlocked: r.unlocked, quests: r.quests });
    },

    /* ------------------- SURVIVAL ------------------- */
    survivalStart() {
      const s = this.session;
      s.surv = { defeated: 0, score: 0, hp: null, time: 0 };
      this.survivalNext();
    },
    survivalLevel(n) { return n < 2 ? 'easy' : n < 5 ? 'normal' : n < 9 ? 'hard' : 'expert'; },
    survivalNext() {
      const s = this.session, sv = s.surv;
      const pool = NS.Chars.ROSTER.filter((c) => c !== 'axiom' || sv.defeated >= 8);
      const opp = U.pick(pool);
      const arenas = NS.Arenas.LIST.filter((a) => a !== 'sanctum');
      const cfg = {
        mode: 'survival', arena: U.pick(arenas), rounds: 1, time: 99,
        p1: { char: s.p1.char, costume: s.p1.costume, human: true, hp: sv.hp || undefined },
        p2: { char: opp, costume: U.randi(0, 2), ai: this.survivalLevel(sv.defeated), hpMul: 1 + Math.min(0.5, sv.defeated * 0.04) },
        stageLabel: `SURVIVAL — ĐỐI THỦ #${sv.defeated + 1}`,
      };
      this.launch(cfg);
    },
    survivalAfter(info) {
      const s = this.session, sv = s.surv, r = info.result;
      const st = r.p1.stats;
      sv.time += r.duration;
      if (info.won) {
        sv.defeated++;
        const gained = Math.round(st.damage + 1000 * (1 + sv.defeated * 0.1) + st.maxCombo * 50 + (st.perfects ? 2000 : 0));
        sv.score += gained;
        // hồi 20% máu giữa các trận (không hồi đầy)
        sv.hp = Math.min(r.p1.maxHp, Math.round(r.p1.hp + r.p1.maxHp * 0.2));
        NS.Storage.questEvent('survivalKO', 1);
        NS.Storage.save();
        info.survival = { defeated: sv.defeated, score: sv.score, gained, hp: sv.hp, maxHp: r.p1.maxHp };
        info.buttons = [
          { label: 'ĐỐI THỦ TIẾP THEO', primary: true, act: () => this.survivalNext() },
          { label: 'DỪNG & LƯU ĐIỂM', act: () => this.survivalFinish(info) },
        ];
        NS.UI.go('results', info);
      } else {
        this.survivalFinish(info);
      }
    },
    survivalFinish(info) {
      const s = this.session, sv = s.surv;
      const entry = { name: NS.Storage.profile.name, char: s.p1.char, score: sv.score, defeated: sv.defeated, time: Math.round(sv.time), date: Date.now() };
      const rank = sv.defeated > 0 || sv.score > 0 ? NS.Storage.addSurvival(entry) : -1;
      NS.Storage.checkUnlocks(); NS.Storage.save();
      info.survival = Object.assign({}, info.survival || {}, { final: true, defeated: sv.defeated, score: sv.score, rank });
      info.buttons = [
        { label: 'CHƠI LẠI', primary: true, act: () => this.survivalStart() },
        { label: 'BẢNG XẾP HẠNG', act: () => NS.UI.go('profile', { tab: 'records' }) },
        { label: 'MAIN MENU', act: () => NS.UI.go('menu') },
      ];
      NS.UI.go('results', info);
    },

    /* ------------------- TIME ATTACK ------------------- */
    taStart() {
      const s = this.session;
      const pool = NS.Chars.ROSTER.filter((c) => c !== 'axiom' && c !== s.p1.char);
      const opps = pool.sort(() => Math.random() - 0.5).slice(0, 5);
      s.ta = { opps, idx: 0, time: 0, splits: [] };
      this.taNext();
    },
    taNext() {
      const s = this.session, ta = s.ta;
      const opp = ta.opps[ta.idx];
      const cfg = {
        mode: 'timeattack', arena: NS.Chars.get(opp).home, rounds: 1, time: 60,
        p1: { char: s.p1.char, costume: s.p1.costume, human: true },
        p2: { char: opp, costume: 0, ai: ['normal', 'normal', 'hard', 'hard', 'expert'][ta.idx] },
        stageLabel: `TIME ATTACK — ${ta.idx + 1} / ${ta.opps.length}`,
      };
      this.launch(cfg);
    },
    taAfter(info) {
      const s = this.session, ta = s.ta;
      ta.time += info.result.duration;
      ta.splits.push(info.result.duration);
      info.timeattack = { idx: ta.idx + 1, total: ta.opps.length, time: ta.time, split: info.result.duration };
      if (info.won && ta.idx + 1 < ta.opps.length) {
        ta.idx++;
        info.buttons = [{ label: 'TRẬN TIẾP THEO', primary: true, act: () => this.taNext() }, { label: 'BỎ CUỘC', act: () => NS.UI.go('menu') }];
      } else if (info.won) {
        const entry = { name: NS.Storage.profile.name, char: s.p1.char, time: Math.round(ta.time * 100) / 100, date: Date.now() };
        info.timeattack.rank = NS.Storage.addTimeAttack(entry);
        info.timeattack.final = true;
        info.timeattack.best = NS.Storage.taBest();
        NS.Storage.checkUnlocks(); NS.Storage.save();
        info.buttons = [{ label: 'CHƠI LẠI', primary: true, act: () => this.taStart() }, { label: 'KỶ LỤC', act: () => NS.UI.go('profile', { tab: 'records' }) }, { label: 'MAIN MENU', act: () => NS.UI.go('menu') }];
      } else {
        info.timeattack.failed = true;
        info.buttons = [{ label: 'THỬ LẠI', primary: true, act: () => this.taStart() }, { label: 'MAIN MENU', act: () => NS.UI.go('menu') }];
      }
      NS.UI.go('results', info);
    },
  };

  NS.Modes = Modes;
})();
