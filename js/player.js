/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — player.js
   FIGHTER / PLAYER CONTROLLER: máy trạng thái của chiến binh.
   Nhận InputFrame (từ bàn phím, gamepad, cảm ứng hoặc AI) và chuyển thành
   hành động: di chuyển, chạy, nhảy, cúi, đấm/đá, đỡ, né, ném, kỹ năng, ultimate.
   Người chơi và AI dùng CHUNG lớp này → cùng một bộ luật chiến đấu.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const U = NS.U;
  const ST = () => NS.Collision.STAGE;
  const ATTACK_ORDER = ['lp', 'lk', 'hp', 'hk'];
  const NEUTRAL = ['idle', 'walk', 'crouch', 'block', 'land', 'run'];

  function within(r, f) { return r && f >= r[0] && f < r[1]; }

  class Fighter {
    constructor(game, o) {
      this.game = game;
      this.side = o.side;
      this.charId = o.charId;
      this.def = NS.Chars.get(o.charId);
      this.costume = o.costume || 0;
      this.pal = NS.Chars.palette(o.charId, this.costume);
      this.controller = o.controller;
      this.isAI = !!(o.controller && o.controller.isAI);
      this.name = o.name || this.def.name;
      this.moves = NS.Chars.buildMoves(o.charId);
      this.stat = NS.Chars.derive(o.charId);
      this.maxHp = Math.round(this.stat.hp * (o.hpMul || 1));
      this.hp = this.maxHp;
      this.ult = o.startUlt || 0;
      this.energy = 30;
      this.roundsWon = 0;
      this.t = 0;
      this.moveInstance = 0;
      this.hitIds = new Set();
      this.stats = { damage: 0, hits: 0, maxCombo: 0, combos: 0, combos3: 0, counters: 0, parries: 0, blocked: 0, throws: 0, ults: 0, skills: 0, perfects: 0 };
      this.resetRound(0, 1);
    }

    resetRound(x, facing, keepHp) {
      this.x = x; this.y = ST().GROUND; this.vx = 0; this.vy = 0; this.pushback = 0;
      this.facing = facing; this.grounded = true;
      if (!keepHp) this.hp = this.maxHp;
      this.energy = Math.max(this.energy * 0.5, 30);
      this.guard = 100; this.guardRegenDelay = 0;
      this.state = 'idle'; this.stateTimer = 0; this.stateDur = 0; this.stateTime = 0;
      this.move = null; this.moveFrame = 0;
      this.cd = { s1: 0, s2: 0, s3: 0 };
      this.status = { slow: 0, burn: 0, freeze: 0, shock: 0, corrupt: 0, encased: 0 };
      this.invuln = 0; this.evadeCounter = 0; this.backstab = 0; this.parryCounter = 0; this.counterNext = false;
      this.combo = 0; this.comboDmg = 0; this.comboMoves = {}; this.juggle = 0;
      this.flash = 0; this.invisible = false; this.noPush = false; this.trailOn = false; this.alpha = 1;
      this.buf = []; this.blockPresses = []; this.lastThrowPress = -999;
      this.lastFwdTap = -999; this.lastBackTap = -999; this.dodgeCd = 0;
      this.airAttacks = 0; this.usedDouble = false; this.flip = 0;
      this.lockedBy = null; this.koed = false; this.launched = false; this.kdPending = false;
      this.adapt = {}; this.crouching = false; this.walkPhase = 0; this.walkDir = 1;
      this.lastHitBy = null; this.renderPose = null; this.skel = null;
      this._wasStunned = false; this.stepTick = 0; this.lowHp = false;
      this.input = { held: {}, pressed: {}, fwd: false, back: false };
      NS.Anim.updatePose(this);
    }

    get opp() { return this.game.opponent(this); }
    jointWorld(n) { return NS.Anim.jointWorld(this, n); }
    get speedMul() { return this.status.slow > 0 ? 0.65 : 1; }

    /* ---------------- INPUT ---------------- */
    readInput(inp) {
      const h = inp.held, p = inp.pressed;
      const fwd = this.facing > 0 ? h.right : h.left, back = this.facing > 0 ? h.left : h.right;
      const fwdP = this.facing > 0 ? p.right : p.left, backP = this.facing > 0 ? p.left : p.right;
      this.input = { held: h, pressed: p, fwd, back, fwdP, backP };
      const fr = this.game.frame;
      for (const a in p) if (p[a]) this.buf.push({ a, f: fr });
      if (this.buf.length > 24) this.buf.splice(0, this.buf.length - 24);
      if (p.block) { this.blockPresses.push(fr); if (this.blockPresses.length > 6) this.blockPresses.shift(); }
      // nhận diện ném (LP + LK gần như cùng lúc)
      if ((p.lp && this.has('lk', 3)) || (p.lk && this.has('lp', 3))) this.lastThrowPress = fr;
    }
    has(a, win = 8) { const fr = this.game.frame; return this.buf.some((b) => b.a === a && fr - b.f <= win); }
    take(a, win = 8) {
      const fr = this.game.frame;
      for (let i = this.buf.length - 1; i >= 0; i--) {
        const b = this.buf[i];
        if (b.a === a && fr - b.f <= win) { this.buf.splice(i, 1); return true; }
      }
      return false;
    }
    throwTechWindow(fr) { return fr - this.lastThrowPress <= 10; }
    parryReady(fr, win) {
      if (!this.blockPresses.length) return false;
      const last = this.blockPresses[this.blockPresses.length - 1];
      if (fr - last > win) return false;
      const recent = this.blockPresses.filter((f) => fr - f <= 45).length;
      return recent <= 2; // chống spam nút đỡ
    }

    /* ---------------- TRẠNG THÁI ---------------- */
    setState(s, dur = 0) { this.state = s; this.stateTimer = dur; this.stateDur = dur; this.stateTime = 0; }
    toIdle() { this.move = null; this.noPush = false; this.invisible = false; this.trailOn = false; this.setState(this.grounded ? 'idle' : 'air'); }
    inHitstun() { return ['hitstun', 'locked', 'thrown', 'frozen', 'dizzy'].includes(this.state); }
    isActionable() { return NEUTRAL.includes(this.state); }
    isInvulnFor(type) {
      if (['down', 'getup', 'ko', 'ko_down', 'victory', 'defeat', 'intro', 'intro_idle'].includes(this.state)) return true;
      if (this.invisible) return true;
      if (this.state === 'attack' && this.move) {
        const f = this.moveFrame;
        if (within(this.move.inv, f)) return true;
        if (type === 'proj' && within(this.move.projInv, f)) return true;
      }
      return false;
    }
    guardActive() { return this.state === 'attack' && this.move && this.move.guard && within([this.move.guard.from, this.move.guard.to], this.moveFrame); }
    hasArmor() { return this.state === 'attack' && this.move && this.move.armor && this.armorHits > 0 && within([this.move.armor.from, this.move.armor.to], this.moveFrame); }
    canBlockNow() {
      if (this.state === 'block' || this.state === 'blockstun') return true;
      return ['idle', 'walk', 'crouch', 'land'].includes(this.state) && !!this.input.held.block;
    }
    isRecovering() {
      if (this.state !== 'attack' || !this.move || !this.move.hits || !this.move.hits.length) return this.state === 'attack';
      const last = this.move.hits[this.move.hits.length - 1];
      return this.moveFrame >= last.f + last.len;
    }

    gainEnergy(n) { if (this.status.corrupt > 0) n *= 0.3; this.energy = U.clamp(this.energy + n * this.stat.energyMul, 0, 100); }
    gainUlt(n) { this.ult = U.clamp(this.ult + n, 0, 100); }

    applyStatus(s) {
      Object.keys(s).forEach((k) => { this.status[k] = Math.max(this.status[k] || 0, s[k]); });
      if (s.corrupt) { this.game.hud.popup(this.side, 'CORRUPTED', 'status'); }
      if (s.slow) this.game.hud.popup(this.side, 'SLOWED', 'status');
    }
    freezeNow(g) {
      this.frozenPose = this.renderPose;
      this.move = null;
      this.setState('frozen', this.status.freeze);
      this.vx = 0;
      g.hud.popup(this.side, 'FROZEN', 'status');
    }

    /* ---------------- BẮT ĐẦU / KẾT THÚC ĐÒN ---------------- */
    canUseSkill(slot) {
      const m = this.moves[slot];
      if (!m) return false;
      if (slot === 'ult') return this.ult >= 100;
      return this.cd[slot] <= 0 && this.energy >= m.cost && this.grounded;
    }
    startMove(move, opts = {}) {
      if (!move) return false;
      const g = this.game;
      if (!opts.free) {
        if (move.kind === 'skill') {
          this.energy -= move.cost || 0;
          this.cd[move.slot] = (move.cd || 120) * (this.status.corrupt > 0 ? 1.5 : 1);
          this.stats.skills++;
        }
        if (move.kind === 'ult') {
          this.ult = 0; this.stats.ults++;
          g.superFlash(this, move);
        }
      }
      this.move = move; this.moveFrame = 0; this.moveInstance++; this.hitIds.clear();
      this.moveHit = false; this.moveBlocked = false; this._stopVel = false; this._swung = false; this._lastFr = -1;
      this.armorHits = move.armor ? move.armor.hits : 0;
      this._bastionTriggered = false;
      this.setState('attack');
      if (!move.air) this.crouching = !!move.crouch;
      if (move.kind === 'skill' && !opts.free) g.sfx('swingH', this, { pitch: 0.8 });
      if (move.onStart) move.onStart(this, g);
      return true;
    }
    endMove() {
      const m = this.move;
      this.move = null; this.noPush = false; this.invisible = false; this.trailOn = false;
      if (m && m.onEnd) m.onEnd(this, this.game);
      if (this.state !== 'attack') return; // onEnd có thể đã chuyển trạng thái
      if (!this.grounded) this.setState('air');
      else if (m && m.air) this.setState('land', 4);
      else this.setState(this.input.held.down ? 'crouch' : 'idle');
    }
    trySkill(slot) {
      if (!this.canUseSkill(slot)) {
        if (this.moves[slot] && slot !== 'ult' && this.cd[slot] <= 0 && this.energy < this.moves[slot].cost && !this.isAI) this.game.hud.popup(this.side, 'LOW ENERGY', 'status');
        return false;
      }
      return this.startMove(this.moves[slot]);
    }
    pickAttack(win = 6) {
      for (const a of ['hk', 'hp', 'lk', 'lp']) if (this.has(a, win)) { this.take(a, win); return a; }
      return null;
    }

    /* ---------------- BỊ ĐÁNH ---------------- */
    takeHit(g, o) {
      if (o.keepLock && this.lockedBy) {
        this.stateTimer = Math.max(this.stateTimer, 10);
        return;
      }
      if (this.lockedBy) { this.lockedBy = null; this.status.encased = 0; }
      if (this.move && this.move.onEnd && this.state === 'attack') { const m = this.move; this.move = null; if (m.onEnd) m.onEnd(this, g); }
      this.move = null; this.noPush = false; this.invisible = false; this.trailOn = false;
      this.setState('hitstun', o.hs);
      this.hitLow = o.low;
      this.crouching = false;
      this.vx = o.dir * o.kb;
      if (this.hp <= 0) { this.koed = true; o.launch = Math.max(o.launch || 0, 9); o.kd = true; this.vx = o.dir * Math.max(o.kb, 6); }
      if (o.launch) {
        this.vy = -o.launch; this.grounded = false; this.launched = true; this.spinRot = 0;
      } else if (!this.grounded) {
        this.vy = Math.min(this.vy, -3);
      }
      if (o.kd) this.kdPending = true;
    }
    toBlockStun(frames, pushVx) {
      this.move = null;
      this.setState('blockstun', frames);
      this.crouching = !!this.input.held.down;
      if (pushVx !== undefined) this.vx = pushVx;
      this.guardRegenDelay = 60;
    }
    stagger(g, frames) {
      this.move = null; this.noPush = false; this.invisible = false;
      this.setState('hitstun', frames);
      this.hitLow = false;
      this.vx = -this.facing * 2;
    }
    guardBreak(g) {
      this.move = null;
      this.setState('dizzy', 70);
      this.vx = 0;
    }
    setLocked(att) {
      if (this.move && this.move.onEnd && this.state === 'attack') { const m = this.move; this.move = null; m.onEnd(this, this.game); }
      this.move = null; this.lockedBy = att; this.setState('locked', 999); this.vx = 0; this.vy = 0;
      this.noPush = true; this.invisible = false;
    }
    release(g) {
      if (!this.lockedBy && this.state !== 'locked' && this.state !== 'thrown') return;
      this.lockedBy = null; this.noPush = false; this.status.encased = 0;
      if (this.state === 'locked' || this.state === 'thrown') {
        this.setState('hitstun', 18);
        if (this.hp <= 0) { this.koed = true; this.kdPending = true; this.vy = -8; this.grounded = false; this.launched = true; this.vx = -this.facing * 4; }
        else if (this.y < ST().GROUND - 1) { this.grounded = false; this.launched = true; this.vy = -3; }
      }
    }

    /** Báo cáo kết thúc combo của chính chiến binh này (người tấn công) */
    endComboReport(g) {
      if (this.combo >= 2) {
        this.stats.combos++;
        if (this.combo >= 3) this.stats.combos3++;
        g.hud.comboEnd(this.side, this.combo, this.comboDmg);
      }
      this.combo = 0; this.comboDmg = 0; this.comboMoves = {};
      this.routeUlt = false; this.routeSkill = false;
    }

    /* ---------------- UPDATE MỖI FRAME ---------------- */
    tickTimers(g) {
      this.t++; this.stateTime++;
      if (this.invuln > 0) this.invuln--;
      if (this.evadeCounter > 0) this.evadeCounter--;
      if (this.backstab > 0) this.backstab--;
      if (this.parryCounter > 0) this.parryCounter--;
      if (this.flash > 0) this.flash--;
      if (this.dodgeCd > 0) this.dodgeCd--;
      const cdRate = this.status.corrupt > 0 ? 0.6 : 1;
      ['s1', 's2', 's3'].forEach((s) => { if (this.cd[s] > 0) this.cd[s] = Math.max(0, this.cd[s] - cdRate); });
      if (g.phase === 'fight') {
        const regen = this.status.corrupt > 0 ? 0 : 0.035 * this.stat.energyMul + (this.def.id === 'axiom' ? 0.017 : 0);
        this.energy = Math.min(100, this.energy + regen);
      }
      // guard gauge hồi phục
      if (this.guardRegenDelay > 0) this.guardRegenDelay--;
      else if (this.state !== 'block' && this.state !== 'blockstun') this.guard = Math.min(100, this.guard + 0.35);
      // trạng thái
      const s = this.status;
      if (s.slow > 0) { s.slow--; if (this.t % 6 === 0) g.particles.add({ type: 'shard', x: this.x + U.rand(-24, 24), y: this.y - U.rand(20, 170), vx: 0, vy: 0.5, size: 4, life: 18, color: '#a5f3fc' }); }
      if (s.burn > 0) {
        s.burn--;
        if (s.burn % 15 === 0 && this.hp > 1 && g.phase === 'fight') { this.hp = Math.max(1, this.hp - 3); }
        if (this.t % 3 === 0) g.particles.add({ type: 'dot', x: this.x + U.rand(-22, 22), y: this.y - U.rand(20, 160), vx: 0, vy: -U.rand(1, 2.5), size: U.rand(5, 10), grow: -0.25, life: 18, color: U.pick(['#f97316', '#facc15', '#ef4444']) });
      }
      if (s.shock > 0) { s.shock--; if (this.t % 4 === 0) NS.FX.lightning(g.particles, this.x + U.rand(-25, 25), this.y - U.rand(40, 170), this.x + U.rand(-40, 40), this.y - U.rand(40, 170), '#fde047', 1, 4, 14); }
      if (s.corrupt > 0) { s.corrupt--; if (this.t % 4 === 0) g.particles.add({ type: 'pixel', x: this.x + U.rand(-30, 30), y: this.y - U.rand(20, 180), vx: U.rand(-1, 1), vy: 0, size: U.rand(3, 7), life: 10, color: U.pick(['#5eead4', '#f0abfc', '#ffffff']) }); }
      if (s.encased > 0) s.encased--;
      if (s.freeze > 0 && this.state !== 'frozen' && this.state !== 'locked' && this.grounded && !this.koed && !['down', 'getup'].includes(this.state)) this.freezeNow(g);
      this.lowHp = this.hp < this.maxHp * 0.25;
    }

    update(g, inp) {
      this.readInput(inp);
      this.tickTimers(g);
      const st = this.state;
      const wasStun = this._wasStunned;
      switch (st) {
        case 'intro': this.updIntro(g); break;
        case 'intro_idle': case 'victory': case 'defeat': this.vx *= 0.8; break;
        case 'idle': case 'walk': case 'crouch': case 'block': case 'run': case 'land': this.updNeutral(g); break;
        case 'prejump':
          if (--this.stateTimer <= 0) this.doJump(g);
          break;
        case 'air': this.updAir(g); break;
        case 'attack': this.updAttack(g); break;
        case 'blockstun':
          if (--this.stateTimer <= 0) this.setState(this.input.held.block ? 'block' : 'idle');
          break;
        case 'hitstun':
          if (this.grounded && --this.stateTimer <= 0) this.setState('idle');
          break;
        case 'down':
          if (--this.stateTimer <= 0) { this.setState('getup', 18); this.invuln = 22; }
          break;
        case 'getup':
          if (--this.stateTimer <= 0) this.setState('idle');
          break;
        case 'dodge': this.updDodge(g); break;
        case 'dizzy':
          if (this.t % 10 === 0) g.particles.add({ type: 'star', x: this.x + Math.cos(this.t * 0.2) * 30, y: this.y - 200, vx: 0, vy: 0, size: 8, vr: 0.2, life: 12, color: '#fde047' });
          if (--this.stateTimer <= 0) this.setState('idle');
          break;
        case 'frozen':
          this.status.freeze = Math.max(0, this.status.freeze - 1);
          if (this.status.freeze <= 0) { this.setState('idle'); NS.FX.shatter(g.particles, this.x, this.y - 100, 30); g.sfx('ice', this); }
          break;
        case 'locked': case 'thrown': {
          const a = this.lockedBy;
          if (!a || a.state !== 'attack' || !a.move || !a.move.scripted) this.release(g);
          break;
        }
        default: break;
      }
      this.physics(g);
      // kết thúc combo của đối thủ khi mình thoát choáng
      const stunned = this.inHitstun() || this.state === 'down';
      if (wasStun && !stunned) {
        const o = this.opp;
        if (o) o.endComboReport(g);
        this.juggle = 0;
      }
      this._wasStunned = stunned;
      NS.Anim.updatePose(this);
    }

    faceOpponent() {
      const o = this.opp;
      if (!o) return;
      const d = o.x - this.x;
      if (Math.abs(d) > 4) this.facing = Math.sign(d);
    }

    updIntro(g) {
      const dir = Math.sign(this.introX - this.x);
      this.walkPhase += 0.22;
      this.x += dir * 3.2;
      if (Math.abs(this.introX - this.x) < 4) { this.x = this.introX; this.setState('intro_idle'); }
    }

    updNeutral(g) {
      const i = this.input, h = i.held;
      this.faceOpponent();
      const fwdNow = this.facing > 0 ? h.right : h.left, backNow = this.facing > 0 ? h.left : h.right;
      if (this.state === 'land' && --this.stateTimer > 0) { this.vx *= 0.7; return; }
      if (this.game.phase !== 'fight' && !this.game.training) { this.setState('idle'); this.vx *= 0.8; return; }
      // ULTIMATE
      if (this.has('ult', 6) && this.canUseSkill('ult')) { this.take('ult', 6); this.startMove(this.moves.ult); return; }
      // KỸ NĂNG
      for (const s of ['s1', 's2', 's3']) {
        if (this.has(s, 6)) { this.take(s, 6); if (this.trySkill(s)) return; }
      }
      // NÉM
      if (this.has('lp', 3) && this.has('lk', 3)) {
        this.take('lp', 3); this.take('lk', 3);
        this.startMove(this.moves.throw);
        return;
      }
      // NÉ TRÁNH
      if (this.has('dodge', 6) && this.dodgeCd <= 0) {
        this.take('dodge', 6);
        if (this.energy >= 8) { this.doDodge(g, fwdNow, true); return; }
        this.game.hud.popup(this.side, 'LOW ENERGY', 'status');
      }
      // TẤN CÔNG
      const atk = this.pickAttack(6);
      if (atk) {
        const id = h.down ? 'c' + atk : atk;
        const carry = this.state === 'run' ? this.facing * this.stat.run * 0.6 : 0;
        this.startMove(this.moves[id]);
        this.vx = carry;
        return;
      }
      // NHẢY
      if (h.up) { this.setState('prejump', 3); this.vx *= 0.5; return; }
      // ĐỠ ĐÒN
      if (h.block) { this.crouching = !!h.down; this.setState('block'); this.vx *= 0.6; return; }
      // CÚI
      if (h.down) { this.crouching = true; if (this.state !== 'crouch') this.setState('crouch'); this.vx *= 0.6; return; }
      this.crouching = false;
      // CHẠY / ĐI BỘ / LÙI NHANH
      const fr = this.game.frame;
      if (i.fwdP) { if (fr - this.lastFwdTap <= 12) { this.setState('run'); g.sfx('dash', this); NS.FX.dust(g.particles, this.x, this.y, 5, -this.facing); } this.lastFwdTap = fr; }
      if (i.backP) {
        if (fr - this.lastBackTap <= 12 && this.dodgeCd <= 0) { this.lastBackTap = -999; this.doDodge(g, false, false); return; }
        this.lastBackTap = fr;
      }
      if (this.state === 'run' && fwdNow) {
        this.vx = this.facing * this.stat.run * this.speedMul;
        this.walkPhase += 0.32;
        if (this.t % 9 === 0) { g.sfx('step', this, { vol: 1.2 }); NS.FX.dust(g.particles, this.x - this.facing * 20, this.y, 2, -this.facing); }
        if (this.def.id === 'raven' || this.trailOn) this.trailOn = true;
        return;
      }
      this.trailOn = false;
      if (fwdNow || backNow) {
        const dir = fwdNow ? 1 : -1;
        if (this.state !== 'walk') this.setState('walk');
        this.walkDir = dir;
        const spd = this.stat.walk * (dir > 0 ? 1 : 0.82) * this.speedMul;
        this.vx = this.facing * dir * spd;
        this.walkPhase += 0.16 * dir * this.speedMul;
        if (++this.stepTick % 18 === 0) g.sfx('step', this, { vol: 0.6 });
      } else {
        if (this.state !== 'idle') this.setState('idle');
        this.vx *= 0.7;
      }
    }

    doJump(g) {
      const h = this.input.held;
      const fwd = this.facing > 0 ? h.right : h.left, back = this.facing > 0 ? h.left : h.right;
      const dir = fwd ? 1 : back ? -1 : 0;
      this.vy = -this.stat.jumpV;
      this.vx = this.facing * dir * this.stat.jumpX * this.speedMul;
      this.grounded = false; this.airAttacks = 0; this.usedDouble = false; this.flip = 0;
      this.setState('air');
      g.sfx('jump', this);
      NS.FX.dust(g.particles, this.x, this.y, 5, 0);
    }

    updAir(g) {
      const i = this.input;
      if (this.flip) this.flip = Math.max(0, this.flip - 18);
      // nhảy kép (Raven)
      if (this.def.doubleJump && i.pressed.up && !this.usedDouble && this.vy > -10) {
        this.usedDouble = true; this.vy = -13; this.flip = 360;
        const h = i.held, fwd = this.facing > 0 ? h.right : h.left, back = this.facing > 0 ? h.left : h.right;
        this.vx = this.facing * (fwd ? 1 : back ? -1 : 0) * this.stat.jumpX;
        g.sfx('jump', this, { pitch: 1.3 });
        g.ghost(this, { color: this.pal.accent, life: 12 });
      }
      // đòn trên không
      if (this.airAttacks < 1) {
        const atk = this.pickAttack(5);
        if (atk) { this.airAttacks++; this.startMove(this.moves['j' + atk]); return; }
      }
    }

    doDodge(g, forward, costs) {
      if (costs) this.energy -= 8;
      this.dodgeCd = costs ? 40 : 30;
      this.dodgeFwd = !!forward;
      const dur = forward ? 24 : costs ? 22 : 18;
      this.setState('dodge', dur);
      this.invuln = forward ? 15 : costs ? 13 : 6;
      this.noPush = !!forward;
      this.vx = this.facing * (forward ? 1.35 : -1) * this.stat.dodgeSpd;
      this.trailOn = true;
      g.sfx(costs ? 'dodge' : 'dash', this);
      NS.FX.dust(g.particles, this.x, this.y, 4, forward ? -this.facing : this.facing);
    }
    updDodge(g) {
      this.vx *= 0.9;
      if (--this.stateTimer <= 0) { this.noPush = false; this.trailOn = false; this.setState('idle'); this.faceOpponent(); }
    }

    updAttack(g) {
      const m = this.move;
      if (!m) { this.toIdle(); return; }
      const fr = Math.floor(this.moveFrame);
      // vận tốc theo kịch bản đòn
      if (m.vel && !this._stopVel) {
        for (const v of m.vel) if (fr >= v[0] && fr < v[1]) { this.vx = this.facing * v[2] * this.speedMul; if (v[3] !== undefined) this.vy = v[3]; }
      }
      this.noPush = within(m.passThrough, fr);
      if (m.invisible) this.invisible = within(m.invisible, fr);
      this.trailOn = within(m.trail, fr);
      // âm thanh vung đòn
      if (m.kind === 'normal' && !this._swung && fr >= Math.max(0, m.startup - 2)) {
        this._swung = true;
        g.sfx(m.swing || 'swingL', this);
        this.normalFx(g, m);
      }
      // hủy đòn ném ↔ đấm/đá trong 2 frame đầu
      if ((m.id === 'lp' || m.id === 'lk') && fr <= 2 && this.has(m.id === 'lp' ? 'lk' : 'lp', 3) && this.grounded) {
        this.take('lp', 3); this.take('lk', 3);
        this.startMove(this.moves.throw);
        return;
      }
      if (this._lastFr !== fr) { this._lastFr = fr; if (m.onFrame) m.onFrame(this, g, fr); }
      if (this.state !== 'attack' || this.move !== m) return; // onFrame đã đổi đòn
      // CANCEL (combo)
      if (this.tryCancel(g, m, fr)) return;
      this.moveFrame += m.scripted ? 1 : this.speedMul;
      if (this.moveFrame >= m.total) this.endMove();
    }

    tryCancel(g, m, fr) {
      if (m.scripted || m.kind === 'throw') return false;
      const connected = this.moveHit || this.moveBlocked;
      if (!connected) return false;
      const firstHit = m.hits && m.hits.length ? m.hits[0].f : 0;
      if (fr < firstHit) return false;
      // Ultimate cancel (khi trúng đòn)
      if (this.moveHit && (m.kind === 'normal' || m.kind === 'skill') && this.has('ult', 8) && this.ult >= 100 && this.grounded) {
        this.take('ult', 8);
        if (this.combo >= 2) this.routeUlt = true;
        this.startMove(this.moves.ult);
        return true;
      }
      if (m.kind === 'normal') {
        // Hủy sang kỹ năng
        if (this.grounded) {
          for (const s of ['s1', 's2', 's3']) {
            if (this.has(s, 8) && this.canUseSkill(s)) { this.take(s, 8); this.startMove(this.moves[s]); this.routeSkill = true; return true; }
          }
        }
        // Chuỗi đòn thường (mạnh dần)
        const idx = ATTACK_ORDER.indexOf(m.id.replace(/^[cj]/, ''));
        const prefix = m.air ? 'j' : '';
        for (const a of ATTACK_ORDER) {
          const ai = ATTACK_ORDER.indexOf(a);
          const okChain = ai > idx || (a === 'lp' && idx === 0 && (this.comboMoves[m.id] || 0) < 2);
          if (okChain && this.has(a, 8)) {
            this.take(a, 8);
            const id = m.air ? 'j' + a : this.input.held.down ? 'c' + a : a;
            if (!this.moves[id]) return false;
            this.startMove(this.moves[id]);
            if (m.air) this.airAttacks++;
            return true;
          }
        }
        void prefix;
      }
      return false;
    }

    normalFx(g, m) {
      const el = this.def.element;
      const p = this.jointWorld(m.limb || 'hF');
      if (el === 'shadow') NS.FX.slash(g.particles, p.x, p.y, this.facing, this.pal.blade, 46 + m.strength * 10, m.id.includes('k') ? 0.8 : -0.3, 1.8);
      else if (el === 'electric' && m.strength >= 2) NS.FX.lightning(g.particles, p.x, p.y, p.x + this.facing * 50, p.y + U.rand(-20, 20), this.pal.accent, 1.2, 5, 14);
      else if (el === 'heavy' && m.strength >= 2) NS.FX.dust(g.particles, this.x, this.y, 3, -this.facing);
      else if (el === 'fire' && m.strength >= 2) for (let k = 0; k < 4; k++) g.particles.add({ type: 'dot', x: p.x, y: p.y, vx: this.facing * U.rand(1, 4), vy: U.rand(-2, 0), size: 8, grow: -0.3, life: 14, color: U.pick(['#f97316', '#facc15']) });
      else if (el === 'ice' && m.strength >= 2) NS.FX.element(g.particles, 'ice', p.x, p.y, this.facing, 0.3);
      else if (el === 'glitch') for (let k = 0; k < 3; k++) g.particles.add({ type: 'pixel', x: p.x + U.rand(-10, 10), y: p.y + U.rand(-10, 10), vx: this.facing * 2, vy: 0, size: 4, life: 10, color: U.pick(['#5eead4', '#ffffff']) });
      else if (el === 'core' && m.strength >= 2) g.particles.add({ type: 'ring', x: p.x, y: p.y, size: 8, grow: 3, w: 2, life: 10, color: '#fde68a' });
    }

    physics(g) {
      const GR = ST().GROUND;
      const locked = this.state === 'locked' || this.state === 'thrown';
      if (locked) { this.grounded = this.y >= GR - 1; return; }
      const noGrav = this.state === 'attack' && this.move && this.move.noGravity;
      if (!this.grounded && !noGrav) {
        const grav = this.state === 'hitstun' ? this.stat.gravity * 0.92 : this.stat.gravity;
        this.vy += grav * (this.status.slow > 0 ? 0.8 : 1);
        if (this.state === 'hitstun' || this.state === 'ko') this.spinRot = (this.spinRot || 0) + (this.launched ? -6 : -2);
      }
      this.x += this.vx + this.pushback;
      this.pushback *= 0.75;
      if (Math.abs(this.pushback) < 0.05) this.pushback = 0;
      if (!noGrav) this.y += this.vy;
      if (this.y >= GR && !noGrav) {
        this.y = GR;
        if (!this.grounded) this.onLand(g);
        this.grounded = true;
        this.vy = 0;
      } else if (this.y < GR - 0.5) this.grounded = false;
      // ma sát mặt đất
      if (this.grounded) {
        const s = this.state;
        if (s === 'hitstun' || s === 'blockstun' || s === 'down' || s === 'getup' || s === 'dizzy' || s === 'ko_down' || s === 'frozen') this.vx *= 0.84;
        else if (s === 'attack' && !(this.move && this.move.vel && this.move.vel.some((v) => this.moveFrame >= v[0] && this.moveFrame < v[1]))) this.vx *= 0.78;
      }
      NS.Collision.clampStage(this);
    }

    onLand(g) {
      const s = this.state;
      g.sfx('land', this, { vol: this.def.heavy ? 1.6 : 1 });
      NS.FX.dust(g.particles, this.x, this.y, this.def.heavy ? 8 : 4, 0);
      if (this.def.heavy && s === 'air') g.shake(2, 4);
      if (s === 'air') { this.setState('land', 4); this.vx *= 0.3; this.faceOpponent(); }
      else if (s === 'attack' && this.move && this.move.air) { this.endMove(); this.vx *= 0.3; }
      else if (s === 'hitstun' || s === 'ko') {
        if (this.koed) { this.setState('ko_down'); this.vx *= 0.4; g.shake(6, 8); NS.FX.dust(g.particles, this.x, this.y, 12, 0); this.spinRot = 0; return; }
        if (this.launched || this.kdPending) {
          this.setState('down', 36);
          this.invuln = 60;
          this.vx *= 0.4;
          g.shake(4, 6);
          NS.FX.dust(g.particles, this.x, this.y, 10, 0);
          g.sfx('kickH', this, { vol: 0.6, pitch: 0.6 });
        }
        this.launched = false; this.kdPending = false; this.spinRot = 0;
      }
    }
  }

  NS.Fighter = Fighter;
})();
