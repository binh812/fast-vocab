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
- 🔎 **Tìm kiếm toàn cục** (gõ không dấu cũng được: *xin chao* tìm ra *Xin chào*) (tab riêng "Tìm kiếm"): tìm xuyên suốt cả từ vựng, câu giao tiếp và thành ngữ/tiếng lóng của ngôn ngữ đang chọn cùng lúc, có 3 tuỳ chọn tích phạm vi (Từ vựng / Câu giao tiếp / Thành ngữ & Tiếng lóng) — mặc định tích cả 3, trạng thái tích được nhớ qua các lần mở app (localStorage). Mỗi kết quả có nhãn nhỏ ghi rõ nguồn + chủ đề để dễ phân biệt khi kết quả trộn lẫn nhiều loại.
- 🔁 **Hai chiều tra cứu**: <Ngôn ngữ đích> → Việt (mặc định) hoặc Việt → <Ngôn ngữ đích> — đổi bằng nút gạt trong thanh công cụ, áp dụng cho cả danh sách (sắp xếp theo bảng chữ cái của ngôn ngữ đang hiển thị chính) lẫn chế độ Ôn tập flashcard.
- 🔊 **Phát âm bằng giọng đọc hệ thống (Text-to-Speech)**, tự đổi locale theo ngôn ngữ đang chọn — không cần tải file âm thanh, có chế độ đọc chậm để nghe rõ từng âm.
- ✅ Đánh dấu ★ yêu thích và ✓ đã thuộc, lưu riêng theo từng ngôn ngữ.
- 🔁 Tab **Ôn tập** dùng **lịch lặp ngắt quãng (spaced repetition, thuật toán SM-2)**, với 3 kiểu luyện tập chung 1 lịch ôn:
  - 🗂️ **Thẻ ghi nhớ**: lật thẻ rồi chấm điểm 4 mức **Quên / Khó / Tốt / Dễ** — mỗi nút hiện sẵn khoảng cách đến lần ôn tiếp theo.
  - 🎯 **Trắc nghiệm**: chọn 1 trong 4 đáp án (3 đáp án nhiễu lấy từ cùng chủ đề), phản hồi đúng/sai ngay.
  - ⌨️ **Nghe - Gõ lại**: nghe phát âm rồi gõ lại đúng chính tả, chấm nhẹ nhàng (chấp nhận sai lệch nhỏ/sai dấu); tiếng Trung gõ chữ Hán hoặc Pinyin không dấu đều được.
  - ⚠️ Nhóm **Thẻ hay quên**: các thẻ từng bị chấm "Quên", nhiều lần quên nhất lên trước, để luyện riêng.
  Cả 3 kiểu đều tự động cập nhật lịch ôn. Mỗi thẻ có lịch ôn riêng (độ khó, khoảng cách ngày, ngày đến hạn) lưu theo từng ngôn ngữ; thẻ nhớ tốt giãn cách ra vài ngày/tuần/tháng, thẻ hay quên quay lại ngay hôm sau. Màn hình thiết lập hiện sẵn số thẻ đến hạn hôm nay + số thẻ mới theo chủ đề đã chọn.
- 🧩 **Ghép câu từng bước** (tab riêng): học theo phương pháp của sách "Ghép câu từng bước" — mỗi bài lấy 1 **từ trụ** ngữ pháp (không, có, muốn, đã, sẽ, hơn, nếu...) ghép với 1 từ thành cụm từ rồi mở rộng thành câu hoàn chỉnh (*nói → không nói → Tôi không nói.*). 36 bài × 3 nhánh cho mỗi ngôn ngữ, chia 3 cấp Cơ bản/Mở rộng/Nâng cao; sơ đồ như sách với từ trụ tô đỏ, phiên âm (tiếng Trung có thêm cách đọc bồi tiếng Việt), ghi chú ngữ pháp; chạm từng ô để nghe. Mỗi bài còn có **công thức câu** dạng khối màu, **cách dùng**, **lỗi người Việt hay gặp** (câu sai → câu đúng + lý do), **so sánh với tiếng Việt**, **mẹo nhớ**, giải thích cách ghép từng nhánh, **hội thoại mẫu** dạng chat (nghe cả đoạn) và **6 ví dụ thêm**. Nút "▶️ Xem ghép từng bước" chạy hoạt cảnh: các ô hiện lần lượt từ → cụm từ → câu, đọc to và gia sư thuyết minh. Bài luyện gồm **điền từ trụ** + **xếp ô chữ thành câu** (có ô nhiễu, nút gợi ý), thanh tiến độ, combo 🔥, chấm 1–3 ★ và pháo giấy khi xong; danh sách bài gợi ý "Học tiếp" bài chưa học.
- 🧑‍🏫 **Gia sư 3D** — ở tab Ôn tập và Ghép câu là thanh lớn có khung thoại; ở các tab khác là avatar nhỏ nổi ở góc (chạm để nhận mẹo học, khen khi đánh dấu đã thuộc, báo số kết quả tìm kiếm). Ở tab Ôn tập: nhân vật 3D (dựng hoàn toàn bằng khối hình three.js, chạy offline, không dùng model tải ngoài) mấp máy miệng theo giọng đọc TTS, chào và báo số thẻ cần ôn, nhắc cách làm ở mỗi thẻ, khen/nhún nhảy khi trả lời đúng, nghiêng đầu động viên khi sai, xoay vòng ăn mừng khi hết phiên. Bật/tắt bằng nút "Gia sư 3D" ở màn hình thiết lập ôn tập; tự ẩn nếu máy không hỗ trợ WebGL. three.js chỉ được nạp khi gia sư hiện lần đầu nên không làm chậm lúc mở app.
- 📊 **Dashboard tiến trình** (bấm huy hiệu 🔥 ở header): số ngày học liên tục (streak), biểu đồ hoạt động 7 ngày gần nhất, số thẻ đến hạn ôn hôm nay, % từ/câu đã thuộc theo từng ngôn ngữ trong số 4 ngôn ngữ, và **9 huy hiệu thành tích** (streak, số mục đã thuộc, số lượt ôn tập, học đủ 4 ngôn ngữ...).
- 🔔 **Nhắc học hằng ngày**: bật/tắt và chọn giờ nhắc ngay trong dashboard — thông báo hệ thống nhắc ôn tập mỗi ngày, vẫn hoạt động sau khi khởi động lại máy.
- 💾 **Sao lưu / khôi phục tiến trình** ngay trong dashboard: xuất toàn bộ dữ liệu học (yêu thích, đã thuộc, lịch ôn SRS, streak...) ra 1 file `.json` chọn nơi lưu tuỳ ý, và khôi phục lại từ file đó bất cứ lúc nào (có xác nhận trước khi ghi đè) — phòng trường hợp gỡ cài đặt hoặc đổi máy.
- 🌙 **Giao diện sáng/tối** (tự động theo hệ thống hoặc chọn tay) và **chỉnh cỡ chữ** trong mục Cài đặt hiển thị ở dashboard; hiệu ứng lật thẻ, phản hồi đúng/sai (rung nhẹ khi sai); nghe được cả câu ví dụ.
- ⚡ Mở app chỉ tải dữ liệu của ngôn ngữ đang dùng (các ngôn ngữ khác tải khi chuyển sang) cho nhanh.
- 📱💻 **Responsive**: bố cục tự thích ứng điện thoại/tablet, dọc/ngang (lưới chủ đề và danh sách tự co giãn số cột, có tôn trọng vùng an toàn màn hình notch khi xoay ngang).
- 🧭 **Hướng dẫn dùng app (onboarding)**: 4 màn hình giới thiệu nhanh (đổi ngôn ngữ, duyệt chủ đề, tìm kiếm toàn cục, ôn tập thông minh) tự hiện ở lần mở đầu tiên; có thể xem lại bất cứ lúc nào qua nút ❓ ở góc header.
- ⬅️ Nút Back hệ thống lùi từng lớp điều hướng trong app (đóng bảng dashboard/hướng dẫn/ngôn ngữ → thoát ôn tập → thu gọn thẻ → xoá ô tìm kiếm toàn cục → về lưới chủ đề → về tab Từ vựng → mới thoát app), không thoát app đột ngột.
- Dữ liệu và tiến trình học (yêu thích, đã thuộc, lịch ôn tập spaced repetition, streak) lưu offline trên máy (localStorage trong WebView) — dùng được không cần mạng, và có thể sao lưu ra file như trên.

## Kiến trúc
Theo đúng pattern các app khác trong máy: một Activity native (`MainActivity.java`) mở `WebView` load giao diện từ `app/assets/index.html` + `css/app.css` + `js/app.js`. Cầu nối `Android.speak()/speakSlow()/setLang()/exitApp()/exportData()/importData()/setReminder()/cancelReminder()/getReminderStatus()` gọi API Android thật; `setLang(code)` đổi locale TTS động (ru/en/fr/zh...) nên việc thêm ngôn ngữ mới không cần sửa code Java. `exportData()/importData()` dùng Storage Access Framework (`ACTION_CREATE_DOCUMENT`/`ACTION_OPEN_DOCUMENT`) để chọn nơi lưu/mở file sao lưu mà không cần xin quyền bộ nhớ. Nhắc học hằng ngày dùng `AlarmManager` (`ReminderUtil.java` lên lịch, `ReminderReceiver.java` hiện thông báo, `BootReceiver.java` lên lịch lại sau khi khởi động lại máy vì AlarmManager bị huỷ khi reboot) — trạng thái bật/tắt + giờ nhắc lưu ở `SharedPreferences` phía native (không phải localStorage, vì cần đọc được cả khi WebView chưa chạy). Nút Back của hệ thống được JS quyết định qua `window.onNativeBack()`, chỉ gọi `Android.exitApp()` khi thực sự không còn gì để lùi trong app.

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

**Gia sư 3D:** `app/assets/js/tutor.js` dựng nhân vật từ khối hình cơ bản của three.js (r149, bản UMD lưu kèm ở `app/assets/vendor/three.min.js`, giấy phép MIT) và tự xử lý chuyển động (chớp mắt, lắc lư, cảm xúc). Khẩu hình dựa vào sự kiện TTS từ native: `onTtsState` (bắt đầu/kết thúc đọc) và `onTtsWord` (mỗi từ, qua `UtteranceProgressListener.onRangeStart`); engine nào không báo thì JS tự ước lượng thời gian đọc theo độ dài câu.

**Ghép câu:** danh sách 36 bài chung cho mọi ngôn ngữ ở `datagen/builder_lessons.json`; dữ liệu từng ngôn ngữ soạn ở `datagen/<mã>/builder_*.json` (mỗi bước có `t` câu, `ph` phiên âm, `vph` đọc bồi cho tiếng Trung, `vi` nghĩa, `hl` phần từ trụ để tô màu, bước 3 có `tokens` để xếp ô). Phần hướng dẫn chi tiết + ví dụ thêm ở `datagen/<mã>/builder_extra_*.json` (quy cách: `datagen/builder_extra_spec.md`). `python3 datagen/merge_builder.py <mã>` gộp cả hai, kiểm tra (đủ 36 bài × 3 nhánh × 3 bước, mọi `hl` có trong câu, `tokens` ghép lại đúng bằng câu) rồi sinh `app/assets/data/<mã>/builder.js`. `build.sh` tự chạy `datagen/gen_meta.py` sinh `data/meta.js` (số mục mỗi ngôn ngữ) vì app chỉ tải gói của ngôn ngữ đang dùng.

## Kiểm thử nhanh giao diện (không cần cài lên máy)
```
cd tools && npm install jsdom   # chỉ cần 1 lần
node smoke_test.js
```
Script dùng jsdom giả lập WebView, click qua toàn bộ luồng chính (onboarding, chọn chủ đề, tìm kiếm toàn cục, đổi chiều tra cứu, ôn tập flashcard spaced repetition, đổi ngôn ngữ, nút Back) để bắt lỗi JS/CSS trước khi build APK thật. Đã từng bắt được 2 lỗi thật theo cách này: crash khi ôn tập không đổi dropdown mặc định, và lớp phủ bảng chọn ngôn ngữ bị đè CSS nên luôn hiện chặn hết thao tác.

## Soát giao diện nhiều kích thước màn hình
```
pkg install x11-repo && pkg install chromium   # chỉ cần 1 lần
node tools/screens.js <thư mục ảnh> [lọc màn hình] [lọc kích thước]
python3 tools/contact_sheet.py <thư mục ảnh> <thư mục bảng tổng hợp>
```
`screens.js` mở app trong Chromium headless, bấm qua 16 màn hình chính (lưới chủ đề, danh sách, tìm kiếm, các màn Ghép câu, ôn tập 3 chế độ, dashboard, onboarding, chế độ tối...) ở 8 kích thước: điện thoại nhỏ 320px, điện thoại dọc/ngang, màn ngoài máy gập, máy gập mở dọc/ngang, tablet dọc/ngang; báo phần tử tràn ngang và lỗi JS. `contact_sheet.py` ghép ảnh mỗi màn hình thành 1 bảng để so sánh nhanh. Bố cục: màn ≤400px thu gọn header; màn thấp (xoay ngang) header 1 hàng, ô chủ đề nằm ngang, màn ôn tập chia 2 cột (thẻ | nút/đáp án); màn ≥640×640 (máy gập mở, tablet) chữ to hơn và hộp thoại nổi giữa màn hình; màn ≥1000px giới hạn bề rộng nội dung.

## Cài lên máy
Sau khi build xong, mở trình quản lý tệp trên điện thoại và bấm cài `NgoaiNguBoTui.apk` (cho phép "cài nguồn không xác định" nếu được hỏi), hoặc:
```
adb install -r NgoaiNguBoTui.apk
```
