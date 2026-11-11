/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — combat.js
   COMBAT SYSTEM: xử lý va chạm đòn đánh mỗi frame.
   - Hitbox ↔ Hurtbox, kiểm tra hướng tấn công & tầm đánh (cao/thấp/overhead)
   - Đỡ đòn (giảm sát thương), Perfect Block (đỡ đúng thời điểm → phản công)
   - Guard gauge (chống "rùa"), ném phá thủ, né tránh có i-frame
   - Combo, damage scaling, chống spam cùng một chiêu, juggle limit
   - Counter hit, knockback, hitstun, hitstop, hiệu ứng & âm thanh
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const U = NS.U;
  const C = () => NS.Collision;

  const PARRY_WINDOW = 7;     // frame
  const JUGGLE_MAX = 7;
  const COMBO_SCALE = [1, 1, 0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.44, 0.38, 0.34, 0.3];

  /* -------- Kiểm tra mọi va chạm trong frame -------- */
  function resolve(g) {
    const [a, b] = g.fighters;
    meleePass(g, a, b);
    meleePass(g, b, a);
    projectilePass(g);
  }

  function meleePass(g, att, def) {
    const actives = C().activeHits(att);
    if (!actives.length) return;
    for (const ah of actives) {
      const key = att.moveInstance + ':' + ah.index;
      if (att.hitIds.has(key)) continue;
      if (ah.hit.throw) { tryThrow(g, att, def, ah, key); continue; }
      const hurts = C().hurtboxes(def);
      let hitBox = null;
      for (const hb of hurts) { if (C().overlap(ah.box, hb)) { hitBox = hb; break; } }
      if (!hitBox) continue;
      // Né tránh: đòn xuyên qua trong i-frame
      if (def.invuln > 0 || def.isInvulnFor('melee')) {
        if (def.state === 'dodge' || def.state === 'getup' || (def.move && def.move.mobility)) registerEvade(g, def, att);
        att.hitIds.add(key);
        continue;
      }
      att.hitIds.add(key);
      const pt = C().intersectCenter(ah.box, hitBox);
      applyHit(g, att, def, ah.hit, { point: pt, move: att.move });
    }
  }

  function registerEvade(g, def, att) {
    if (def._evadeFrame === g.frame) return;
    def._evadeFrame = g.frame;
    if (def.evadeCounter > 0) return;
    def.evadeCounter = 30;
    g.hud.popup(def.side, 'EVADE', 'evade');
    g.sfx('evade', def);
    g.slowmo(0.45, 14);
    g.ghost(def, { color: '#7dd3fc', life: 16 });
  }

  function tryThrow(g, att, def, ah, key) {
    att.hitIds.add(key);
    if (!def.grounded || def.invuln > 0 || def.isInvulnFor('melee')) return;
    const throwable = ['idle', 'walk', 'crouch', 'block', 'run', 'land', 'attack'].includes(def.state) && !(def.state === 'attack' && def.move && def.move.kind === 'ult');
    if (!throwable) return;
    const hurts = C().hurtboxes(def);
    if (!hurts.some((hb) => C().overlap(ah.box, hb))) return;
    // Thoát ném: defender cũng bấm ném trong cửa sổ
    if (def.throwTechWindow(g.frame)) {
      g.hud.popup(def.side, 'TECH', 'tech');
      g.sfx('tech', def);
      NS.FX.block(g.particles, (att.x + def.x) / 2, def.y - 110, att.facing);
      att.vx = -att.facing * 7; def.vx = att.facing * 7;
      att.endMove(); def.toIdle();
      att.state = 'blockstun'; att.stateTimer = 12;
      return;
    }
    // Ném thành công
    g.sfx('grab', att);
    def.setLocked(att);
    def.state = 'thrown';
    const mv = {
      id: 'throw_exec', name: 'Throw', kind: 'throw', scripted: true, total: 34, hits: [], inv: [0, 34],
      anim: [[0, 'grab'], [10, 'grab'], [18, 'toss'], [34, 'guard']],
      onFrame: (f, game, fr) => {
        if (fr < 18) { def.x = f.x + f.facing * 58; def.y = Math.min(def.y, C().STAGE.GROUND - fr * 3); def.spinRot = -fr * 4; }
        if (fr === 18) {
          game.shake(8, 10);
          applyHit(game, f, def, Object.assign({}, ah.hit, { hs: 40, kb: 8, launch: 9, kd: true, hitstop: 10, element: f.def.element, sfx: 'throw', shake: 8, isThrow: true }), { forced: true });
          game.hud.popup(f.side, 'THROW', 'throw');
          f.stats.throws++;
        }
      },
      onEnd: (f, game) => { if (def.lockedBy === f) def.release(game); },
    };
    att.startMove(mv, { free: true });
  }

  /* -------- Đạn & bẫy -------- */
  function projectilePass(g) {
    const P = g.projectiles;
    // va chạm đạn với đạn
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (!p.active || p.hazard) continue;
      for (let j = i + 1; j < P.length; j++) {
        const q = P[j];
        if (!q.active || q.hazard || q.owner === p.owner) continue;
        if (!C().overlap(p.box(), q.box())) continue;
        const pp = p.power, qp = q.power;
        if (!p.pierceProj || q.pierceProj) p.power -= qp;
        if (!q.pierceProj || p.pierceProj) q.power -= pp;
        if (p.power <= 0) p.dead = true;
        if (q.power <= 0) q.dead = true;
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        NS.FX.hit(g.particles, mx, my, 1, p.hit.element, 1);
        g.sfx('hitL', p.owner);
      }
    }
    // va chạm đạn với chiến binh
    for (const p of P) {
      if (!p.active || p.cd > 0) continue;
      for (const f of g.fighters) {
        if (f === p.owner) continue;
        if (p.ground && !f.grounded) continue;
        const hurts = C().hurtboxes(f);
        const pb = p.box();
        if (!hurts.some((hb) => C().overlap(pb, hb))) continue;
        if (f.invuln > 0 || f.isInvulnFor('proj')) {
          if (f.state === 'dodge' || (f.move && f.move.mobility)) registerEvade(g, f, p.owner);
          continue;
        }
        // Thế phản đòn với đạn
        if (f.guardActive()) {
          const r = guardReact(g, f, p.owner, p.hit, p);
          if (r === 'absorb') { p.dead = true; continue; }
          if (r === 'reflect') continue;
        }
        const res = applyHit(g, p.owner, f, p.hit, { proj: p, point: { x: p.x, y: p.y } });
        p.hitCount++;
        p.cd = p.interval;
        if (res === 'hit' && p.onHitTarget) p.onHitTarget(p, f, g);
        if (p.hitCount >= p.hits) { p.dead = true; if (p.onDeath) p.onDeath(p, g); }
      }
    }
    g.projectiles = P.filter((p) => !p.dead);
  }

  /* -------- Thế phòng thủ đặc biệt (Iron Bastion, Crystal Guard, Counter Protocol, Aegis) -------- */
  function guardReact(g, def, att, hit, proj) {
    const type = def.move.guard.type;
    if (type === 'bastion') {
      return null; // xử lý trong applyHit (giảm sát thương + phản đòn)
    }
    if (type === 'freeze') {
      if (proj) { NS.FX.element(g.particles, 'ice', proj.x, proj.y, 1, 1.5); g.sfx('ice', def); return 'absorb'; }
      att.applyStatus({ freeze: 55 });
      att.freezeNow(g);
      g.hud.popup(def.side, 'COUNTER', 'counter');
      def.stats.counters++;
      g.sfx('shatter', def);
      NS.FX.shatter(g.particles, att.x, att.y - 100, 40);
      def.moveFrame = Math.max(def.moveFrame, 30);
      return 'absorb';
    }
    if (type === 'zero') {
      if (proj) { def.energy = Math.min(100, def.energy + 20); NS.FX.element(g.particles, 'glitch', proj.x, proj.y, 1, 1.5); g.sfx('glitch', def); return 'absorb'; }
      NS.FX.element(g.particles, 'glitch', def.x, def.y - 100, 1, 2);
      def.x = C().STAGE.WALL + U.clamp(att.x - att.facing * 80 - C().STAGE.WALL, 0, C().STAGE.W - C().STAGE.WALL * 2);
      def.facing = Math.sign(att.x - def.x) || 1;
      def.startMove(def.moves.zeroCounter, { free: true });
      def.counterNext = true;
      g.hud.popup(def.side, 'COUNTER', 'counter');
      def.stats.counters++;
      g.sfx('counter', def);
      return 'absorb';
    }
    if (type === 'aegis') {
      if (proj) {
        proj.owner = def; proj.vx = -proj.vx; proj.facing = -proj.facing; proj.hitCount = 0; proj.cd = 4;
        g.sfx('parry', def);
        NS.FX.parry(g.particles, proj.x, proj.y);
        g.hud.popup(def.side, 'REFLECT', 'parry');
        return 'reflect';
      }
      return null; // giảm sát thương trong applyHit
    }
    return null;
  }

  /**
   * Áp dụng một đòn trúng/đỡ.
   * ctx: { proj, point, move, forced (bỏ qua đỡ/miễn nhiễm), keepLock }
   * Trả về 'hit' | 'block' | 'parry' | 'armor' | 'whiff'
   */
  function applyHit(g, att, def, hit, ctx = {}) {
    const forced = !!ctx.forced;
    const pt = ctx.point || { x: (att.x + def.x) / 2, y: def.y - 110 };
    const fromX = ctx.proj ? ctx.proj.x - ctx.proj.vx * 3 : att.x;
    const dir = Math.sign(def.x - fromX) || att.facing;
    if (def.hp <= 0 && !forced) return 'whiff';

    if (!forced) {
      // Thế phản đòn cận chiến
      if (!ctx.proj && def.guardActive()) {
        const r = guardReact(g, def, att, hit, null);
        if (r === 'absorb') { g.hitstop = Math.max(g.hitstop, 8); return 'parry'; }
      }
      // ---- ĐỠ ĐÒN ----
      const facingOk = C().isInFront(def, fromX);
      const canBlock = def.canBlockNow() && facingOk && !hit.unblockable;
      const levelOk = hit.level === 'low' ? def.crouching : hit.level === 'overhead' ? !def.crouching : true;
      if (canBlock && levelOk) return doBlock(g, att, def, hit, ctx, pt, dir);
    }

    // ---- TRÚNG ĐÒN ----
    const wasStunned = def.inHitstun();
    const airborne = !def.grounded;
    if (airborne && wasStunned && !forced) {
      def.juggle += hit.jug || 1;
      if (def.juggle > JUGGLE_MAX) { def.invuln = Math.max(def.invuln, 10); return 'whiff'; }
    }
    // Combo
    if (wasStunned || forced) att.combo++;
    else { att.endComboReport(g); att.combo = 1; att.comboDmg = 0; att.comboMoves = {}; def.juggle = 0; }
    const isNewCombo = att.combo === 1;
    // Counter / Punish
    let counter = false, punish = false;
    if (!forced && !wasStunned && def.state === 'attack' && def.move && !def.move.scripted) {
      const firstActive = def.move.hits && def.move.hits.length ? def.move.hits[0].f : def.move.total;
      if (def.moveFrame < firstActive) counter = true; else punish = true;
    }
    if (att.evadeCounter > 0 || att.backstab > 0 || att.counterNext || hit.counterHit) { counter = true; att.evadeCounter = 0; att.backstab = 0; att.counterNext = false; }
    if (att.parryCounter > 0) { counter = true; att.parryCounter = 0; }

    // Sát thương
    const mvId = (ctx.move && ctx.move.id) || (ctx.proj ? 'proj_' + ctx.proj.type : 'x');
    att.comboMoves[mvId] = (att.comboMoves[mvId] || 0) + 1;
    let dmg = hit.dmg * att.stat.atkMul;
    const scaleIdx = Math.min(att.combo - 1, COMBO_SCALE.length - 1);
    if (!ctx.keepLock) dmg *= COMBO_SCALE[scaleIdx];
    else dmg *= Math.max(0.6, COMBO_SCALE[Math.min(scaleIdx, 4)]);
    if (att.comboMoves[mvId] > 2 && !hit.noStale && !ctx.keepLock) dmg *= 0.6; // chống spam một chiêu
    if (counter) dmg *= 1.25;
    else if (punish) dmg *= 1.1;
    dmg *= def.stat.defMul;
    if (att.def.id === 'frost' && (def.status.slow > 0 || def.status.freeze > 0)) dmg *= 1.12;
    // Zero thích nghi
    if (def.def.id === 'zero') {
      const n = (def.adapt[mvId] = (def.adapt[mvId] || 0) + 1);
      dmg *= 1 - Math.min(0.32, (n - 1) * 0.08);
    }
    // Giáp / thế phòng thủ
    let armored = false;
    if (!forced && def.hasArmor()) {
      armored = true;
      def.armorHits--;
      dmg *= 0.5;
    }
    if (!forced && def.guardActive() && def.move.guard.type === 'bastion') {
      armored = true;
      dmg *= 0.3;
      if (!def._bastionTriggered) {
        def._bastionTriggered = true;
        const cm = def.moves[def.move.counterMove];
        if (cm) { def.facing = Math.sign(att.x - def.x) || def.facing; def.startMove(cm, { free: true }); def.counterNext = true; }
        g.hud.popup(def.side, 'COUNTER', 'counter');
        def.stats.counters++;
      }
    }
    if (!forced && def.guardActive() && def.move.guard.type === 'aegis') { armored = true; dmg *= 0.2; }
    dmg = Math.max(1, Math.round(dmg));

    def.hp = Math.max(0, def.hp - dmg);
    def.lastHitBy = { attacker: att, hit, kind: (ctx.move && ctx.move.kind) || (ctx.proj ? 'skill' : 'normal') };
    att.comboDmg += dmg;
    att.stats.damage += dmg;
    att.stats.hits++;
    if (counter) { att.stats.counters++; g.hud.popup(att.side, 'COUNTER', 'counter'); g.sfx('counter', att); }
    else if (punish && isNewCombo) g.hud.popup(att.side, 'PUNISH', 'punish');

    // Năng lượng & Ultimate
    att.gainEnergy((hit.energy || 2) * (ctx.proj ? 0.6 : 1));
    att.gainUlt(dmg * 0.07);
    def.gainEnergy(dmg * 0.045);
    def.gainUlt(dmg * 0.09);
    if (hit.drain) { def.energy = Math.max(0, def.energy - hit.drain); }

    // Hiệu ứng trạng thái
    if (hit.status) def.applyStatus(hit.status);
    if (def.status.freeze > 0 && def.state === 'frozen' && !forced) {
      def.status.freeze = 0; // đánh vỡ băng
      NS.FX.shatter(g.particles, def.x, def.y - 100, 40);
      g.sfx('shatter', def);
    }

    // Phản ứng vật lý
    const power = dmg >= 90 ? 3 : dmg >= 55 ? 2 : 1;
    if (!armored || def.hp <= 0) {
      const kbDir = hit.radial ? dir : (ctx.proj ? Math.sign(ctx.proj.vx) || dir : att.facing);
      let hs = hit.hs + (counter ? 8 : 0) + (def.status.shock > 0 ? 6 : 0);
      if (def.status.shock > 0) def.status.shock = Math.max(0, def.status.shock - 20);
      def.takeHit(g, {
        hs, kb: (hit.kb || 0) * (1 + (att.combo > 6 ? 0.25 : 0)), dir: kbDir,
        launch: hit.launch || (airborne && !ctx.keepLock ? 4 : 0), kd: !!hit.kd, low: hit.level === 'low',
        keepLock: !!ctx.keepLock, forced,
      });
      // ép người tấn công lùi khi đối thủ dính tường
      if (def.atWall && !ctx.proj && !ctx.keepLock && att.grounded) att.pushback = -att.facing * (hit.kb || 2) * 1.2;
    } else {
      g.sfx('armor', def);
      def.flash = 4;
    }

    // Hitstop / rung màn hình / hạt
    const hs = (hit.hitstop || 6) + (counter ? 4 : 0);
    g.hitstop = Math.max(g.hitstop, hs);
    def.flash = Math.max(def.flash, 5);
    if (hit.shake || power >= 2) g.shake((hit.shake || power * 2) * (counter ? 1.4 : 1), 8 + power * 2);
    NS.FX.hit(g.particles, pt.x, pt.y, kbDir_or(dir, att, ctx), hit.element || att.def.element, power);
    if (NS.Storage.settings.showDamage) NS.FX.text(g.particles, pt.x + U.rand(-10, 10), pt.y - 30, String(dmg), counter ? '#fde047' : '#ffffff', 16 + power * 4);
    g.sfx(hit.sfx || (power >= 2 ? 'hitH' : 'hitL'), att, { pitch: 1 + Math.min(att.combo, 10) * 0.02 });
    if (counter && power >= 2) g.zoomPulse(1.08, 14);

    // Combo HUD
    if (att.combo >= 2) {
      g.hud.combo(att.side, att.combo, att.comboDmg, att);
      g.sfx('combo', att, { n: att.combo, gap: 0 });
    }
    att.stats.maxCombo = Math.max(att.stats.maxCombo, att.combo);

    if (hit.onHit) hit.onHit(att, def, g);
    if (!ctx.proj && ctx.move && hit.lockOnHit && ctx.move.onHit && def.hp > 0) ctx.move.onHit(att, def, g, hit);
    else if (!ctx.proj && ctx.move && hit.lockOnHit && ctx.move.onHit && def.hp <= 0) { /* KO bằng đòn mở màn */ }
    if (ctx.move && ctx.move.stopOnHit) att.vx = 0, att._stopVel = true;
    att.moveHit = true;

    if (def.hp <= 0) g.onKO(att, def, hit, ctx);
    return armored ? 'armor' : 'hit';
  }
  function kbDir_or(dir, att, ctx) { return ctx.proj ? Math.sign(ctx.proj.vx) || dir : att.facing; }

  function doBlock(g, att, def, hit, ctx, pt, dir) {
    // Perfect Block (Parry)
    const parry = def.parryReady(g.frame, PARRY_WINDOW);
    if (parry) {
      def.stats.parries++;
      def.gainEnergy(14);
      def.gainUlt(6);
      def.parryCounter = 40;
      def.guard = Math.min(100, def.guard + 20);
      g.hud.popup(def.side, 'PERFECT', 'parry');
      g.sfx('parry', def);
      NS.FX.parry(g.particles, pt.x, pt.y);
      g.hitstop = Math.max(g.hitstop, 14);
      g.zoomPulse(1.06, 16);
      g.slowmo(0.5, 12);
      def.toBlockStun(4);
      if (!ctx.proj && att.state === 'attack' && !att.move.scripted) {
        att.stagger(g, 22); // người tấn công bị khựng → cơ hội phản công
      }
      att.moveBlocked = true;
      return 'parry';
    }
    // Đỡ thường: giảm sát thương còn chip
    const chipRate = hit.chip !== undefined ? hit.chip : att.move && att.move.kind === 'normal' ? 0 : 0.18;
    const chip = Math.round(hit.dmg * chipRate * att.stat.atkMul);
    if (chip > 0) def.hp = Math.max(1, def.hp - chip);
    def.guard -= hit.dmg * 0.32;
    def.gainEnergy(3);
    att.gainEnergy((hit.energy || 2) * 0.5);
    def.stats.blocked++;
    def.toBlockStun(hit.bs || 10, ctx.proj ? Math.sign(ctx.proj.vx) * (hit.kb || 2) * 0.8 : att.facing * Math.max(2, (hit.kb || 2) * 0.9));
    if (def.atWall && !ctx.proj && att.grounded) att.pushback = -att.facing * Math.max(2.5, (hit.kb || 2));
    g.hitstop = Math.max(g.hitstop, Math.round((hit.hitstop || 6) * 0.6));
    NS.FX.block(g.particles, pt.x, pt.y, dir);
    g.sfx('block', def);
    att.moveBlocked = true;
    if (def.guard <= 0) {
      // Phá thủ
      def.guard = 100;
      def.guardBreak(g);
      g.hud.popup(def.side, 'GUARD BREAK', 'break');
      g.sfx('guardBreak', def);
      g.shake(8, 12);
      NS.FX.hit(g.particles, pt.x, pt.y, dir, 'neutral', 3);
    } else g.hud.popup(def.side, 'BLOCK', 'block');
    return 'block';
  }

  NS.Combat = { resolve, applyHit, PARRY_WINDOW, JUGGLE_MAX };
})();
