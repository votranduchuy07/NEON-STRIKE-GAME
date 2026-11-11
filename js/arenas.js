/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — arenas.js
   6 đấu trường vẽ thủ tục bằng Canvas: nền nhiều lớp parallax,
   hiệu ứng môi trường động, ánh sáng & âm thanh môi trường riêng.
   Tọa độ màn hình logic: 1280 x 720. Mặt sàn thế giới y = 620.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const U = NS.U;
  const TAU = Math.PI * 2;
  const GROUND = 620, CX = 900;

  const DEFS = {
    neon_city: {
      id: 'neon_city', name: 'NEON CITY', district: 'Quận Trung tâm — Neo-Veyra', music: 'neon_city', amb: 'rain',
      light: '#f472b6', accent: '#22d3ee', floor: '#120a22',
      desc: 'Đại lộ chính của Neo-Veyra lúc nửa đêm. Mưa neon không bao giờ tạnh, biển quảng cáo hologram che kín bầu trời.',
      lore: 'Mỗi trận đấu ở đây được phát trực tiếp lên hàng nghìn màn hình hologram. Người dân đặt cược bằng chính khẩu phần năng lượng của mình.',
    },
    underground: {
      id: 'underground', name: 'CYBER UNDERGROUND', district: 'Khu công nghiệp bỏ hoang — Tầng -7', music: 'underground', amb: 'factory',
      light: '#ef4444', accent: '#f97316', floor: '#140606',
      desc: 'Nhà máy chế tạo vũ khí cũ của Helix. Đường ống năng lượng vẫn chảy rực, ánh đèn cảnh báo đỏ không bao giờ tắt.',
      lore: 'Nơi Iron Vanguard từng được "nâng cấp". Những vết cào trên tường thép là dấu vết của những người không bao giờ rời khỏi đây.',
    },
    skyline: {
      id: 'skyline', name: 'SKYLINE 09', district: 'Nóc tháp Aether — 1.240m', music: 'skyline', amb: 'wind',
      light: '#fb7185', accent: '#a78bfa', floor: '#16132a',
      desc: 'Sân đấu trên nóc tòa nhà chọc trời cao nhất Neo-Veyra. Cả thành phố trải dài dưới chân trong ánh hoàng hôn neon.',
      lore: 'Gió ở độ cao này đủ mạnh để quật ngã một chiếc drone. Một bước sai là rơi xuống 1.240 mét.',
    },
    frozen: {
      id: 'frozen', name: 'FROZEN CORE', district: 'Cơ sở nghiên cứu Cryon — Vùng cực Bắc', music: 'frozen', amb: 'frost',
      light: '#67e8f9', accent: '#e0f2fe', floor: '#0a1f33',
      desc: 'Phòng thí nghiệm cryo-genetic bị bỏ hoang sau vụ rò rỉ Cryon-7. Băng tinh thể mọc xuyên qua cả tường thép.',
      lore: 'Hàng trăm buồng ngủ đông vẫn đang hoạt động. Không ai dám kiểm tra xem bên trong còn ai sống hay không.',
    },
    reactor: {
      id: 'reactor', name: 'REACTOR ZERO', district: 'Lò phản ứng trung tâm — Lõi phụ', music: 'reactor', amb: 'reactor',
      light: '#2dd4bf', accent: '#5eead4', floor: '#031a1c',
      desc: 'Lò phản ứng năng lượng khổng lồ cung cấp điện cho nửa thành phố. Năng lượng bất ổn phóng hồ quang liên tục.',
      lore: 'Mức bất ổn đã vượt 87% từ nhiều tháng nay. Helix vẫn ra lệnh tiếp tục vận hành.',
    },
    sanctum: {
      id: 'sanctum', name: 'CORE-9 SANCTUM', district: 'Đỉnh tháp Helix — Lõi CORE-9', music: 'sanctum', amb: 'sanctum',
      light: '#fbbf24', accent: '#fde68a', floor: '#120f1f', boss: true,
      desc: 'Nơi CORE-9 ngự trị. Ánh sáng ở đây được dệt từ Lumen của hàng nghìn chiến binh đã ngã xuống.',
      lore: 'Chưa từng có ai bước vào Sanctum và trở về. Đây là trận đấu cuối cùng của THE LAST LIGHT.',
    },
  };
  const LIST = ['neon_city', 'underground', 'skyline', 'frozen', 'reactor', 'sanctum'];

  /** Chạy fn trong không gian parallax: x tương đối tâm, y = 0 tại đường chân trời/mặt sàn */
  function layer(ctx, cam, f, fn) {
    const z = 1 + (cam.zoom - 1) * f;
    const gy = (GROUND - cam.y) * cam.zoom + 360;
    const by = 590 + (gy - 590) * Math.max(f, 0.15);
    ctx.save();
    ctx.translate(640, by);
    ctx.scale(z, z);
    ctx.translate(-(cam.x - CX) * f, 0);
    fn();
    ctx.restore();
  }
  function drawImgC(ctx, img, yOff = 0, scale = 1) {
    ctx.drawImage(img, (-img.width / 2) * scale, -img.height * scale + yOff, img.width * scale, img.height * scale);
  }
  function glow(ctx, x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, U.rgba(col, a)); g.addColorStop(1, U.rgba(col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  /* ======================================================================= */
  class Arena {
    constructor(id, quality = 'high', reduce = false) {
      this.def = DEFS[id] || DEFS.neon_city;
      this.id = this.def.id;
      this.q = quality; this.reduce = reduce;
      this.fxMul = reduce ? 0.3 : quality === 'low' ? 0.4 : quality === 'medium' ? 0.7 : 1;
      this.t = 0;
      this.flash = 0;
      this.drops = []; this.amb = [];
      this.surge = 0;
      this.build();
    }
    build() {
      const id = this.id;
      const mk = NS.makeCity;
      if (id === 'neon_city') {
        this.L1 = mk({ w: 2400, h: 360, seed: 101, base: '#0d0721', top: '#1a0d35', colors: ['#a855f7', '#22d3ee', '#f472b6'], minH: 120, maxH: 340, windowP: 0.12, winSize: 2, minW: 30, maxW: 80 });
        this.L2 = mk({ w: 2600, h: 460, seed: 202, base: '#08041a', top: '#1e1145', colors: ['#f472b6', '#22d3ee', '#facc15', '#a855f7'], minH: 180, maxH: 450, windowP: 0.22, winSize: 3, signs: 0.45, minW: 60, maxW: 150 });
        this.L3 = mk({ w: 3000, h: 380, seed: 303, base: '#04020c', top: '#0f0820', colors: ['#f0abfc', '#22d3ee'], minH: 200, maxH: 370, windowP: 0.1, winSize: 5, signs: 0.6, minW: 120, maxW: 220, gap: 60, gapR: 90 });
        this.cars = Array.from({ length: 14 }, () => this._car(true));
        this.drops = Array.from({ length: Math.round(170 * this.fxMul) }, () => this._drop(true));
      } else if (id === 'underground') {
        this.pipes = Array.from({ length: 9 }, (_, i) => ({ y: -60 - i * 48 - (i % 3) * 12, r: 8 + (i % 3) * 5, speed: 1 + (i % 4) * 0.6, col: i % 2 ? '#f97316' : '#ef4444' }));
        this.chains = Array.from({ length: 7 }, (_, i) => ({ x: -900 + i * 300 + (i % 2) * 70, len: 120 + (i % 3) * 60, ph: i }));
        this.sparks = [];
      } else if (id === 'skyline') {
        this.L1 = mk({ w: 3000, h: 300, seed: 404, base: '#120a2e', top: '#2a1650', colors: ['#fb7185', '#a78bfa', '#fde047', '#22d3ee'], minH: 60, maxH: 280, windowP: 0.3, winSize: 2, minW: 24, maxW: 70 });
        this.L2 = mk({ w: 3000, h: 320, seed: 505, base: '#0a0620', top: '#1c1040', colors: ['#f472b6', '#22d3ee', '#fde047'], minH: 80, maxH: 300, windowP: 0.28, winSize: 3, signs: 0.2, minW: 40, maxW: 110 });
        this.clouds = Array.from({ length: 9 }, (_, i) => ({ x: -1400 + i * 340, y: -300 - (i % 3) * 60, w: 260 + (i % 4) * 90, s: 0.15 + (i % 3) * 0.08 }));
        this.drones = Array.from({ length: 5 }, (_, i) => ({ x: -1000 + i * 450, y: -260 - i * 30, v: 0.6 + i * 0.2 }));
        this.wind = Array.from({ length: Math.round(40 * this.fxMul) }, () => ({ x: Math.random() * 1280, y: Math.random() * 720, v: U.rand(8, 18), l: U.rand(30, 90) }));
      } else if (id === 'frozen') {
        const r = U.rng(606);
        this.peaks = Array.from({ length: 14 }, (_, i) => ({ x: -1500 + i * 230 + r() * 80, h: 160 + r() * 220, w: 160 + r() * 140 }));
        this.crystals = Array.from({ length: 10 }, (_, i) => ({ x: -1300 + i * 290 + r() * 60, h: 70 + r() * 150, w: 18 + r() * 26, tilt: (r() - 0.5) * 0.5 }));
        this.drops = Array.from({ length: Math.round(120 * this.fxMul) }, () => this._flake(true));
      } else if (id === 'reactor') {
        this.arcs = [];
        this.motes = Array.from({ length: Math.round(60 * this.fxMul) }, () => ({ x: U.rand(-200, 2000), y: U.rand(300, 640), v: U.rand(0.3, 1.2), s: U.rand(1, 3) }));
      } else if (id === 'sanctum') {
        this.monoliths = Array.from({ length: 8 }, (_, i) => ({ x: -1100 + i * 320, y: -220 - (i % 3) * 90, w: 40 + (i % 3) * 18, h: 120 + (i % 4) * 40, ph: i * 1.3 }));
        this.motes = Array.from({ length: Math.round(70 * this.fxMul) }, () => ({ x: U.rand(0, 1280), y: U.rand(0, 720), v: U.rand(0.2, 0.8), s: U.rand(1, 3), ph: U.rand(0, TAU) }));
      }
    }
    _car(init) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      return { x: init ? U.rand(-1400, 1400) : dir > 0 ? -1500 : 1500, y: U.rand(-420, -180), v: dir * U.rand(2, 6), c: U.pick(['#f43f5e', '#22d3ee', '#fde047', '#ffffff', '#a855f7']), f: U.rand(0.2, 0.45) };
    }
    _drop(init) { return { x: U.rand(-100, 1400), y: init ? U.rand(-50, 720) : U.rand(-80, -10), v: U.rand(14, 22), l: U.rand(10, 24) }; }
    _flake(init) { return { x: U.rand(-50, 1330), y: init ? U.rand(0, 720) : -10, v: U.rand(0.6, 1.8), s: U.rand(1, 3.5), ph: U.rand(0, TAU) }; }

    update() {
      this.t++;
      if (this.flash > 0) this.flash -= 0.04;
      if (this.id === 'neon_city' && Math.random() < 0.0025) this.flash = 1;
      if (this.id === 'reactor') {
        if (this.surge > 0) this.surge -= 0.02;
        if (this.t % 380 === 0) this.surge = 1;
      }
    }

    /* ---------- Lớp nền (không gian màn hình) ---------- */
    drawBack(ctx, cam) {
      const t = this.t;
      switch (this.id) {
        case 'neon_city': return this._neonBack(ctx, cam, t);
        case 'underground': return this._ugBack(ctx, cam, t);
        case 'skyline': return this._skyBack(ctx, cam, t);
        case 'frozen': return this._frostBack(ctx, cam, t);
        case 'reactor': return this._reactorBack(ctx, cam, t);
        case 'sanctum': return this._sanctumBack(ctx, cam, t);
      }
    }
    /* ---------- Mặt sàn (không gian thế giới) ---------- */
    drawFloor(ctx, cam) {
      const t = this.t;
      switch (this.id) {
        case 'neon_city': return this._neonFloor(ctx, t);
        case 'underground': return this._ugFloor(ctx, t);
        case 'skyline': return this._skyFloor(ctx, t);
        case 'frozen': return this._frostFloor(ctx, t);
        case 'reactor': return this._reactorFloor(ctx, t);
        case 'sanctum': return this._sanctumFloor(ctx, t);
      }
    }
    /* ---------- Lớp phủ trước (mưa, tuyết, sương...) ---------- */
    drawFront(ctx, cam) {
      const t = this.t;
      if (this.id === 'neon_city') {
        ctx.strokeStyle = 'rgba(180,200,255,0.28)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        this.drops.forEach((d) => {
          d.y += d.v; d.x -= d.v * 0.18;
          if (d.y > 720) Object.assign(d, this._drop(false));
          ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.18, d.y - d.l);
        });
        ctx.stroke();
        if (this.flash > 0) { ctx.fillStyle = `rgba(220,200,255,${this.flash * 0.25})`; ctx.fillRect(0, 0, 1280, 720); }
      } else if (this.id === 'underground') {
        // tia lửa rơi từ dây cáp hỏng
        if (Math.random() < 0.08 * this.fxMul) {
          const x = U.pick([220, 610, 1010]);
          for (let i = 0; i < 6; i++) this.sparks.push({ x: x + U.rand(-6, 6), y: 40, vx: U.rand(-2, 2), vy: U.rand(0, 3), l: 40 });
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        this.sparks = this.sparks.filter((s) => {
          s.vy += 0.3; s.x += s.vx; s.y += s.vy; s.l--;
          ctx.fillStyle = `rgba(253,186,116,${s.l / 40})`; ctx.fillRect(s.x, s.y, 2, 4);
          return s.l > 0 && s.y < 720;
        });
        ctx.restore();
        const vg = ctx.createRadialGradient(640, 360, 300, 640, 360, 800);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(40,0,0,0.55)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, 1280, 720);
      } else if (this.id === 'skyline') {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
        ctx.beginPath();
        this.wind.forEach((w) => {
          w.x -= w.v; if (w.x < -100) { w.x = 1380; w.y = Math.random() * 720; }
          ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + w.l, w.y + 2);
        });
        ctx.stroke();
      } else if (this.id === 'frozen') {
        ctx.fillStyle = 'rgba(240,249,255,0.85)';
        this.drops.forEach((d) => {
          d.y += d.v; d.x += Math.sin(t * 0.02 + d.ph) * 0.6 - 0.4;
          if (d.y > 720) Object.assign(d, this._flake(false));
          ctx.beginPath(); ctx.arc(d.x, d.y, d.s, 0, TAU); ctx.fill();
        });
        // sương dưới sàn
        for (let i = 0; i < 3; i++) {
          const y = 560 + i * 40, off = (t * (0.3 + i * 0.2)) % 400;
          const g = ctx.createLinearGradient(0, y - 40, 0, y + 40);
          g.addColorStop(0, 'rgba(207,250,254,0)'); g.addColorStop(0.5, `rgba(207,250,254,${0.07 + i * 0.03})`); g.addColorStop(1, 'rgba(207,250,254,0)');
          ctx.fillStyle = g; ctx.fillRect(-off, y - 40, 1680, 80);
        }
      } else if (this.id === 'reactor') {
        if (this.surge > 0) { ctx.fillStyle = `rgba(45,212,191,${this.surge * 0.12})`; ctx.fillRect(0, 0, 1280, 720); }
        const vg = ctx.createRadialGradient(640, 360, 280, 640, 360, 800);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,20,20,0.5)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, 1280, 720);
      } else if (this.id === 'sanctum') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        this.motes.forEach((m) => {
          m.y -= m.v; m.x += Math.sin(t * 0.01 + m.ph) * 0.3;
          if (m.y < -10) { m.y = 730; m.x = U.rand(0, 1280); }
          glow(ctx, m.x, m.y, m.s * 4, '#fde68a', 0.5);
        });
        ctx.restore();
      }
    }

    /* =================== NEON CITY =================== */
    _neonBack(ctx, cam, t) {
      const sky = ctx.createLinearGradient(0, 0, 0, 720);
      sky.addColorStop(0, '#04020d'); sky.addColorStop(0.5, '#1a0a34'); sky.addColorStop(0.85, '#4a1250'); sky.addColorStop(1, '#2a0a30');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 1280, 720);
      layer(ctx, cam, 0.03, () => {
        // mặt trăng hologram
        const mx = 260, my = -440;
        glow(ctx, mx, my, 220, '#f472b6', 0.25);
        ctx.fillStyle = 'rgba(244,114,182,0.35)'; ctx.beginPath(); ctx.arc(mx, my, 90, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(253,164,175,0.5)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(4,2,13,0.4)';
        for (let i = -90; i < 90; i += 9) ctx.fillRect(mx - 95, my + i + ((t * 0.3) % 9), 190, 3);
      });
      layer(ctx, cam, 0.08, () => {
        // tháp CORE-9 xa
        const bx = -220;
        const a = 0.2 + Math.sin(t * 0.03) * 0.07;
        const g = ctx.createLinearGradient(bx - 30, 0, bx + 30, 0);
        g.addColorStop(0, 'rgba(34,211,238,0)'); g.addColorStop(0.5, `rgba(125,211,252,${a})`); g.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.fillStyle = g; ctx.fillRect(bx - 30, -900, 60, 900);
        ctx.fillStyle = '#120a2c';
        ctx.beginPath(); ctx.moveTo(bx - 34, -40); ctx.lineTo(bx - 9, -470); ctx.lineTo(bx + 9, -470); ctx.lineTo(bx + 34, -40); ctx.fill();
        glow(ctx, bx, -470, 60, '#67e8f9', 0.7);
        drawImgC(ctx, this.L1, -30);
      });
      layer(ctx, cam, 0.22, () => {
        // xe bay
        this.cars.forEach((c) => {
          c.x += c.v; if (c.x > 1600 || c.x < -1600) Object.assign(c, this._car(false));
          ctx.fillStyle = U.rgba(c.c, 0.9); ctx.fillRect(c.x, c.y, 6, 2);
          ctx.fillStyle = U.rgba(c.c, 0.2); ctx.fillRect(c.x - Math.sign(c.v) * 40, c.y, 40, 2);
        });
        drawImgC(ctx, this.L2, -10);
        // biển quảng cáo hologram
        this._billboard(ctx, -380, -330, 240, 120, '#22d3ee', 'THE LAST LIGHT', 'LIVE TONIGHT • CORE-9 •', t);
        this._billboard(ctx, 420, -380, 200, 150, '#f472b6', 'PYRA', 'EMBER PIT CHAMPION', t + 50, true);
      });
      layer(ctx, cam, 0.5, () => {
        drawImgC(ctx, this.L3, 30, 1);
        // cột đèn neon gần
        [-700, -150, 520, 1050].forEach((x, i) => {
          ctx.fillStyle = '#05030c'; ctx.fillRect(x, -300, 20, 300);
          const c = i % 2 ? '#22d3ee' : '#f472b6';
          const fl = Math.sin(t * 0.2 + i * 3) > -0.9 ? 1 : 0.2;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = U.rgba(c, 0.8 * fl); ctx.fillRect(x + 7, -290, 6, 280);
          glow(ctx, x + 10, -150, 70, c, 0.2 * fl);
          ctx.restore();
        });
      });
    }
    _billboard(ctx, x, y, w, h, col, title, sub, t, figure) {
      const fl = Math.random() < 0.02 ? 0.3 : 1;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = U.rgba(col, 0.1 * fl); ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = U.rgba(col, 0.8 * fl); ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = U.rgba(col, 0.9 * fl);
      ctx.font = `900 ${figure ? 30 : 22}px Orbitron, sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(title, x + w / 2, y + (figure ? h - 34 : h * 0.45));
      ctx.font = '600 11px "Chakra Petch", sans-serif';
      const sw = ctx.measureText(sub + '   ').width;
      ctx.save(); ctx.beginPath(); ctx.rect(x + 4, y, w - 8, h); ctx.clip();
      const off = (t * 0.8) % sw;
      for (let k = -1; k < 3; k++) ctx.fillText(sub, x + w / 2 - off + k * sw, y + h - 12);
      ctx.restore();
      if (figure) {
        // hình bóng idol nhảy múa
        const cx = x + w / 2, cy = y + 70, s = Math.sin(t * 0.1);
        ctx.strokeStyle = U.rgba('#fde047', 0.8 * fl); ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, cy - 34, 8, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 26); ctx.lineTo(cx, cy + 6);
        ctx.moveTo(cx, cy - 18); ctx.lineTo(cx - 18, cy - 34 - s * 8); ctx.moveTo(cx, cy - 18); ctx.lineTo(cx + 18, cy - 30 + s * 8);
        ctx.moveTo(cx, cy + 6); ctx.lineTo(cx - 12, cy + 28); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx + 12, cy + 28); ctx.stroke();
      } else {
        for (let i = 0; i < 14; i++) {
          const bh = 8 + Math.abs(Math.sin(t * 0.09 + i * 0.7)) * 30;
          ctx.fillRect(x + 18 + i * 15, y + h - 26 - bh, 9, bh);
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let i = 0; i < h; i += 4) ctx.fillRect(x, y + i, w, 1.5);
      ctx.restore();
    }
    _neonFloor(ctx, t) {
      const g = ctx.createLinearGradient(0, GROUND, 0, GROUND + 260);
      g.addColorStop(0, '#1a0e2e'); g.addColorStop(1, '#06030c');
      ctx.fillStyle = g; ctx.fillRect(-400, GROUND, 2600, 400);
      // phản chiếu neon trên mặt đường ướt
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      [[150, '#f472b6'], [520, '#22d3ee'], [880, '#a855f7'], [1260, '#f472b6'], [1640, '#22d3ee']].forEach(([x, c], i) => {
        const a = 0.12 + Math.sin(t * 0.05 + i) * 0.04;
        const rg = ctx.createLinearGradient(0, GROUND, 0, GROUND + 200);
        rg.addColorStop(0, U.rgba(c, a * 2)); rg.addColorStop(1, U.rgba(c, 0));
        ctx.fillStyle = rg;
        for (let k = 0; k < 6; k++) ctx.fillRect(x - 30 + k * 11 + Math.sin(t * 0.07 + k) * 2, GROUND + 2, 5, 120 + k * 12);
      });
      ctx.restore();
      // vạch kẻ đường
      ctx.strokeStyle = 'rgba(253,224,71,0.25)'; ctx.lineWidth = 3; ctx.setLineDash([50, 40]);
      ctx.beginPath(); ctx.moveTo(-400, GROUND + 70); ctx.lineTo(2200, GROUND + 70); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(244,114,182,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-400, GROUND + 1); ctx.lineTo(2200, GROUND + 1); ctx.stroke();
      // vũng nước gợn sóng
      if (this.fxMul > 0.35) {
        ctx.strokeStyle = 'rgba(200,210,255,0.25)'; ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
          const ph = (t * 0.6 + i * 37) % 60;
          const x = (i * 263) % 1800, y = GROUND + 20 + (i % 4) * 40;
          ctx.beginPath(); ctx.ellipse(x, y, ph, ph * 0.18, 0, 0, TAU); ctx.globalAlpha = 1 - ph / 60; ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }

    /* =================== CYBER UNDERGROUND =================== */
    _ugBack(ctx, cam, t) {
      const g = ctx.createLinearGradient(0, 0, 0, 720);
      g.addColorStop(0, '#080202'); g.addColorStop(0.6, '#1f0606'); g.addColorStop(1, '#0c0303');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
      layer(ctx, cam, 0.1, () => {
        // tường thép xa + quạt khổng lồ
        ctx.fillStyle = '#140505';
        for (let i = -8; i < 8; i++) { ctx.fillRect(i * 200, -700, 190, 700); }
        [-450, 450].forEach((fx, k) => {
          const fy = -380;
          glow(ctx, fx, fy, 230, '#ef4444', 0.35);
          ctx.fillStyle = '#0a0202'; ctx.beginPath(); ctx.arc(fx, fy, 150, 0, TAU); ctx.fill();
          ctx.save(); ctx.translate(fx, fy); ctx.rotate(t * (k ? -0.03 : 0.025));
          ctx.fillStyle = '#2b0b0b';
          for (let b = 0; b < 6; b++) { ctx.rotate(TAU / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(60, -30, 140, -10); ctx.lineTo(140, 20); ctx.quadraticCurveTo(60, 10, 0, 0); ctx.fill(); }
          ctx.restore();
          ctx.strokeStyle = '#3b0d0d'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(fx, fy, 150, 0, TAU); ctx.stroke();
          ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(fx, fy, 14, 0, TAU); ctx.fill();
        });
      });
      layer(ctx, cam, 0.3, () => {
        // đường ống năng lượng
        this.pipes.forEach((p, i) => {
          ctx.fillStyle = '#1c0909'; ctx.fillRect(-1400, p.y - p.r, 2800, p.r * 2);
          ctx.fillStyle = '#2c1010'; ctx.fillRect(-1400, p.y - p.r, 2800, p.r * 0.6);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = U.rgba(p.col, 0.75); ctx.lineWidth = 2.5;
          ctx.setLineDash([24, 46]); ctx.lineDashOffset = -t * p.speed * (i % 2 ? 2 : -2);
          ctx.beginPath(); ctx.moveTo(-1400, p.y); ctx.lineTo(1400, p.y); ctx.stroke();
          ctx.restore();
          for (let x = -1400; x < 1400; x += 260) { ctx.fillStyle = '#3a1414'; ctx.fillRect(x + (i * 37) % 120, p.y - p.r - 3, 14, p.r * 2 + 6); }
        });
        ctx.setLineDash([]);
        // ống đứng
        [-820, -260, 300, 860].forEach((x) => {
          ctx.fillStyle = '#190707'; ctx.fillRect(x, -720, 34, 720);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const k = (t * 3 + x) % 720;
          const lg = ctx.createLinearGradient(0, -k, 0, -k + 80);
          lg.addColorStop(0, 'rgba(249,115,22,0)'); lg.addColorStop(0.5, 'rgba(249,115,22,0.6)'); lg.addColorStop(1, 'rgba(249,115,22,0)');
          ctx.fillStyle = lg; ctx.fillRect(x + 12, -k, 10, 80);
          ctx.restore();
        });
      });
      layer(ctx, cam, 0.55, () => {
        // đèn cảnh báo xoay
        [-600, 0, 600].forEach((x, i) => {
          const y = -470, a = t * 0.06 + i;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.translate(x, y);
          ctx.rotate(Math.sin(a) * 0.9 + Math.PI / 2);
          const lg = ctx.createLinearGradient(0, 0, 600, 0);
          lg.addColorStop(0, 'rgba(239,68,68,0.35)'); lg.addColorStop(1, 'rgba(239,68,68,0)');
          ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(600, -110); ctx.lineTo(600, 110); ctx.fill();
          ctx.restore();
          ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
          glow(ctx, x, y, 40, '#ef4444', 0.6);
        });
        // xích treo
        ctx.strokeStyle = '#3f2a2a'; ctx.lineWidth = 3;
        this.chains.forEach((c) => {
          const sw = Math.sin(t * 0.02 + c.ph) * 8;
          ctx.beginPath(); ctx.moveTo(c.x, -720);
          for (let k = 0; k <= c.len; k += 12) ctx.lineTo(c.x + (sw * k) / c.len, -620 + k);
          ctx.stroke();
          ctx.fillStyle = '#5b3b3b'; ctx.fillRect(c.x + sw - 8, -620 + c.len, 16, 22);
        });
        // khung máy
        ctx.fillStyle = '#0d0303';
        ctx.fillRect(-1100, -160, 260, 160); ctx.fillRect(900, -200, 300, 200);
        ctx.fillStyle = 'rgba(239,68,68,0.6)';
        for (let i = 0; i < 5; i++) ctx.fillRect(-1080 + i * 46, -140, 30, 6 + ((t >> 3) + i) % 3 * 4);
      });
    }
    _ugFloor(ctx, t) {
      ctx.fillStyle = '#120404'; ctx.fillRect(-400, GROUND, 2600, 400);
      for (let x = -400; x < 2200; x += 90) {
        ctx.fillStyle = (x / 90) % 2 ? '#1a0707' : '#160606';
        ctx.fillRect(x, GROUND, 88, 400);
        ctx.strokeStyle = '#2b0e0e'; ctx.lineWidth = 2; ctx.strokeRect(x, GROUND, 88, 400);
      }
      // ánh đỏ dưới khe lưới
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let x = -400; x < 2200; x += 90) {
        const a = 0.15 + Math.sin(t * 0.04 + x * 0.01) * 0.08;
        ctx.fillStyle = U.rgba('#ef4444', a); ctx.fillRect(x + 86, GROUND + 4, 4, 200);
      }
      ctx.restore();
      // sọc cảnh báo
      for (let x = -400; x < 2200; x += 40) {
        ctx.fillStyle = (x / 40) % 2 ? '#facc15' : '#111';
        ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 20, GROUND); ctx.lineTo(x + 10, GROUND + 12); ctx.lineTo(x - 10, GROUND + 12); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(249,115,22,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-400, GROUND); ctx.lineTo(2200, GROUND); ctx.stroke();
      // hơi nước từ lỗ thông
      if (this.fxMul > 0.3) {
        [260, 1540].forEach((x, i) => {
          const ph = (t + i * 90) % 240;
          if (ph < 90) for (let k = 0; k < 4; k++) {
            const y = GROUND - ph * 2.2 - k * 18, r = 20 + ph * 0.6 + k * 8;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, `rgba(220,200,200,${0.18 * (1 - ph / 90)})`); g.addColorStop(1, 'rgba(220,200,200,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + Math.sin(k + t * 0.05) * 10, y, r, 0, TAU); ctx.fill();
          }
          ctx.fillStyle = '#2b0e0e'; ctx.fillRect(x - 30, GROUND - 4, 60, 8);
        });
      }
    }

    /* =================== SKYLINE 09 =================== */
    _skyBack(ctx, cam, t) {
      const g = ctx.createLinearGradient(0, 0, 0, 720);
      g.addColorStop(0, '#060924'); g.addColorStop(0.4, '#26124d'); g.addColorStop(0.7, '#8a2a6b'); g.addColorStop(0.86, '#f97362'); g.addColorStop(1, '#3b1240');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
      layer(ctx, cam, 0.03, () => {
        // mặt trời synthwave
        const sy = -190;
        const sg = ctx.createLinearGradient(0, sy - 200, 0, sy + 120);
        sg.addColorStop(0, '#fde047'); sg.addColorStop(1, '#f43f5e');
        ctx.save(); ctx.beginPath(); ctx.arc(0, sy, 200, Math.PI, 0); ctx.lineTo(200, sy + 60); ctx.lineTo(-200, sy + 60); ctx.closePath(); ctx.clip();
        ctx.fillStyle = sg; ctx.fillRect(-210, sy - 210, 420, 280);
        ctx.fillStyle = '#8a2a6b';
        for (let i = 0; i < 8; i++) { const yy = sy - 70 + i * 18 + ((t * 0.2) % 18); ctx.fillRect(-210, yy, 420, 2 + i * 0.9); }
        ctx.restore();
        glow(ctx, 0, sy, 380, '#fb7185', 0.25);
      });
      layer(ctx, cam, 0.06, () => {
        this.clouds.forEach((c) => {
          c.x += c.s; if (c.x > 1800) c.x = -1800;
          const cg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.w * 0.6);
          cg.addColorStop(0, 'rgba(250,180,210,0.18)'); cg.addColorStop(1, 'rgba(250,180,210,0)');
          ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w, c.w * 0.18, 0, 0, TAU); ctx.fill();
        });
      });
      layer(ctx, cam, 0.12, () => drawImgC(ctx, this.L1, 150));
      layer(ctx, cam, 0.2, () => {
        drawImgC(ctx, this.L2, 190);
        // đèn pha quét từ dưới thành phố
        [-500, 300, 800].forEach((x, i) => {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.translate(x, 100); ctx.rotate(-Math.PI / 2 + Math.sin(t * 0.008 + i * 2) * 0.5);
          const lg = ctx.createLinearGradient(0, 0, 900, 0);
          lg.addColorStop(0, 'rgba(167,139,250,0.2)'); lg.addColorStop(1, 'rgba(167,139,250,0)');
          ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -50); ctx.lineTo(900, 50); ctx.fill();
          ctx.restore();
        });
      });
      layer(ctx, cam, 0.4, () => {
        // đỉnh các tòa tháp lân cận
        [[-900, -260, 150], [-560, -160, 110], [700, -300, 170], [1100, -200, 130]].forEach(([x, y, w], i) => {
          const tg = ctx.createLinearGradient(0, y, 0, 200);
          tg.addColorStop(0, '#1c1338'); tg.addColorStop(1, '#0a0618');
          ctx.fillStyle = tg; ctx.fillRect(x, y, w, 500);
          ctx.fillRect(x + w / 2 - 3, y - 90, 6, 90);
          const on = Math.floor(t / 40 + i) % 2 === 0;
          if (on) { ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(x + w / 2, y - 92, 4, 0, TAU); ctx.fill(); glow(ctx, x + w / 2, y - 92, 26, '#f43f5e', 0.7); }
          ctx.fillStyle = 'rgba(167,139,250,0.4)';
          for (let k = 0; k < 6; k++) ctx.fillRect(x + 10, y + 20 + k * 26, w - 20, 3);
        });
        this.drones.forEach((d) => {
          d.x += d.v; if (d.x > 1500) d.x = -1500;
          const yy = d.y + Math.sin(t * 0.05 + d.x * 0.01) * 10;
          ctx.fillStyle = '#0d0920'; ctx.fillRect(d.x - 10, yy - 3, 20, 6);
          ctx.fillStyle = (t >> 4) % 2 ? '#22d3ee' : '#f43f5e'; ctx.fillRect(d.x - 2, yy + 3, 4, 3);
        });
      });
    }
    _skyFloor(ctx, t) {
      // lan can phía sau
      ctx.strokeStyle = '#2a2050'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-400, GROUND - 58); ctx.lineTo(2200, GROUND - 58); ctx.stroke();
      ctx.lineWidth = 3;
      for (let x = -400; x < 2200; x += 70) { ctx.beginPath(); ctx.moveTo(x, GROUND - 58); ctx.lineTo(x, GROUND); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(251,113,133,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-400, GROUND - 60); ctx.lineTo(2200, GROUND - 60); ctx.stroke();
      // máy lạnh / chảo vệ tinh
      [[90, 70, 50], [1650, 90, 60]].forEach(([x, w, h]) => {
        ctx.fillStyle = '#1b1636'; ctx.fillRect(x, GROUND - h, w, h);
        ctx.strokeStyle = '#2f2758'; ctx.lineWidth = 2; ctx.strokeRect(x, GROUND - h, w, h);
        ctx.save(); ctx.translate(x + w / 2, GROUND - h / 2); ctx.rotate(t * 0.2);
        ctx.strokeStyle = '#3b3470'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.stroke();
        ctx.restore();
      });
      const g = ctx.createLinearGradient(0, GROUND, 0, GROUND + 260);
      g.addColorStop(0, '#2a2246'); g.addColorStop(1, '#0c0918');
      ctx.fillStyle = g; ctx.fillRect(-400, GROUND, 2600, 400);
      // bãi đáp trực thăng
      ctx.save(); ctx.translate(CX, GROUND + 70); ctx.scale(1, 0.22);
      ctx.strokeStyle = 'rgba(253,224,71,0.5)'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(0, 0, 260, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(253,224,71,0.45)';
      ctx.font = '900 60px Orbitron, sans-serif'; ctx.textAlign = 'center';
      ctx.save(); ctx.translate(CX, GROUND + 90); ctx.scale(1.8, 0.4); ctx.fillText('H', 0, 0); ctx.restore();
      // đèn viền
      for (let x = -400; x < 2200; x += 120) {
        const on = (Math.floor(t / 10) + x / 120) % 6 === 0;
        ctx.fillStyle = on ? '#fde047' : 'rgba(253,224,71,0.3)';
        ctx.fillRect(x, GROUND + 4, 10, 4);
      }
    }

    /* =================== FROZEN CORE =================== */
    _frostBack(ctx, cam, t) {
      const g = ctx.createLinearGradient(0, 0, 0, 720);
      g.addColorStop(0, '#01040f'); g.addColorStop(0.5, '#0a2440'); g.addColorStop(1, '#134a6e');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
      // cực quang
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let b = 0; b < 3; b++) {
        ctx.beginPath();
        for (let x = 0; x <= 1280; x += 20) {
          const y = 90 + b * 40 + Math.sin(x * 0.006 + t * 0.01 + b) * 40 + Math.sin(x * 0.013 - t * 0.017) * 18;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(1280, 0); ctx.lineTo(0, 0); ctx.closePath();
        const ag = ctx.createLinearGradient(0, 0, 0, 260);
        ag.addColorStop(0, 'rgba(45,212,191,0)'); ag.addColorStop(0.7, b === 1 ? 'rgba(167,139,250,0.12)' : 'rgba(45,212,191,0.12)'); ag.addColorStop(1, 'rgba(45,212,191,0)');
        ctx.fillStyle = ag; ctx.fill();
      }
      ctx.restore();
      layer(ctx, cam, 0.08, () => {
        this.peaks.forEach((p) => {
          ctx.fillStyle = '#0c2238';
          ctx.beginPath(); ctx.moveTo(p.x - p.w, 0); ctx.lineTo(p.x, -p.h - 120); ctx.lineTo(p.x + p.w, 0); ctx.fill();
          ctx.fillStyle = 'rgba(224,242,254,0.35)';
          ctx.beginPath(); ctx.moveTo(p.x - p.w * 0.25, -p.h * 0.75 - 120); ctx.lineTo(p.x, -p.h - 120); ctx.lineTo(p.x + p.w * 0.25, -p.h * 0.75 - 120); ctx.fill();
        });
      });
      layer(ctx, cam, 0.3, () => {
        // tòa nhà nghiên cứu
        ctx.fillStyle = '#0b1d31'; ctx.fillRect(-1100, -420, 2200, 420);
        ctx.fillStyle = '#10283f'; ctx.fillRect(-1100, -430, 2200, 14);
        // buồng cryo
        for (let i = 0; i < 9; i++) {
          const x = -960 + i * 240, y = -330, w = 70, h = 230;
          ctx.fillStyle = '#081624'; ctx.fillRect(x - 6, y - 10, w + 12, h + 20);
          const tg = ctx.createLinearGradient(x, 0, x + w, 0);
          tg.addColorStop(0, 'rgba(103,232,249,0.15)'); tg.addColorStop(0.5, 'rgba(165,243,252,0.35)'); tg.addColorStop(1, 'rgba(103,232,249,0.15)');
          ctx.fillStyle = tg; ctx.fillRect(x, y, w, h);
          ctx.fillStyle = 'rgba(8,22,36,0.6)';
          ctx.beginPath(); ctx.arc(x + w / 2, y + 50, 14, 0, TAU); ctx.fill(); ctx.fillRect(x + w / 2 - 16, y + 64, 32, 90);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const k = (t * 0.8 + i * 40) % h;
          ctx.fillStyle = 'rgba(207,250,254,0.4)'; ctx.fillRect(x, y + k, w, 2);
          ctx.restore();
          ctx.fillStyle = i % 3 === 0 ? '#f43f5e' : '#22d3ee'; ctx.fillRect(x + w / 2 - 4, y + h + 2, 8, 4);
        }
      });
      layer(ctx, cam, 0.55, () => {
        this.crystals.forEach((c, i) => {
          ctx.save(); ctx.translate(c.x, 0); ctx.rotate(c.tilt);
          const cg = ctx.createLinearGradient(-c.w, 0, c.w, 0);
          cg.addColorStop(0, 'rgba(103,232,249,0.5)'); cg.addColorStop(0.5, 'rgba(224,242,254,0.85)'); cg.addColorStop(1, 'rgba(56,189,248,0.4)');
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.moveTo(-c.w, 0); ctx.lineTo(-c.w * 0.6, -c.h); ctx.lineTo(0, -c.h - 30); ctx.lineTo(c.w * 0.6, -c.h); ctx.lineTo(c.w, 0); ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
          glow(ctx, 0, -c.h * 0.6, c.w * 2.4, '#67e8f9', 0.12 + Math.sin(t * 0.04 + i) * 0.05);
          ctx.restore();
        });
      });
    }
    _frostFloor(ctx, t) {
      const g = ctx.createLinearGradient(0, GROUND, 0, GROUND + 260);
      g.addColorStop(0, '#2b6a8f'); g.addColorStop(0.15, '#123a57'); g.addColorStop(1, '#06121f');
      ctx.fillStyle = g; ctx.fillRect(-400, GROUND, 2600, 400);
      ctx.strokeStyle = 'rgba(224,242,254,0.25)'; ctx.lineWidth = 1.2;
      const r = U.rng(77);
      for (let i = 0; i < 18; i++) {
        let x = r() * 2200 - 200, y = GROUND + 10 + r() * 160;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (r() - 0.3) * 60; y += (r() - 0.5) * 16; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const sh = ctx.createLinearGradient(0, GROUND, 0, GROUND + 40);
      sh.addColorStop(0, 'rgba(165,243,252,0.35)'); sh.addColorStop(1, 'rgba(165,243,252,0)');
      ctx.fillStyle = sh; ctx.fillRect(-400, GROUND, 2600, 40);
      ctx.restore();
    }

    /* =================== REACTOR ZERO =================== */
    _reactorBack(ctx, cam, t) {
      const g = ctx.createLinearGradient(0, 0, 0, 720);
      g.addColorStop(0, '#010607'); g.addColorStop(0.6, '#03211f'); g.addColorStop(1, '#021312');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
      layer(ctx, cam, 0.12, () => {
        // giàn đỡ xa
        ctx.strokeStyle = '#06302c'; ctx.lineWidth = 6;
        for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(i * 220, 0); ctx.lineTo(i * 220 + 110, -700); ctx.stroke(); }
        // lõi lò phản ứng
        const pulse = 0.6 + Math.sin(t * 0.06) * 0.2 + this.surge * 0.5;
        glow(ctx, 0, -330, 420, '#2dd4bf', 0.25 * pulse);
        const cg = ctx.createLinearGradient(-110, 0, 110, 0);
        cg.addColorStop(0, '#043b36'); cg.addColorStop(0.35, '#14b8a6'); cg.addColorStop(0.5, '#ccfbf1'); cg.addColorStop(0.65, '#14b8a6'); cg.addColorStop(1, '#043b36');
        ctx.fillStyle = cg; ctx.fillRect(-110, -720, 220, 720);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
          const y = -((t * 4 + i * 120) % 720);
          ctx.fillStyle = `rgba(204,251,241,${0.25 * pulse})`; ctx.fillRect(-110, y, 220, 8);
        }
        ctx.restore();
        ctx.fillStyle = '#021a18'; ctx.fillRect(-150, -720, 40, 720); ctx.fillRect(110, -720, 40, 720);
        // vòng xoay
        for (let r = 0; r < 3; r++) {
          const y = -520 + r * 160;
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = `rgba(94,234,212,${0.5 * pulse})`; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.ellipse(0, y, 250, 34, 0, 0, TAU); ctx.stroke();
          const a = t * (0.03 + r * 0.01) * (r % 2 ? -1 : 1);
          for (let k = 0; k < 6; k++) {
            const aa = a + (k * TAU) / 6;
            ctx.fillStyle = 'rgba(204,251,241,0.9)';
            ctx.fillRect(Math.cos(aa) * 250 - 4, y + Math.sin(aa) * 34 - 4, 8, 8);
          }
          ctx.restore();
        }
      });
      // hồ quang năng lượng bất ổn
      if (Math.random() < 0.05 * this.fxMul + this.surge * 0.2) {
        const side = Math.random() < 0.5 ? -1 : 1;
        this.arcs.push({ x1: 640 + side * 120, y1: U.rand(150, 450), x2: 640 + side * U.rand(300, 620), y2: U.rand(80, 520), life: 8, pts: null });
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      this.arcs = this.arcs.filter((a) => {
        a.life--;
        if (!a.pts || a.life % 2 === 0) {
          a.pts = [[a.x1, a.y1]];
          for (let k = 1; k < 8; k++) a.pts.push([U.lerp(a.x1, a.x2, k / 8) + U.rand(-24, 24), U.lerp(a.y1, a.y2, k / 8) + U.rand(-24, 24)]);
          a.pts.push([a.x2, a.y2]);
        }
        [[7, 'rgba(45,212,191,0.25)'], [2.5, '#5eead4'], [1, '#ffffff']].forEach(([w, c]) => {
          ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); a.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
        });
        return a.life > 0;
      });
      ctx.restore();
      layer(ctx, cam, 0.4, () => {
        // sàn catwalk phía sau
        ctx.fillStyle = '#041c1a'; ctx.fillRect(-1400, -260, 2800, 18);
        ctx.strokeStyle = '#0a3a35'; ctx.lineWidth = 3;
        for (let x = -1400; x < 1400; x += 60) { ctx.beginPath(); ctx.moveTo(x, -260); ctx.lineTo(x + 30, -300); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(-1400, -300); ctx.lineTo(1400, -300); ctx.stroke();
        // bảng cảnh báo
        const fl = Math.floor(t / 20) % 2;
        ctx.fillStyle = 'rgba(2,20,18,0.85)'; ctx.fillRect(-700, -430, 260, 70);
        ctx.strokeStyle = fl ? '#f43f5e' : '#5eead4'; ctx.lineWidth = 2; ctx.strokeRect(-700, -430, 260, 70);
        ctx.fillStyle = fl ? '#fb7185' : '#5eead4';
        ctx.font = '700 15px "Share Tech Mono", monospace'; ctx.textAlign = 'left';
        ctx.fillText('CORE INSTABILITY', -688, -404);
        ctx.fillText(`${(87 + Math.sin(t * 0.05) * 4).toFixed(1)}%  ▲`, -688, -378);
        ctx.fillRect(500, -430, 180, 6);
        for (let k = 0; k < 10; k++) { ctx.fillStyle = k < 8 ? '#14b8a6' : '#f43f5e'; ctx.fillRect(500 + k * 18, -416, 14, 26); }
      });
    }
    _reactorFloor(ctx, t) {
      const g = ctx.createLinearGradient(0, GROUND, 0, GROUND + 260);
      g.addColorStop(0, '#06302c'); g.addColorStop(1, '#010807');
      ctx.fillStyle = g; ctx.fillRect(-400, GROUND, 2600, 400);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(45,212,191,0.22)'; ctx.lineWidth = 1.5;
      for (let row = 0; row < 5; row++) {
        const y = GROUND + 14 + row * 34, s = 26 + row * 6;
        for (let x = -400 + (row % 2) * s; x < 2200; x += s * 2) {
          ctx.beginPath();
          for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; ctx.lineTo(x + Math.cos(a) * s * 0.9, y + Math.sin(a) * s * 0.25); }
          ctx.closePath(); ctx.stroke();
        }
      }
      const pulseX = (t * 9) % 2600 - 400;
      const pg = ctx.createLinearGradient(pulseX - 120, 0, pulseX + 120, 0);
      pg.addColorStop(0, 'rgba(94,234,212,0)'); pg.addColorStop(0.5, 'rgba(94,234,212,0.35)'); pg.addColorStop(1, 'rgba(94,234,212,0)');
      ctx.fillStyle = pg; ctx.fillRect(pulseX - 120, GROUND, 240, 4);
      this.motes.forEach((m) => {
        m.y -= m.v; if (m.y < 200) { m.y = GROUND; m.x = U.rand(-200, 2000); }
        ctx.fillStyle = `rgba(94,234,212,${0.5 * ((m.y - 200) / 420)})`; ctx.fillRect(m.x, m.y, m.s, m.s * 2);
      });
      ctx.restore();
      ctx.strokeStyle = 'rgba(94,234,212,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-400, GROUND); ctx.lineTo(2200, GROUND); ctx.stroke();
    }

    /* =================== CORE-9 SANCTUM =================== */
    _sanctumBack(ctx, cam, t) {
      const g = ctx.createRadialGradient(640, 180, 40, 640, 300, 900);
      g.addColorStop(0, '#4a3a12'); g.addColorStop(0.35, '#1a1430'); g.addColorStop(1, '#05040d');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
      layer(ctx, cam, 0.05, () => {
        const cy = -430;
        // tia sáng
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.translate(0, cy);
        for (let i = 0; i < 14; i++) {
          ctx.rotate(TAU / 14 + Math.sin(t * 0.002) * 0.01);
          const lg = ctx.createLinearGradient(0, 0, 900, 0);
          lg.addColorStop(0, 'rgba(253,230,138,0.14)'); lg.addColorStop(1, 'rgba(253,230,138,0)');
          ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -40); ctx.lineTo(900, 40); ctx.fill();
        }
        ctx.restore();
        glow(ctx, 0, cy, 300, '#fbbf24', 0.35);
        const sg = ctx.createRadialGradient(-30, cy - 30, 10, 0, cy, 130);
        sg.addColorStop(0, '#fffbeb'); sg.addColorStop(0.5, '#fcd34d'); sg.addColorStop(1, '#b45309');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, cy, 120 + Math.sin(t * 0.04) * 4, 0, TAU); ctx.fill();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let r = 0; r < 3; r++) {
          ctx.strokeStyle = `rgba(253,230,138,${0.5 - r * 0.12})`; ctx.lineWidth = 3 - r * 0.6;
          ctx.beginPath(); ctx.ellipse(0, cy, 190 + r * 60, 40 + r * 18, t * 0.004 * (r % 2 ? -1 : 1) + r, 0, TAU); ctx.stroke();
        }
        ctx.restore();
      });
      layer(ctx, cam, 0.3, () => {
        this.monoliths.forEach((m) => {
          const y = m.y + Math.sin(t * 0.02 + m.ph) * 14;
          const mg = ctx.createLinearGradient(m.x, y, m.x + m.w, y);
          mg.addColorStop(0, '#1c1733'); mg.addColorStop(1, '#2d2550');
          ctx.fillStyle = mg; ctx.fillRect(m.x, y, m.w, m.h);
          ctx.fillStyle = 'rgba(251,191,36,0.8)'; ctx.fillRect(m.x + m.w / 2 - 1.5, y + 10, 3, m.h - 20);
          glow(ctx, m.x + m.w / 2, y + m.h / 2, m.h * 0.6, '#fbbf24', 0.12);
        });
      });
    }
    _sanctumFloor(ctx, t) {
      const g = ctx.createLinearGradient(0, GROUND, 0, GROUND + 260);
      g.addColorStop(0, '#3b2f12'); g.addColorStop(0.2, '#1a1430'); g.addColorStop(1, '#05040d');
      ctx.fillStyle = g; ctx.fillRect(-400, GROUND, 2600, 400);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(251,191,36,0.2)'; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) { const y = GROUND + 6 + i * i * 7; ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(2200, y); ctx.stroke(); }
      for (let x = -400; x < 2200; x += 80) { ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(CX + (x - CX) * 2.2, GROUND + 260); ctx.stroke(); }
      const rg = ctx.createRadialGradient(CX, GROUND + 20, 0, CX, GROUND + 20, 500);
      rg.addColorStop(0, `rgba(253,230,138,${0.25 + Math.sin(t * 0.04) * 0.05})`); rg.addColorStop(1, 'rgba(253,230,138,0)');
      ctx.fillStyle = rg; ctx.fillRect(CX - 500, GROUND, 1000, 200);
      ctx.restore();
      ctx.strokeStyle = 'rgba(253,230,138,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-400, GROUND); ctx.lineTo(2200, GROUND); ctx.stroke();
    }
  }

  /** Vẽ preview tĩnh/động cho thẻ chọn đấu trường */
  function drawPreview(ctx, arena, w, h) {
    const cam = { x: CX, y: 390, zoom: 1 };
    arena.update();
    ctx.save();
    ctx.scale(w / 1280, h / 720);
    arena.drawBack(ctx, cam);
    ctx.save();
    ctx.translate(640, 360); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
    arena.drawFloor(ctx, cam);
    ctx.restore();
    arena.drawFront(ctx, cam);
    ctx.restore();
  }

  NS.Arenas = { DEFS, LIST, Arena, drawPreview, GROUND };
})();
