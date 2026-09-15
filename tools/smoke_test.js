// Kiểm tra nhanh logic UI (app.js) bằng jsdom, không cần cài lên máy thật.
// Cài 1 lần:  npm install jsdom   (chạy trong thư mục tools/, hoặc bất kỳ đâu rồi trỏ NODE_PATH)
// Chạy:       node tools/smoke_test.js
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const ROOT = path.join(__dirname, "..", "app", "assets");
const html = `<!doctype html><html><head></head><body><div id="app"></div></body></html>`;

const dom = new JSDOM(html, { url: "https://fastvocab.local/", runScripts: "dangerously", pretendToBeVisual: true });
const { window } = dom;

// giả lập cầu nối native Android
let lastSpoken = null;
let exitCalled = 0;
let exportCalled = 0;
let exportedJson = null;
let importCalled = 0;
window.Android = {
  speak: (t) => { lastSpoken = t; },
  speakSlow: (t) => { lastSpoken = t; },
  setLang: () => {},
  isLangAvailable: () => true,
  exitApp: () => { exitCalled++; },
  exportData: (json) => { exportCalled++; exportedJson = json; },
  importData: () => { importCalled++; },
};

function loadScript(relPath){
  const code = fs.readFileSync(path.join(ROOT, relPath), "utf8");
  window.eval(code + "\n//# sourceURL=" + relPath);
}

let fails = 0;
function check(label, cond){
  if(cond){ console.log("OK  ", label); }
  else { console.log("FAIL", label); fails++; }
}

try {
  // jsdom không tự áp dụng CSS ngoài, nên các check UI dưới đây không phát hiện được
  // lỗi "phần tử [hidden] vẫn hiện" do 1 rule khác ép display:... đè lên UA stylesheet.
  // Guard tĩnh: mọi id nào bị JS toggle qua .hidden = true/false thì CSS phải có rule
  // "<selector>[hidden]{display:none}" tương ứng, nếu không sẽ bị đè và luôn hiện.
  const cssText = fs.readFileSync(path.join(ROOT, "css/app.css"), "utf8");
  const jsText = fs.readFileSync(path.join(ROOT, "js/app.js"), "utf8");
  const hiddenToggledIds = new Set();
  for(const m of jsText.matchAll(/getElementById\("(\w+)"\)\.hidden\s*=/g)) hiddenToggledIds.add(m[1]);
  for(const id of hiddenToggledIds){
    const hasGuard = new RegExp("#" + id + "\\[hidden\\]|\\." + "[\\w-]+\\[hidden\\]").test(cssText);
    check("CSS has a [hidden]-safe rule for #" + id + " (no base display: override left uncovered)", hasGuard);
  }

  loadScript("data/ru/words.js");
  loadScript("data/ru/sentences.js");
  loadScript("data/en/words.js");
  loadScript("data/en/sentences.js");
  loadScript("data/fr/words.js");
  loadScript("data/fr/sentences.js");
  loadScript("data/zh/words.js");
  loadScript("data/zh/sentences.js");
  // Số lượng thực tế dao động theo từng ngôn ngữ (mỗi đợt agent tự khử trùng lặp khác nhau),
  // nên chỉ kiểm tra "đủ lớn" (>= 85% mục tiêu ~3000 từ / ~2500 câu) thay vì số tuyệt đối.
  for (const lang of ["ru", "en", "fr", "zh"]) {
    const w = window.LANG_PACKS[lang].words.length;
    const s = window.LANG_PACKS[lang].sentences.length;
    check(`${lang} words data loaded (${w}, >= 2550 expected)`, w >= 2550);
    check(`${lang} sentences data loaded (${s}, >= 2300 expected)`, s >= 2300);
    const idiomCount = window.LANG_PACKS[lang].sentences.filter(it => it.category === "idioms_slang").length;
    check(`${lang} has exactly 500 idioms_slang entries`, idiomCount === 500);
  }

  window.localStorage.clear();
  loadScript("js/app.js");
  const doc = window.document;

  // 0. onboarding tự mở ở lần chạy đầu tiên (chưa có cờ fv_onboarded)
  check("onboarding modal auto-opens on first boot", doc.getElementById("onboardBack").hidden === false);
  check("onboarding shows first slide title", doc.querySelector(".onboard-title").textContent.indexOf("Chọn ngôn ngữ") !== -1);
  check("onboarding first dot is active", doc.querySelectorAll(".onboard-dot")[0].classList.contains("active"));
  doc.getElementById("obNext").click();
  doc.getElementById("obNext").click();
  check("onboarding advances through slides (dot 3 active)", doc.querySelectorAll(".onboard-dot")[2].classList.contains("active"));
  doc.getElementById("obNext").click();
  check("onboarding last slide shows start button", doc.getElementById("obNext").textContent.indexOf("Bắt đầu học") !== -1);
  doc.getElementById("obNext").click();
  check("onboarding closes after last slide and marks onboarded", doc.getElementById("onboardBack").hidden === true && window.localStorage.getItem("fv_onboarded") === "1");

  doc.getElementById("helpBtn").click();
  check("help button reopens onboarding", doc.getElementById("onboardBack").hidden === false);
  window.onNativeBack();
  check("back button closes onboarding instead of exiting", doc.getElementById("onboardBack").hidden === true && exitCalled === 0);

  // 1. boot -> lưới chủ đề
  let tiles = doc.querySelectorAll(".topic-tile");
  check("topic grid renders tiles on boot", tiles.length === 3 + 15);

  // 2. mở 1 chủ đề
  let transportTile = Array.from(tiles).find(t => t.getAttribute("data-topic") === "transport");
  check("transport tile exists", !!transportTile);
  transportTile.click();
  let cards = doc.querySelectorAll("#cardList .card");
  check("list view shows cards after clicking topic", cards.length > 0);
  check("breadcrumb shows topic name", doc.querySelector(".list-head-title").textContent.indexOf("Giao thông") !== -1);

  // 3. quay lại lưới chủ đề
  doc.getElementById("backToTopics").click();
  check("back button returns to topic grid", doc.querySelectorAll(".topic-tile").length === 18);

  // 4. tab Tìm kiếm toàn cục (thay cho ô tìm kiếm riêng trong từng tab trước đây)
  doc.querySelector('.tab[data-tab="search"]').click();
  check("search tab shows empty-state hint before typing", doc.querySelector("#main .empty") && doc.querySelectorAll("#cardList .card").length === 0);
  check("search scope chips default to all 3 checked", doc.querySelectorAll("#searchScopeChips .scope-chip.active").length === 3);

  let globalSearchInput = doc.getElementById("globalSearchInput");
  globalSearchInput.value = "привет";
  globalSearchInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  let searchCards = doc.querySelectorAll("#cardList .card");
  check("global search finds results for 'привет'", searchCards.length >= 1);
  check("search result cards carry a source tag (Từ vựng/Câu giao tiếp)", !!searchCards[0].querySelector(".card-tag"));

  // 4b. tắt phạm vi "Từ vựng" -> kết quả phải giảm (không còn lẫn từ vựng)
  // (renderSearchToolbar() build lại toàn bộ DOM của các chip sau mỗi lần bấm, nên phải
  //  truy vấn lại phần tử mỗi lần thay vì giữ tham chiếu cũ đã bị thay thế)
  doc.querySelector('.scope-chip[data-scope="words"]').click();
  check("unchecking 'Từ vựng' scope updates chip state", !doc.querySelector('.scope-chip[data-scope="words"]').classList.contains("active"));
  check("search results no longer include words-type cards", doc.querySelectorAll('#cardList .card[data-type="words"]').length === 0);
  doc.querySelector('.scope-chip[data-scope="words"]').click(); // bật lại để không ảnh hưởng các bước sau
  check("re-checking 'Từ vựng' scope restores it", doc.querySelector('.scope-chip[data-scope="words"]').classList.contains("active"));

  // 5. thao tác trên thẻ kết quả tìm kiếm
  searchCards = doc.querySelectorAll("#cardList .card");
  let firstCard = searchCards[0];
  firstCard.querySelector('[data-act="speak"]').click();
  check("speak button triggers Android.speak", lastSpoken && lastSpoken.length > 0);
  let favBtn = firstCard.querySelector('[data-act="fav"]');
  favBtn.click();
  check("fav button toggles 'on' class", favBtn.classList.contains("on"));
  let knownBtn = firstCard.querySelector('[data-act="known"]');
  knownBtn.click();
  check("known button toggles 'known' class", knownBtn.classList.contains("known"));
  firstCard.click();
  check("card expands detail on click", firstCard.classList.contains("open"));

  // 6. xóa tìm kiếm -> quay lại gợi ý rỗng
  globalSearchInput.value = "";
  globalSearchInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  check("clearing global search shows empty-state hint again", doc.querySelectorAll("#cardList .card").length === 0);

  // quay lại tab Từ vựng, mở lại chủ đề để tiếp tục kiểm tra chiều tra cứu
  doc.querySelector('.tab[data-tab="words"]').click();
  doc.querySelector('.topic-tile[data-topic="transport"]').click();

  // 7. đổi chiều tra cứu
  doc.querySelector('.dir-btn[data-dir="rev"]').click();
  let primaryText = doc.querySelector("#cardList .card .primary").textContent;
  check("direction toggle re-renders primary field", primaryText.trim().length > 0);

  // 8. tab câu giao tiếp
  doc.querySelector('.tab[data-tab="sentences"]').click();
  check("sentences tab shows topic grid (3 quick + 13 cats)", doc.querySelectorAll(".topic-tile").length === 3 + 13);

  // 9. ôn tập flashcard (spaced repetition) - đúng luồng người dùng thực (không đổi dropdown mặc định)
  doc.querySelector('.tab[data-tab="review"]').click();
  check("review setup shows due/new card counts", doc.querySelector(".review-due-info").textContent.indexOf("thẻ cần ôn hôm nay") !== -1);
  let rvStart = doc.getElementById("rvStart");
  check("review setup renders start button", !!rvStart);
  rvStart.click();
  check("review starts and shows a flashcard", !!doc.getElementById("flashCard"));
  check("grade buttons hidden before revealing answer", doc.querySelectorAll(".grade-row").length === 0);
  doc.getElementById("flashCard").click();
  check("flashcard reveals on click", doc.getElementById("flashCard").classList.contains("show"));
  let gradeBtns = doc.querySelectorAll(".grade-btn");
  check("4 SM-2 grade buttons appear after reveal (Quên/Khó/Tốt/Dễ)", gradeBtns.length === 4);
  check("grade buttons show next-interval preview text", gradeBtns[2].querySelector("span").textContent.indexOf("ngày") !== -1);
  doc.querySelector('.grade-btn.grade-good').click(); // đây là chỗ từng bị crash do state.review.pool chưa được set
  check("review advances to card 2 after grading", doc.querySelector(".review-progress").textContent.indexOf("2 /") !== -1);

  // 9b. chế độ Trắc nghiệm (dùng chung lịch spaced repetition với thẻ ghi nhớ)
  window.onNativeBack(); // thoát phiên ôn tập dở dang -> quay lại màn hình cài đặt
  check("back exits in-progress review session to setup screen", !!doc.getElementById("rvStart"));
  doc.querySelector('.rv-mode-row [data-mode="quiz"]').click();
  check("quiz mode toggle activates", doc.querySelector('.rv-mode-row [data-mode="quiz"]').classList.contains("active"));
  doc.getElementById("rvStart").click();
  check("quiz mode shows 4 answer options", doc.querySelectorAll(".quiz-opt").length === 4);
  check("quiz next button hidden before answering", !doc.getElementById("quizNext"));
  doc.querySelector(".quiz-opt").click();
  check("quiz option shows correct/wrong feedback after picking", doc.querySelectorAll(".quiz-opt.correct, .quiz-opt.wrong").length >= 1);
  check("quiz shows next button after answering", !!doc.getElementById("quizNext"));
  doc.getElementById("quizNext").click();
  check("quiz advances to question 2 after tapping next", doc.querySelector(".review-progress").textContent.indexOf("2 /") !== -1);
  window.onNativeBack();
  doc.querySelector('.rv-mode-row [data-mode="flash"]').click(); // đưa về mặc định thẻ ghi nhớ

  // 9c. dashboard tiến trình học (streak, biểu đồ 7 ngày, tiến độ theo ngôn ngữ, sao lưu/khôi phục)
  doc.getElementById("streakBadge").click();
  check("dashboard opens via streak badge", doc.getElementById("dashBack").hidden === false);
  check("dashboard shows a streak count after reviewing today", /🔥 [1-9]/.test(doc.querySelector(".dash-streak").textContent));
  check("dashboard shows 7-day activity bar chart", doc.querySelectorAll(".dash-bar-col").length === 7);
  check("dashboard shows progress for all 4 languages", doc.querySelectorAll(".dash-lang-row").length === 4);

  doc.getElementById("dashExport").click();
  check("export button calls Android.exportData with a JSON payload", exportCalled === 1 && exportedJson && exportedJson.indexOf('"data"') !== -1);

  window.confirm = () => true; // giả lập người dùng đồng ý ghi đè khi khôi phục
  const backupPayload = JSON.stringify({app:"ngoai-ngu-bo-tui", version:1, exportedAt:"test", data:{fv_lang:"fr"}});
  window.onImportData(backupPayload);
  check("importing a backup applies its data (switches language)", window.localStorage.getItem("fv_lang") === "fr");
  check("hdrTitle reflects the language restored from backup", doc.getElementById("hdrTitle").textContent.indexOf("Tiếng Pháp") !== -1);

  doc.getElementById("dashClose").click();
  check("dashboard closes via close button", doc.getElementById("dashBack").hidden === true);

  doc.getElementById("streakBadge").click();
  window.onNativeBack();
  check("back button closes dashboard instead of exiting", doc.getElementById("dashBack").hidden === true && exitCalled === 0);

  // 10. bảng chọn ngôn ngữ
  doc.querySelector('.tab[data-tab="words"]').click();
  doc.getElementById("langBtn").click();
  check("lang modal opens", doc.getElementById("langModalBack").hidden === false);
  let allLangRows = doc.querySelectorAll(".lang-row");
  check("all 4 languages present in picker", allLangRows.length === 4);
  check("no language is locked anymore (all 4 packs ready)", Array.from(allLangRows).every(r => !r.classList.contains("locked")));

  let zhRow = doc.querySelector('.lang-row[data-lang="zh"]');
  zhRow.click();
  check("selecting Chinese closes the modal", doc.getElementById("langModalBack").hidden === true);
  check("hdrTitle switches to Chinese pack name", doc.getElementById("hdrTitle").textContent.indexOf("Tiếng Trung") !== -1);
  let zhTiles = doc.querySelectorAll(".topic-tile");
  check("switching to Chinese re-renders topic grid (18 tiles)", zhTiles.length === 3 + 15);
  // đưa chiều tra cứu về mặc định (bước 7 ở trên đã đổi sang "Việt -> Nga")
  doc.querySelector('.dir-btn[data-dir="fwd"]').click();
  doc.querySelector('.topic-tile[data-topic="greetings"]').click();
  let zhCard = doc.querySelector("#cardList .card");
  let zhPrimary = zhCard.querySelector(".primary").textContent;
  let zhPhon = zhCard.querySelector(".phon").textContent;
  check("Chinese word list shows Han characters as primary text", /[一-鿿]/.test(zhPrimary));
  check("Chinese card shows pinyin phonetic (latin letters), not Han", /[a-zA-ZüÜ]/.test(zhPhon) && !/[一-鿿]/.test(zhPhon));

  doc.getElementById("langBtn").click();
  let enRow = doc.querySelector('.lang-row[data-lang="en"]');
  enRow.click();
  check("switching back to English works", doc.getElementById("hdrTitle").textContent.indexOf("Tiếng Anh") !== -1);
  let enTiles = doc.querySelectorAll(".topic-tile");
  check("switching language re-renders topic grid (18 tiles)", enTiles.length === 3 + 15);
  let enWordCard = doc.querySelector('.topic-tile[data-topic="greetings"]');
  enWordCard.click();
  let enCardText = doc.querySelector("#cardList .card .primary").textContent;
  check("English word list shows English text, not Russian", !/[Ѐ-ӿ]/.test(enCardText));

  // 11. nút Back hệ thống: phải lùi từng lớp trong app, KHÔNG thoát app ngay
  //     (đây là lỗi thật: trước đây bấm Back ở bất kỳ đâu cũng thoát app luôn)
  // (đang ở: tab Từ vựng, đã chuyển sang tiếng Anh, đã mở chủ đề "greetings")
  window.onNativeBack();
  check("back from topic list returns to topic grid, not exit", doc.querySelectorAll(".topic-tile").length > 0 && exitCalled === 0);

  doc.getElementById("langBtn").click();
  check("re-opened language modal for back test", doc.getElementById("langModalBack").hidden === false);
  window.onNativeBack();
  check("back closes language modal instead of exiting", doc.getElementById("langModalBack").hidden === true && exitCalled === 0);

  doc.querySelector('.topic-tile[data-topic="hotel"]').click();
  check("drilled into 'hotel' topic", doc.querySelectorAll("#cardList .card").length > 0);
  window.onNativeBack();
  check("back from topic list (2nd time) returns to topic grid, not exit", doc.querySelectorAll(".topic-tile").length > 0 && exitCalled === 0);

  doc.querySelector('.tab[data-tab="sentences"]').click();
  window.onNativeBack();
  check("back from another tab returns to 'Từ vựng' tab, not exit", doc.querySelector('.tab[data-tab="words"]').classList.contains("active") && exitCalled === 0);

  window.onNativeBack();
  check("back at home screen (Từ vựng, topic grid, no search) finally exits", exitCalled === 1);

} catch (e) {
  console.log("EXCEPTION:", e.stack || e.message);
  fails++;
}

console.log("\n" + (fails === 0 ? "ALL CHECKS PASSED" : fails + " CHECK(S) FAILED"));
process.exit(fails === 0 ? 0 : 1);
