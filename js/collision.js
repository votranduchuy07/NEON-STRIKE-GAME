/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — collision.js
   COLLISION DETECTION: hitbox (đòn đánh), hurtbox (vùng nhận đòn),
   pushbox (va chạm thân), giới hạn đấu trường.
   Box dạng tâm: { cx, cy, w, h } trong tọa độ thế giới.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});
  const U = NS.U;

  const STAGE = { W: 1800, GROUND: 620, WALL: 46, MAX_SEP: 980 };

  function overlap(a, b) {
    return Math.abs(a.cx - b.cx) * 2 < a.w + b.w && Math.abs(a.cy - b.cy) * 2 < a.h + b.h;
  }
  function intersectCenter(a, b) {
    const l = Math.max(a.cx - a.w / 2, b.cx - b.w / 2), r = Math.min(a.cx + a.w / 2, b.cx + b.w / 2);
    const t = Math.max(a.cy - a.h / 2, b.cy - b.h / 2), btm = Math.min(a.cy + a.h / 2, b.cy + b.h / 2);
    return { x: (l + r) / 2, y: (t + btm) / 2 };
  }
  /** Box cục bộ (x tiến về trước, y = độ cao tâm tính từ chân) → thế giới */
  function toWorld(f, box) {
    const s = f.def.scale;
    return { cx: f.x + f.facing * box.x * s, cy: f.y - box.y * s, w: box.w * s, h: box.h * s };
  }

  /** Hurtbox theo tư thế hiện tại */
  function hurtboxes(f) {
    if (f.invisible) return [];
    const s = f.def.scale;
    const out = [];
    const st = f.state;
    let low = f.crouching || st === 'crouch' || (f.move && f.move.crouch && st === 'attack');
    if (f.move && f.move.lowProfile && st === 'attack') low = true;
    if (st === 'down' || st === 'getup' || st === 'ko_down') {
      out.push({ cx: f.x - f.facing * 10 * s, cy: f.y - 20 * s, w: 150 * s, h: 40 * s });
    } else if (!f.grounded || st === 'air') {
      out.push({ cx: f.x, cy: f.y - 104 * s, w: 52 * s, h: 128 * s });
    } else if (low) {
      out.push({ cx: f.x + f.facing * 4 * s, cy: f.y - 52 * s, w: 60 * s, h: 104 * s });
    } else {
      out.push({ cx: f.x, cy: f.y - 90 * s, w: 52 * s, h: 178 * s });
    }
    // Vùng chi mở rộng khi đang ra đòn → có thể bị phản đòn lúc hụt
    if (st === 'attack' && f.move && f.move.hits) {
      const fr = f.moveFrame;
      f.move.hits.forEach((h) => {
        if (h.throw || h.noExtend) return;
        if (fr >= h.f - 1 && fr < h.f + h.len + 8) {
          const b = toWorld(f, h.box);
          out.push({ cx: b.cx - f.facing * b.w * 0.12, cy: b.cy, w: b.w * 0.72, h: b.h * 0.8 });
        }
      });
    }
    return out;
  }

  /** Các hitbox đang hoạt động của đòn hiện tại */
  function activeHits(f) {
    const res = [];
    if (f.state !== 'attack' || !f.move || !f.move.hits) return res;
    const fr = f.moveFrame;
    f.move.hits.forEach((h, i) => {
      if (fr >= h.f && fr < h.f + h.len) res.push({ hit: h, index: i, box: toWorld(f, h.box) });
    });
    return res;
  }

  function pushbox(f) {
    const s = f.def.scale;
    return { cx: f.x, w: (f.def.heavy ? 66 : 54) * s };
  }

  /** Đẩy hai nhân vật không chồng lên nhau */
  function resolvePush(a, b) {
    if (a.noPush || b.noPush) return;
    if (Math.abs(a.y - b.y) > 120) return; // một người đang nhảy qua đầu
    const pa = pushbox(a), pb = pushbox(b);
    const min = (pa.w + pb.w) / 2;
    let dx = b.x - a.x;
    if (Math.abs(dx) < 0.01) dx = a.side === 0 ? 0.01 : -0.01;
    const ov = min - Math.abs(dx);
    if (ov <= 0) return;
    const dir = Math.sign(dx);
    const L = STAGE.WALL, R = STAGE.W - STAGE.WALL;
    let ma = ov / 2, mb = ov / 2;
    // dựa vào tường: bên kia bị đẩy toàn bộ
    if ((dir > 0 && a.x - ma <= L) || (dir < 0 && a.x + ma >= R)) { ma = 0; mb = ov; }
    if ((dir > 0 && b.x + mb >= R) || (dir < 0 && b.x - mb <= L)) { mb = 0; ma = ov; }
    a.x -= dir * ma; b.x += dir * mb;
    clampStage(a); clampStage(b);
  }

  function clampStage(f) {
    const L = STAGE.WALL, R = STAGE.W - STAGE.WALL;
    f.atWall = 0;
    if (f.x < L) { f.x = L; f.atWall = -1; }
    if (f.x > R) { f.x = R; f.atWall = 1; }
  }
  /** Giữ khoảng cách tối đa để camera luôn thấy cả hai */
  function clampSeparation(a, b) {
    const d = b.x - a.x;
    if (Math.abs(d) > STAGE.MAX_SEP) {
      const excess = Math.abs(d) - STAGE.MAX_SEP, s = Math.sign(d);
      const am = Math.abs(a.vx || 0) + (a.moving ? 1 : 0), bm = Math.abs(b.vx || 0) + (b.moving ? 1 : 0);
      if (am >= bm) a.x += s * excess; else b.x -= s * excess;
    }
  }

  /** Điểm va chạm & hướng tấn công: attacker có ở phía trước defender không */
  function isInFront(def, x) { return (x - def.x) * def.facing >= -4; }

  NS.Collision = { STAGE, overlap, intersectCenter, toWorld, hurtboxes, activeHits, pushbox, resolvePush, clampStage, clampSeparation, isInFront };
})();
