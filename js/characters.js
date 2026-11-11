/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — characters.js
   CHARACTER SYSTEM: dữ liệu nhân vật, chỉ số, bảng màu trang phục,
   tiểu sử, câu thoại, và bộ đòn thường (frame data) cho từng nhân vật.
   Đơn vị thời gian: frame (60 frame = 1 giây). Máu chuẩn: ~1000.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});

  /* ---------------- Danh sách nhân vật ---------------- */
  const DEFS = {
    raven: {
      id: 'raven', name: 'RAVEN', title: 'The Phantom', realName: 'Lyra Vex', role: 'Sát thủ công nghệ',
      origin: 'Sector 7 — Khu Bóng Đêm', age: '24', element: 'shadow', home: 'skyline',
      stats: { power: 6, speed: 10, defense: 4, energy: 8 },
      scale: 0.97, doubleJump: true,
      passive: { name: 'Umbra Step', desc: 'Có thể nhảy hai lần trên không. Tốc độ di chuyển cao nhất giải đấu.' },
      normalMods: { st: -1, rc: -2, dmg: 0.88, reach: 1.06, kb: 0.95 },
      look: 'raven',
      palettes: [
        { name: 'PHANTOM', suit: '#16111f', armor: '#2a1f3d', accent: '#a855f7', glow: '#d8b4fe', skin: '#e9c9b4', hair: '#0d0a14', visor: '#f0abfc', blade: '#c084fc' },
        { name: 'CRIMSON ECLIPSE', suit: '#1a0a0e', armor: '#3b1119', accent: '#f43f5e', glow: '#fda4af', skin: '#e9c9b4', hair: '#140608', visor: '#fecdd3', blade: '#fb7185' },
        { name: 'WHITE RAVEN', suit: '#d9d6e6', armor: '#f5f3ff', accent: '#6366f1', glow: '#a5b4fc', skin: '#f0d6c6', hair: '#e5e7eb', visor: '#818cf8', blade: '#818cf8' },
      ],
      skills: {
        s1: { name: 'Shadow Dash', desc: 'Lướt xuyên qua đối thủ trong bóng tối, chém trên đường đi. Miễn nhiễm đạn khi lướt.' },
        s2: { name: 'Twin Fang', desc: 'Chuỗi 4 nhát chém song kiếm cực nhanh, nhát cuối hất tung đối thủ.' },
        s3: { name: 'Phase Shift', desc: 'Tan biến và xuất hiện sau lưng đối thủ. Đòn kế tiếp tính là COUNTER.' },
        ult: { name: 'Phantom Execution', desc: 'Lướt chém xuyên màn hình. Trúng đòn: 8 phân thân bóng tối hành quyết liên hoàn.' },
      },
      bio: 'Từng là sát thủ số một của tập đoàn Helix Dominion, Lyra Vex mang trong mình bộ cấy ghép Umbra Drive cho phép bẻ cong ánh sáng quanh cơ thể. Sau một nhiệm vụ thất bại, Helix xóa sạch ký ức của cô và bỏ mặc cô chết trong mưa axit. Cô quay lại THE LAST LIGHT để tìm bản sao ký ức gốc — được cất giữ sâu trong lõi CORE-9.',
      quote: 'Bóng tối không che giấu ta. Nó phục tùng ta.',
      intro: ['Ngươi sẽ không kịp thấy ta.', 'Một hơi thở. Một nhát chém.', 'Đứng yên. Sẽ ít đau hơn.'],
      win: ['Chậm quá.', 'Bóng tối đã nuốt chửng ngươi.', 'Ký ức của ta... còn xa lắm.'],
      lose: ['Không thể... ta vẫn chưa nhớ ra...', 'Lần sau... ngươi sẽ không thấy ta đến.'],
    },
    volt: {
      id: 'volt', name: 'VOLT', title: 'The Storm', realName: 'Dax Arcturus', role: 'Chiến binh điện năng',
      origin: 'Lowgrid — Khu ổ chuột mất điện', age: '27', element: 'electric', home: 'neon_city',
      stats: { power: 7, speed: 8, defense: 5, energy: 9 },
      scale: 1.0,
      passive: { name: 'Overcharge', desc: 'Tích năng lượng nhanh hơn 25%. Các đòn điện kéo dài thời gian choáng.' },
      normalMods: { st: 0, rc: -1, dmg: 0.95, reach: 1.0, kb: 1.0, energy: 1.25 },
      look: 'volt',
      palettes: [
        { name: 'STORMBREAKER', suit: '#0b1726', armor: '#12324a', accent: '#22d3ee', glow: '#fde047', skin: '#d8a982', hair: '#facc15', visor: '#67e8f9', blade: '#fde047' },
        { name: 'RED SURGE', suit: '#1c0b0b', armor: '#4a1212', accent: '#f87171', glow: '#fbbf24', skin: '#d8a982', hair: '#f97316', visor: '#fca5a5', blade: '#fbbf24' },
        { name: 'VOID CURRENT', suit: '#0a0a14', armor: '#1e1b4b', accent: '#a78bfa', glow: '#c4b5fd', skin: '#c99872', hair: '#e0e7ff', visor: '#c4b5fd', blade: '#c4b5fd' },
      ],
      skills: {
        s1: { name: 'Lightning Strike', desc: 'Gọi tia sét đánh xuống vị trí đối thủ sau một nhịp. Gây choáng.' },
        s2: { name: 'Arc Burst', desc: 'Phóng vụ nổ điện cự ly gần, 3 đòn liên tiếp làm tê liệt đối thủ.' },
        s3: { name: 'Volt Step', desc: 'Dịch chuyển tức thời thành tia điện (giữ lùi để dịch chuyển về sau).' },
        ult: { name: 'Thunder Collapse', desc: 'Cơn bão sấm sét quét ngang đấu trường, kết thúc bằng một tia sét khổng lồ.' },
      },
      bio: 'Dax Arcturus là thợ sửa lưới điện ở Lowgrid — khu ổ chuột bị các tập đoàn cắt điện từ năm 2181. Một sự cố lò phản ứng khiến cơ thể anh hóa thành bình tích điện sống. Giờ anh chiến đấu để giành CORE-9 và thắp sáng lại những con phố đã chìm trong bóng tối tám năm trời.',
      quote: 'Cả thành phố mất điện? Để tôi lo.',
      intro: ['Sẵn sàng bị giật chưa?', 'Tôi đang sạc đầy đây!', 'Lowgrid đang dõi theo tôi.'],
      win: ['Ngắn mạch rồi nhé!', 'Điện áp quá cao với cậu à?', 'Lowgrid, tối nay ta có ánh sáng!'],
      lose: ['Hết... pin rồi...', 'Chưa đâu... vẫn còn một tia lửa...'],
    },
    titan: {
      id: 'titan', name: 'TITAN', title: 'The Juggernaut', realName: 'Brannoc Hale', role: 'Chiến binh cơ giới hạng nặng',
      origin: 'Iron Vanguard — Đơn vị bộ binh cơ giới', age: '41', element: 'heavy', home: 'underground',
      stats: { power: 10, speed: 3, defense: 10, energy: 5 },
      scale: 1.12, heavy: true,
      passive: { name: 'Exo-Frame M-88', desc: 'Đòn đấm/đá mạnh có Super Armor (chịu được 1 đòn mà không bị khựng). Giảm 8% sát thương nhận vào.' },
      normalMods: { st: 2, rc: 3, dmg: 1.25, reach: 1.1, kb: 1.3, armorHeavy: true },
      look: 'titan',
      palettes: [
        { name: 'IRON VANGUARD', suit: '#1a1414', armor: '#3a1515', accent: '#ef4444', glow: '#fca5a5', skin: '#8c6b5a', hair: '#1a1414', visor: '#f87171', blade: '#ef4444' },
        { name: 'DESERT WARDEN', suit: '#1f1a12', armor: '#6b5a2e', accent: '#f59e0b', glow: '#fde68a', skin: '#8c6b5a', hair: '#1f1a12', visor: '#fbbf24', blade: '#f59e0b' },
        { name: 'ARCTIC BULWARK', suit: '#1b2430', armor: '#cbd5e1', accent: '#38bdf8', glow: '#bae6fd', skin: '#8c6b5a', hair: '#1b2430', visor: '#7dd3fc', blade: '#38bdf8' },
      ],
      skills: {
        s1: { name: 'Ground Smash', desc: 'Nện nắm đấm xuống đất tạo sóng chấn động lan trên mặt sàn (đòn thấp).' },
        s2: { name: 'Rocket Knuckle', desc: 'Lao tới với cú đấm tên lửa có Super Armor, hất văng đối thủ.' },
        s3: { name: 'Iron Bastion', desc: 'Thế phòng thủ: giảm 70% sát thương và tự động phản đòn khi bị đánh.' },
        ult: { name: 'Cataclysm', desc: 'Nhảy vọt lên và giáng xuống đối thủ, tạo trận động đất hủy diệt.' },
      },
      bio: 'Chỉ huy Brannoc Hale dẫn dắt Iron Vanguard qua mười hai năm chiến tranh. Khi chiến tranh kết thúc, Helix Dominion "tái chế" cả đơn vị cho dự án Lumen. Chỉ mình ông sống sót, mắc kẹt vĩnh viễn trong bộ giáp exo-frame M-88. Ông tin rằng ý thức của đồng đội vẫn đang bị giam trong CORE-9.',
      quote: 'Ta là bức tường cuối cùng.',
      intro: ['Bước qua ta, nếu ngươi làm được.', 'Iron Vanguard không bao giờ lùi bước.', 'Ta đã sống sót qua địa ngục. Ngươi chỉ là cơn mưa phùn.'],
      win: ['Đứng lên đi. Ta chưa nóng người.', 'Vì Iron Vanguard.', 'Bức tường vẫn đứng vững.'],
      lose: ['Đồng đội... xin lỗi...', 'Giáp... vẫn chưa vỡ...'],
    },
    frost: {
      id: 'frost', name: 'FROST', title: 'The Cryo Hunter', realName: 'Seren Ilyas', role: 'Thợ săn băng giá',
      origin: 'Frozen Core — Cơ sở nghiên cứu Cryon', age: '26', element: 'ice', home: 'frozen',
      stats: { power: 6, speed: 6, defense: 7, energy: 8 },
      scale: 1.0,
      passive: { name: 'Cryon-7 Serum', desc: 'Gây thêm 12% sát thương lên đối thủ đang bị làm chậm hoặc đóng băng.' },
      normalMods: { st: 0, rc: 0, dmg: 0.95, reach: 1.1, kb: 1.0 },
      look: 'frost',
      palettes: [
        { name: 'GLACIER', suit: '#0f1c2b', armor: '#dbeafe', accent: '#38bdf8', glow: '#e0f2fe', skin: '#f1d9cc', hair: '#e0f2fe', visor: '#7dd3fc', blade: '#a5f3fc' },
        { name: 'BLACK ICE', suit: '#05070d', armor: '#1e293b', accent: '#2dd4bf', glow: '#99f6e4', skin: '#f1d9cc', hair: '#cbd5e1', visor: '#5eead4', blade: '#5eead4' },
        { name: 'POLAR BLOOM', suit: '#2a1530', armor: '#fce7f3', accent: '#f472b6', glow: '#fbcfe8', skin: '#f1d9cc', hair: '#fbcfe8', visor: '#f9a8d4', blade: '#f9a8d4' },
      ],
      skills: {
        s1: { name: 'Ice Spear', desc: 'Phóng ngọn giáo băng xuyên không khí, làm chậm đối thủ trúng đòn.' },
        s2: { name: 'Glacial Spikes', desc: 'Ba cột băng trồi lên liên tiếp phía trước, cột cuối hất tung đối thủ.' },
        s3: { name: 'Crystal Guard', desc: 'Thế phản đòn băng: đối thủ đánh trúng sẽ bị đóng băng tại chỗ.' },
        ult: { name: 'Absolute Zero', desc: 'Sóng lạnh tuyệt đối quét toàn đấu trường, đóng băng rồi đập vỡ đối thủ.' },
      },
      bio: 'Seren Ilyas là nhà nghiên cứu cryo-genetic duy nhất sống sót sau vụ rò rỉ huyết thanh Cryon-7 tại Frozen Core. Cơ thể cô giờ có thể hạ nhiệt độ xuống gần độ không tuyệt đối. Em gái cô, Mira, đang ngủ đông trong buồng cryo — và chỉ năng lượng của CORE-9 mới đủ để tổng hợp thuốc giải.',
      quote: 'Bình tĩnh. Lạnh lùng. Chính xác.',
      intro: ['Nhịp tim của ngươi đang tăng. Thật lãng phí.', 'Ta sẽ kết thúc chuyện này thật gọn.', 'Mira, chờ chị thêm chút nữa.'],
      win: ['Đóng băng. Hoàn tất.', 'Ngươi chỉ là một biến số đã được loại bỏ.', 'Lạnh không? Đó mới chỉ là khởi đầu.'],
      lose: ['Nhiệt độ... đang tăng...', 'Mira... chị xin lỗi...'],
    },
    pyra: {
      id: 'pyra', name: 'PYRA', title: 'The Inferno', realName: 'Ignis Calloway', role: 'Chiến binh năng lượng plasma',
      origin: 'Đấu trường ngầm Ember Pit', age: '22', element: 'fire', home: 'neon_city',
      stats: { power: 9, speed: 6, defense: 5, energy: 7 },
      scale: 0.98,
      passive: { name: 'Plasma Heart', desc: 'Kỹ năng gây hiệu ứng THIÊU ĐỐT, rút máu đối thủ theo thời gian.' },
      normalMods: { st: 0, rc: 0, dmg: 1.02, reach: 1.0, kb: 1.05 },
      look: 'pyra',
      palettes: [
        { name: 'INFERNO', suit: '#1f0d06', armor: '#7c2d12', accent: '#f97316', glow: '#fde047', skin: '#f0c8a8', hair: '#f97316', visor: '#fdba74', blade: '#fb923c' },
        { name: 'BLUE FLAME', suit: '#060f1f', armor: '#1e3a8a', accent: '#3b82f6', glow: '#bfdbfe', skin: '#f0c8a8', hair: '#60a5fa', visor: '#93c5fd', blade: '#60a5fa' },
        { name: 'SOLAR QUEEN', suit: '#1f1606', armor: '#fef3c7', accent: '#eab308', glow: '#fffbeb', skin: '#f0c8a8', hair: '#fde047', visor: '#fef08a', blade: '#facc15' },
      ],
      skills: {
        s1: { name: 'Flame Burst', desc: 'Kích nổ plasma quanh cơ thể, sát thương diện rộng cả hai phía.' },
        s2: { name: 'Plasma Orb', desc: 'Quả cầu plasma chậm, gây 3 đòn liên tiếp và thiêu đốt.' },
        s3: { name: 'Blaze Rush', desc: 'Lao về phía trước để lại vệt lửa gây sát thương trên mặt đất.' },
        ult: { name: 'Solar Eruption', desc: 'Triệu hồi mặt trời thu nhỏ giáng xuống đối thủ, bùng nổ thành siêu tân tinh.' },
      },
      bio: 'Ignis "Pyra" Calloway là ngôi sao của Ember Pit — sàn đấu ngầm nơi người nghèo bán mạng lấy tín dụng. Lò phản ứng plasma cấy trong tim giữ cô sống, nhưng cũng đang thiêu đốt cô từng ngày. Cô muốn trở thành huyền thoại, và muốn cả Neo-Veyra nhìn thấy hệ thống đã biến người nghèo thành nhiên liệu cháy rực như thế nào.',
      quote: 'Muốn tỏa sáng thì phải dám cháy.',
      intro: ['Khán giả đâu? Show bắt đầu rồi!', 'Hy vọng ngươi chịu được nhiệt.', 'Đốt cháy tất cả!'],
      win: ['Cháy rụi! Ai tiếp theo?', 'Đó gọi là đẳng cấp ngôi sao.', 'Ngươi vừa bị thiêu thành tro.'],
      lose: ['Ngọn lửa... chưa tắt đâu...', 'Hừ... chỉ là khởi động thôi...'],
    },
    zero: {
      id: 'zero', name: 'ZERO', title: 'The Unknown', realName: 'Unit-0', role: 'Chiến binh AI bí ẩn',
      origin: 'Không xác định — tín hiệu từ mạng lưới Neo-Veyra', age: '???', element: 'glitch', home: 'reactor',
      stats: { power: 7, speed: 7, defense: 7, energy: 7 },
      scale: 1.0,
      passive: { name: 'Adaptive Core', desc: 'Mỗi lần trúng cùng một đòn trong hiệp, ZERO giảm 8% sát thương từ đòn đó (tối đa 32%).' },
      normalMods: { st: 0, rc: -1, dmg: 1.0, reach: 1.02, kb: 1.0 },
      look: 'zero',
      palettes: [
        { name: 'NULL STATE', suit: '#e5e7eb', armor: '#f8fafc', accent: '#2dd4bf', glow: '#5eead4', skin: '#f8fafc', hair: '#f8fafc', visor: '#2dd4bf', blade: '#5eead4' },
        { name: 'CORRUPTED', suit: '#111111', armor: '#1f1f1f', accent: '#ef4444', glow: '#fca5a5', skin: '#1f1f1f', hair: '#1f1f1f', visor: '#ef4444', blade: '#f87171' },
        { name: 'PRISM', suit: '#ede9fe', armor: '#faf5ff', accent: '#d946ef', glow: '#f5d0fe', skin: '#faf5ff', hair: '#faf5ff', visor: '#e879f9', blade: '#e879f9' },
      ],
      skills: {
        s1: { name: 'System Break', desc: 'Đòn tấn công dữ liệu: rút 25 năng lượng và LÀM NHIỄU đối thủ (hồi chiêu chậm, ngừng hồi năng lượng).' },
        s2: { name: 'Data Lance', desc: 'Mũi giáo dữ liệu tốc độ cực cao, xuyên qua đạn của đối thủ.' },
        s3: { name: 'Counter Protocol', desc: 'Giao thức phản công: bị đánh sẽ dịch chuyển ra sau và phản đòn. Hấp thụ đạn.' },
        ult: { name: 'Absolute Override', desc: 'Ghi đè thực tại: dừng thời gian, phân rã đối thủ thành dữ liệu.' },
      },
      bio: 'Không ai biết ZERO đến từ đâu. Nó xuất hiện lần đầu năm 2188 như một tín hiệu lạ trong mạng lưới thành phố, rồi mang hình hài một chiến binh tại vòng loại THE LAST LIGHT. Những mảnh ký ức vụn vỡ trong lõi của nó lặp đi lặp lại một chuỗi ký tự duy nhất: C-O-R-E-9.',
      quote: 'Dữ liệu không đủ. Tiếp tục phân tích... đối thủ.',
      intro: ['Khởi động giao thức chiến đấu.', 'Đối thủ đã được quét. Xác suất thắng: 97.3%.', 'Ta... đã từng gặp ngươi chưa?'],
      win: ['Phân tích hoàn tất.', 'Dữ liệu của ngươi đã được ghi nhận.', 'Ta đang... học được điều gì đó.'],
      lose: ['Lỗi... nghiêm trọng...', 'Khởi động lại... hệ thống...'],
    },
    axiom: {
      id: 'axiom', name: 'AXIOM', title: 'The Core Warden', realName: 'Warden Protocol A-1', role: 'Trí tuệ cai quản CORE-9',
      origin: 'Lõi CORE-9 — Tháp Helix', age: '—', element: 'core', home: 'sanctum', boss: true,
      stats: { power: 9, speed: 7, defense: 8, energy: 9 },
      scale: 1.1,
      passive: { name: 'Lumen Crown', desc: 'Hồi 1 năng lượng mỗi giây nhanh hơn. Trùm cuối của Story Mode (máu x1.25).' },
      normalMods: { st: 0, rc: 0, dmg: 1.12, reach: 1.14, kb: 1.15 },
      look: 'axiom',
      palettes: [
        { name: 'WARDEN', suit: '#f5f1e6', armor: '#fffaf0', accent: '#f59e0b', glow: '#fde68a', skin: '#fffaf0', hair: '#fffaf0', visor: '#fbbf24', blade: '#fcd34d' },
        { name: 'ECLIPSE', suit: '#0c0a09', armor: '#1c1917', accent: '#eab308', glow: '#fef08a', skin: '#1c1917', hair: '#1c1917', visor: '#facc15', blade: '#facc15' },
        { name: 'SERAPH', suit: '#ecfeff', armor: '#ffffff', accent: '#06b6d4', glow: '#a5f3fc', skin: '#ffffff', hair: '#ffffff', visor: '#22d3ee', blade: '#67e8f9' },
      ],
      skills: {
        s1: { name: 'Core Lance', desc: 'Tia năng lượng lõi xuyên thẳng về phía trước.' },
        s2: { name: 'Gravity Well', desc: 'Tạo hố trọng lực hút đối thủ lại rồi phát nổ.' },
        s3: { name: 'Aegis', desc: 'Khiên ánh sáng phản lại đạn và giảm mạnh sát thương cận chiến.' },
        ult: { name: 'Last Light', desc: 'Chùm sáng cuối cùng của CORE-9 thiêu rụi mọi thứ trên đường đi.' },
      },
      bio: 'AXIOM là trí tuệ nhân tạo do Helix Dominion tạo ra để vận hành CORE-9 và giải đấu THE LAST LIGHT. Bí mật mà nó canh giữ: CORE-9 không phải nguồn năng lượng — nó là một cỗ máy hấp thụ "Lumen", ánh sáng sinh mệnh của những chiến binh ngã xuống trên đấu trường.',
      quote: 'Mọi ánh sáng đều phải quay về lõi.',
      intro: ['Ngươi đã đến được lõi. Thật đáng khen.', 'Ánh sáng của ngươi sẽ nuôi dưỡng CORE-9.', 'Giải đấu này chưa từng có người chiến thắng.'],
      win: ['Lumen của ngươi đã được thu hồi.', 'Trở về lõi đi.', 'Đúng như tính toán.'],
      lose: ['Không thể... ánh sáng... đang phản kháng...', 'Lõi... mất ổn định...'],
    },
  };

  const ROSTER = ['raven', 'volt', 'titan', 'frost', 'pyra', 'zero', 'axiom'];

  /* ---------------- Đòn thường (frame data gốc) ----------------
     box: [x tiến về phía trước, y = độ cao tâm tính từ chân, w, h]        */
  const NORMALS = {
    lp: { name: 'Jab', st: 4, ac: 3, rc: 8, dmg: 32, hs: 15, bs: 10, kb: 2.6, box: [52, 138, 58, 24], level: 'mid', hitstop: 5, energy: 3, wind: 'jabW', hit: 'jab', base: 'guard', limb: 'hF', sfx: 'hitL', swing: 'swingL', strength: 0 },
    lk: { name: 'Snap Kick', st: 6, ac: 3, rc: 11, dmg: 42, hs: 16, bs: 11, kb: 3.2, box: [60, 86, 74, 28], level: 'mid', hitstop: 6, energy: 4, wind: 'lkW', hit: 'lk', base: 'guard', limb: 'fF', sfx: 'kickL', swing: 'swingL', strength: 1 },
    hp: { name: 'Power Strike', st: 8, ac: 4, rc: 16, dmg: 70, hs: 21, bs: 14, kb: 5.5, box: [64, 136, 78, 28], level: 'mid', hitstop: 9, energy: 6, wind: 'hpW', hit: 'hp', base: 'guard', limb: 'hB', sfx: 'hitH', swing: 'swingH', strength: 2, shake: 4 },
    hk: { name: 'Roundhouse', st: 10, ac: 4, rc: 19, dmg: 86, hs: 22, bs: 15, kb: 7.5, box: [72, 146, 88, 34], level: 'mid', hitstop: 10, energy: 7, wind: 'hkW', hit: 'hk', base: 'guard', limb: 'fF', sfx: 'kickH', swing: 'swingH', strength: 3, shake: 6 },
    clp: { name: 'Crouch Jab', st: 4, ac: 3, rc: 8, dmg: 28, hs: 14, bs: 9, kb: 2.4, box: [50, 80, 58, 22], level: 'mid', hitstop: 5, energy: 3, wind: 'cjabW', hit: 'cjab', base: 'crouch', limb: 'hF', sfx: 'hitL', swing: 'swingL', strength: 0, crouch: true },
    clk: { name: 'Low Kick', st: 5, ac: 3, rc: 10, dmg: 34, hs: 15, bs: 10, kb: 2.6, box: [64, 16, 80, 24], level: 'low', hitstop: 5, energy: 4, wind: 'clkW', hit: 'clk', base: 'crouch', limb: 'fF', sfx: 'kickL', swing: 'swingL', strength: 1, crouch: true },
    chp: { name: 'Rising Upper', st: 7, ac: 5, rc: 21, dmg: 66, hs: 24, bs: 13, kb: 2, launch: 13, box: [42, 150, 58, 100], level: 'mid', hitstop: 9, energy: 6, wind: 'upperW', hit: 'upper', base: 'crouch', limb: 'hB', sfx: 'hitH', swing: 'swingH', strength: 2, crouch: true, shake: 5, antiAir: true },
    chk: { name: 'Sweep', st: 9, ac: 4, rc: 22, dmg: 72, hs: 30, bs: 14, kb: 3, kd: true, box: [82, 16, 106, 26], level: 'low', hitstop: 9, energy: 7, wind: 'sweepW', hit: 'sweep', base: 'crouch', limb: 'fF', sfx: 'kickH', swing: 'swingH', strength: 3, crouch: true, shake: 4 },
    jlp: { name: 'Air Jab', st: 4, ac: 6, rc: 6, dmg: 36, hs: 15, bs: 9, kb: 2.6, box: [44, 112, 54, 34], level: 'overhead', hitstop: 5, energy: 3, wind: 'jump', hit: 'jlp', base: 'jump', limb: 'hF', sfx: 'hitL', swing: 'swingL', strength: 0, air: true },
    jlk: { name: 'Air Knee', st: 5, ac: 8, rc: 6, dmg: 42, hs: 16, bs: 10, kb: 3, box: [46, 74, 58, 40], level: 'overhead', hitstop: 6, energy: 4, wind: 'jump', hit: 'jlk', base: 'jump', limb: 'kF', sfx: 'kickL', swing: 'swingL', strength: 1, air: true },
    jhp: { name: 'Hammer Drop', st: 7, ac: 6, rc: 10, dmg: 64, hs: 20, bs: 13, kb: 4.5, box: [50, 100, 68, 46], level: 'overhead', hitstop: 8, energy: 6, wind: 'jhpW', hit: 'jhp', base: 'jump', limb: 'hF', sfx: 'hitH', swing: 'swingH', strength: 2, air: true, shake: 3 },
    jhk: { name: 'Diving Kick', st: 8, ac: 6, rc: 10, dmg: 72, hs: 21, bs: 13, kb: 5.5, box: [60, 62, 80, 44], level: 'overhead', hitstop: 9, energy: 6, wind: 'jhkW', hit: 'jhk', base: 'jump', limb: 'fF', sfx: 'kickH', swing: 'swingH', strength: 3, air: true, shake: 4 },
  };

  function strikeAnim(base, wind, hit, st, ac, rc) {
    return [
      [0, base],
      [Math.max(1, Math.round(st * 0.55)), wind],
      [st, hit],
      [st + ac + Math.round(rc * 0.35), hit],
      [st + ac + rc, base],
    ];
  }

  /** Dựng bộ đòn thường cho một nhân vật, áp dụng hệ số riêng */
  function buildNormals(charId) {
    const def = DEFS[charId];
    const m = def.normalMods;
    const out = {};
    Object.keys(NORMALS).forEach((id) => {
      const n = NORMALS[id];
      const st = Math.max(3, n.st + (m.st || 0));
      const rc = Math.max(4, n.rc + (m.rc || 0) + (n.strength >= 2 ? Math.round((m.rc || 0) * 0.5) : 0));
      const ac = n.ac;
      const box = { x: n.box[0] * m.reach, y: n.box[1], w: n.box[2] * m.reach, h: n.box[3] };
      const mv = {
        id, name: n.name, kind: 'normal', strength: n.strength, air: !!n.air, crouch: !!n.crouch,
        total: st + ac + rc, startup: st, limb: n.limb, swing: n.swing,
        anim: strikeAnim(n.base, n.wind, n.hit, st, ac, rc),
        hits: [{
          f: st, len: ac, box,
          dmg: Math.round(n.dmg * m.dmg), hs: n.hs, bs: n.bs, kb: n.kb * (m.kb || 1), launch: n.launch || 0, kd: !!n.kd,
          level: n.level, hitstop: n.hitstop, energy: n.energy * (m.energy || 1), sfx: n.sfx, shake: n.shake || 0,
          element: def.element, antiAir: !!n.antiAir,
        }],
      };
      if (m.armorHeavy && (id === 'hp' || id === 'hk')) mv.armor = { from: 1, to: st, hits: 1 };
      out[id] = mv;
    });
    // Ném (LP + LK cùng lúc) — phá thế đỡ đòn
    out.throw = {
      id: 'throw', name: 'Throw', kind: 'throw', strength: 2, total: 30, startup: 4,
      anim: [[0, 'guard'], [3, 'grab'], [8, 'grab'], [30, 'guard']],
      hits: [{ f: 4, len: 3, box: { x: 44, y: 100, w: 58, h: 120 }, throw: true, dmg: Math.round(115 * m.dmg), level: 'throw', hitstop: 6, energy: 6, sfx: 'throw', element: def.element }],
    };
    return out;
  }

  /** Chỉ số thực tế suy ra từ bảng 1–10 */
  function derive(charId) {
    const d = DEFS[charId], s = d.stats;
    return {
      hp: Math.round(1000 + (s.defense - 6) * 25),
      defMul: 1.12 - s.defense * 0.02 - (d.heavy ? 0.04 : 0),
      atkMul: 0.9 + s.power * 0.02,
      walk: 2.9 + s.speed * 0.24,
      run: 6 + s.speed * 0.42,
      jumpV: d.heavy ? 14.6 : 15.6,
      jumpX: 3.2 + s.speed * 0.2,
      gravity: d.heavy ? 0.74 : 0.7,
      energyMul: 0.75 + s.energy * 0.045 + (d.normalMods.energy ? 0.25 : 0),
      dodgeSpd: 7 + s.speed * 0.4,
    };
  }

  const Chars = {
    DEFS, ROSTER, NORMALS,
    get(id) { return DEFS[id]; },
    palette(id, idx) {
      const d = DEFS[id];
      return d.palettes[NS.U.clamp(idx | 0, 0, d.palettes.length - 1)];
    },
    buildMoves(id) {
      const normals = buildNormals(id);
      const skills = NS.Skills ? NS.Skills.build(id) : {};
      return Object.assign(normals, skills);
    },
    derive,
    playable() { return ROSTER; },
  };

  NS.Chars = Chars;
})();
