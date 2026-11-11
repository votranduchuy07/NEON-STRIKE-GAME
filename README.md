# NEON STRIKE: THE LAST LIGHT

Game đối kháng 2D **Cyberpunk / Neon Noir / Esports**. Viết bằng HTML5, CSS3, JavaScript ES6+, Canvas API và Web Audio API.
Không dùng engine, thư viện hay file ảnh/âm thanh bên ngoài: nhân vật, đấu trường, hiệu ứng, nhạc và SFX đều được tạo bằng code lúc chạy.

> Năm 2189, ở thành phố Neo-Veyra, giải đấu bí mật **THE LAST LIGHT** quy tụ những chiến binh mạnh nhất để tranh **CORE-9**, nguồn năng lượng cuối cùng của nhân loại.

---

## 1. Cách chạy

### Cách 1: mở trực tiếp (không cần cài gì)
Nhấp đúp `index.html` để mở bằng **Chrome** hoặc **Edge**. Code không dùng ES module nên chạy được với `file://`.

### Cách 2: chạy bằng server local (nên dùng khi phát triển)
Mở thư mục `NEON-STRIKE` trong VS Code, rồi chọn một trong các cách:
- Cài extension **Live Server** → chuột phải `index.html` → *Open with Live Server*
- Hoặc dùng Python:
  ```bash
  python -m http.server 8000
  ```
  sau đó mở `http://localhost:8000`

> Font Orbitron / Chakra Petch / Share Tech Mono tải từ Google Fonts. Khi không có mạng, game tự dùng font hệ thống và vẫn chạy bình thường.
> Âm thanh chỉ bật sau lần bấm phím hoặc chạm đầu tiên (đúng chính sách autoplay của trình duyệt).

---

## 2. Điều khiển

| Hành động | Player 1 | Player 2 (laptop) | Player 2 (numpad) |
|---|---|---|---|
| Di chuyển / Nhảy / Cúi | `A` `D` / `W` / `S` | `←` `→` / `↑` / `↓` | — |
| Đấm nhanh / Đấm mạnh | `F` / `G` | `K` / `L` | `Num4` / `Num5` |
| Đá nhanh / Đá mạnh | `V` / `B` | `,` / `.` | `Num1` / `Num2` |
| Đỡ đòn (giữ) | `H` | `;` | `Num6` |
| Né tránh (i-frame) | `Q` | `/` | `Num0` |
| Kỹ năng 1 / 2 / 3 | `R` / `T` / `C` | `I` / `O` / `P` | `Num7` / `Num8` / `Num3` |
| Ultimate | `E` | `U` | `Num9` |
| Tạm dừng | `ESC` / `P` | | |

- **Ném (phá thế đỡ):** Đấm nhanh + Đá nhanh cùng lúc. Bấm tổ hợp này khi bị túm để **thoát ném**.
- **Chạy / Lùi nhanh:** nhấn đúp hướng tiến / lùi.
- **Perfect Block:** nhấn Đỡ ngay trước khi trúng đòn → không mất máu, đối thủ bị khựng, đòn kế tiếp tính là COUNTER. Bấm đỡ liên tục sẽ bị khóa Perfect Block (chống spam).
- **Khi chơi 1 người:** P1 dùng được cả hai bộ phím.
- **Gamepad (chuẩn Xbox):** X/Y/A/B = LP/HP/LK/HK • RB đỡ • LB né • LT/RT kỹ năng 1/2 • LB+RB hoặc R3 kỹ năng 3 • LT+RT Ultimate • START tạm dừng.
- **Điện thoại:** xoay ngang. Nút cảm ứng tự hiện (có thể bật/tắt trong Settings).
- Có thể **đổi toàn bộ phím** trong *Settings → Phím*.

### Combo
- Đòn thường nối được theo thứ tự mạnh dần: `Đấm nhanh → Đá nhanh → Đấm mạnh → Đá mạnh`
- Đòn thường trúng hoặc bị đỡ → hủy sang **Kỹ năng**. Đòn thường/kỹ năng trúng → hủy sang **Ultimate** (= **PERFECT COMBO**)
- Nhảy → Đá (overhead) → tiếp đất → Đấm
- Né tránh thành công → đòn bất kỳ = **COUNTER**
- Đòn hất tung (Rising Upper, Twin Fang, Glacial Spikes...) → đánh tiếp trên không (giới hạn juggle)

---

## 3. Nội dung game

### 7 chiến binh
Mỗi nhân vật có 4 chỉ số, 1 nội tại, 12 đòn thường + ném, 2 kỹ năng đặc biệt, 1 kỹ năng di chuyển/phòng thủ, 1 Ultimate (có chuỗi kết liễu điện ảnh), 3 trang phục, tiểu sử và câu thoại.

| Nhân vật | Phong cách | Kỹ năng 1 / 2 / 3 | Ultimate |
|---|---|---|---|
| **RAVEN** — The Phantom | Sát thủ tốc độ, nhảy 2 lần | Shadow Dash / Twin Fang / Phase Shift | Phantom Execution |
| **VOLT** — The Storm | Điện năng, làm choáng | Lightning Strike / Arc Burst / Volt Step | Thunder Collapse |
| **TITAN** — The Juggernaut | Hạng nặng, Super Armor | Ground Smash / Rocket Knuckle / Iron Bastion | Cataclysm |
| **FROST** — The Cryo Hunter | Khống chế, làm chậm, đóng băng | Ice Spear / Glacial Spikes / Crystal Guard | Absolute Zero |
| **PYRA** — The Inferno | Sát thương diện rộng, thiêu đốt | Flame Burst / Plasma Orb / Blaze Rush | Solar Eruption |
| **ZERO** — The Unknown | Cân bằng, phản công, thích nghi | System Break / Data Lance / Counter Protocol | Absolute Override |
| **AXIOM** — The Core Warden | Trùm cuối (mở khóa sau Story) | Core Lance / Gravity Well / Aegis | Last Light |

### 7 chế độ chơi
**Quick Match** (CPU hoặc 2P), **Versus** (2 người, chỉnh thời gian và số hiệp), **AI Challenge** (Easy/Normal/Hard/Expert), **Story** (6 trận, hội thoại, trùm AXIOM, kết thúc riêng cho từng nhân vật, 3 mức độ khó), **Survival** (máu mang sang các trận, bảng xếp hạng), **Time Attack** (5 trận, ghi kỷ lục), **Training** (hình nộm tùy chỉnh, hitbox, frame data).

### 6 đấu trường
Neon City • Cyber Underground • Skyline 09 • Frozen Core • Reactor Zero • CORE-9 Sanctum (mở khóa sau Story). Mỗi đấu trường có nền parallax nhiều lớp, hiệu ứng môi trường (mưa, tuyết, hơi nước, hồ quang...), ánh sáng riêng, nhạc nền và âm thanh môi trường riêng.

### Tiến trình
Level/EXP, Credits, thống kê đầy đủ, nhiệm vụ nhiều bậc (Contracts), sự kiện hằng ngày (+50% EXP cho một nhân vật), mở khóa nhân vật, trang phục, hiệu ứng chiến thắng, hình nền hồ sơ, danh hiệu, đoạn kết Story. Tất cả lưu trong **LocalStorage**.

---

## 4. Cấu trúc thư mục

```
NEON-STRIKE/
├── index.html            # Khung trang, thứ tự tải module
├── README.md
├── css/
│   ├── main.css          # Design system: biến màu, nút neon, glass, form, chuyển cảnh, toast, modal
│   ├── menu.css          # Các màn hình menu (boot, menu, select, arena, VS, results, codex...)
│   ├── game.css          # Sân khấu 16:9, HUD, combo, cut-in, pause, training, nút cảm ứng
│   └── effects.css       # Scanline, noise, glitch, preview trang trí, chế độ giảm hiệu ứng
├── js/
│   ├── utils.js          # Toán, màu, random có seed, DOM helpers
│   ├── storage.js        # SAVE SYSTEM: hồ sơ, cài đặt, mở khóa, nhiệm vụ, kỷ lục
│   ├── audio.js          # AUDIO MANAGER: sequencer nhạc, SFX tổng hợp, âm thanh môi trường, announcer
│   ├── input.js          # PLAYER CONTROLLER (input): bàn phím, gamepad, cảm ứng
│   ├── characters.js     # CHARACTER SYSTEM: dữ liệu nhân vật, chỉ số, frame data đòn thường
│   ├── animation.js      # ANIMATION SYSTEM: khung xương 2D, IK, keyframe, vẽ nhân vật, portrait
│   ├── collision.js      # COLLISION DETECTION: hitbox, hurtbox, pushbox, giới hạn sân
│   ├── effects.js        # PARTICLE SYSTEM + hiệu ứng nguyên tố + nền thành phố menu
│   ├── arenas.js         # 6 đấu trường vẽ thủ tục
│   ├── skills.js         # SKILL SYSTEM: kỹ năng, đạn, chuỗi Ultimate
│   ├── combat.js         # COMBAT SYSTEM: trúng/đỡ/perfect block/ném/combo/scaling/counter
│   ├── player.js         # Fighter: máy trạng thái chiến binh (người và AI dùng chung)
│   ├── ai.js             # AI SYSTEM: 4 cấp độ + hình nộm Training
│   ├── story.js          # Cốt truyện, hội thoại, đoạn kết
│   ├── hud.js            # HUD trong trận
│   ├── engine.js         # GAME ENGINE: vòng lặp 60Hz, luồng hiệp, camera, render
│   ├── modes.js          # Điều phối 7 chế độ chơi
│   ├── ui.js             # UI MANAGER: điều hướng, chuyển cảnh, preview, toast, modal
│   ├── ui-menu.js        # Màn: Boot, Intro, Menu, Modes, Select, Arena, VS
│   ├── ui-match.js       # Màn: trận đấu + Pause, Results, Dialogue, Ending
│   ├── ui-pages.js       # Màn: Characters, Collection, Profile, Settings
│   └── main.js           # Khởi động
└── assets/
    ├── characters/       # (trống — nhân vật vẽ bằng Canvas)
    ├── backgrounds/      # (trống — đấu trường vẽ bằng Canvas)
    ├── sounds/           # (trống — âm thanh tổng hợp bằng Web Audio)
    └── icons/favicon.svg
```

Tất cả module gắn vào namespace toàn cục `window.NS` (ví dụ `NS.Game`, `NS.Combat`, `NS.UI`).

---

## 5. Kiến trúc kỹ thuật

- **Vòng lặp cố định 60Hz:** `requestAnimationFrame` cộng dồn thời gian vào accumulator rồi chạy từng `step()` 1/60s. Nhờ vậy frame data ổn định ở mọi tốc độ màn hình. Slow-motion được làm bằng cách nhân thời gian vào accumulator với `timeScale`.
- **Hitstop / Superflash:** khi trúng đòn, mô phỏng dừng vài frame nhưng vẫn ghi nhận nút bấm vào buffer, nên combo vẫn mượt.
- **Input buffer:** nút bấm được giữ trong 6–8 frame để nối combo dễ hơn.
- **Frame data:** mỗi đòn có `startup / active / recovery`, hitbox theo frame, sát thương, hitstun, blockstun, knockback, mức đòn (`mid / low / overhead / throw`).
- **Hurtbox động:** thay đổi theo tư thế (đứng/cúi/trên không/nằm). Khi đang ra đòn, chi đánh ra cũng có hurtbox, nên đánh hụt có thể bị phạt.
- **Chống spam:** cooldown kỹ năng, chi phí năng lượng, damage scaling theo combo, giảm 40% sát thương khi dùng cùng một đòn hơn 2 lần trong combo, guard gauge (đỡ quá nhiều sẽ bị phá thủ), ném phá thế đỡ, juggle limit, pushback khi đối thủ sát tường, khóa Perfect Block khi bấm liên tục.
- **AI công bằng:** AI tạo ra `InputFrame` giống hệt bàn phím và đi qua cùng lớp `Fighter`. AI chỉ thấy trạng thái đối thủ trễ 7–28 frame tùy cấp độ (mô phỏng phản xạ người), không đọc input. Expert ghi nhớ thói quen (hay nhảy, hay đỡ, hay tấn công khi đứng dậy) để bắt bài.
- **Animation thủ tục:** khung xương 11 khớp, chân bám đất bằng IK 2 xương, nội suy keyframe có easing, chu kỳ đi/chạy, thở khi đứng yên, vệt mờ khi lướt, bóng phân thân.

---

## 6. Hướng dẫn mở rộng

- **Thêm nhân vật:** thêm vào `DEFS` và `ROSTER` trong `characters.js`, thêm `LOOKS` và `STANCE` trong `animation.js` (cùng nhánh vẽ trong `drawHead`/`drawBack` nếu cần), thêm builder kỹ năng trong `skills.js`, thêm `STYLE` trong `ai.js`, rồi thêm lộ trình/hội thoại trong `story.js`.
- **Thêm đòn:** định nghĩa object move `{ total, anim, hits:[{f,len,box,dmg,hs,bs,kb,level}], vel, inv, armor, onFrame }`.
- **Thêm đấu trường:** thêm vào `DEFS` và `LIST` trong `arenas.js`, viết `_xxxBack` / `_xxxFloor`, và thêm track nhạc trong `audio.js` nếu muốn.
- **Debug va chạm:** bật *Settings → Đồ họa → Hiện hitbox* hoặc dùng chế độ **Training**.
- **Xóa dữ liệu:** *Settings → Dữ liệu → Reset Save*, hoặc xóa key `neonstrike.save.v1` trong LocalStorage.

---

## 7. Thư viện ngoài
Không dùng thư viện nào. Thứ duy nhất tải từ ngoài là font Google Fonts (không bắt buộc).
