/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — main.js
   Điểm khởi động: tải dữ liệu, khởi tạo input & UI, xử lý lỗi toàn cục.
   ========================================================================= */
(function () {
  'use strict';
  const NS = window.NS;

  function boot() {
    try {
      NS.Storage.load();
      NS.Input.Keyboard.init();
      NS.UI.init();
      NS.UI.go('boot', {}, { instant: true });
      // Tự tạm dừng khi chuyển tab
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && NS.UI.game && !NS.UI.game.paused && NS.UI.current === 'hud') NS.UI.screens.hud.togglePause(true);
      });
      window.addEventListener('contextmenu', (e) => { if (e.target.closest('#touch, .stage')) e.preventDefault(); });
      // Tải sẵn ảnh đại diện để chuyển cảnh mượt
      setTimeout(() => NS.Chars.ROSTER.forEach((c) => { NS.Anim.portrait(c, 0, 160, 160); NS.Anim.portrait(c, 0, 96, 96); }), 300);
      if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
      window.NEON_STRIKE_READY = true;
    } catch (err) {
      console.error(err);
      document.body.insertAdjacentHTML('beforeend', `<div style="position:fixed;inset:auto 10px 10px 10px;padding:12px;background:#300;color:#fff;font:14px monospace;z-index:9999">Lỗi khởi động: ${String(err && err.message)}</div>`);
    }
  }
  window.addEventListener('error', (e) => { console.error('[NEON STRIKE]', e.message, e.filename, e.lineno); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
