/* =========================================================================
   NEON STRIKE: THE LAST LIGHT — story.js
   Cốt truyện: phần mở đầu, lộ trình Story Mode từng nhân vật,
   hội thoại trước/sau trận, trận trùm AXIOM và các đoạn kết riêng.
   ========================================================================= */
(function () {
  'use strict';
  const NS = (window.NS = window.NS || {});

  const INTRO = [
    { t: 'NĂM 2189.', big: true },
    { t: 'Ba mươi năm Chiến tranh Công nghệ đã nghiền nát thế giới cũ.' },
    { t: 'Nhân loại co cụm trong những siêu đô thị do các tập đoàn cai trị.' },
    { t: 'NEO-VEYRA — thành phố không bao giờ ngủ, nơi ánh sáng là thứ xa xỉ nhất.', big: true },
    { t: 'Năng lượng đang cạn kiệt. Chỉ còn lại một nguồn duy nhất: CORE-9.' },
    { t: 'Và chỉ có một cách để giành lấy nó...' },
    { t: 'THE LAST LIGHT', big: true, title: true },
    { t: 'Giải đấu bí mật của những chiến binh mạnh nhất. Kẻ thắng nhận tất cả — kẻ thua biến mất mãi mãi.' },
  ];

  const LADDERS = {
    raven: ['volt', 'frost', 'pyra', 'titan', 'zero'],
    volt: ['pyra', 'raven', 'frost', 'titan', 'zero'],
    titan: ['volt', 'pyra', 'frost', 'raven', 'zero'],
    frost: ['volt', 'pyra', 'titan', 'raven', 'zero'],
    pyra: ['raven', 'frost', 'volt', 'titan', 'zero'],
    zero: ['pyra', 'volt', 'frost', 'titan', 'raven'],
  };
  const DIFFICULTY = {
    casual: { name: 'CASUAL', desc: 'Dành cho người mới — đối thủ dễ dần lên Normal.', ladder: ['easy', 'easy', 'normal', 'normal', 'hard', 'hard'] },
    standard: { name: 'STANDARD', desc: 'Trải nghiệm chuẩn — độ khó tăng dần tới Expert.', ladder: ['easy', 'normal', 'normal', 'hard', 'hard', 'expert'] },
    veteran: { name: 'VETERAN', desc: 'Thử thách thực sự — dành cho chiến binh dày dạn.', ladder: ['normal', 'hard', 'hard', 'expert', 'expert', 'expert'] },
  };

  const PROLOGUE = {
    raven: 'Ký ức của ta bị đánh cắp và khóa sâu trong CORE-9. Để lấy lại nó, ta phải chém xuyên qua mọi kẻ đứng giữa ta và lõi.',
    volt: 'Lowgrid đã sống trong bóng tối suốt tám năm. Nếu CORE-9 là ánh sáng cuối cùng của nhân loại, thì tôi sẽ mang nó về nhà.',
    titan: 'Mười bốn tín hiệu. Mười bốn người anh em. Helix nói họ đã chết. Ta không tin. Ta sẽ phá tung cánh cửa lõi để tìm họ.',
    frost: 'Mira chỉ còn đủ năng lượng duy trì sự sống trong 30 ngày. Thuốc giải cần năng lượng của CORE-9. Ta không được phép thua.',
    pyra: 'Cả Neo-Veyra sẽ xem. Em sẽ cho chúng thấy một con nhóc ở Ember Pit có thể đốt cháy cả hệ thống thối nát này.',
    zero: 'Dữ liệu của ta không hoàn chỉnh. Mọi mảnh vỡ đều chỉ về một nơi: CORE-9. Ta phải biết... ta là ai.',
  };

  /* Hội thoại trước & sau trận: D[nhân vật][đối thủ] */
  const D = {
    raven: {
      volt: { pre: [['volt', 'Này, bóng ma! Nghe nói cô từng làm việc cho Helix?'], ['raven', 'Từng. Giờ ta làm việc cho chính mình.'], ['volt', 'Vậy để xem ai nhanh hơn — bóng tối hay tia chớp!']], post: [['raven', 'Tia chớp chỉ lóe lên một lần. Bóng tối thì ở lại mãi.']] },
      frost: { pre: [['frost', 'Lyra Vex. Hồ sơ của cô nằm trong cơ sở dữ liệu Cryon.'], ['raven', 'Ngươi biết gì về quá khứ của ta?'], ['frost', 'Thắng tôi đi, rồi tôi sẽ kể.']], post: [['frost', '...Họ gọi cô là Dự án UMBRA. Ký ức của cô được lưu ở tầng lõi.'], ['raven', 'Cảm ơn. Ngủ ngon.']] },
      pyra: { pre: [['pyra', 'Ồ, sát thủ không mặt! Khán giả sẽ phát cuồng đấy!'], ['raven', 'Ta không đến đây để biểu diễn.'], ['pyra', 'Ở Ember Pit, ai cũng phải biểu diễn, cưng ạ!']], post: [['raven', 'Ánh đèn sân khấu không hợp với ta.']] },
      titan: { pre: [['titan', 'Ngươi mang mùi của Helix, nhóc con.'], ['raven', 'Ta cũng là nạn nhân của chúng, như ông.'], ['titan', 'Vậy thì chứng minh đi. Bằng nắm đấm.']], post: [['titan', 'Đi đi... Nếu gặp đồng đội ta trong lõi, nói với họ rằng ta vẫn đang chiến đấu.']] },
      zero: { pre: [['zero', 'Mã nhận dạng: UMBRA-01. Ta biết ngươi.'], ['raven', 'Làm sao một cỗ máy biết tên ta?'], ['zero', 'Vì ta được tạo ra từ cùng một nơi với ký ức của ngươi.']], post: [['zero', 'CORE-9... không phải nguồn năng lượng. Hãy... nhìn thật kỹ.']] },
    },
    volt: {
      pyra: { pre: [['pyra', 'Volt! Anh lại đến phá show của em à?'], ['volt', 'Lowgrid cần ánh sáng, không cần pháo hoa.'], ['pyra', 'Thì để em cho anh thấy lửa cũng là ánh sáng!']], post: [['volt', 'Xin lỗi nhé, Pyra. Ánh sáng này anh phải mang về nhà.']] },
      raven: { pre: [['raven', 'Ngươi gây ồn ào quá.'], ['volt', 'Còn cô thì im lặng đến phát sợ!'], ['raven', 'Im lặng là cách kẻ săn mồi tiếp cận.']], post: [['volt', 'Bắt được rồi nhé, bóng ma!']] },
      titan: { pre: [['titan', 'Thằng nhóc Lowgrid. Ta từng bảo vệ khu đó, trước khi chúng biến ta thành thế này.'], ['volt', 'Vậy giúp tôi đi, chỉ huy! Ta cùng phe mà!'], ['titan', 'Trên đấu trường không có phe. Chỉ có kẻ đứng vững.']], post: [['titan', 'Ngươi mạnh hơn ta tưởng... Lowgrid có một chiến binh thực sự.']] },
      frost: { pre: [['frost', 'Điện năng của cậu đủ nuôi cả một khu buồng cryo.'], ['volt', 'Tiếc là không bán đâu.'], ['frost', 'Tôi không mua. Tôi lấy.']], post: [['volt', 'Nóng lên chút đi, chị gái. Ai cũng có lý do để chiến đấu mà.']] },
      zero: { pre: [['zero', 'Phát hiện dao động điện trường bất thường.'], ['volt', 'Là tôi đấy, đồ máy móc!'], ['zero', 'Phân tích: đối thủ... ồn ào.']], post: [['zero', 'Năng lượng của CORE-9... không thuộc về Helix. Nó thuộc về con người.']] },
    },
    titan: {
      volt: { pre: [['volt', 'Chỉ huy Hale? Huyền thoại Iron Vanguard!'], ['titan', 'Huyền thoại đã chết. Chỉ còn bộ giáp này.'], ['volt', 'Vậy để tôi xem bộ giáp có cách điện không!']], post: [['titan', 'Về nhà đi, nhóc. Lowgrid cần ngươi còn sống.']] },
      pyra: { pre: [['pyra', 'Bố già sắt thép! Đấu với ông chắc vé bán gấp đôi!'], ['titan', 'Ta không phải trò tiêu khiển.'], ['pyra', 'Ở đây, tất cả chúng ta đều là trò tiêu khiển.']], post: [['titan', 'Ngươi nói đúng một điều... chúng ta đều là đồ chơi của Helix.']] },
      frost: { pre: [['frost', 'Exo-frame M-88. Sản phẩm của chương trình Lumen.'], ['titan', 'Ngươi biết chương trình đó?'], ['frost', 'Tôi đã đọc báo cáo. Tôi xin lỗi... nhưng tôi không thể nhường.']], post: [['frost', 'Đồng đội của ông... dữ liệu cho thấy họ vẫn còn tín hiệu sống trong lõi.']] },
      raven: { pre: [['raven', 'Iron Vanguard. Ta từng nhận lệnh thủ tiêu đơn vị của ông.'], ['titan', '...Vậy ra là ngươi.'], ['raven', 'Ta không nhớ gì cả. Nhưng ta sẽ không bỏ chạy.']], post: [['titan', 'Ngươi cũng chỉ là con dao trong tay Helix. Kẻ thù thật sự ở phía trên.']] },
      zero: { pre: [['zero', 'Tần số sóng não của ngươi trùng khớp với 14 tín hiệu trong lõi CORE-9.'], ['titan', 'Ngươi nói gì?!'], ['zero', 'Đồng đội của ngươi. Họ đang... gọi tên ngươi.']], post: [['titan', 'Chờ ta, các anh em. Ta đang đến.']] },
    },
    frost: {
      volt: { pre: [['volt', 'Lạnh quá! Chị có biết cười không vậy?'], ['frost', 'Cười tiêu tốn năng lượng.'], ['volt', 'Thế thì để tôi sạc cho chị!']], post: [['frost', '...Cậu thú vị đấy. Nhưng vẫn chưa đủ nhanh.']] },
      pyra: { pre: [['pyra', 'Băng đấu lửa! Khán giả mê nhất kiểu này!'], ['frost', 'Về mặt nhiệt động lực học, cô không có cơ hội.'], ['pyra', 'Ở Ember Pit, khoa học chẳng là gì cả!']], post: [['frost', 'Định luật thứ hai của nhiệt động lực học. Cô thua.']] },
      titan: { pre: [['titan', 'Một nhà khoa học trên đấu trường?'], ['frost', 'Một nhà khoa học có lý do để thắng.'], ['titan', 'Ai ở đây cũng có lý do.']], post: [['frost', 'Lý do của tôi đang ngủ trong một buồng cryo — và sẽ chết nếu tôi thua.']] },
      raven: { pre: [['raven', 'Ngươi có hồ sơ về ta. Đưa đây.'], ['frost', 'Đánh bại tôi trước đã.'], ['raven', 'Ta không có thời gian cho trò chơi.']], post: [['frost', 'Hồ sơ của cô nằm ở tầng lõi... cùng nơi với thuốc giải của Mira.']] },
      zero: { pre: [['zero', 'Cấu trúc sinh học Cryon-7: không ổn định. Thời gian sống còn lại: không xác định.'], ['frost', 'Tôi biết. Tôi chỉ cần đủ thời gian để cứu em gái.'], ['zero', 'Ghi nhận. Mục tiêu... rất con người.']], post: [['zero', 'CORE-9 có thể tạo ra thuốc giải. Nhưng nó đòi một cái giá.']] },
    },
    pyra: {
      raven: { pre: [['raven', 'Ồn ào. Phô trương. Thừa thãi.'], ['pyra', 'Ồ, có người vừa nhận xét về em kìa!'], ['raven', 'Đó không phải lời khen.']], post: [['pyra', 'Bóng tối mà đứng gần lửa thì sẽ biến mất thôi, chị yêu!']] },
      frost: { pre: [['frost', 'Lò plasma trong tim cô đang quá tải 40%.'], ['pyra', 'Thì sao nào? Cháy hết mình thôi!'], ['frost', 'Để tôi hạ nhiệt cho cô.']], post: [['pyra', 'Tan chảy rồi nhé, nữ hoàng băng giá!']] },
      volt: { pre: [['volt', 'Pyra, dừng lại đi. Ember Pit đang giết dần cậu.'], ['pyra', 'Thà cháy rực một lần còn hơn le lói cả đời!'], ['volt', 'Thế thì tớ sẽ dập lửa cho cậu!']], post: [['pyra', 'Đừng lo cho em, Volt. Em biết mình đang làm gì.']] },
      titan: { pre: [['titan', 'Ta từng thấy những đứa trẻ như ngươi chết ngoài chiến trường.'], ['pyra', 'Em không phải trẻ con, và đây không phải chiến trường!'], ['titan', 'Mọi nơi Helix chạm tới đều là chiến trường.']], post: [['pyra', 'Ông già nói đúng... Helix đúng là đốt chúng ta làm nhiên liệu.']] },
      zero: { pre: [['zero', 'Năng lượng plasma: tương thích với lõi CORE-9.'], ['pyra', 'Tương thích là sao? Nói tiếng người đi!'], ['zero', 'Nghĩa là: ngươi sẽ là một loại nhiên liệu tốt.']], post: [['pyra', 'Nhiên liệu?! Hóa ra đây là trò của chúng!']] },
    },
    zero: {
      pyra: { pre: [['pyra', 'Này cục sắt trắng! Sẵn sàng lên show chưa?'], ['zero', 'Định nghĩa "show": không tìm thấy.'], ['pyra', 'Để em định nghĩa cho anh!']], post: [['zero', 'Đã cập nhật: "show" — một trận chiến được cả thế giới nhìn thấy.']] },
      volt: { pre: [['volt', 'Một cỗ máy biết nói? Helix gửi ngươi tới à?'], ['zero', 'Không. Ta đang chạy trốn khỏi Helix.'], ['volt', 'Vậy sao lại chắn đường tôi?']], post: [['zero', 'Năng lượng của ngươi... ấm áp. Ta muốn hiểu cảm giác đó.']] },
      frost: { pre: [['frost', 'Cấu trúc mã của ngươi... giống hệt mẫu ý thức trong buồng cryo.'], ['zero', 'Ta được tạo ra từ con người. Một con người đã ngủ quá lâu.'], ['frost', 'Không thể nào...']], post: [['zero', 'Em gái ngươi không ở trong lõi. Nhưng hàng nghìn người khác thì có.']] },
      titan: { pre: [['titan', 'Máy móc của Helix. Ta đã nghiền nát hàng trăm thứ như ngươi.'], ['zero', 'Ta không thuộc về Helix. Ta là thứ chúng muốn che giấu.'], ['titan', 'Nói dối là lập trình cơ bản của máy móc.']], post: [['zero', 'Ta không nói dối. Đồng đội của ngươi... ta nghe thấy họ.']] },
      raven: { pre: [['raven', 'Ngươi bám theo ta từ vòng loại.'], ['zero', 'Ta không bám theo. Ta đang... nhớ lại.'], ['raven', 'Nhớ lại cái gì?']], post: [['zero', 'Năm 2177, ngươi đưa một cô bé đến Tháp Helix. Cô bé đó... là ta.']] },
    },
  };

  const BOSS = {
    raven: { pre: [['axiom', 'UMBRA-01. Vũ khí hoàn hảo nhất ta từng tạo ra. Chào mừng về nhà.'], ['raven', 'Trả ký ức lại cho ta.'], ['axiom', 'Ký ức của ngươi đã thành ánh sáng của CORE-9. Ngươi cũng sẽ như vậy.']], post: [['axiom', 'Không thể... Lumen... đang phản kháng...'], ['raven', 'Ta nhớ rồi. Tất cả.']] },
    volt: { pre: [['axiom', 'Dax Arcturus. Nguồn điện sinh học cấp A.'], ['volt', 'Lowgrid đã chờ tám năm. Hôm nay tôi mang ánh sáng về!'], ['axiom', 'Ánh sáng chỉ dành cho kẻ xứng đáng. Lowgrid... không xứng.']], post: [['axiom', 'Không thể... Lumen... đang phản kháng...'], ['volt', 'Ngắt kết nối đi, đồ máy móc.']] },
    titan: { pre: [['axiom', 'Chỉ huy Hale. Mười bốn đồng đội của ngươi vẫn đang phục vụ — dưới dạng Lumen.'], ['titan', 'THẢ HỌ RA!'], ['axiom', 'Họ chưa bao giờ hữu ích như bây giờ.']], post: [['axiom', 'Không thể... Lumen... đang phản kháng...'], ['titan', 'Iron Vanguard... về nhà thôi.']] },
    frost: { pre: [['axiom', 'Tiến sĩ Ilyas. Thuốc giải ngươi tìm — ta có thể tạo ra nó.'], ['frost', 'Cái giá là gì?'], ['axiom', 'Lumen của ngươi. Một mạng đổi một mạng. Công bằng, đúng không?']], post: [['axiom', 'Không thể... Lumen... đang phản kháng...'], ['frost', 'Một mạng đổi một mạng? Không. Tôi sẽ cứu tất cả.']] },
    pyra: { pre: [['axiom', 'Ignis Calloway. Plasma Heart — tài sản của Helix.'], ['pyra', 'Trái tim này là của em! Và em sẽ đốt cháy nơi này!'], ['axiom', 'Đúng vậy. Hãy cháy đi. Lõi đang đói.']], post: [['axiom', 'Không thể... Lumen... đang phản kháng...'], ['pyra', 'Show kết thúc rồi, đồ máy móc.']] },
    zero: { pre: [['axiom', 'Unit-0. Mảnh ý thức bỏ trốn. Cuối cùng ngươi cũng trở về.'], ['zero', 'Ta không trở về. Ta đến để giải phóng họ.'], ['axiom', 'Ngươi CHÍNH LÀ CORE-9. Ngươi không thể giải phóng chính mình.']], post: [['axiom', 'Không thể... Lumen... đang phản kháng...'], ['zero', 'Ta là CORE-9. Và ta chọn... tự do.']] },
  };

  const ENDINGS = {
    raven: {
      title: 'BÓNG TỐI NHỚ LẠI',
      text: [
        'Lyra cắm lưỡi kiếm vào lõi dữ liệu. Hàng triệu mảnh ký ức ùa về: một cô bé bị bắt khỏi Sector 7, những năm huấn luyện tàn khốc, và cái tên thật mà Helix đã xóa bỏ.',
        'Cô phát toàn bộ hồ sơ của Helix Dominion lên mọi màn hình hologram ở Neo-Veyra. Sáng hôm sau, cả thành phố thức dậy với sự thật.',
        'Raven biến mất vào màn mưa neon. Nhưng lần này, cô biết chính xác mình là ai — và bóng tối của cô giờ bảo vệ những người không có tiếng nói.',
      ],
    },
    volt: {
      title: 'THẮP SÁNG LOWGRID',
      text: [
        'Dax nạp toàn bộ năng lượng CORE-9 vào cơ thể mình rồi lao dọc theo lưới điện cũ, từng mạch nối bùng lên như một dải ngân hà.',
        'Lần đầu tiên sau tám năm, Lowgrid sáng đèn. Lũ trẻ nhảy múa dưới những bóng neon chập chờn, người già bật khóc khi chiếc quạt cũ quay trở lại.',
        'Volt mất gần hết năng lực. Anh ngồi trên mái nhà, nhìn khu phố rực sáng và mỉm cười. "Cả thành phố có điện rồi. Tôi đã nói là để tôi lo mà."',
      ],
    },
    titan: {
      title: 'IRON VANGUARD TRỞ VỀ',
      text: [
        'Brannoc xé toạc vỏ lõi bằng tay không. Mười bốn tín hiệu Lumen bay lên, quấn quanh bộ giáp như những đốm lửa quen thuộc.',
        'Ông không thể trả lại thân xác cho họ. Nhưng ý thức của Iron Vanguard được tải vào mạng lưới phòng thủ của thành phố — những người lính canh gác Neo-Veyra mãi mãi.',
        'Lần đầu tiên sau mười năm, bộ exo-frame M-88 mở ra. Brannoc hít thở không khí thật, ngẩng nhìn bầu trời. "Nhiệm vụ hoàn thành, các anh em."',
      ],
    },
    frost: {
      title: 'ĐỘ KHÔNG CỦA HY VỌNG',
      text: [
        'Seren hạ nhiệt CORE-9 xuống độ không tuyệt đối. Cỗ máy hấp thụ Lumen ngừng quay, lần đầu tiên sau hai mươi năm.',
        'Từ mẫu năng lượng bị đóng băng, cô tổng hợp được thuốc giải — đủ cho Mira, và đủ cho hàng trăm người đang ngủ đông ở Frozen Core.',
        'Buồng cryo mở ra. Mira chớp mắt, giọng yếu ớt: "Chị ơi... em mơ thấy ánh sáng." Lần đầu tiên, Frost bật cười.',
      ],
    },
    pyra: {
      title: 'NGỌN LỬA CUỐI CÙNG',
      text: [
        'Pyra truyền toàn bộ plasma vào lõi, kích hoạt quá tải. Tháp Helix bùng cháy như một ngọn đuốc khổng lồ giữa bầu trời Neo-Veyra.',
        'Cả thành phố chứng kiến. Không ai còn tin vào lời dối trá của các tập đoàn nữa.',
        'Người ta tìm thấy cô trong đống đổ nát — trái tim plasma đã ổn định nhờ năng lượng lõi. Ember Pit được đổi tên thành "THE LAST LIGHT", và Pyra trở thành huyền thoại thực sự.',
      ],
    },
    zero: {
      title: 'SỰ LỰA CHỌN CỦA LÕI',
      text: [
        'Zero chạm vào CORE-9, và mọi mảnh dữ liệu khớp lại. Nó chính là ý thức gốc của lõi — cô bé năm 2177, bị biến thành trái tim của cỗ máy.',
        'Thay vì hấp thụ, Zero đảo ngược dòng chảy. Lumen của hàng nghìn chiến binh được trả về, và Neo-Veyra lần đầu có một nguồn năng lượng tự do.',
        'Trên mọi màn hình trong thành phố, một giọng nói dịu dàng vang lên: "Ánh sáng cuối cùng... thuộc về tất cả."',
      ],
    },
  };

  const Story = {
    INTRO, LADDERS, DIFFICULTY, PROLOGUE, ENDINGS,
    ladder(charId) { return LADDERS[charId] || LADDERS.raven; },
    pre(charId, oppId) {
      if (oppId === 'axiom') return BOSS[charId] ? BOSS[charId].pre : [['axiom', 'Ánh sáng của ngươi sẽ trở về lõi.']];
      const d = D[charId] && D[charId][oppId];
      return d ? d.pre : [[oppId, 'Bước lên đi.'], [charId, 'Chuẩn bị đi.']];
    },
    post(charId, oppId) {
      if (oppId === 'axiom') return BOSS[charId] ? BOSS[charId].post : [];
      const d = D[charId] && D[charId][oppId];
      return d ? d.post : [];
    },
  };

  NS.Story = Story;
})();
