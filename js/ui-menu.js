/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — ui-menu.js
   Màn hình: Boot, Intro, Main Menu, Game Modes, Character Select, Arena Select, VS.
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


  /* ---------------- BOOT: chờ tương tác đầu tiên ---------------- */
  SCREENS.boot = {
    noBack: true,
    enter(el) {
      el.innerHTML = `
        <div class="boot">
          <div class="boot-logo"><h1 class="logo-main glitch" data-text="NEON STRIKE">NEON STRIKE</h1><div class="logo-sub">THE LAST LIGHT</div></div>
          <div class="boot-press blink">NHẤN PHÍM BẤT KỲ HOẶC CHẠM ĐỂ BẮT ĐẦU</div>
          <div class="boot-info"><span>NEO-VEYRA NETWORK • NODE 09</span><span>HEADPHONES RECOMMENDED</span></div>
        </div>`;
      const go = () => {
        if (this.done) return;
        this.done = true;
        NS.Audio.init();
        NS.Audio.sfx('lock');
        NS.Audio.setAmbience('menu');
        window.removeEventListener('keydown', go, true);
        window.removeEventListener('pointerdown', go, true);
        if (!S().profile.introSeen) UI.go('intro'); else UI.go('menu');
      };
      window.addEventListener('keydown', go, true);
      window.addEventListener('pointerdown', go, true);
      this._go = go;
    },
    leave() {
      this.done = true;
      if (this._go) { window.removeEventListener('keydown', this._go, true); window.removeEventListener('pointerdown', this._go, true); }
    },
    onKey() { return true; },
  };

  /* ---------------- INTRO cinematic ---------------- */
  SCREENS.intro = {
    noBack: true,
    enter(el) {
      el.innerHTML = `<div class="intro"><div class="intro-lines"></div><button class="nbtn ghost intro-skip nav-item">SKIP ▸▸</button></div>`;
      NS.Audio.playMusic('menu');
      const box = $('.intro-lines', el);
      const lines = NS.Story.INTRO;
      let i = 0;
      this.stop = false;
      const finish = () => {
        if (this.stop) return;
        this.stop = true;
        S().profile.introSeen = true; S().save();
        UI.go('menu');
      };
      $('.intro-skip', el).addEventListener('click', finish);
      const next = () => {
        if (this.stop) return;
        if (i >= lines.length) { setTimeout(finish, 1800); return; }
        const L = lines[i++];
        const d = U.el('div', `intro-line ${L.big ? 'big' : ''} ${L.title ? 'title' : ''}`);
        box.innerHTML = '';
        box.appendChild(d);
        let k = 0;
        const type = () => {
          if (this.stop) return;
          d.textContent = L.t.slice(0, ++k);
          if (k % 2 === 0) NS.Audio.sfx('type', { gap: 0 });
          if (k < L.t.length) setTimeout(type, L.title ? 90 : 30);
          else setTimeout(next, L.title ? 2200 : 1700);
        };
        type();
      };
      next();
      this.finish = finish;
    },
    onKey(e) { if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') this.finish(); return true; },
    leave() { this.stop = true; },
  };

  /* ---------------- MAIN MENU ---------------- */
  SCREENS.menu = {
    noBack: true,
    enter(el) {
      UI.history = [];
      NS.Audio.playMusic('menu');
      NS.Audio.setAmbience('menu');
      UI.bg.start();
      const ev = S().dailyEvent();
      const items = [
        ['codex', 'CHARACTERS', 'Hồ sơ 7 chiến binh & animation', ICON.user],
        ['modes', 'GAME MODES', 'Story • Versus • Survival • Time Attack...', ICON.grid],
        ['arenas', 'ARENA', '6 đấu trường của Neo-Veyra', ICON.map],
        ['collection', 'COLLECTION', 'Trang phục • Hiệu ứng • Danh hiệu', ICON.star],
        ['profile', 'PROFILE', 'Hồ sơ, thống kê & bảng xếp hạng', ICON.trophy],
        ['settings', 'SETTINGS', 'Âm thanh • Đồ họa • Phím điều khiển', ICON.gear],
      ];
      el.innerHTML = `
        <div class="menu">
          <div class="menu-top">
            <div class="player-card nav-item" data-go="profile">${playerCard()}</div>
            <div class="menu-top-r">
              <div class="chip credits">◈ <b class="cr-val">${U.fmtNum(S().profile.credits)}</b> CR</div>
              <button class="icon-btn nav-item" data-act="mute" title="Âm thanh">${S().settings.muted ? ICON.mute : ICON.sound}</button>
              <button class="icon-btn nav-item" data-go="settings" title="Cài đặt">${ICON.gear}</button>
            </div>
          </div>
          <div class="menu-body">
            <div class="menu-left">
              <div class="logo">
                <div class="logo-kicker">CORE-9 TOURNAMENT • SEASON 2189</div>
                <h1 class="logo-main glitch" data-text="NEON STRIKE">NEON STRIKE</h1>
                <div class="logo-sub"><span>THE LAST LIGHT</span></div>
              </div>
              <button class="btn-play nav-item" data-act="play" data-autofocus><span class="bp-l">PLAY NOW</span><span class="bp-s">QUICK MATCH vs CPU</span><i></i></button>
              <nav class="menu-list">
                ${items.map(([id, l, d, ic], i) => `<button class="menu-item nav-item" data-go="${id}"><span class="mi-num">0${i + 1}</span><span class="mi-ico">${ic}</span><span class="mi-txt"><b>${l}</b><small>${d}</small></span><span class="mi-arrow">›</span></button>`).join('')}
              </nav>
            </div>
            <div class="menu-hero">
              <div class="hero-ring"></div>
              <canvas class="hero-cv"></canvas>
              <div class="hero-info"><div class="hero-name"></div><div class="hero-title"></div><div class="hero-quote"></div></div>
              <div class="hero-dots"></div>
            </div>
            <aside class="menu-right">
              <div class="panel glass ev-panel">
                <div class="panel-h"><span class="dot live"></span>SỰ KIỆN HÔM NAY</div>
                <div class="ev-body"><img src="${NS.Anim.portrait(ev.char, 0, 96, 96)}" alt=""><div><b>${U.esc(ev.title)}</b><p>${U.esc(ev.text)}</p></div></div>
              </div>
              <div class="panel glass q-panel"><div class="panel-h">${ICON.target}CONTRACTS — NHIỆM VỤ</div><div class="q-list"></div></div>
              <div class="panel glass news-panel"><div class="panel-h">NEO-VEYRA FEED</div><div class="news"></div></div>
            </aside>
          </div>
          <footer class="menu-foot">
            <div class="ticker"><div class="ticker-in">
              ${['TIN NÓNG: Mức bất ổn của Reactor Zero vượt 87% — Helix Dominion phủ nhận mọi rủi ro.', 'EMBER PIT: PYRA giữ chuỗi bất bại 42 trận liên tiếp.', 'CẢNH BÁO: Lowgrid tiếp tục mất điện ngày thứ 2.921.', 'THE LAST LIGHT: Vòng chung kết sẽ diễn ra tại đỉnh Tháp Helix.', 'Tín hiệu lạ "UNIT-0" xuất hiện trên mạng lưới thành phố.', 'FROZEN CORE: Cơ sở Cryon vẫn bị phong tỏa sau sự cố Cryon-7.'].map((t) => `<span>◆ ${t}</span>`).join('')}
            </div></div>
            <div class="foot-hint">↑↓←→ Điều hướng • ENTER Chọn • ESC Quay lại</div>
          </footer>
        </div>`;
      $$('[data-go]', el).forEach((b) => b.addEventListener('click', () => {
        const go = b.dataset.go;
        if (go === 'arenas') UI.go('arena', { mode: 'gallery' });
        else UI.go(go);
      }));
      $('[data-act="play"]', el).addEventListener('click', () => NS.Modes.begin('quick', { aiLevel: 'normal' }));
      $('[data-act="mute"]', el).addEventListener('click', (e) => {
        const s = S().settings; s.muted = !s.muted; S().save(); NS.Audio.applySettings();
        e.currentTarget.innerHTML = s.muted ? ICON.mute : ICON.sound;
      });
      this.el = el;
      this.renderQuests();
      // nhân vật nổi bật
      const roster = NS.Chars.ROSTER;
      const fav = Object.keys(S().profile.charUsage).sort((a, b) => S().profile.charUsage[b] - S().profile.charUsage[a])[0];
      this.heroIdx = Math.max(0, roster.indexOf(fav || 'raven'));
      this.hero = UI.preview($('.hero-cv', el), { char: roster[this.heroIdx], costume: S().costumeFor(roster[this.heroIdx]), state: 'idle', scale: 0.95, facing: -1, anchor: 0.9 });
      $('.hero-dots', el).innerHTML = roster.map((c, i) => `<button class="hd nav-item" data-i="${i}" title="${c}"></button>`).join('');
      $$('.hero-dots .hd', el).forEach((b) => b.addEventListener('click', () => this.showHero(+b.dataset.i)));
      $('.hero-cv', el).addEventListener('click', () => UI.go('codex', { char: roster[this.heroIdx] }));
      this.showHero(this.heroIdx);
      clearInterval(this.heroT);
      this.heroT = setInterval(() => this.showHero((this.heroIdx + 1) % roster.length), 7000);
      // news ngẫu nhiên từ lore
      const lores = NS.Arenas.LIST.map((a) => NS.Arenas.DEFS[a]);
      $('.news', el).innerHTML = lores.slice(0, 4).map((a) => `<div class="news-it"><b>${a.name}</b><p>${U.esc(a.lore)}</p></div>`).join('');
    },
    showHero(i) {
      const roster = NS.Chars.ROSTER;
      this.heroIdx = i;
      const c = roster[i], def = NS.Chars.get(c);
      const locked = !S().isCharUnlocked(c);
      const hero = $('.menu-hero', this.el);
      if (!hero) return;
      hero.classList.remove('swap'); void hero.offsetWidth; hero.classList.add('swap');
      hero.style.setProperty('--acc', def.palettes[0].accent);
      hero.style.setProperty('--glow', def.palettes[0].glow);
      this.hero.set({ char: c, costume: locked ? 0 : S().costumeFor(c), silhouette: locked, state: i % 2 ? 'idle' : 'victory' });
      $('.hero-name', this.el).textContent = locked ? '??????' : def.name;
      $('.hero-title', this.el).textContent = locked ? 'CHƯA MỞ KHÓA' : `${def.title} — ${def.role}`;
      $('.hero-quote', this.el).textContent = locked ? charLockText(c) : `“${def.quote}”`;
      $$('.hero-dots .hd', this.el).forEach((b, k) => b.classList.toggle('on', k === i));
    },
    renderQuests() {
      const box = $('.q-list', this.el);
      if (!box) return;
      const list = S().questList().sort((a, b) => (b.done - a.done) || (b.progress / b.target - a.progress / a.target)).slice(0, 4);
      box.innerHTML = list.map((q) => `
        <div class="q-it ${q.done ? 'done' : ''}">
          <div class="q-ico">${q.icon}</div>
          <div class="q-main"><b>${U.esc(q.desc)}</b><div class="q-bar"><i style="--v:${q.progress / q.target}"></i></div><small>${q.progress}/${q.target} • +${q.reward.exp} EXP • +${q.reward.credits} CR</small></div>
          ${q.done ? `<button class="nbtn sm primary nav-item" data-claim="${q.id}">NHẬN</button>` : ''}
        </div>`).join('');
      $$('[data-claim]', box).forEach((b) => b.addEventListener('click', () => {
        const r = S().claimQuest(b.dataset.claim);
        if (!r) return;
        NS.Audio.sfx('unlock');
        UI.toast('HOÀN THÀNH NHIỆM VỤ', `+${r.reward.exp} EXP • +${r.reward.credits} CR`, 'quest');
        if (r.ups.length) { NS.Audio.sfx('levelup'); UI.toast('LEVEL UP!', `Đạt Level ${r.ups[r.ups.length - 1]}`, 'level'); }
        UI.notifyRewards(r.unlocked);
        this.renderQuests();
        this.refreshCard();
      }));
    },
    refreshCard() {
      if (!this.el) return;
      const pc = $('.player-card', this.el);
      if (pc) pc.innerHTML = playerCard();
      const cr = $('.cr-val', this.el);
      if (cr) cr.textContent = U.fmtNum(S().profile.credits);
    },
    leave() { clearInterval(this.heroT); },
  };

  /* ---------------- GAME MODES ---------------- */
  SCREENS.modes = {
    enter(el) {
      NS.Audio.playMusic('menu');
      const M = NS.Modes.MODES;
      this.ai = this.ai || 'normal';
      this.vsTime = this.vsTime || S().settings.roundTime;
      this.vsRounds = this.vsRounds || S().settings.rounds;
      this.story = this.story || 'standard';
      el.innerHTML = `${header('GAME MODES', 'CHỌN CHẾ ĐỘ CHƠI')}
        <div class="modes-grid">
          ${Object.values(M).map((m, i) => `
            <div class="mode-card card glass nav-item ${m.id === 'story' ? 'feat' : ''}" data-mode="${m.id}" style="--i:${i}" ${i === 0 ? 'data-autofocus' : ''}>
              <div class="mc-ico">${ICON[m.icon]}</div>
              <div class="mc-num">${String(i + 1).padStart(2, '0')}</div>
              <h3>${m.name}</h3>
              <p>${m.desc}</p>
              <div class="mc-tags">${m.tags.map((t) => `<span>${t}</span>`).join('')}</div>
              ${m.id === 'ai' ? `<div class="seg mc-opt" data-k="ai">${['easy', 'normal', 'hard', 'expert'].map((d) => `<button class="nav-item ${this.ai === d ? 'on' : ''}" data-v="${d}">${DIFF_LABEL[d]}</button>`).join('')}</div>` : ''}
              ${m.id === 'versus' ? `<div class="mc-opts"><div class="seg mc-opt" data-k="time">${[30, 60, 99, 0].map((t) => `<button class="nav-item ${this.vsTime === (t || Infinity) ? 'on' : ''}" data-v="${t}">${t ? t + 's' : '∞'}</button>`).join('')}</div>
                <div class="seg mc-opt" data-k="rounds">${[1, 3, 5].map((r) => `<button class="nav-item ${this.vsRounds === r ? 'on' : ''}" data-v="${r}">BO${r}</button>`).join('')}</div></div>` : ''}
              ${m.id === 'story' ? `<div class="seg mc-opt" data-k="story">${Object.entries(NS.Story.DIFFICULTY).map(([k, d]) => `<button class="nav-item ${this.story === k ? 'on' : ''}" data-v="${k}" title="${U.esc(d.desc)}">${d.name}</button>`).join('')}</div>` : ''}
              <div class="mc-go">START ›</div>
            </div>`).join('')}
        </div>`;
      bindBack(el);
      $$('.mc-opt button', el).forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const k = b.parentNode.dataset.k, v = b.dataset.v;
        b.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        if (k === 'ai') this.ai = v;
        if (k === 'time') this.vsTime = +v || Infinity;
        if (k === 'rounds') this.vsRounds = +v;
        if (k === 'story') this.story = v;
      }));
      $$('.mode-card', el).forEach((c) => c.addEventListener('click', (e) => {
        if (e.target.closest('.mc-opt')) return;
        const m = c.dataset.mode;
        NS.Audio.sfx('confirm');
        if (m === 'ai') NS.Modes.begin('ai', { aiLevel: this.ai });
        else if (m === 'versus') NS.Modes.begin('versus', { time: this.vsTime, rounds: this.vsRounds, vsHuman: true });
        else if (m === 'story') NS.Modes.begin('story', { storyDiff: this.story });
        else if (m === 'quick') NS.Modes.begin('quick', { aiLevel: 'normal' });
        else NS.Modes.begin(m, { aiLevel: 'normal' });
      }));
    },
  };

  /* ---------------- CHARACTER SELECT ---------------- */
  SCREENS.select = {
    enter(el, params) {
      NS.Audio.playMusic('select');
      const sess = params.session || NS.Modes.session;
      this.sess = sess;
      this.mode = sess.mode;
      const roster = NS.Chars.ROSTER;
      this.roster = roster.concat(['random']);
      this.single = ['story', 'survival', 'timeattack'].includes(this.mode);
      this.vsHuman = this.mode === 'versus' || (this.mode === 'quick' && sess.vsHuman);
      const fav = Object.keys(S().profile.charUsage).sort((a, b) => S().profile.charUsage[b] - S().profile.charUsage[a])[0];
      this.p = [
        { idx: Math.max(0, roster.indexOf(fav || 'raven')), costume: 0, locked: false },
        { idx: 1, costume: 0, locked: false },
      ];
      this.p[0].costume = S().costumeFor(roster[this.p[0].idx]);
      this.ai = sess.aiLevel || 'normal';
      const modeName = NS.Modes.MODES[this.mode].name;
      const showP2 = !this.single;
      el.innerHTML = `${header('SELECT YOUR FIGHTER', modeName, `<div class="sel-mode">${this.mode === 'story' ? `STORY — ${NS.Story.DIFFICULTY[sess.storyDiff || 'standard'].name}` : this.mode === 'ai' ? `AI ${DIFF_LABEL[this.ai]}` : ''}</div>`)}
        <div class="select ${showP2 ? '' : 'single'}">
          <div class="sel-side s1" data-side="0">
            <div class="sel-tag">1P</div>
            <canvas class="sel-cv"></canvas>
            <div class="sel-info"></div>
            <div class="sel-ready">READY</div>
          </div>
          <div class="sel-center">
            <div class="sel-grid">${this.roster.map((c, i) => {
              if (c === 'random') return `<div class="sel-cell random nav-item" data-i="${i}"><div class="cell-in"><span>?</span></div><b>RANDOM</b></div>`;
              const def = NS.Chars.get(c), lock = !S().isCharUnlocked(c);
              return `<div class="sel-cell nav-item ${lock ? 'locked' : ''}" data-i="${i}" style="--acc:${def.palettes[0].accent}"><div class="cell-in"><img src="${NS.Anim.portrait(c, 0, 160, 160)}" alt="">${lock ? `<div class="cell-lock">${ICON.lock}</div>` : ''}</div><b>${def.name}</b><span class="cur c1">1P</span><span class="cur c2">${this.vsHuman ? '2P' : 'CPU'}</span></div>`;
            }).join('')}</div>
            <div class="sel-hint"></div>
            <div class="sel-actions">
              ${showP2 && !this.vsHuman ? `<div class="seg ai-seg">${['easy', 'normal', 'hard', 'expert'].map((d) => `<button class="nav-item ${this.ai === d ? 'on' : ''}" data-v="${d}">${DIFF_LABEL[d]}</button>`).join('')}</div>` : ''}
              ${this.mode === 'quick' ? `<button class="nbtn sm nav-item" data-act="toggle2p">${this.vsHuman ? '⇄ ĐẤU VỚI CPU' : '⇄ NGƯỜI CHƠI 2 THAM GIA'}</button>` : ''}
              <button class="nbtn primary nav-item" data-act="confirm">XÁC NHẬN</button>
            </div>
          </div>
          ${showP2 ? `<div class="sel-side s2" data-side="1"><div class="sel-tag">${this.vsHuman ? '2P' : 'CPU'}</div><canvas class="sel-cv"></canvas><div class="sel-info"></div><div class="sel-ready">READY</div></div>` : ''}
        </div>`;
      bindBack(el);
      this.el = el;
      this.prev = [UI.preview($('.sel-side.s1 .sel-cv', el), { char: roster[this.p[0].idx], costume: this.p[0].costume, state: 'idle', scale: 1.05, facing: 1 })];
      if (showP2) {
        this.p[1].idx = (this.p[0].idx + 1) % roster.length;
        if (this.p[1].idx === roster.length - 1) this.p[1].idx = 0;
        this.prev.push(UI.preview($('.sel-side.s2 .sel-cv', el), { char: roster[this.p[1].idx], costume: 0, state: 'idle', scale: 1.05, facing: -1 }));
      }
      $$('.sel-cell', el).forEach((c) => {
        c.addEventListener('click', () => { const s = this.activeSide(); this.p[s].idx = +c.dataset.i; this.refresh(s); this.lock(s); });
        c.addEventListener('mouseenter', () => { const s = this.activeSide(); if (!this.p[s].locked) { this.p[s].idx = +c.dataset.i; this.refresh(s); } });
      });
      $$('.ai-seg button', el).forEach((b) => b.addEventListener('click', () => { this.ai = b.dataset.v; $$('.ai-seg button', el).forEach((x) => x.classList.toggle('on', x === b)); }));
      const t2 = $('[data-act="toggle2p"]', el);
      if (t2) t2.addEventListener('click', () => { this.sess.vsHuman = !this.vsHuman; UI.go('select', { session: this.sess }, { instant: true }); });
      $('[data-act="confirm"]', el).addEventListener('click', () => this.lock(this.activeSide()));
      this.refresh(0); if (showP2) this.refresh(1);
      this.updateHint();
    },
    activeSide() { if (this.single) return 0; if (this.vsHuman) return this.p[0].locked ? 1 : 0; return this.p[0].locked ? 1 : 0; },
    charAt(s) { return this.roster[this.p[s].idx]; },
    refresh(s) {
      const side = $(`.sel-side.s${s + 1}`, this.el);
      if (!side) return;
      const c = this.charAt(s);
      $$('.sel-cell', this.el).forEach((cell) => cell.classList.toggle(`at${s + 1}`, +cell.dataset.i === this.p[s].idx));
      const info = $('.sel-info', side);
      if (c === 'random') {
        this.prev[s].set({ char: NS.Chars.ROSTER[U.randi(0, 5)], silhouette: true, state: 'idle' });
        info.innerHTML = '<div class="si-name">RANDOM</div><div class="si-title">Để số phận quyết định</div>';
        side.style.setProperty('--acc', '#94a3b8');
        return;
      }
      const def = NS.Chars.get(c);
      const lock = !S().isCharUnlocked(c);
      const pal = def.palettes[this.p[s].costume] || def.palettes[0];
      side.style.setProperty('--acc', pal.accent);
      side.style.setProperty('--glow', pal.glow);
      this.prev[s].set({ char: c, costume: this.p[s].costume, silhouette: lock, state: this.p[s].locked ? 'victory' : 'idle' });
      const cos = def.palettes.map((p, i) => {
        const own = S().isCostumeUnlocked(c, i);
        return `<button class="cos nav-item ${i === this.p[s].costume ? 'on' : ''} ${own ? '' : 'locked'}" data-c="${i}" style="--c1:${p.accent};--c2:${p.armor}" title="${U.esc(p.name)}${own ? '' : ' (chưa mở)'}"></button>`;
      }).join('');
      info.innerHTML = lock
        ? `<div class="si-name">${def.name}</div><div class="si-title">CHƯA MỞ KHÓA</div><p class="si-lock">${ICON.lock}${U.esc(charLockText(c))}</p>`
        : `<div class="si-name">${def.name}</div><div class="si-title">${def.title} <em>• ${def.role}</em></div>
          <div class="si-stats">${statBars(def)}</div>
          <div class="si-skills">${['s1', 's2', 's3', 'ult'].map((k) => `<span class="${k}">${k === 'ult' ? '✸' : k.toUpperCase()} ${U.esc(def.skills[k].name)}</span>`).join('')}</div>
          <div class="si-cos"><small>TRANG PHỤC: <b>${U.esc(pal.name)}</b></small><div class="cos-row">${cos}</div></div>`;
      $$('.cos', info).forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        const i = +b.dataset.c;
        if (!S().isCostumeUnlocked(c, i)) { NS.Audio.sfx('error'); UI.toast('TRANG PHỤC CHƯA MỞ', 'Mở khóa trong COLLECTION.', 'warn'); return; }
        this.p[s].costume = i; this.refresh(s);
      }));
    },
    move(s, d) {
      if (this.p[s].locked) return;
      const n = this.roster.length;
      this.p[s].idx = (this.p[s].idx + d + n) % n;
      const c = this.charAt(s);
      this.p[s].costume = c !== 'random' && s === 0 ? S().costumeFor(c) : 0;
      NS.Audio.sfx('hover');
      this.refresh(s);
    },
    cycleCostume(s, d) {
      const c = this.charAt(s);
      if (c === 'random' || this.p[s].locked) return;
      const def = NS.Chars.get(c);
      let i = this.p[s].costume;
      for (let k = 0; k < def.palettes.length; k++) {
        i = (i + d + def.palettes.length) % def.palettes.length;
        if (S().isCostumeUnlocked(c, i)) break;
      }
      this.p[s].costume = i;
      NS.Audio.sfx('hover');
      this.refresh(s);
    },
    lock(s) {
      if (this.p[s].locked) return;
      let c = this.charAt(s);
      if (c === 'random') {
        const pool = NS.Chars.ROSTER.filter((x) => (s === 1 && !this.vsHuman) || S().isCharUnlocked(x)).filter((x) => !(this.mode === 'story' && x === 'axiom'));
        c = U.pick(pool);
        this.p[s].idx = this.roster.indexOf(c);
        this.p[s].costume = 0;
      }
      // P2 là CPU: được chọn cả nhân vật chưa mở
      const needUnlock = s === 0 || this.vsHuman;
      if (needUnlock && !S().isCharUnlocked(c)) { NS.Audio.sfx('error'); UI.toast('CHƯA MỞ KHÓA', charLockText(c), 'warn'); return; }
      if (this.mode === 'story' && c === 'axiom') { NS.Audio.sfx('error'); UI.toast('KHÔNG KHẢ DỤNG', 'AXIOM là trùm cuối — không có hành trình Story riêng.', 'warn'); return; }
      this.p[s].locked = true;
      NS.Audio.sfx('lock');
      NS.Audio.announce(NS.Chars.get(c).name);
      $(`.sel-side.s${s + 1}`, this.el).classList.add('locked');
      this.refresh(s);
      this.updateHint();
      const done = this.single ? this.p[0].locked : this.p[0].locked && this.p[1].locked;
      if (done) {
        setTimeout(() => {
          const pick = (k) => ({ char: this.charAt(k), costume: this.p[k].costume });
          NS.Modes.afterSelect({ p1: pick(0), p2: this.single ? null : pick(1), aiLevel: this.ai, vsHuman: this.vsHuman });
        }, 650);
      }
    },
    unlock(s) {
      if (!this.p[s].locked) return false;
      this.p[s].locked = false;
      $(`.sel-side.s${s + 1}`, this.el).classList.remove('locked');
      this.refresh(s);
      this.updateHint();
      return true;
    },
    updateHint() {
      const h = $('.sel-hint', this.el);
      const k1 = keysFor('p1'), k2 = keysFor('p2');
      if (this.single) h.innerHTML = `<b>1P</b> ${k1.left}/${k1.right} chọn • ${k1.up}/${k1.down} trang phục • <kbd>${k1.lp}</kbd>/ENTER xác nhận • <kbd>${k1.hp}</kbd> hủy`;
      else if (this.vsHuman) h.innerHTML = `<b>1P</b> ${k1.left}/${k1.right} • <kbd>${k1.lp}</kbd> chọn • <kbd>${k1.hp}</kbd> hủy &nbsp;|&nbsp; <b>2P</b> ←/→ • <kbd>${k2.lp}</kbd> chọn • <kbd>${k2.hp}</kbd> hủy`;
      else h.innerHTML = this.p[0].locked ? '<b>CHỌN ĐỐI THỦ CPU</b> — dùng cùng phím của 1P' : `<b>1P</b> ${k1.left}/${k1.right} chọn • ${k1.up}/${k1.down} trang phục • <kbd>${k1.lp}</kbd>/ENTER xác nhận`;
    },
    onKey(e) {
      const b1 = S().settings.bindings.p1, b2 = S().settings.bindings.p2;
      const is = (b, a) => b[a].includes(e.code);
      if (UI.modalEl.classList.contains('show')) return false;
      // P2 riêng trong chế độ 2 người
      if (this.vsHuman && !this.single) {
        if (is(b2, 'left')) { this.move(1, -1); return true; }
        if (is(b2, 'right')) { this.move(1, 1); return true; }
        if (is(b2, 'up')) { this.cycleCostume(1, -1); return true; }
        if (is(b2, 'down')) { this.cycleCostume(1, 1); return true; }
        if (is(b2, 'lp') || e.code === 'NumpadEnter') { this.lock(1); return true; }
        if (is(b2, 'hp')) { this.unlock(1); return true; }
      }
      const s = this.vsHuman ? 0 : this.activeSide();
      if (is(b1, 'left') || (!this.vsHuman && e.code === 'ArrowLeft')) { this.move(s, -1); return true; }
      if (is(b1, 'right') || (!this.vsHuman && e.code === 'ArrowRight')) { this.move(s, 1); return true; }
      if (is(b1, 'up') || (!this.vsHuman && e.code === 'ArrowUp')) { this.cycleCostume(s, -1); return true; }
      if (is(b1, 'down') || (!this.vsHuman && e.code === 'ArrowDown')) { this.cycleCostume(s, 1); return true; }
      if (is(b1, 'lp') || e.code === 'Enter' || e.code === 'Space') { this.lock(s); return true; }
      if (is(b1, 'hp') || e.code === 'Escape' || e.code === 'Backspace') {
        if (this.unlock(1) || this.unlock(0)) { NS.Audio.sfx('back'); return true; }
        UI.back();
        return true;
      }
      return true;
    },
  };

  /* ---------------- ARENA SELECT / GALLERY ---------------- */
  SCREENS.arena = {
    enter(el, params) {
      this.mode = params.mode || 'pick';
      NS.Audio.playMusic(this.mode === 'gallery' ? 'menu' : 'select');
      const list = NS.Arenas.LIST;
      this.list = this.mode === 'pick' ? list.concat(['random']) : list.slice();
      this.idx = 0;
      el.innerHTML = `${header(this.mode === 'pick' ? 'SELECT ARENA' : 'ARENAS', this.mode === 'pick' ? 'CHỌN ĐẤU TRƯỜNG' : 'CÁC ĐẤU TRƯỜNG CỦA NEO-VEYRA')}
        <div class="arena-scr">
          <div class="ar-main glass"><canvas class="ar-big"></canvas>
            <div class="ar-info"><small class="ar-dist"></small><h3 class="ar-name"></h3><p class="ar-desc"></p><p class="ar-lore"></p>
              <div class="ar-actions">${this.mode === 'pick' ? '<button class="nbtn primary nav-item" data-act="go" data-autofocus>CHIẾN ĐẤU TẠI ĐÂY</button>' : '<button class="nbtn primary nav-item" data-act="fight">QUICK MATCH TẠI ĐÂY</button>'}</div>
            </div>
          </div>
          <div class="ar-list">${this.list.map((a, i) => {
            if (a === 'random') return `<div class="ar-card card nav-item random" data-i="${i}"><div class="arc-img"><span>?</span></div><b>RANDOM</b></div>`;
            const d = NS.Arenas.DEFS[a];
            const lock = !arenaUnlocked(a);
            return `<div class="ar-card card nav-item ${lock ? 'locked' : ''}" data-i="${i}" style="--acc:${d.light}"><canvas class="arc-cv" data-a="${a}"></canvas>${lock ? `<div class="cell-lock">${ICON.lock}</div>` : ''}<b>${d.name}</b><small>${d.district}</small></div>`;
          }).join('')}</div>
        </div>`;
      bindBack(el);
      this.el = el;
      // vẽ thumbnail tĩnh một lần
      this.thumbs = {};
      $$('.arc-cv', el).forEach((cv) => {
        const a = cv.dataset.a;
        cv.width = 320; cv.height = 180;
        const ar = new NS.Arenas.Arena(a, 'medium', true);
        for (let i = 0; i < 30; i++) ar.update();
        NS.Arenas.drawPreview(cv.getContext('2d'), ar, 320, 180);
      });
      $$('.ar-card', el).forEach((c) => {
        c.addEventListener('mouseenter', () => this.focus(+c.dataset.i));
        c.addEventListener('click', () => { this.focus(+c.dataset.i); if (this.mode === 'pick') this.pick(); });
      });
      const go = $('[data-act="go"]', el); if (go) go.addEventListener('click', () => this.pick());
      const fight = $('[data-act="fight"]', el);
      if (fight) fight.addEventListener('click', () => { const a = this.list[this.idx]; if (!arenaUnlocked(a)) { NS.Audio.sfx('error'); return; } NS.Modes.begin('quick', { aiLevel: 'normal', arena: a }); });
      this.big = $('.ar-big', el);
      this.focus(0);
      UI.arenaPreviewTick = () => this.tick();
    },
    focus(i) {
      this.idx = i;
      const a = this.list[i];
      $$('.ar-card', this.el).forEach((c) => c.classList.toggle('sel', +c.dataset.i === i));
      if (a === 'random') {
        this.live = null;
        $('.ar-name', this.el).textContent = 'RANDOM';
        $('.ar-dist', this.el).textContent = '???';
        $('.ar-desc', this.el).textContent = 'Hệ thống sẽ chọn ngẫu nhiên một đấu trường.';
        $('.ar-lore', this.el).textContent = '';
        return;
      }
      const d = NS.Arenas.DEFS[a];
      const lock = !arenaUnlocked(a);
      this.el.style.setProperty('--acc', d.light);
      $('.ar-name', this.el).textContent = d.name;
      $('.ar-dist', this.el).textContent = d.district;
      $('.ar-desc', this.el).textContent = lock ? 'Hoàn thành Story Mode để mở khóa đấu trường này.' : d.desc;
      $('.ar-lore', this.el).textContent = lock ? '' : d.lore;
      if (!this.live || this.live.id !== a) this.live = new NS.Arenas.Arena(a, S().settings.quality === 'low' ? 'low' : 'medium', S().settings.reduceFx);
    },
    tick() {
      if (UI.current !== 'arena' || !this.big || !this.big.isConnected) { UI.arenaPreviewTick = null; return; }
      const cv = this.big, r = cv.getBoundingClientRect();
      if (!r.width) return;
      const W = Math.round(r.width), H = Math.round(r.height);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const ctx = cv.getContext('2d');
      if (!this.live) { ctx.fillStyle = '#05050d'; ctx.fillRect(0, 0, W, H); return; }
      NS.Arenas.drawPreview(ctx, this.live, W, H);
    },
    pick() {
      let a = this.list[this.idx];
      if (a === 'random') a = U.pick(NS.Arenas.LIST.filter(arenaUnlocked));
      if (!arenaUnlocked(a)) { NS.Audio.sfx('error'); UI.toast('ĐẤU TRƯỜNG BỊ KHÓA', 'Hoàn thành Story Mode để mở khóa.', 'warn'); return; }
      NS.Audio.sfx('lock');
      NS.Modes.afterArena(a);
    },
    onKey(e) {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { this.focus((this.idx + 1) % this.list.length); NS.Audio.sfx('hover'); return true; }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { this.focus((this.idx - 1 + this.list.length) % this.list.length); NS.Audio.sfx('hover'); return true; }
      if ((e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyF') && this.mode === 'pick') { this.pick(); return true; }
      return false;
    },
    leave() { UI.arenaPreviewTick = null; this.live = null; },
  };

  /* ---------------- VS SCREEN ---------------- */
  SCREENS.vs = {
    noBack: true,
    enter(el, params) {
      const cfg = params.cfg;
      const a = NS.Chars.get(cfg.p1.char), b = NS.Chars.get(cfg.p2.char);
      const pa = a.palettes[cfg.p1.costume || 0], pb = b.palettes[cfg.p2.costume || 0];
      const ar = NS.Arenas.DEFS[cfg.arena];
      NS.Audio.stopMusic();
      NS.Audio.sfx('superflash');
      el.innerHTML = `
        <div class="vs" style="--a1:${pa.accent};--a2:${pb.accent}">
          <div class="vs-half l"><canvas class="vs-cv"></canvas><div class="vs-name"><small>${a.title}</small><b>${a.name}</b><i>“${U.esc(U.pick(a.intro))}”</i></div></div>
          <div class="vs-half r"><canvas class="vs-cv"></canvas><div class="vs-name"><small>${b.title}</small><b>${b.name}</b><i>“${U.esc(U.pick(b.intro))}”</i></div></div>
          <div class="vs-mid"><span class="glitch" data-text="VS">VS</span></div>
          <div class="vs-bot">
            ${cfg.stageLabel ? `<div class="vs-stage">${U.esc(cfg.stageLabel)}</div>` : ''}
            <div class="vs-arena"><small>${U.esc(ar.district)}</small><b>${ar.name}</b></div>
            <div class="vs-tags"><span>${cfg.p2.ai ? 'CPU ' + DIFF_LABEL[cfg.p2.ai] : '1P vs 2P'}</span><span>${cfg.rounds > 1 ? 'BEST OF ' + cfg.rounds : '1 ROUND'}</span><span>${isFinite(cfg.time) ? cfg.time + 's' : '∞'}</span></div>
            <div class="vs-load"><i></i></div>
          </div>
        </div>`;
      UI.preview($('.l .vs-cv', el), { char: cfg.p1.char, costume: cfg.p1.costume, state: 'victory', scale: 1.15, facing: 1 });
      UI.preview($('.r .vs-cv', el), { char: cfg.p2.char, costume: cfg.p2.costume, state: 'victory', scale: 1.15, facing: -1 });
      this.done = false;
      this.cb = params.onDone;
      this.t0 = performance.now();
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.finish(), 3000);
    },
    finish() { if (this.done) return; this.done = true; clearTimeout(this.timer); this.cb && this.cb(); },
    onKey() { if (performance.now() - this.t0 > 900) this.finish(); return true; },
    leave() { clearTimeout(this.timer); },
  };

})();
