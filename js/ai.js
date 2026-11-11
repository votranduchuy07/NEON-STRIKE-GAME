/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — ai.js
   AI SYSTEM: AI điều khiển chiến binh bằng CÙNG InputFrame như người chơi.
   - AI chỉ "nhìn" trạng thái hiển thị của đối thủ với độ trễ phản xạ
     (giống mắt người) — không đọc input, không tự gây sát thương.
   - 4 cấp độ: Easy / Normal / Hard / Expert, mỗi cấp có chiến thuật riêng.
   - Kế hoạch hành động (plan) dạng chuỗi bước: bấm nút, giữ, chờ, xác nhận trúng.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const U = NS.U;

  const LEVELS = {
    easy: { react: 28, think: 24, block: 0.16, parry: 0, dodge: 0.03, punish: 0.15, antiAir: 0.1, combo: 1, mistake: 0.25, skill: 0.18, ult: 0.35, throwP: 0.04, aggression: 0.4, jumpIn: 0.12, confirm: false, spacing: 0.4, idle: 0.35 },
    normal: { react: 18, think: 14, block: 0.48, parry: 0.02, dodge: 0.08, punish: 0.45, antiAir: 0.4, combo: 2, mistake: 0.08, skill: 0.35, ult: 0.65, throwP: 0.14, aggression: 0.5, jumpIn: 0.08, confirm: false, spacing: 0.65, idle: 0.15 },
    hard: { react: 11, think: 8, block: 0.72, parry: 0.12, dodge: 0.15, punish: 0.75, antiAir: 0.68, combo: 3, mistake: 0.03, skill: 0.6, ult: 0.9, throwP: 0.3, aggression: 0.58, jumpIn: 0.06, confirm: true, spacing: 0.85, idle: 0.06 },
    expert: { react: 7, think: 5, block: 0.86, parry: 0.26, dodge: 0.22, punish: 0.93, antiAir: 0.86, combo: 4, mistake: 0, skill: 0.75, ult: 1, throwP: 0.45, aggression: 0.62, jumpIn: 0.04, confirm: true, spacing: 0.95, idle: 0.02, read: true },
  };

  /* Phong cách từng nhân vật: khoảng cách ưa thích & combo đặc trưng */
  const STYLE = {
    raven: { range: 120, zoner: false, combo: ['lp', 'hp', 's2'], ender: 's1', ultRange: 520, poke: 'lk' },
    volt: { range: 300, zoner: true, combo: ['lk', 'hp', 's2'], ender: 's2', ultRange: 900, poke: 'lk', proj: 's1' },
    titan: { range: 130, zoner: false, combo: ['lp', 'hp', 's2'], ender: 's1', ultRange: 600, poke: 'hp' },
    frost: { range: 320, zoner: true, combo: ['lk', 'hk', 's2'], ender: 's1', ultRange: 900, poke: 'lk', proj: 's1' },
    pyra: { range: 220, zoner: true, combo: ['lp', 'hp', 's1'], ender: 's1', ultRange: 900, poke: 'lk', proj: 's2' },
    zero: { range: 170, zoner: false, combo: ['lp', 'hp', 's1'], ender: 's1', ultRange: 850, poke: 'lk', proj: 's2' },
    axiom: { range: 260, zoner: true, combo: ['lp', 'hp', 's2'], ender: 's1', ultRange: 1000, poke: 'hp', proj: 's1' },
  };

  function emptyFrame() { return NS.Input.emptyFrame(); }

  class AIController {
    constructor(level = 'normal') {
      this.isAI = true;
      this.type = 'ai';
      this.level = LEVELS[level] ? level : 'normal';
      this.P = LEVELS[this.level];
      this.plan = [];
      this.step = null;
      this.history = [];
      this.thinkTimer = 0;
      this.mem = { oppJumps: 0, oppBlocks: 0, oppAttacks: 0, oppWakeAtk: 0, oppWakeBlock: 0, samples: 0, lastOppState: 'idle' };
      this.prevHeld = {};
    }
    attach(game, self) { this.game = game; this.self = self; this.style = STYLE[self.def.id] || STYLE.zero; }

    /* ---------- Nhận thức (có độ trễ) ---------- */
    snapshot() {
      const g = this.game, s = this.self, o = g.opponent(s);
      const mv = o.move;
      const first = mv && mv.hits && mv.hits.length ? mv.hits[0].f : 99;
      const lastHit = mv && mv.hits && mv.hits.length ? mv.hits[mv.hits.length - 1] : null;
      const reach = lastHit ? (lastHit.box.x + lastHit.box.w / 2) * o.def.scale : 0;
      const projs = g.projectiles.filter((p) => p.owner === o && !p.hazard).map((p) => ({ x: p.x, y: p.y, vx: p.vx, active: p.active, delay: p.delay - p.age, w: p.w, ground: p.ground, type: p.type }));
      return {
        x: o.x, y: o.y, vy: o.vy, vx: o.vx, state: o.state, grounded: o.grounded, facing: o.facing, crouching: o.crouching,
        moveId: mv ? mv.id : null, moveKind: mv ? mv.kind : null, moveFrame: o.moveFrame, first, reach,
        level: lastHit ? lastHit.level : 'mid', recovering: o.isRecovering(), attacking: o.state === 'attack' && !o.isRecovering(),
        hp: o.hp, invuln: o.isInvulnFor('melee') || o.invuln > 0, projs, ult: o.ult, scripted: mv ? !!mv.scripted : false,
      };
    }
    perceive() {
      const delay = Math.max(1, Math.round(this.P.react));
      const h = this.history;
      return h[Math.max(0, h.length - 1 - delay)];
    }
    learn(cur) {
      // Expert ghi nhớ thói quen của đối thủ
      const m = this.mem;
      if (cur.state !== m.lastOppState) {
        if (cur.state === 'air' || cur.state === 'prejump') m.oppJumps++;
        if (cur.state === 'block') m.oppBlocks++;
        if (cur.state === 'attack') {
          m.oppAttacks++;
          if (m.lastOppState === 'getup') m.oppWakeAtk++;
        }
        if (m.lastOppState === 'getup' && cur.state === 'block') m.oppWakeBlock++;
        m.lastOppState = cur.state;
        m.samples++;
      }
    }

    /* ---------- Vòng lặp ---------- */
    poll() {
      const f = emptyFrame();
      const g = this.game, s = this.self;
      if (!g || !s) return f;
      const cur = this.snapshot();
      this.history.push(cur);
      if (this.history.length > 60) this.history.shift();
      this.learn(cur);
      if (g.phase !== 'fight' || g.paused) { this.plan = []; this.step = null; return f; }
      const per = this.perceive();
      if (!per) return f;
      // phản ứng khẩn cấp có thể ngắt kế hoạch
      if (--this.thinkTimer <= 0 || !this.step) {
        this.thinkTimer = Math.round(this.P.think * U.rand(0.8, 1.3));
        const interrupt = this.react(per);
        if (interrupt) { this.plan = interrupt; this.step = null; }
        else if (!this.step && !this.plan.length) this.plan = this.decide(per);
      }
      this.exec(f, per);
      return f;
    }

    /* ---------- Thực thi kế hoạch ---------- */
    exec(out, per) {
      const s = this.self;
      if (!this.step) {
        if (!this.plan.length) return;
        this.step = Object.assign({ age: 0 }, this.plan.shift());
      }
      const st = this.step;
      const H = out.held, P = out.pressed;
      const fwdKey = s.facing > 0 ? 'right' : 'left', backKey = s.facing > 0 ? 'left' : 'right';
      const dir = (d) => { if (d === 'fwd') H[fwdKey] = true; else if (d === 'back') H[backKey] = true; else if (d === 'down') H.down = true; };
      let done = false;
      switch (st.t) {
        case 'press':
          if (st.dir) dir(st.dir);
          if (st.down) H.down = true;
          if (st.age === 0) { P[st.a] = true; H[st.a] = true; if (st.a2) { P[st.a2] = true; H[st.a2] = true; } }
          else if (st.age < (st.hold || 1)) H[st.a] = true;
          done = st.age >= (st.hold || 1);
          break;
        case 'hold':
          H[st.a] = true;
          if (st.down) H.down = true;
          if (st.age === 0 && st.press) P[st.a] = true;
          done = st.age >= st.n;
          break;
        case 'walk':
          dir(st.dir);
          done = st.age >= st.n;
          break;
        case 'run':
          if (st.age === 0 || st.age === 3) P[fwdKey] = true;
          if (st.age !== 1 && st.age !== 2) H[fwdKey] = true;
          done = st.age >= st.n;
          break;
        case 'jump':
          H.up = true; dir(st.dir);
          done = st.age >= 4;
          break;
        case 'dodge':
          if (st.dir) dir(st.dir);
          if (st.age === 0) P.dodge = true;
          done = st.age >= 2;
          break;
        case 'wait':
          if (st.dir) dir(st.dir);
          done = st.age >= st.n;
          break;
        case 'confirm': {
          const o = this.game.opponent(s);
          const ok = s.moveHit || o.inHitstun();
          if (!ok && this.P.confirm) { this.plan = []; }
          done = true;
          break;
        }
        case 'until': // chờ tới khi có thể hành động
          done = s.isActionable() || st.age > 40;
          break;
        default: done = true;
      }
      st.age++;
      if (done) this.step = null;
      // Tự nhấn đè hướng/đỡ để giữ thế phòng thủ khi không có lệnh
      void per;
    }

    /* ---------- Phản ứng (phòng thủ, chống không chiến, trừng phạt) ---------- */
    react(o) {
      const s = this.self, P = this.P, st = this.style;
      const dist = Math.abs(o.x - s.x);
      if (!s.isActionable() && s.state !== 'blockstun') return null;
      // Đạn đang bay tới
      const incoming = o.projs.find((p) => (p.active && Math.sign(s.x - p.x) === Math.sign(p.vx) && Math.abs(s.x - p.x) < 280) || (!p.active && p.delay < 16 && Math.abs(p.x - s.x) < p.w / 2 + 50));
      if (incoming) {
        const r = Math.random();
        if (!incoming.active) {
          // tia sét/mặt trời đang ngắm → tránh khỏi vùng
          if (r < P.block + 0.1) return [{ t: 'walk', dir: s.x < incoming.x ? (s.facing > 0 ? 'back' : 'fwd') : s.facing > 0 ? 'fwd' : 'back', n: 16 }];
          return null;
        }
        if (s.def.id === 'zero' && s.canUseSkill('s3') && r < P.skill) return [{ t: 'press', a: 's3' }];
        if (s.def.id === 'axiom' && s.canUseSkill('s3') && r < P.skill) return [{ t: 'press', a: 's3' }];
        if (r < P.dodge * 2 && s.energy >= 8) return [{ t: 'dodge', dir: 'fwd' }];
        if (incoming.ground && r < P.block + 0.1) return [{ t: 'jump', dir: 'fwd' }, { t: 'wait', n: 10 }, { t: 'press', a: 'hk' }];
        if (r < P.block) return [{ t: 'hold', a: 'block', n: 18, down: incoming.y > s.y - 60 }];
      }
      // Đối thủ đang ra đòn trong tầm
      if (o.attacking && !o.scripted && dist < o.reach + 60) {
        const r = Math.random();
        const framesLeft = o.first - o.moveFrame;
        // AI nhìn thấy trạng thái trễ "react" frame → ước lượng thời điểm đòn chạm thật
        const eta = framesLeft - P.react;
        if (P.parry && r < P.parry * 2.2 && eta >= 1 && eta <= 6) {
          return [{ t: 'wait', n: Math.max(0, eta - 3) }, { t: 'hold', a: 'block', press: true, n: 12, down: o.level === 'low' }];
        }
        if (r < P.parry + P.dodge && s.energy >= 8) return [{ t: 'dodge', dir: Math.random() < 0.5 ? 'fwd' : null }];
        if (s.def.id === 'titan' && s.canUseSkill('s3') && r < P.skill * 0.4) return [{ t: 'press', a: 's3' }];
        if (s.def.id === 'frost' && s.canUseSkill('s3') && r < P.skill * 0.4 && framesLeft > 3) return [{ t: 'press', a: 's3' }];
        if (s.def.id === 'zero' && s.canUseSkill('s3') && r < P.skill * 0.4 && framesLeft > 3) return [{ t: 'press', a: 's3' }];
        if (r < P.block + P.parry + P.dodge) {
          const low = o.level === 'low';
          const high = o.level === 'overhead';
          return [{ t: 'hold', a: 'block', n: 14 + Math.round(Math.random() * 8), down: low ? true : high ? false : Math.random() < 0.4 }];
        }
        if (Math.random() < P.mistake) return [{ t: 'press', a: U.pick(['lp', 'hk', 'hp']) }]; // phản ứng sai (Easy)
        return null;
      }
      // Chống tấn công trên không
      if (!o.grounded && o.state === 'air' && dist < 200 && o.vy > -6 && Math.random() < P.antiAir) {
        return [{ t: 'press', a: 'hp', dir: 'down', hold: 2 }];
      }
      // Trừng phạt đòn hụt
      if (o.recovering && dist < 200 && Math.random() < P.punish) return this.comboPlan(dist, true);
      return null;
    }

    /* ---------- Ra quyết định trong trạng thái trung lập ---------- */
    decide(o) {
      const s = this.self, P = this.P, st = this.style, m = this.mem;
      const dist = Math.abs(o.x - s.x);
      const r = Math.random();
      if (!s.isActionable()) return [{ t: 'until' }];
      // Sai lầm ngẫu nhiên
      if (r < P.mistake) return [U.pick([{ t: 'press', a: U.pick(['lp', 'lk', 'hp', 'hk']) }, { t: 'jump', dir: 'fwd' }, { t: 'walk', dir: 'fwd', n: 20 }, { t: 'wait', n: 20 }])];
      if (Math.random() < P.idle) return [{ t: 'wait', n: U.randi(10, 30) }];

      // Đối thủ nằm đất / đứng dậy
      if (o.state === 'down' || o.state === 'getup') {
        if (P.read && m.oppWakeAtk > m.oppWakeBlock + 1) return [{ t: 'hold', a: 'block', n: 24 }];
        if (dist > st.range + 20) return [{ t: 'walk', dir: 'fwd', n: 14 }];
        if (P.read && m.oppWakeBlock > m.oppWakeAtk) return [{ t: 'wait', n: 14 }, { t: 'walk', dir: 'fwd', n: 6 }, { t: 'press', a: 'lp', a2: 'lk' }];
        return [{ t: 'wait', n: U.randi(6, 16) }];
      }
      // Ultimate
      if (s.ult >= 100 && Math.random() < P.ult * 0.5) {
        const inRange = dist < st.ultRange;
        if (inRange && (this.level === 'easy' || this.level === 'normal' || o.recovering || o.state === 'hitstun' || o.state === 'dizzy' || dist < 220)) return [{ t: 'press', a: 'ult' }];
      }
      // Đối thủ bị choáng (guard break) → combo
      if (o.state === 'dizzy' || o.state === 'frozen') {
        if (dist > 150) return [{ t: 'run', n: 12 }];
        return this.comboPlan(dist, true);
      }
      // Expert: đọc thói quen nhảy → chờ sẵn đòn chống không chiến
      if (P.read && m.samples > 12 && m.oppJumps / m.samples > 0.25 && dist < 300 && dist > 140) return [{ t: 'wait', n: 10 }];
      // Ném khi đối thủ hay đỡ
      const blockRate = m.samples ? m.oppBlocks / m.samples : 0;
      if (dist < 100 && Math.random() < P.throwP + (P.read ? blockRate * 0.6 : 0)) return [{ t: 'press', a: 'lp', a2: 'lk' }];

      const want = st.range;
      // Nhân vật bắn xa
      if (st.zoner && st.proj && dist > 200 && s.canUseSkill(st.proj) && Math.random() < P.skill) return [{ t: 'press', a: st.proj }, { t: 'wait', n: 10 }];
      if (dist > want + 60) {
        // tiếp cận
        const rr = Math.random();
        if (rr < P.jumpIn && dist < 380) return [{ t: 'jump', dir: 'fwd' }, { t: 'wait', n: 14 }, { t: 'press', a: U.pick(['hk', 'hp']) }, { t: 'until' }].concat(this.level !== 'easy' ? [{ t: 'press', a: 'lp' }] : []);
        if (rr < 0.35 && this.level !== 'easy' && dist > 380) return [{ t: 'run', n: U.randi(14, 26) }];
        if (st.zoner && rr < 0.55) return [{ t: 'walk', dir: 'fwd', n: U.randi(8, 16) }, { t: 'hold', a: 'block', n: 8 }];
        return [{ t: 'walk', dir: 'fwd', n: U.randi(10, 24) }];
      }
      if (st.zoner && dist < want - 120 && Math.random() < P.spacing * 0.5) {
        // giữ khoảng cách
        if (Math.random() < 0.3 && s.canUseSkill('s3') && (s.def.id === 'volt' || s.def.id === 'pyra')) return [{ t: 'press', a: 's3', dir: s.def.id === 'volt' ? 'back' : null }];
        return [{ t: 'walk', dir: 'back', n: U.randi(10, 20) }];
      }
      // Đỡ đón đầu khi đối thủ áp sát (người thật cũng phải đoán trước đòn nhanh)
      if (dist < 175 && o.grounded && !o.recovering && Math.random() < P.block * 0.42) {
        return [{ t: 'hold', a: 'block', n: U.randi(10, 22), down: Math.random() < (P.read && m.samples ? 0.55 : 0.4) }];
      }
      if (!o.grounded && dist < 260 && Math.random() < P.block * 0.5) return [{ t: 'hold', a: 'block', n: 18 }];
      // Trong tầm đánh
      if (dist < 150) {
        const rr = Math.random();
        if (rr < P.aggression) return this.comboPlan(dist, false);
        if (rr < P.aggression + 0.15) return [{ t: 'press', a: 'lk', dir: 'down' }, { t: 'wait', n: 10 }];
        if (rr < P.aggression + 0.3) return [{ t: 'hold', a: 'block', n: U.randi(10, 20), down: Math.random() < 0.5 }];
        return [{ t: 'walk', dir: 'back', n: U.randi(6, 14) }];
      }
      // Tầm trung: poke / kỹ năng tiếp cận / phân vân
      const rr = Math.random();
      if (rr < 0.3) return [{ t: 'walk', dir: 'fwd', n: U.randi(6, 12) }, { t: 'press', a: st.poke }, { t: 'wait', n: 8 }];
      if (rr < 0.3 + P.skill * 0.3 && s.def.id === 'raven' && s.canUseSkill('s1')) return [{ t: 'press', a: 's1' }];
      if (rr < 0.3 + P.skill * 0.3 && s.def.id === 'titan' && s.canUseSkill('s1')) return [{ t: 'press', a: 's1' }];
      if (rr < 0.6) return [{ t: 'walk', dir: Math.random() < 0.7 ? 'fwd' : 'back', n: U.randi(8, 18) }];
      return [{ t: 'hold', a: 'block', n: U.randi(8, 16) }];
    }

    /** Tạo kế hoạch combo theo cấp độ */
    comboPlan(dist, punish) {
      const s = this.self, P = this.P, st = this.style;
      const plan = [];
      if (dist > 130) plan.push({ t: 'walk', dir: 'fwd', n: Math.min(16, Math.round((dist - 100) / Math.max(2, s.stat.walk))) });
      const seq = st.combo.slice();
      const len = Math.min(P.combo, seq.length);
      for (let i = 0; i < len; i++) {
        const a = seq[i];
        if (a.startsWith('s')) {
          if (!s.canUseSkill(a) && i > 0) break;
          if (i > 0) plan.push({ t: 'confirm' });
          plan.push({ t: 'press', a });
          plan.push({ t: 'wait', n: 12 });
          continue;
        }
        if (i > 0) plan.push({ t: 'confirm' });
        plan.push({ t: 'press', a });
        const mv = s.moves[a];
        plan.push({ t: 'wait', n: (mv ? mv.startup : 6) + 1 });
      }
      if (P.combo >= 4 && s.ult >= 100) { plan.push({ t: 'confirm' }); plan.push({ t: 'press', a: 'ult' }); }
      else if (P.combo >= 3 && punish && s.canUseSkill(st.ender) && len < 3) { plan.push({ t: 'confirm' }); plan.push({ t: 'press', a: st.ender }); }
      plan.push({ t: 'until' });
      return plan;
    }
  }

  /* ---------- Hình nộm luyện tập (Training) ---------- */
  class DummyController {
    constructor(mode = 'stand') { this.isAI = true; this.type = 'dummy'; this.mode = mode; this.t = 0; }
    attach(game, self) { this.game = game; this.self = self; }
    poll() {
      const f = emptyFrame();
      this.t++;
      const s = this.self, g = this.game;
      if (!s || !g) return f;
      switch (this.mode) {
        case 'crouch': f.held.down = true; break;
        case 'block': f.held.block = true; break;
        case 'cblock': f.held.block = true; f.held.down = true; break;
        case 'jump': f.held.up = true; break;
        case 'parry': {
          const o = g.opponent(s);
          if (o.state === 'attack' && o.move && o.move.hits && o.move.hits.length) {
            const left = Math.ceil(o.move.hits[0].f - o.moveFrame);
            if (left === 2 && this._pressedFor !== o.moveInstance) { this._pressedFor = o.moveInstance; f.pressed.block = true; f.held.block = true; }
            else if (left < 2) f.held.block = true;
            if (o.move.hits[0].level === 'low') f.held.down = true;
          }
          break;
        }
        default: break;
      }
      return f;
    }
  }

  NS.AI = { AIController, DummyController, LEVELS, STYLE };
})();
