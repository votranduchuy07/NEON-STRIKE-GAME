/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — ui-match.js
   Màn hình trận đấu (HUD + tạm dừng), Kết quả, Hội thoại Story, Kết thúc Story.
   ========================================================================= */
(function () {
  'use strict';
  const NS = window.NS;
  const U = NS.U;
  const $ = (s, r) => U.$(s, r), $$ = (s, r) => U.$$(s, r);
  const S = () => NS.Storage;
  const UI = NS.UI;
  const SCREENS = UI.SCREENS;
  const { ICON, DIFF_LABEL, statBars, skillList, keysFor, charLockText, playerCard, header, bindBack, arenaUnlocked } = NS.UIH;

  /* ---------------- HUD / GAMEPLAY ---------------- */
  SCREENS.hud = {
    noBack: true,
    enter(el, params) {
      const cfg = params.cfg;
      this.cfg = cfg;
      UI.bg.stop();
      document.body.classList.add('in-game');
      el.innerHTML = `
        <div class="stage-wrap"><div class="stage">
          <canvas id="game-canvas"></canvas>
          <div class="hud-root"></div>
          <div class="overlay pause-ov"></div>
        </div></div>`;
      this.el = el;
      this.startMatch(cfg);
    },
    startMatch(cfg) {
      if (UI.game) { UI.game.destroy(); UI.game = null; }
      const solo = !!cfg.p2.ai || cfg.mode === 'training';
      const c1 = NS.Input.createHuman('p1', solo);
      let c2;
      if (cfg.mode === 'training') c2 = new NS.AI.DummyController(cfg.training ? cfg.training.dummy : 'stand');
      else if (cfg.p2.ai) c2 = new NS.AI.AIController(cfg.p2.ai);
      else c2 = NS.Input.createHuman('p2', false);
      const hud = new NS.HUD($('.hud-root', this.el));
      const game = new NS.Game({
        canvas: $('#game-canvas', this.el), hud, mode: cfg.mode, arena: cfg.arena, rounds: cfg.rounds, time: cfg.time,
        training: cfg.training ? Object.assign({}, cfg.training) : null,
        p1: { char: cfg.p1.char, costume: cfg.p1.costume, controller: c1, hp: cfg.p1.hp, name: cfg.p1.name },
        p2: { char: cfg.p2.char, costume: cfg.p2.costume, controller: c2, hpMul: cfg.p2.hpMul },
        onEnd: (res) => {
          setTimeout(() => {
            if (UI.game !== game) return;
            NS.Modes.onMatchEnd(res);
          }, 400);
        },
      });
      hud.build(game);
      UI.game = game;
      $('.hud-pause', this.el).addEventListener('click', () => this.togglePause(true));
      game.start();
      this.buildPause();
    },
    buildPause() {
      const ov = $('.pause-ov', this.el);
      const g = UI.game;
      ov.innerHTML = `<div class="pause glass">
        <div class="pause-h"><small>${NS.Modes.MODES[this.cfg.mode].name}</small><h2>PAUSED</h2></div>
        <div class="pause-list">
          <button class="nbtn primary nav-item" data-p="resume">TIẾP TỤC</button>
          <button class="nbtn nav-item" data-p="restart">CHƠI LẠI</button>
          <button class="nbtn nav-item" data-p="moves">BẢNG CHIÊU THỨC</button>
          <button class="nbtn nav-item" data-p="settings">CÀI ĐẶT</button>
          <button class="nbtn danger nav-item" data-p="quit">THOÁT VỀ MENU</button>
        </div>
        <div class="pause-extra"></div>
      </div>`;
      $$('[data-p]', ov).forEach((b) => b.addEventListener('click', () => {
        const a = b.dataset.p;
        if (a === 'resume') this.togglePause(false);
        if (a === 'restart') UI.confirm('Chơi lại trận này từ đầu?', () => { this.togglePause(false); this.startMatch(this.cfg); });
        if (a === 'quit') UI.confirm('Thoát về Main Menu? Kết quả trận này sẽ không được lưu.', () => { this.quit(); });
        if (a === 'moves') this.showMoves();
        if (a === 'settings') { const ex = $('.pause-extra', ov); ex.innerHTML = '<div class="pause-settings"></div>'; UI.buildSettings($('.pause-settings', ex), true); }
      }));
      void g;
    },
    showMoves() {
      const g = UI.game, f = g.p1, def = f.def;
      const k = keysFor('p1');
      const moves = [
        ['Đấm nhanh / mạnh', `${k.lp} / ${k.hp}`], ['Đá nhanh / mạnh', `${k.lk} / ${k.hk}`], ['Đòn thấp', `${k.down} + đòn`], ['Đòn trên không (overhead)', `${k.up} rồi đòn`],
        ['Đỡ đòn (giữ)', k.block], ['Perfect Block', `Nhấn ${k.block} ngay trước khi trúng`], ['Né tránh (i-frame)', `${k.dodge} (+ tiến để lướt qua)`], ['Chạy / Lùi nhanh', 'Nhấn đúp tiến / lùi'],
        ['Ném (phá thế đỡ)', `${k.lp} + ${k.lk}`], ['Thoát ném', `${k.lp} + ${k.lk} khi bị túm`],
        [def.skills.s1.name, k.s1], [def.skills.s2.name, k.s2], [def.skills.s3.name, k.s3], [`ULTIMATE: ${def.skills.ult.name}`, `${k.ult} (thanh ULT đầy)`],
      ];
      const combos = ['Đấm nhanh → Đấm mạnh → Đá mạnh (chuỗi đòn thường mạnh dần)', 'Nhảy → Đá → (tiếp đất) Đấm', 'Né tránh thành công → đòn bất kỳ = COUNTER', 'Đòn thường trúng → Kỹ năng → Ultimate (PERFECT COMBO)', 'Perfect Block → phản đòn khi đối thủ bị khựng'];
      $('.pause-extra', this.el).innerHTML = `<div class="moves">
        <h4>${def.name} — ${def.title}</h4>
        <div class="mv-grid">${moves.map(([n, kk]) => `<span>${U.esc(n)}</span><kbd>${U.esc(kk)}</kbd>`).join('')}</div>
        <h4>COMBO GỢI Ý</h4><ul>${combos.map((c) => `<li>${c}</li>`).join('')}</ul>
        <p class="mv-passive"><b>${def.passive.name}:</b> ${U.esc(def.passive.desc)}</p>
      </div>`;
    },
    togglePause(on) {
      const g = UI.game;
      if (!g || g.phase === 'matchEnd') return;
      if (on === undefined) on = !g.paused;
      g.pause(on);
      const ov = $('.pause-ov', this.el);
      ov.classList.toggle('show', on);
      if (on) { $('.pause-extra', ov).innerHTML = ''; NS.Audio.sfx('back'); setTimeout(() => UI.setFocus($('[data-p="resume"]', ov), true), 20); }
    },
    quit() {
      this.togglePause(false);
      UI.go('menu');
    },
    onKey(e) {
      if (UI.modalEl.classList.contains('show')) return false;
      const g = UI.game;
      if (!g) return true;
      if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); this.togglePause(); return true; }
      if (g.paused) return false; // cho phép điều hướng menu tạm dừng
      return true;
    },
    leave() {
      if (UI.game) { UI.game.destroy(); UI.game = null; }
      document.body.classList.remove('in-game');
      NS.Input.Touch.reset();
      UI.bg.start();
    },
  };

  /* ---------------- RESULTS ---------------- */
  SCREENS.results = {
    noBack: true,
    enter(el, info) {
      const r = info.result, cfg = info.cfg;
      const win = info.won, draw = info.draw;
      const ws = r.winnerSide;
      const wChar = ws >= 0 ? (ws === 0 ? cfg.p1 : cfg.p2) : cfg.p1;
      const wDef = NS.Chars.get(wChar.char);
      const versus = !cfg.p2.ai;
      const title = draw ? 'DRAW' : versus ? (ws === 0 ? '1P WINS' : '2P WINS') : win ? 'VICTORY' : 'DEFEAT';
      NS.Audio.playMusic('results');
      const s1 = r.p1.stats, s2 = r.p2.stats;
      const row = (label, a, b, fmt = (x) => x) => `<div class="rs-row"><b class="${a > b ? 'hi' : ''}">${fmt(a)}</b><span>${label}</span><b class="${b > a ? 'hi' : ''}">${fmt(b)}</b></div>`;
      const rw = info.rewards;
      const quote = ws >= 0 ? U.pick(wDef.win) : '...';
      el.innerHTML = `
        <div class="results ${win ? 'win' : draw ? 'draw' : 'lose'}" style="--acc:${wDef.palettes[wChar.costume || 0].accent}">
          <div class="rs-hero"><canvas class="rs-cv"></canvas><div class="rs-quote">“${U.esc(quote)}”<small>— ${wDef.name}</small></div></div>
          <div class="rs-main">
            <div class="rs-title"><small>${U.esc(info.storyLine || (cfg.stageLabel || NS.Modes.MODES[cfg.mode].name))}</small><h1 class="glitch" data-text="${title}">${title}</h1></div>
            <div class="rs-stats glass">
              <div class="rs-head"><span>${NS.Chars.get(cfg.p1.char).name} <em>1P</em></span><span>THỐNG KÊ</span><span><em>${cfg.p2.ai ? 'CPU' : '2P'}</em> ${NS.Chars.get(cfg.p2.char).name}</span></div>
              ${row('SÁT THƯƠNG', s1.damage, s2.damage, U.fmtNum)}
              ${row('COMBO CAO NHẤT', s1.maxCombo, s2.maxCombo)}
              ${row('SỐ COMBO', s1.combos, s2.combos)}
              ${row('COUNTER', s1.counters, s2.counters)}
              ${row('PERFECT BLOCK', s1.parries, s2.parries)}
              ${row('ULTIMATE', s1.ults, s2.ults)}
              ${row('HIỆP THẮNG', r.p1.roundsWon, r.p2.roundsWon)}
              <div class="rs-time">THỜI GIAN TRẬN: <b>${U.fmtTime(r.duration)}</b></div>
            </div>
            ${info.survival ? `<div class="rs-mode glass"><b>SURVIVAL</b><span>Đã hạ: <em>${info.survival.defeated}</em></span><span>Điểm: <em>${U.fmtNum(info.survival.score)}</em></span>${info.survival.gained ? `<span>+${U.fmtNum(info.survival.gained)}</span>` : ''}${info.survival.hp ? `<span>HP mang sang: <em>${info.survival.hp}/${info.survival.maxHp}</em></span>` : ''}${info.survival.final ? `<span class="rk">${info.survival.rank >= 0 ? `XẾP HẠNG #${info.survival.rank + 1}` : 'KHÔNG VÀO BẢNG'}</span>` : ''}</div>` : ''}
            ${info.timeattack ? `<div class="rs-mode glass"><b>TIME ATTACK</b><span>Trận ${info.timeattack.idx}/${info.timeattack.total}</span><span>Split: <em>${U.fmtTime(info.timeattack.split)}</em></span><span>Tổng: <em>${U.fmtTime(info.timeattack.time)}</em></span>${info.timeattack.final ? `<span class="rk">KỶ LỤC #${info.timeattack.rank + 1} • BEST ${U.fmtTime(info.timeattack.best)}</span>` : ''}${info.timeattack.failed ? '<span class="rk bad">THẤT BẠI</span>' : ''}</div>` : ''}
            ${rw ? `<div class="rs-rewards glass">
              <div class="rw-exp"><span>EXP</span><b>+${rw.exp}${rw.eventBonus ? ' <em>EVENT x1.5</em>' : ''}</b></div>
              <div class="rw-bar"><i></i><span class="rw-lv">LV ${rw.levelBefore}</span></div>
              <div class="rw-cr"><span>CREDITS</span><b>+${rw.credits}</b></div>
              ${rw.quests.length ? `<div class="rw-q">${rw.quests.map((q) => `<span>✔ ${U.esc(q)}</span>`).join('')}</div>` : ''}
            </div>` : ''}
            <div class="rs-btns">${info.buttons.map((b, i) => `<button class="nbtn ${b.primary ? 'primary' : ''} nav-item" data-b="${i}" ${i === 0 ? 'data-autofocus' : ''}>${b.label}</button>`).join('')}</div>
          </div>
        </div>`;
      UI.preview($('.rs-cv', el), { char: wChar.char, costume: wChar.costume, state: draw ? 'idle' : 'victory', scale: 1.1, facing: 1 });
      $$('[data-b]', el).forEach((b) => b.addEventListener('click', () => info.buttons[+b.dataset.b].act()));
      if (rw) this.animateExp(el, rw);
      NS.Audio.sfx(win || (versus && !draw) ? 'win' : 'lose');
    },
    animateExp(el, rw) {
      const bar = $('.rw-bar i', el), lv = $('.rw-lv', el);
      const p = S().profile;
      const endK = p.exp / S().expToNext(p.level);
      const levels = rw.levelAfter - rw.levelBefore;
      let lvl = rw.levelBefore, k = 0;
      const target = levels > 0 ? 1 : endK;
      const startK = levels > 0 ? 0.0 : Math.max(0, endK - rw.exp / S().expToNext(p.level));
      k = startK;
      const step = () => {
        k += 0.02;
        if (k >= target) {
          if (lvl < rw.levelAfter) {
            lvl++; k = 0; lv.textContent = `LV ${lvl}`;
            NS.Audio.sfx('levelup');
            UI.toast('LEVEL UP!', `Đạt Level ${lvl} • +100 CR`, 'level');
            if (lvl === rw.levelAfter) { bar.style.setProperty('--v', 0); animTo(endK); return; }
          } else { bar.style.setProperty('--v', target); return; }
        }
        bar.style.setProperty('--v', k);
        requestAnimationFrame(step);
      };
      const animTo = (t) => { let x = 0; const s2 = () => { x = Math.min(t, x + 0.02); bar.style.setProperty('--v', x); if (x < t) requestAnimationFrame(s2); }; s2(); };
      setTimeout(step, 600);
      setTimeout(() => UI.notifyRewards(rw.unlocked), 1200);
    },
  };

  /* ---------------- DIALOGUE ---------------- */
  SCREENS.dialogue = {
    noBack: true,
    enter(el, params) {
      this.p = params;
      this.i = 0;
      const sess = NS.Modes.session;
      const me = sess && sess.p1 ? sess.p1.char : params.lines[0][0];
      const other = (params.lines.find((l) => l[0] !== me) || [null])[0];
      this.left = me; this.right = other;
      const ar = NS.Arenas.DEFS[params.bg] || NS.Arenas.DEFS.neon_city;
      NS.Audio.playMusic(params.bg === 'sanctum' ? 'sanctum' : 'select');
      el.innerHTML = `
        <div class="dlg" style="--acc:${ar.light}">
          <canvas class="dlg-bg"></canvas>
          <div class="dlg-head"><small>${U.esc(params.sub || ar.name)}</small><h3>${U.esc(params.title || '')}</h3></div>
          <div class="dlg-por l"><img src="${NS.Anim.portrait(me, sess && sess.p1 ? sess.p1.costume : 0, 320, 320)}" alt=""></div>
          ${other ? `<div class="dlg-por r"><img src="${NS.Anim.portrait(other, 0, 320, 320)}" alt=""></div>` : ''}
          <div class="dlg-box glass"><div class="dlg-name"></div><div class="dlg-text"></div><div class="dlg-next blink">▼</div></div>
          <button class="nbtn ghost dlg-skip nav-item">SKIP ▸▸</button>
        </div>`;
      const cv = $('.dlg-bg', el);
      cv.width = 640; cv.height = 360;
      const arena = new NS.Arenas.Arena(ar.id, 'medium', true);
      for (let i = 0; i < 20; i++) arena.update();
      NS.Arenas.drawPreview(cv.getContext('2d'), arena, 640, 360);
      $('.dlg-box', el).addEventListener('click', () => this.advance());
      $('.dlg-skip', el).addEventListener('click', () => this.finish());
      this.el = el;
      this.done = false;
      this.show();
    },
    show() {
      const L = this.p.lines[this.i];
      if (!L) { this.finish(); return; }
      const [who, text] = L;
      const def = NS.Chars.get(who);
      const el = this.el;
      $('.dlg-name', el).innerHTML = `<b style="color:${def.palettes[0].accent}">${def.name}</b><span>${def.title}</span>`;
      $('.dlg-por.l', el).classList.toggle('talk', who === this.left);
      const r = $('.dlg-por.r', el); if (r) r.classList.toggle('talk', who !== this.left);
      const t = $('.dlg-text', el);
      this.full = text; this.k = 0; this.typing = true;
      clearInterval(this.tt);
      this.tt = setInterval(() => {
        this.k += 2;
        t.textContent = text.slice(0, this.k);
        if (this.k % 4 === 0) NS.Audio.sfx('type', { gap: 0 });
        if (this.k >= text.length) { clearInterval(this.tt); this.typing = false; }
      }, 28);
    },
    advance() {
      if (this.typing) { clearInterval(this.tt); this.typing = false; $('.dlg-text', this.el).textContent = this.full; return; }
      NS.Audio.sfx('click');
      this.i++;
      if (this.i >= this.p.lines.length) this.finish(); else this.show();
    },
    finish() { if (this.done) return; this.done = true; clearInterval(this.tt); this.p.onDone && this.p.onDone(); },
    onKey(e) {
      if (['Enter', 'Space', 'KeyF', 'KeyJ', 'KeyK'].includes(e.code)) this.advance();
      if (e.code === 'Escape') this.finish();
      return true;
    },
    leave() { clearInterval(this.tt); },
  };

  /* ---------------- STORY ENDING ---------------- */
  SCREENS.ending = {
    noBack: true,
    enter(el, params) {
      const c = params.char, def = NS.Chars.get(c);
      const E = NS.Story.ENDINGS[c];
      NS.Audio.playMusic('sanctum');
      el.innerHTML = `
        <div class="ending" style="--acc:${def.palettes[params.costume || 0].accent}">
          <canvas class="end-cv"></canvas>
          <div class="end-txt">
            <small>ENDING — ${def.name}</small>
            <h1>${E.title}</h1>
            ${E.text.map((p, i) => `<p style="--d:${0.8 + i * 1.6}s">${U.esc(p)}</p>`).join('')}
            <div class="end-unlock" style="--d:${0.8 + E.text.length * 1.6}s">
              <b>STORY CLEAR!</b> +300 CR • Kết thúc đã được lưu trong COLLECTION.
              ${(params.unlocked || []).map((u) => `<span class="chip">MỞ KHÓA: ${U.esc(u.name || u.ref)}</span>`).join('')}
            </div>
            <button class="nbtn primary nav-item" data-autofocus style="--d:${1.2 + E.text.length * 1.6}s">TIẾP TỤC</button>
          </div>
          <div class="credits"><div class="credits-in">
            <h2>NEON STRIKE</h2><p>THE LAST LIGHT</p><br>
            <p><b>Game Design & Code</b><br>Neo-Veyra Dev Team</p><p><b>Engine</b><br>HTML5 Canvas • Web Audio API</p>
            <p><b>Âm nhạc & SFX</b><br>100% tổng hợp thời gian thực</p><p><b>Cảm ơn bạn đã chơi!</b></p>
          </div></div>
        </div>`;
      UI.preview($('.end-cv', el), { char: c, costume: params.costume, state: 'victory', scale: 1.2, facing: 1 });
      UI.notifyRewards(params.unlocked);
      $('.ending .nbtn', el).addEventListener('click', () => {
        $('.ending', el).classList.add('roll');
        setTimeout(() => UI.go('menu'), 9000);
        $('.credits', el).addEventListener('click', () => UI.go('menu'));
      });
    },
    onKey(e) { if (e.code === 'Escape') { UI.go('menu'); return true; } return false; },
  };

})();
