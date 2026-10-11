# Spec: dữ liệu mở rộng cho bài "Ghép câu từng bước" (builder_extra_*.json)

App "Ngoại Ngữ Bỏ Túi" dạy ngoại ngữ cho người Việt. Mỗi bài Ghép câu có 1 TỪ TRỤ (pivot) và 3 nhánh
"từ -> cụm từ -> câu" (đã có sẵn trong datagen/<lang>/builder_1.json (bài 1-18) và builder_2.json (bài 19-36)).
Nhiệm vụ: viết phần HƯỚNG DẪN CHI TIẾT + VÍ DỤ THÊM cho từng bài, khớp với từ trụ và 3 nhánh đã có.

Output: một JSON array (UTF-8, JSON hợp lệ), mỗi bài 1 object, theo thứ tự id:

{
  "id": 1,
  "formula": [ {"k":"S","t":"Chủ ngữ"}, {"k":"P","t":"不"}, {"k":"V","t":"Động từ"}, {"k":"O","t":"(Tân ngữ)"} ],
  "points": ["<quy tắc dùng 1>", "<quy tắc 2>", "<quy tắc 3>"],
  "mistakes": [ {"wrong":"<câu SAI bằng ngoại ngữ>", "right":"<câu ĐÚNG>", "why":"<giải thích ngắn tiếng Việt>"} ],
  "compare": "<so sánh với tiếng Việt: giống gì, khác gì, 1-2 câu>",
  "tip": "<mẹo nhớ ngắn gọn, vui, dễ nhớ>",
  "how": ["<nhánh 1: giải thích cách ghép bước 1->2->3>", "<nhánh 2>", "<nhánh 3>"],
  "dialog": [
    {"who":"A", "t":"...", "ph":"...", "vi":"...", "hl":["..."]},
    {"who":"B", "t":"...", "ph":"...", "vi":"...", "hl":["..."]}
  ],
  "more": [
    {"t":"...", "ph":"...", "vi":"...", "hl":["..."], "tokens":["..."]}
  ]
}

Quy tắc:
- "formula": 2-6 khối mô tả MẪU CÂU của bài theo đúng trật tự từ của ngoại ngữ. "k" là loại khối:
  S=chủ ngữ, P=từ trụ (bắt buộc có ít nhất 1 khối P, "t" là dạng ngoại ngữ của từ trụ), V=động từ,
  O=tân ngữ/bổ ngữ, A=tính từ/trạng từ, Q=từ để hỏi/trợ từ, X=khác. "t" của các khối không phải P viết
  bằng tiếng Việt (vd "Chủ ngữ", "Động từ", "Nơi chốn"); khối tuỳ chọn để trong ngoặc "(Tân ngữ)".
- "points": 3-4 ý, mỗi ý 1 câu tiếng Việt rõ ràng, cụ thể, có thể kèm ví dụ ngắn trong ngoặc kép.
- "mistakes": 1-2 lỗi người Việt HAY MẮC thật sự với từ trụ này (dịch word-by-word từ tiếng Việt, sai trật tự,
  sai dạng...). "wrong" và "right" là câu ngoại ngữ ngắn; "why" giải thích bằng tiếng Việt.
- "how": đúng 3 chuỗi, ứng với 3 nhánh có sẵn của bài (đúng thứ tự), mỗi chuỗi 1 câu giải thích ghép
  (vd: "Thêm 不 trước động từ 说 → 不说, rồi đặt chủ ngữ 我 lên đầu → 我不说。").
- "dialog": hội thoại đời thường 3-4 lượt giữa A và B (luân phiên), câu ngắn, CÓ dùng từ trụ ở ít nhất 2 lượt,
  tình huống du lịch/công tác/sinh hoạt. "hl" = các chuỗi con đúng nguyên văn của "t" là từ trụ ([] nếu lượt đó
  không có từ trụ).
- "more": đúng 6 câu ví dụ MỚI (không trùng các câu đã có trong bài), 3-8 từ, đa dạng tình huống, độ khó tăng dần,
  câu nào cũng chứa từ trụ. "hl": chuỗi con đúng nguyên văn của "t". "tokens": như dữ liệu cũ — các từ theo thứ tự,
  KHÔNG gồm dấu câu cuối câu; nối lại (tiếng Trung: nối liền, bỏ mọi dấu câu 。？！，; ngôn ngữ khác: nối bằng 1 dấu cách)
  phải đúng bằng "t" bỏ dấu câu cuối. Tránh dấu phẩy giữa câu trừ khi ngữ pháp bắt buộc.
- "ph" (phiên âm) theo ĐÚNG kiểu phiên âm đang dùng trong file builder_*.json của ngôn ngữ đó (xem các bài có sẵn).
  Tiếng Trung thêm "vph" (đọc bồi kiểu Việt) cho mọi câu trong "dialog" và "more", như dữ liệu có sẵn.
- Mọi nội dung ngoại ngữ phải đúng ngữ pháp, tự nhiên; tiếng Việt tự nhiên, dễ hiểu cho người mới học.

Sau khi viết xong, tự kiểm tra bằng 1 script python3: JSON hợp lệ, đủ các bài được giao theo đúng id, mỗi bài có
formula (có khối P), 3-4 points, 1-2 mistakes, compare, tip, đúng 3 how, dialog 3-4 lượt, đúng 6 more; mọi hl có
trong t; quy tắc tokens đúng. Sửa hết lỗi rồi mới xong.
