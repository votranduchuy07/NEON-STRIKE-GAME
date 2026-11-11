/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — ui-pages.js
   Trang thông tin: Hồ sơ nhân vật, Bộ sưu tập, Hồ sơ người chơi, Cài đặt (âm thanh/đồ họa/phím).
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

  /* ---------------- CHARACTER CODEX ---------------- */
  SCREENS.codex = {
    enter(el, params) {
      NS.Audio.playMusic('menu');
      const roster = NS.Chars.ROSTER;
      this.c = params.char || this.c || 'raven';
      this.anim = 'idle';
      el.innerHTML = `${header('CHARACTERS', 'HỒ SƠ CHIẾN BINH')}
        <div class="codex">
          <div class="cx-list">${roster.map((c) => { const d = NS.Chars.get(c); const lock = !S().isCharUnlocked(c); return `<button class="cx-it nav-item ${lock ? 'locked' : ''}" data-c="${c}" style="--acc:${d.palettes[0].accent}"><img src="${NS.Anim.portrait(c, 0, 96, 96)}" alt=""><span><b>${d.name}</b><small>${lock ? 'LOCKED' : d.title}</small></span></button>`; }).join('')}</div>
          <div class="cx-stage glass"><canvas class="cx-cv"></canvas><div class="cx-move"></div>
            <div class="cx-anims seg">${[['idle', 'Đứng'], ['walk', 'Đi'], ['run', 'Chạy'], ['air', 'Nhảy'], ['attack', 'Tấn công'], ['skills', 'Kỹ năng'], ['block', 'Đỡ'], ['hitstun', 'Bị đánh'], ['victory', 'Thắng'], ['defeat', 'Thua']].map(([k, l]) => `<button class="nav-item ${k === 'idle' ? 'on' : ''}" data-a="${k}">${l}</button>`).join('')}</div>
            <div class="cx-cos"></div>
          </div>
          <div class="cx-info glass"></div>
        </div>`;
      bindBack(el);
      this.el = el;
      this.prev = UI.preview($('.cx-cv', el), { char: this.c, costume: 0, state: 'idle', scale: 1.05, onMove: (n) => { const m = $('.cx-move', el); if (m) m.textContent = n; } });
      $$('.cx-it', el).forEach((b) => b.addEventListener('click', () => this.show(b.dataset.c)));
      $$('.cx-anims button', el).forEach((b) => b.addEventListener('click', () => {
        $$('.cx-anims button', el).forEach((x) => x.classList.toggle('on', x === b));
        this.anim = b.dataset.a;
        $('.cx-move', el).textContent = '';
        this.prev.set({ state: this.anim });
      }));
      this.show(this.c);
    },
    show(c) {
      this.c = c;
      const el = this.el, def = NS.Chars.get(c);
      const lock = !S().isCharUnlocked(c);
      const cos = lock ? 0 : S().costumeFor(c);
      $$('.cx-it', el).forEach((b) => b.classList.toggle('sel', b.dataset.c === c));
      el.style.setProperty('--acc', def.palettes[cos].accent);
      this.prev.set({ char: c, costume: cos, silhouette: lock, state: this.anim });
      $('.cx-cos', el).innerHTML = lock ? '' : def.palettes.map((p, i) => `<button class="cos nav-item ${i === cos ? 'on' : ''} ${S().isCostumeUnlocked(c, i) ? '' : 'locked'}" data-i="${i}" style="--c1:${p.accent};--c2:${p.armor}" title="${U.esc(p.name)}"></button>`).join('');
      $$('.cx-cos .cos', el).forEach((b) => b.addEventListener('click', () => {
        const i = +b.dataset.i;
        if (!S().isCostumeUnlocked(c, i)) { NS.Audio.sfx('error'); UI.toast('CHƯA MỞ KHÓA', 'Mở trang phục trong COLLECTION.', 'warn'); return; }
        S().equip('costume', i, c); this.show(c);
      }));
      const k = keysFor('p1');
      const d = NS.Chars.derive(c);
      $('.cx-info', el).innerHTML = lock ? `<div class="cx-name"><small>???</small><h3>${def.name}</h3></div><p class="si-lock">${ICON.lock} ${U.esc(charLockText(c))}</p>` : `
        <div class="cx-name"><small>${U.esc(def.role)}</small><h3>${def.name} <em>${def.title}</em></h3></div>
        <div class="cx-meta"><span>Tên thật <b>${U.esc(def.realName)}</b></span><span>Tuổi <b>${def.age}</b></span><span>Xuất thân <b>${U.esc(def.origin)}</b></span><span>Máu <b>${d.hp}</b></span></div>
        <blockquote>“${U.esc(def.quote)}”</blockquote>
        <p class="cx-bio">${U.esc(def.bio)}</p>
        <div class="si-stats">${statBars(def)}</div>
        <div class="cx-passive"><b>NỘI TẠI — ${U.esc(def.passive.name)}</b><p>${U.esc(def.passive.desc)}</p></div>
        <div class="cx-skills">${skillList(def, k)}</div>`;
    },
  };

  /* ---------------- COLLECTION ---------------- */
  SCREENS.collection = {
    enter(el) {
      NS.Audio.playMusic('menu');
      this.tab = this.tab || 'char';
      el.innerHTML = `${header('COLLECTION', 'BỘ SƯU TẬP & MỞ KHÓA', `<div class="chip credits">◈ <b class="cr-val">${U.fmtNum(S().profile.credits)}</b> CR</div>`)}
        <div class="tabs">${[['char', 'NHÂN VẬT'], ['costume', 'TRANG PHỤC'], ['fx', 'HIỆU ỨNG THẮNG'], ['bg', 'HÌNH NỀN HỒ SƠ'], ['title', 'DANH HIỆU'], ['ending', 'KẾT THÚC STORY']].map(([k, l]) => `<button class="tab nav-item ${this.tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
        <div class="col-grid"></div>`;
      bindBack(el);
      this.el = el;
      $$('.tab', el).forEach((t) => t.addEventListener('click', () => { this.tab = t.dataset.t; $$('.tab', el).forEach((x) => x.classList.toggle('on', x === t)); this.render(); }));
      this.render();
    },
    render() {
      const grid = $('.col-grid', this.el);
      const eq = S().data.equipped;
      $('.cr-val', this.el).textContent = U.fmtNum(S().profile.credits);
      if (this.tab === 'ending') {
        grid.innerHTML = Object.keys(NS.Story.ENDINGS).map((c) => {
          const ok = S().data.records.story[c] && S().data.records.story[c].cleared;
          const d = NS.Chars.get(c);
          return `<div class="col-it card glass ${ok ? '' : 'locked'}" style="--acc:${d.palettes[0].accent}"><img class="col-img" src="${NS.Anim.portrait(c, ok ? 2 : 0, 200, 200)}" alt=""><b>${ok ? NS.Story.ENDINGS[c].title : '??????'}</b><small>${d.name}</small>${ok ? `<button class="nbtn sm nav-item" data-end="${c}">XEM LẠI</button>` : `<small class="req">Hoàn thành Story với ${d.name}</small>`}</div>`;
        }).join('');
        $$('[data-end]', grid).forEach((b) => b.addEventListener('click', () => UI.go('ending', { char: b.dataset.end, costume: 2, unlocked: [] })));
        return;
      }
      const items = S().CATALOG.filter((it) => it.type === this.tab);
      grid.innerHTML = items.map((it) => {
        const own = S().isOwned(it.id);
        let img = '', name = it.name, equipped = false;
        if (it.type === 'char') { img = `<img class="col-img" src="${NS.Anim.portrait(it.ref, 0, 200, 200)}" alt="">`; }
        if (it.type === 'costume') {
          const p = NS.Chars.get(it.ref).palettes[it.idx];
          name = `${NS.Chars.get(it.ref).name} — ${p.name}`;
          img = `<img class="col-img" src="${NS.Anim.portrait(it.ref, it.idx, 200, 200)}" alt="">`;
          equipped = S().costumeFor(it.ref) === it.idx;
        }
        if (it.type === 'fx') { img = `<div class="col-img fx fx-${it.ref}"><i></i><i></i><i></i></div>`; equipped = eq.fx === it.ref; }
        if (it.type === 'bg') { img = `<div class="col-img pbg pbg-${it.ref}"></div>`; equipped = eq.bg === it.ref; }
        if (it.type === 'title') { img = `<div class="col-img ttl"><span>${it.ref}</span></div>`; equipped = eq.title === it.ref; }
        const canBuy = !own && it.cost > 0;
        const action = own
          ? (it.type === 'char' ? '<span class="owned">ĐÃ SỞ HỮU</span>' : equipped ? '<span class="owned on">ĐANG DÙNG</span>' : `<button class="nbtn sm primary nav-item" data-eq="${it.id}">TRANG BỊ</button>`)
          : canBuy ? `<button class="nbtn sm nav-item" data-buy="${it.id}">◈ ${it.cost} CR</button>` : '<span class="lockd">KHÓA</span>';
        return `<div class="col-it card glass ${own ? '' : 'locked'} ${equipped ? 'eq' : ''}">${img}<b>${U.esc(name)}</b><small class="req">${U.esc(it.desc)}</small>${action}</div>`;
      }).join('');
      // trang phục mặc định
      if (this.tab === 'costume') {
        const defs = NS.Chars.ROSTER.map((c) => {
          const eqd = S().costumeFor(c) === 0;
          return `<div class="col-it card glass ${eqd ? 'eq' : ''}"><img class="col-img" src="${NS.Anim.portrait(c, 0, 200, 200)}" alt=""><b>${NS.Chars.get(c).name} — ${NS.Chars.get(c).palettes[0].name}</b><small class="req">Mặc định</small>${eqd ? '<span class="owned on">ĐANG DÙNG</span>' : `<button class="nbtn sm primary nav-item" data-def="${c}">TRANG BỊ</button>`}</div>`;
        }).join('');
        grid.insertAdjacentHTML('afterbegin', defs);
      }
      $$('[data-buy]', grid).forEach((b) => b.addEventListener('click', () => {
        const it = S().item(b.dataset.buy);
        UI.confirm(`Mua "${it.name || it.ref}" với giá ${it.cost} Credits?`, () => {
          const r = S().buy(it.id);
          if (r.ok) { NS.Audio.sfx('unlock'); UI.toast('ĐÃ MỞ KHÓA', it.name || it.ref, 'unlock'); this.render(); }
          else { NS.Audio.sfx('error'); UI.toast('KHÔNG THỂ MUA', r.msg, 'warn'); }
        }, null, 'MUA', 'HỦY');
      }));
      $$('[data-eq]', grid).forEach((b) => b.addEventListener('click', () => {
        const it = S().item(b.dataset.eq);
        if (it.type === 'costume') S().equip('costume', it.idx, it.ref); else S().equip(it.type, it.ref);
        NS.Audio.sfx('confirm'); this.render();
      }));
      $$('[data-def]', grid).forEach((b) => b.addEventListener('click', () => { S().equip('costume', 0, b.dataset.def); this.render(); }));
    },
  };

  /* ---------------- PROFILE ---------------- */
  SCREENS.profile = {
    enter(el, params) {
      NS.Audio.playMusic('menu');
      this.tab = params.tab || 'overview';
      el.innerHTML = `${header('PROFILE', 'HỒ SƠ NGƯỜI CHƠI')}
        <div class="tabs">${[['overview', 'TỔNG QUAN'], ['records', 'BẢNG XẾP HẠNG'], ['titles', 'THÀNH TÍCH']].map(([k, l]) => `<button class="tab nav-item ${this.tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
        <div class="prof-body"></div>`;
      bindBack(el);
      this.el = el;
      $$('.tab', el).forEach((t) => t.addEventListener('click', () => { this.tab = t.dataset.t; $$('.tab', el).forEach((x) => x.classList.toggle('on', x === t)); this.render(); }));
      this.render();
    },
    render() {
      const box = $('.prof-body', this.el);
      const p = S().profile, rec = S().data.records;
      if (this.tab === 'overview') {
        const fav = Object.keys(p.charUsage).sort((a, b) => p.charUsage[b] - p.charUsage[a]);
        const wr = p.matches ? ((p.wins / p.matches) * 100).toFixed(1) : '0.0';
        const st = [['TỔNG TRẬN', p.matches], ['THẮNG', p.wins], ['THUA', p.losses], ['HÒA', p.draws], ['WIN RATE', wr + '%'], ['CHUỖI THẮNG', p.streak], ['CHUỖI DÀI NHẤT', p.bestStreak], ['TỔNG SÁT THƯƠNG', U.fmtNum(p.totalDamage)], ['COMBO CAO NHẤT', p.maxCombo + ' HIT'], ['SỐ COMBO (3+)', p.totalCombos], ['ULTIMATE', p.ultsUsed], ['PERFECT BLOCK', p.parries], ['COUNTER', p.counters], ['HIỆP PERFECT', p.perfects], ['THỜI GIAN CHƠI', U.fmtTime(p.playTime).slice(0, 5)], ['STORY HOÀN THÀNH', rec.storyClears]];
        box.innerHTML = `
          <div class="prof-card glass pbg-${S().data.equipped.bg}">
            <div class="player-card big">${playerCard()}</div>
            <div class="prof-name"><label>TÊN NGƯỜI CHƠI</label><input class="ninput" maxlength="16" value="${U.esc(p.name)}"><button class="nbtn sm nav-item" data-act="save">LƯU</button></div>
          </div>
          <div class="prof-grid">${st.map(([l, v]) => `<div class="pst glass"><b>${v}</b><span>${l}</span></div>`).join('')}</div>
          <div class="prof-fav glass"><div class="panel-h">NHÂN VẬT THƯỜNG DÙNG</div>${fav.length ? fav.slice(0, 5).map((c) => `<div class="fav-it"><img src="${NS.Anim.portrait(c, 0, 80, 80)}" alt=""><b>${NS.Chars.get(c).name}</b><div class="q-bar"><i style="--v:${p.charUsage[c] / p.charUsage[fav[0]]}"></i></div><span>${p.charUsage[c]} trận</span></div>`).join('') : '<p class="muted">Chưa có trận đấu nào.</p>'}</div>`;
        $('[data-act="save"]', box).addEventListener('click', () => {
          const v = $('.ninput', box).value.trim().toUpperCase().replace(/[^A-Z0-9_\- À-Ỹ]/gi, '').slice(0, 16) || 'PLAYER';
          p.name = v; S().save(); UI.toast('ĐÃ LƯU', `Tên người chơi: ${v}`, 'info'); this.render();
        });
      } else if (this.tab === 'records') {
        const sv = rec.survival, ta = rec.timeAttack;
        box.innerHTML = `
          <div class="lb-wrap">
            <div class="lb glass"><div class="panel-h">${ICON.shield} SURVIVAL — TOP 10</div>
              <div class="lb-row h"><span>#</span><span>NGƯỜI CHƠI</span><span>NHÂN VẬT</span><span>HẠ GỤC</span><span>ĐIỂM</span></div>
              ${sv.length ? sv.map((r, i) => `<div class="lb-row ${i < 3 ? 'top' + (i + 1) : ''}"><span>${i + 1}</span><span>${U.esc(r.name)}</span><span>${NS.Chars.get(r.char).name}</span><span>${r.defeated}</span><span>${U.fmtNum(r.score)}</span></div>`).join('') : '<p class="muted">Chưa có kỷ lục. Hãy thử chế độ Survival!</p>'}
            </div>
            <div class="lb glass"><div class="panel-h">${ICON.clock} TIME ATTACK — TOP 10</div>
              <div class="lb-row h"><span>#</span><span>NGƯỜI CHƠI</span><span>NHÂN VẬT</span><span>THỜI GIAN</span><span>NGÀY</span></div>
              ${ta.length ? ta.map((r, i) => `<div class="lb-row ${i < 3 ? 'top' + (i + 1) : ''}"><span>${i + 1}</span><span>${U.esc(r.name)}</span><span>${NS.Chars.get(r.char).name}</span><span>${U.fmtTime(r.time)}</span><span>${new Date(r.date).toLocaleDateString('vi-VN')}</span></div>`).join('') : '<p class="muted">Chưa có kỷ lục. Hãy thử chế độ Time Attack!</p>'}
            </div>
            <div class="lb glass"><div class="panel-h">${ICON.book} STORY MODE</div>
              ${['raven', 'volt', 'titan', 'frost', 'pyra', 'zero'].map((c) => { const r = rec.story[c]; return `<div class="lb-row s"><span><img src="${NS.Anim.portrait(c, 0, 48, 48)}" alt=""></span><span>${NS.Chars.get(c).name}</span><span>${r && r.cleared ? `✔ ${r.clears} lần • ${(NS.Story.DIFFICULTY[r.best] || {}).name || ''}` : '—'}</span></div>`; }).join('')}
            </div>
          </div>`;
      } else {
        const titles = S().CATALOG.filter((x) => x.type === 'title');
        box.innerHTML = `<div class="ach-grid">${titles.map((t) => { const own = S().isOwned(t.id); const eq = S().data.equipped.title === t.ref; return `<div class="ach glass ${own ? '' : 'locked'} ${eq ? 'eq' : ''}"><div class="ach-ico">${own ? ICON.trophy : ICON.lock}</div><div><b>${t.ref}</b><p>${U.esc(t.desc)}</p></div>${own ? (eq ? '<span class="owned on">ĐANG DÙNG</span>' : `<button class="nbtn sm nav-item" data-t="${t.ref}">DÙNG</button>`) : ''}</div>`; }).join('')}</div>`;
        $$('[data-t]', box).forEach((b) => b.addEventListener('click', () => { S().equip('title', b.dataset.t); this.render(); }));
      }
    },
  };

  /* ---------------- SETTINGS ---------------- */
  function buildSettings(box, inGame) {
    let tab = 'audio';
    const render = () => {
      const s = S().settings;
      const slider = (k, l) => `<div class="set-row"><span>${l}</span><input type="range" class="nrange" min="0" max="1" step="0.05" value="${s[k]}" data-k="${k}"><b>${Math.round(s[k] * 100)}%</b></div>`;
      const toggle = (k, l, d = '') => `<div class="set-row"><span>${l}${d ? `<small>${d}</small>` : ''}</span><button class="ntoggle nav-item ${s[k] ? 'on' : ''}" data-tg="${k}"><i></i></button></div>`;
      const seg = (k, l, opts) => `<div class="set-row"><span>${l}</span><div class="seg" data-sk="${k}">${opts.map(([v, t]) => `<button class="nav-item ${String(s[k]) === String(v) ? 'on' : ''}" data-v="${v}">${t}</button>`).join('')}</div></div>`;
      let body = '';
      if (tab === 'audio') body = slider('master', 'Âm lượng tổng') + slider('music', 'Nhạc nền') + slider('sfx', 'Hiệu ứng âm thanh') + toggle('muted', 'Tắt toàn bộ âm thanh') + toggle('announcer', 'Giọng bình luận viên', 'Đọc ROUND / FIGHT / K.O. (Speech Synthesis)');
      if (tab === 'graphics') body = seg('quality', 'Chất lượng đồ họa', [['high', 'CAO'], ['medium', 'TRUNG BÌNH'], ['low', 'THẤP']]) + toggle('reduceFx', 'Giảm hiệu ứng', 'Cho máy cấu hình thấp: ít hạt, tắt glitch & chuyển cảnh') + toggle('shake', 'Rung màn hình') + toggle('showDamage', 'Hiện số sát thương') + toggle('showHitbox', 'Hiện hitbox / hurtbox', 'Công cụ debug va chạm');
      if (tab === 'gameplay') body = seg('roundTime', 'Thời gian mỗi hiệp (mặc định)', [[30, '30s'], [60, '60s'], [99, '99s']]) + seg('rounds', 'Số hiệp (Best of)', [[1, 'BO1'], [3, 'BO3'], [5, 'BO5']]) + seg('touch', 'Điều khiển cảm ứng', [['auto', 'TỰ ĐỘNG'], ['on', 'BẬT'], ['off', 'TẮT']]);
      if (tab === 'controls') {
        const A = S().ACTIONS, L = S().ACTION_LABELS, b = s.bindings;
        body = `<div class="bind-table"><div class="bind-h"><span>HÀNH ĐỘNG</span><span>PLAYER 1</span><span>PLAYER 2</span></div>
          ${A.map((a) => `<div class="bind-row"><span>${L[a]}</span><button class="kbtn nav-item" data-bp="p1" data-ba="${a}">${NS.Input.keyName(b.p1[a][0])}</button><button class="kbtn nav-item" data-bp="p2" data-ba="${a}">${NS.Input.keyName(b.p2[a][0])}${b.p2[a][1] ? `<small>${NS.Input.keyName(b.p2[a][1])}</small>` : ''}</button></div>`).join('')}
          </div>
          <p class="muted">Bấm vào ô phím rồi nhấn phím mới (ESC để hủy). Ném = Đấm nhanh + Đá nhanh. Gamepad: X/Y/A/B = LP/HP/LK/HK • RB đỡ • LB né • LT/RT kỹ năng • LT+RT Ultimate • START tạm dừng.</p>
          <button class="nbtn sm nav-item" data-act="resetkeys">KHÔI PHỤC PHÍM MẶC ĐỊNH</button>`;
      }
      if (tab === 'data') body = `<div class="set-row"><span>Xem lại phần giới thiệu</span><button class="nbtn sm nav-item" data-act="intro" ${inGame ? 'disabled' : ''}>XEM INTRO</button></div>
          <div class="set-row"><span>Xóa toàn bộ dữ liệu<small>Hồ sơ, mở khóa, kỷ lục và cài đặt sẽ bị xóa vĩnh viễn.</small></span><button class="nbtn sm danger nav-item" data-act="reset" ${inGame ? 'disabled' : ''}>RESET SAVE</button></div>
          <p class="muted">Dữ liệu được lưu tự động trong LocalStorage của trình duyệt.</p>`;
      box.innerHTML = `<div class="tabs sm">${[['audio', 'ÂM THANH'], ['graphics', 'ĐỒ HỌA'], ['gameplay', 'GAMEPLAY'], ['controls', 'PHÍM'], ['data', 'DỮ LIỆU']].map(([k, l]) => `<button class="tab nav-item ${tab === k ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div><div class="set-body glass">${body}</div>`;
      $$('[data-st]', box).forEach((t) => t.addEventListener('click', () => { tab = t.dataset.st; render(); }));
      $$('.nrange', box).forEach((r) => r.addEventListener('input', () => { s[r.dataset.k] = +r.value; r.nextElementSibling.textContent = Math.round(r.value * 100) + '%'; NS.Audio.applySettings(); S().save(); }));
      $$('[data-tg]', box).forEach((t) => t.addEventListener('click', () => {
        const k = t.dataset.tg; s[k] = !s[k]; S().save(); NS.Audio.applySettings(); UI.applyBodyFlags();
        if (UI.game && (k === 'reduceFx')) { UI.game.reduce = s.reduceFx; UI.game.particles.setQuality(s.quality, s.reduceFx); }
        render();
      }));
      $$('[data-sk]', box).forEach((g) => $$('button', g).forEach((b) => b.addEventListener('click', () => {
        const k = g.dataset.sk; const v = b.dataset.v;
        s[k] = isNaN(+v) ? v : +v; S().save(); UI.applyBodyFlags();
        if (k === 'quality') { UI.bg.resize(); if (UI.game) { UI.game.resize(); UI.game.particles.setQuality(s.quality, s.reduceFx); } }
        render();
      })));
      $$('.kbtn', box).forEach((kb) => kb.addEventListener('click', () => {
        kb.classList.add('wait'); kb.textContent = '...';
        UI._capture = (e) => {
          e.preventDefault && e.preventDefault();
          UI._capture = null;
          if (e.code !== 'Escape') {
            const p = kb.dataset.bp, a = kb.dataset.ba;
            // gỡ phím trùng
            ['p1', 'p2'].forEach((pp) => S().ACTIONS.forEach((aa) => { s.bindings[pp][aa] = s.bindings[pp][aa].filter((c) => c !== e.code); if (!s.bindings[pp][aa].length) s.bindings[pp][aa] = []; }));
            s.bindings[p][a] = [e.code].concat((s.bindings[p][a] || []).filter((c) => c !== e.code)).slice(0, 2);
            S().ACTIONS.forEach((aa) => ['p1', 'p2'].forEach((pp) => { if (!s.bindings[pp][aa].length) s.bindings[pp][aa] = JSON.parse(JSON.stringify(S().DEFAULT_BINDINGS[pp][aa])).filter((c) => !Object.values(s.bindings).some((bb) => Object.values(bb).some((list) => list.includes(c)))); }));
            S().save(); NS.Input.Keyboard.refreshGameKeys(); NS.Audio.sfx('confirm');
          }
          render();
        };
      }));
      const rk = $('[data-act="resetkeys"]', box);
      if (rk) rk.addEventListener('click', () => { s.bindings = JSON.parse(JSON.stringify(S().DEFAULT_BINDINGS)); S().save(); NS.Input.Keyboard.refreshGameKeys(); render(); });
      const ri = $('[data-act="intro"]', box); if (ri) ri.addEventListener('click', () => UI.go('intro'));
      const rs = $('[data-act="reset"]', box);
      if (rs) rs.addEventListener('click', () => UI.confirm('Xóa TOÀN BỘ dữ liệu game? Không thể hoàn tác.', () => { S().resetAll(); NS.Audio.applySettings(); UI.applyBodyFlags(); UI.toast('ĐÃ RESET', 'Dữ liệu đã được xóa.', 'warn'); UI.go('menu'); }, null, 'XÓA', 'HỦY'));
    };
    render();
  }
  SCREENS.settings = {
    enter(el) {
      NS.Audio.playMusic('menu');
      el.innerHTML = `${header('SETTINGS', 'CÀI ĐẶT')}<div class="settings"></div>`;
      bindBack(el);
      buildSettings($('.settings', el), false);
    },
  };

  UI.buildSettings = buildSettings;
})();
