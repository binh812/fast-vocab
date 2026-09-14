# Ngoại Ngữ Bỏ Túi 🇷🇺🇬🇧🇫🇷🇨🇳

App Android học/ôn ngoại ngữ cấp tốc, kiến trúc **đa ngôn ngữ** — hiện có đủ dữ liệu **4 ngôn ngữ: Nga, Anh, Pháp, Trung**, mỗi ngôn ngữ ~2700-2900 từ vựng + ~2400-2500 câu giao tiếp (gồm đúng 500 thành ngữ/tiếng lóng mỗi ngôn ngữ) — xấp xỉ mục tiêu 3000 từ / 2000 câu / 500 idiom do dữ liệu được khử trùng lặp nghiêm ngặt. Ban đầu làm cho người đã biết tiếng Nga nhưng lâu không dùng, chuẩn bị đi công tác Nga, sau mở rộng thành app học ngoại ngữ đa năng.

Build 100% trong **Termux** trên điện thoại, không dùng Gradle:
```
bash build.sh
```
→ ra `NgoaiNguBoTui.apk` (pipeline: aapt2 → ecj → d8 → zip assets → zipalign → apksigner).

## Tính năng
- 🌐 **4 ngôn ngữ đầy đủ dữ liệu**: 🇷🇺 Nga, 🇬🇧 Anh, 🇫🇷 Pháp, 🇨🇳 Trung (Giản thể, phiên âm Pinyin có dấu thanh điệu). Đổi ngôn ngữ bằng nút cờ ở góc trên header — mở bảng chọn, chuyển tức thì.
- 📖 **~2700-2900 từ vựng/ngôn ngữ**: phiên âm dễ đọc cho người Việt (Pinyin với tiếng Trung), từ loại, nghĩa tiếng Việt, cách dùng, ví dụ + dịch nghĩa. Chia theo 15 chủ đề (chào hỏi, số & thời gian, động từ, gia đình, ăn uống, giao thông, khách sạn, mua sắm, sân bay, y tế, công việc...), mỗi chủ đề có cả lớp từ cơ bản lẫn lớp từ trung cấp/chuyên sâu hơn từ đợt mở rộng thứ hai.
- 💬 **~2400-2500 câu giao tiếp/ngôn ngữ** theo 13 chủ đề thực tế (sân bay, khách sạn, nhà hàng, mua sắm, hỏi đường, ngân hàng, khẩn cấp, công việc/đàm phán...) — kể cả **đúng 500 thành ngữ & tiếng lóng** đời thường mỗi ngôn ngữ (kèm giải nghĩa bóng + lưu ý ngữ cảnh dùng thân mật/thô tục nếu có, phủ cả tiếng lóng Gen Z/mạng xã hội hiện đại).
- 🗂️ **Điều hướng theo lưới chủ đề**: mở app vào thẳng màn hình chọn chủ đề (kèm icon + số lượng mục), bấm vào để học/tra cứu riêng từng chủ đề; có sẵn 2 lối tắt "★ Yêu thích" và "○ Chưa thuộc".
- 🔎 **Tìm kiếm toàn cục** (tab riêng "Tìm kiếm"): tìm xuyên suốt cả từ vựng, câu giao tiếp và thành ngữ/tiếng lóng của ngôn ngữ đang chọn cùng lúc, có 3 tuỳ chọn tích phạm vi (Từ vựng / Câu giao tiếp / Thành ngữ & Tiếng lóng) — mặc định tích cả 3, trạng thái tích được nhớ qua các lần mở app (localStorage). Mỗi kết quả có nhãn nhỏ ghi rõ nguồn + chủ đề để dễ phân biệt khi kết quả trộn lẫn nhiều loại.
- 🔁 **Hai chiều tra cứu**: <Ngôn ngữ đích> → Việt (mặc định) hoặc Việt → <Ngôn ngữ đích> — đổi bằng nút gạt trong thanh công cụ, áp dụng cho cả danh sách (sắp xếp theo bảng chữ cái của ngôn ngữ đang hiển thị chính) lẫn chế độ Ôn tập flashcard.
- 🔊 **Phát âm bằng giọng đọc hệ thống (Text-to-Speech)**, tự đổi locale theo ngôn ngữ đang chọn — không cần tải file âm thanh, có chế độ đọc chậm để nghe rõ từng âm.
- ✅ Đánh dấu ★ yêu thích và ✓ đã thuộc, lưu riêng theo từng ngôn ngữ.
- 🔁 Chế độ **Ôn tập** kiểu flashcard: chọn kho từ/câu + chủ đề + chiều tra cứu + số lượng thẻ, ưu tiên ôn thẻ chưa thuộc trước.
- 📱💻 **Responsive**: bố cục tự thích ứng điện thoại/tablet, dọc/ngang (lưới chủ đề và danh sách tự co giãn số cột, có tôn trọng vùng an toàn màn hình notch khi xoay ngang).
- ⬅️ Nút Back hệ thống lùi từng lớp điều hướng trong app (đóng bảng ngôn ngữ → thoát ôn tập → thu gọn thẻ → xoá ô tìm kiếm toàn cục → về lưới chủ đề → về tab Từ vựng → mới thoát app), không thoát app đột ngột.
- Dữ liệu và tiến trình học lưu offline trên máy (localStorage trong WebView) — dùng được không cần mạng.

## Kiến trúc
Theo đúng pattern các app khác trong máy: một Activity native (`MainActivity.java`) mở `WebView` load giao diện từ `app/assets/index.html` + `css/app.css` + `js/app.js`. Cầu nối `Android.speak()/speakSlow()/setLang()/exitApp()` gọi API Android thật; `setLang(code)` đổi locale TTS động (ru/en/fr/zh...) nên việc thêm ngôn ngữ mới không cần sửa code Java. Nút Back của hệ thống được JS quyết định qua `window.onNativeBack()`, chỉ gọi `Android.exitApp()` khi thực sự không còn gì để lùi trong app.

**Đa ngôn ngữ:** dữ liệu nạp vào `window.LANG_PACKS.<mã ngôn ngữ>.{words,sentences}`, mỗi ngôn ngữ một thư mục `app/assets/data/<mã>/words.js|sentences.js`. Danh sách ngôn ngữ hiển thị trong app (kèm cờ, tên, trạng thái sẵn sàng) khai báo ở đầu `js/app.js` (biến `LANGS`) — cả 4 ngôn ngữ hiện đều `ready:true`. Để thêm một ngôn ngữ mới:
1. Tạo `datagen/<mã>/` và soạn dữ liệu theo đúng schema (xem `datagen/merge_lang.py`).
2. Chạy `python3 datagen/merge_lang.py <mã> <tổng số câu kỳ vọng>` (hiện tại là 1260) để gộp, kiểm tra trùng lặp, sinh `app/assets/data/<mã>/words.js|sentences.js`.
3. Thêm `<script src="data/<mã>/words.js">` + `sentences.js` vào `index.html`.
4. Thêm dòng ngôn ngữ mới (hoặc đổi `ready:false` → `ready:true`) trong mảng `LANGS` (`js/app.js`), và mã locale tương ứng trong `localeFor()` (`MainActivity.java`) nếu là ngôn ngữ hoàn toàn mới.
5. `bash build.sh` lại.

Nếu máy đích chưa có giọng đọc cho ngôn ngữ đang chọn, app sẽ nhắc và mở màn hình cài đặt Text-to-Speech (`Settings > Text-to-speech output`, cài thêm gói ngôn ngữ tương ứng cho Google TTS).

## Dữ liệu
Mỗi ngôn ngữ có thư mục riêng `datagen/<mã>/` (ru/en/fr/zh) chứa các lô thô `words_1.json, words_2.json...` và `sentences_1.json, sentences_2.json...` (câu giao tiếp theo tình huống; các file `sentences_6/7/13...json` là các đợt thành ngữ/tiếng lóng, category `idioms_slang`, đánh id ở dải riêng `2001+` để không đụng dải `1-2000` của câu giao tiếp thường). `datagen/merge_lang.py <mã> <tổng từ kỳ vọng> <tổng câu kỳ vọng>` tự gom mọi file `words_*.json`/`sentences_*.json` đang có, gộp, kiểm tra (không trùng "ru", đúng field/category), rồi sinh `app/assets/data/<mã>/words.js|sentences.js`. Dùng chung 1 script cho cả 4 ngôn ngữ.

**Khử trùng lặp ở quy mô lớn:** khi mỗi đợt soạn thêm hàng nghìn mục (nhiều agent chạy song song không biết nhau đang viết gì), tỉ lệ trùng lặp có thể lên 10-35% tuỳ chủ đề — quá nhiều để soạn tay từng bản thay thế như ở quy mô nhỏ. `datagen/dedupe_chunks.py <mã> <words|sentences>` xử lý việc này tự động: xoá thẳng các mục trùng "ru" (giữ mục id nhỏ nhất), báo cáo số lượng xoá theo từng category. Sau khi xoá, nếu 1 category hụt nhiều so với mục tiêu, soạn thêm 1 đợt "bù" (backfill) riêng cho đúng category đó rồi dedupe lại — nhưng đợt bù thường tự đụng lại ~50-70% nội dung cũ (các chủ đề hẹp như khách sạn/hải quan/mua sắm gần như đã "bão hoà" vốn từ thông dụng), nên chỉ nên bù 1 lần rồi chấp nhận kết quả ~90-96% mục tiêu thay vì cố ép đúng số tuyệt đối.

Với dữ liệu ở quy mô nhỏ hơn (chỉ vài chục mục trùng), có thể soạn tay bản thay thế bằng script kiểu `datagen/patch_<mã>_dupes.py` — xem code các script đó để tham khảo, dù cách này không còn thực tế ở quy mô nghìn mục.

## Kiểm thử nhanh giao diện (không cần cài lên máy)
```
cd tools && npm install jsdom   # chỉ cần 1 lần
node smoke_test.js
```
Script dùng jsdom giả lập WebView, click qua toàn bộ luồng chính (chọn chủ đề, tìm kiếm, đổi chiều tra cứu, ôn tập flashcard, đổi ngôn ngữ, nút Back) để bắt lỗi JS/CSS trước khi build APK thật. Đã từng bắt được 2 lỗi thật theo cách này: crash khi ôn tập không đổi dropdown mặc định, và lớp phủ bảng chọn ngôn ngữ bị đè CSS nên luôn hiện chặn hết thao tác.

## Cài lên máy
Sau khi build xong, mở trình quản lý tệp trên điện thoại và bấm cài `NgoaiNguBoTui.apk` (cho phép "cài nguồn không xác định" nếu được hỏi), hoặc:
```
adb install -r NgoaiNguBoTui.apk
```
