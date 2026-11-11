/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — hud.js
   HUD trong trận: thanh máu (có vệt máu trễ), năng lượng, Ultimate, guard,
   ảnh đại diện, tên, đồng hồ, số hiệp thắng, kỹ năng & hồi chiêu,
   thông báo COMBO / PERFECT / COUNTER / BLOCK / FINISHER, cut-in Ultimate.
   Chỉ ghi DOM khi giá trị thay đổi để giữ 60 FPS.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const U = NS.U;
  const SLOTS = ['s1', 's2', 's3', 'ult'];
  const SKILL_ICON = { s1: 'I', s2: 'II', s3: 'III', ult: '✸' };

  class HUD {
    constructor(root) {
      this.root = root;
      this.cache = {};
      this.popT = [{}, {}];
    }
    build(game) {
      this.game = game;
      const side = (s) => {
        const f = game.fighters[s];
        const pr = NS.Anim.portrait(f.charId, f.costume, 160, 160);
        const bind = NS.Storage.settings.bindings[s === 0 ? 'p1' : 'p2'];
        const key = (a) => (f.isAI ? '' : NS.Input.keyName(bind[a][0]));
        const skills = SLOTS.map((sl) => {
          const m = f.moves[sl];
          const meta = f.def.skills[sl];
          return `<div class="hs-slot ${sl === 'ult' ? 'is-ult' : ''}" data-slot="${sl}" title="${U.esc(meta.name)}">
            <div class="hs-ico">${SKILL_ICON[sl]}</div><div class="hs-cd"></div>
            <div class="hs-key">${key(sl)}</div>
            <div class="hs-name">${U.esc(meta.name)}</div>
            ${m && m.cost ? `<div class="hs-cost">${m.cost}</div>` : ''}
          </div>`;
        }).join('');
        const pips = Array.from({ length: Math.ceil(game.roundsTotal / 2) }, () => '<i></i>').join('');
        return [`
        <div class="hud-side p${s + 1}" style="--acc:${f.pal.accent};--glow:${f.pal.glow}">
          <div class="hud-portrait"><img src="${pr}" alt=""><span class="hud-tag">${s === 0 ? '1P' : f.isAI ? 'CPU' : '2P'}</span></div>
          <div class="hud-info">
            <div class="hud-name"><b>${U.esc(f.name)}</b><span>${U.esc(f.def.title)}</span></div>
            <div class="hp-bar"><div class="hp-lag"></div><div class="hp-fill"></div><div class="hp-ticks"></div><div class="hp-num"></div></div>
            <div class="guard-bar"><div class="guard-fill"></div></div>
            <div class="meters">
              <div class="en-bar"><div class="en-fill"></div><div class="en-seg"></div><label>ENERGY</label></div>
              <div class="ult-bar"><div class="ult-fill"></div><label>ULTIMATE</label></div>
            </div>
            <div class="hud-sub"><div class="hud-rounds">${pips}</div><div class="hud-status"></div></div>
          </div>
        </div>`, `
        <div class="hud-skills p${s + 1}" style="--acc:${f.pal.accent}">${skills}</div>
        <div class="hud-combo p${s + 1}" style="--acc:${f.pal.accent}"><div class="cb-num"></div><div class="cb-hit">HIT</div><div class="cb-tier"></div><div class="cb-dmg"></div></div>
        <div class="hud-pops p${s + 1}"></div>`];
      };
      const A = side(0), B = side(1);
      this.root.innerHTML = `
        <div class="hud ${game.training ? 'is-training' : ''}">
          <div class="hud-top">
            ${A[0]}
            <div class="hud-timer"><div class="tm-num">99</div><div class="tm-round">ROUND 1</div></div>
            ${B[0]}
          </div>
          ${A[1]}${B[1]}
          <div class="hud-announce"></div>
          <div class="hud-cutin"></div>
          <div class="hud-intro"></div>
          <div class="hud-train"></div>
          <button class="hud-pause nav-item" data-act="pause" aria-label="Pause">❚❚</button>
        </div>`;
      this.el = {};
      [0, 1].forEach((s) => {
        const q = (c) => this.root.querySelector(`.p${s + 1} ${c}`) || this.root.querySelector(`.hud-side.p${s + 1} ${c}`);
        this.el[s] = {
          side: this.root.querySelector(`.hud-side.p${s + 1}`),
          hp: q('.hp-fill'), lag: q('.hp-lag'), num: q('.hp-num'), guard: q('.guard-fill'),
          en: q('.en-fill'), ult: q('.ult-fill'), ultBar: q('.ult-bar'),
          pips: Array.from(this.root.querySelectorAll(`.hud-side.p${s + 1} .hud-rounds i`)),
          status: q('.hud-status'),
          skills: Array.from(this.root.querySelectorAll(`.hud-skills.p${s + 1} .hs-slot`)),
          combo: this.root.querySelector(`.hud-combo.p${s + 1}`),
          pops: this.root.querySelector(`.hud-pops.p${s + 1}`),
        };
        this.el[s].lagV = 1;
        this.el[s].lagHold = 0;
      });
      this.timerEl = this.root.querySelector('.tm-num');
      this.roundEl = this.root.querySelector('.tm-round');
      this.annEl = this.root.querySelector('.hud-announce');
      this.cutEl = this.root.querySelector('.hud-cutin');
      this.introEl = this.root.querySelector('.hud-intro');
      this.trainEl = this.root.querySelector('.hud-train');
      this.cache = {};
      if (game.training) this.buildTraining(game);
    }
    set(key, val, fn) { if (this.cache[key] !== val) { this.cache[key] = val; fn(val); } }

    resetRound(game) {
      if (!this.el) return;
      [0, 1].forEach((s) => { this.el[s].lagV = game.fighters[s].hp / game.fighters[s].maxHp; this.el[s].combo.classList.remove('show'); });
      this.set('round', game.round, (v) => (this.roundEl.textContent = game.training ? 'TRAINING' : `ROUND ${v}`));
    }

    update(game) {
      if (!this.el) return;
      game.fighters.forEach((f, s) => {
        const E = this.el[s];
        const r = U.clamp(f.hp / f.maxHp, 0, 1);
        this.set('hp' + s, r.toFixed(4), () => { E.hp.style.transform = `scaleX(${r})`; E.num.textContent = Math.ceil(f.hp); });
        // vệt máu trễ (hiển thị sát thương vừa nhận)
        if (r < E.lagV) { if (f.inHitstun()) E.lagHold = 30; else if (E.lagHold > 0) E.lagHold--; else E.lagV = Math.max(r, E.lagV - 0.012); }
        else E.lagV = r;
        this.set('lag' + s, E.lagV.toFixed(3), (v) => (E.lag.style.transform = `scaleX(${v})`));
        this.set('dng' + s, r < 0.25 && r > 0, (v) => E.side.classList.toggle('danger', v));
        this.set('gd' + s, Math.round(f.guard), (v) => { E.guard.style.transform = `scaleX(${v / 100})`; E.guard.parentNode.classList.toggle('low', v < 30); });
        this.set('en' + s, Math.floor(f.energy), (v) => (E.en.style.transform = `scaleX(${v / 100})`));
        this.set('ult' + s, Math.floor(f.ult), (v) => { E.ult.style.transform = `scaleX(${v / 100})`; E.ultBar.classList.toggle('full', v >= 100); });
        this.set('rw' + s, f.roundsWon, (v) => E.pips.forEach((p, i) => p.classList.toggle('on', i < v)));
        const st = Object.keys(f.status).filter((k) => f.status[k] > 0 && k !== 'encased').join(',');
        this.set('st' + s, st, (v) => { E.status.innerHTML = v ? v.split(',').map((k) => `<span class="st-${k}">${{ slow: 'SLOW', burn: 'BURN', freeze: 'FROZEN', shock: 'SHOCK', corrupt: 'CORRUPT' }[k] || k}</span>`).join('') : ''; });
        E.skills.forEach((el) => {
          const sl = el.dataset.slot;
          let cdK = 0, ready = false;
          if (sl === 'ult') { ready = f.ult >= 100; cdK = 1 - f.ult / 100; }
          else {
            const m = f.moves[sl];
            const max = (m.cd || 1) * (f.status.corrupt > 0 ? 1.5 : 1);
            cdK = U.clamp(f.cd[sl] / max, 0, 1);
            ready = cdK <= 0 && f.energy >= (m.cost || 0);
          }
          const key = `sk${s}${sl}`;
          const v = Math.round(cdK * 40) + (ready ? 'r' : 'n');
          this.set(key, v, () => { el.style.setProperty('--cd', cdK.toFixed(3)); el.classList.toggle('ready', ready); el.classList.toggle('noen', !ready && cdK <= 0); });
        });
      });
      const tl = game.training ? '∞' : isFinite(game.timeLeft) ? String(Math.max(0, game.timeLeft)) : '∞';
      this.set('time', tl, (v) => { this.timerEl.textContent = v; this.timerEl.classList.toggle('low', !game.training && isFinite(game.timeLeft) && game.timeLeft <= 10); });
      if (game.training) this.updateTraining(game);
    }

    /* ---------- Thông báo ---------- */
    announce(text, kind = '') {
      if (!this.annEl) return;
      const d = document.createElement('div');
      d.className = `ann ann-${kind}`;
      d.innerHTML = `<span data-text="${U.esc(text)}">${U.esc(text)}</span>`;
      this.annEl.innerHTML = '';
      this.annEl.appendChild(d);
      clearTimeout(this._annT);
      this._annT = setTimeout(() => d.classList.add('out'), kind === 'match' ? 2600 : kind === 'round' ? 900 : 1100);
    }
    popup(side, text, kind = '') {
      if (!this.el) return;
      const now = performance.now();
      const key = text;
      if (this.popT[side][key] && now - this.popT[side][key] < (kind === 'block' ? 500 : 250)) return;
      this.popT[side][key] = now;
      const E = this.el[side];
      const d = document.createElement('div');
      d.className = `pop pop-${kind}`;
      d.textContent = text;
      E.pops.prepend(d);
      while (E.pops.children.length > 4) E.pops.lastChild.remove();
      setTimeout(() => d.remove(), 1100);
    }
    combo(side, n, dmg, att) {
      const E = this.el && this.el[side];
      if (!E) return;
      const el = E.combo;
      const route = att.routeUlt || (att.routeSkill && n >= 6);
      const tier = n >= 10 || (route && n >= 4) ? 'PERFECT COMBO' : n >= 7 ? 'AMAZING' : n >= 5 ? 'GREAT' : n >= 3 ? 'NICE' : '';
      const score = n * n * 10 + dmg;
      el.querySelector('.cb-num').textContent = n;
      el.querySelector('.cb-hit').textContent = n >= 2 ? 'HIT' : 'HIT';
      el.querySelector('.cb-tier').textContent = tier;
      el.querySelector('.cb-dmg').textContent = `${dmg} DMG • ${U.fmtNum(score)} PTS`;
      el.classList.remove('bump', 'end');
      void el.offsetWidth;
      el.classList.add('show', 'bump');
      el.dataset.tier = tier ? tier.split(' ')[0].toLowerCase() : '';
      clearTimeout(el._t);
    }
    comboEnd(side, n, dmg) {
      const E = this.el && this.el[side];
      if (!E) return;
      const el = E.combo;
      el.classList.add('end');
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove('show', 'end'), 1300);
    }
    cutin(f, name) {
      if (!this.cutEl) return;
      const pr = NS.Anim.portrait(f.charId, f.costume, 256, 256);
      this.cutEl.className = `hud-cutin show side${f.side}`;
      this.cutEl.style.setProperty('--acc', f.pal.accent);
      this.cutEl.style.setProperty('--glow', f.pal.glow);
      this.cutEl.innerHTML = `<div class="ci-band"><img src="${pr}" alt=""><div class="ci-text"><small>ULTIMATE</small><b>${U.esc(name)}</b></div></div>`;
      clearTimeout(this._cutT);
      this._cutT = setTimeout(() => { this.cutEl.className = 'hud-cutin'; }, 900);
    }
    introBanner(a, b, arena) {
      if (!this.introEl) return;
      this.introEl.innerHTML = `
        <div class="in-arena"><small>${U.esc(arena.district)}</small><b>${U.esc(arena.name)}</b></div>
        <div class="in-name l" style="--acc:${a.pal.accent}"><b>${U.esc(a.name)}</b><span>${U.esc(a.def.title)}</span><i>“${U.esc(U.pick(a.def.intro))}”</i></div>
        <div class="in-name r" style="--acc:${b.pal.accent}"><b>${U.esc(b.name)}</b><span>${U.esc(b.def.title)}</span><i>“${U.esc(U.pick(b.def.intro))}”</i></div>`;
      this.introEl.classList.remove('show');
      void this.introEl.offsetWidth;
      this.introEl.classList.add('show');
      setTimeout(() => this.introEl.classList.remove('show'), 3200);
    }

    /* ---------- Bảng luyện tập ---------- */
    buildTraining(game) {
      const t = game.opts.training;
      this.trainEl.innerHTML = `
        <div class="tr-panel glass">
          <div class="tr-title">TRAINING MODE</div>
          <div class="tr-row"><span>Hình nộm</span><div class="seg" data-k="dummy">
            ${[['stand', 'Đứng'], ['crouch', 'Cúi'], ['block', 'Đỡ'], ['cblock', 'Đỡ thấp'], ['parry', 'Perfect'], ['jump', 'Nhảy'], ['cpu', 'CPU']].map(([v, l]) => `<button class="nav-item ${t.dummy === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}
          </div></div>
          <div class="tr-row"><span>Hitbox</span><div class="seg" data-k="hitbox"><button class="nav-item ${t.hitbox ? 'on' : ''}" data-v="1">BẬT</button><button class="nav-item ${!t.hitbox ? 'on' : ''}" data-v="0">TẮT</button></div></div>
          <div class="tr-data"></div>
        </div>`;
      this.trainEl.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
        const k = b.parentNode.dataset.k;
        b.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        if (k === 'dummy') {
          t.dummy = b.dataset.v;
          const f = game.p2;
          if (t.dummy === 'cpu') { f.controller = new NS.AI.AIController('normal'); }
          else { f.controller = new NS.AI.DummyController(t.dummy); }
          f.controller.attach(game, f);
          f.isAI = true;
        } else if (k === 'hitbox') t.hitbox = b.dataset.v === '1';
        NS.Audio.sfx('click');
      }));
      this.trData = this.trainEl.querySelector('.tr-data');
    }
    updateTraining(game) {
      const f = game.p1;
      const m = f.move && !f.move.scripted ? f.move : null;
      if (m) this._lastMove = m;
      const mv = this._lastMove;
      if (!mv || !this.trData) return;
      const h = mv.hits && mv.hits[0];
      const active = mv.hits && mv.hits.length ? mv.hits.reduce((s, x) => s + x.len, 0) : 0;
      const rec = h ? mv.total - (mv.hits[mv.hits.length - 1].f + mv.hits[mv.hits.length - 1].len) : mv.total;
      const adv = h && h.bs ? h.bs - rec : null;
      const sig = `${mv.id}|${f.combo}|${f.comboDmg}`;
      this.set('trd', sig, () => {
        this.trData.innerHTML = `
          <div><b>${U.esc(mv.name)}</b> <em>${mv.kind.toUpperCase()}</em></div>
          <div class="tr-grid">
            <span>Startup</span><b>${h ? h.f : '-'}f</b>
            <span>Active</span><b>${active}f</b>
            <span>Recovery</span><b>${rec}f</b>
            <span>Damage</span><b>${h ? h.dmg : '-'}</b>
            <span>On block</span><b class="${adv !== null && adv < 0 ? 'neg' : 'pos'}">${adv === null ? '-' : (adv > 0 ? '+' : '') + adv}</b>
            <span>Level</span><b>${h ? (h.level || 'mid').toUpperCase() : '-'}</b>
            <span>Combo</span><b>${f.combo} hit • ${f.comboDmg}</b>
          </div>`;
      });
    }
  }

  NS.HUD = HUD;
})();
