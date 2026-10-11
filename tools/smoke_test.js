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
let reminderState = {enabled:false, hour:20, minute:0};
window.Android = {
  speak: (t) => { lastSpoken = t; },
  speakSlow: (t) => { lastSpoken = t; },
  setLang: () => {},
  isLangAvailable: () => true,
  exitApp: () => { exitCalled++; },
  exportData: (json) => { exportCalled++; exportedJson = json; },
  importData: () => { importCalled++; },
  setReminder: (h, m) => { reminderState = {enabled:true, hour:h, minute:m}; },
  cancelReminder: () => { reminderState.enabled = false; },
  getReminderStatus: () => JSON.stringify(reminderState),
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
  // app chỉ tự tải gói của ngôn ngữ đang dùng (thẻ <script> động, jsdom không chạy); nạp sẵn cả 4 gói + meta
  for (const l of ["ru", "en", "fr", "zh"]) loadScript(`data/${l}/builder.js`);
  loadScript("data/meta.js");
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
  loadScript("js/tutor.js");
  loadScript("js/app.js");
  const doc = window.document;

  // 0. onboarding tự mở ở lần chạy đầu tiên (chưa có cờ fv_onboarded)
  check("onboarding modal auto-opens on first boot", doc.getElementById("onboardBack").hidden === false);
  check("onboarding shows first slide title", doc.querySelector(".onboard-title").textContent.indexOf("Chọn ngôn ngữ") !== -1);
  check("onboarding first dot is active", doc.querySelectorAll(".onboard-dot")[0].classList.contains("active"));
  doc.getElementById("obNext").click();
  doc.getElementById("obNext").click();
  check("onboarding advances through slides (dot 3 active)", doc.querySelectorAll(".onboard-dot")[2].classList.contains("active"));
  // bấm tới trang cuối (số trang onboarding có thể thay đổi khi thêm tính năng)
  for (let i = 0; i < 10 && doc.getElementById("obNext").textContent.indexOf("Bắt đầu học") === -1; i++) doc.getElementById("obNext").click();
  check(`onboarding has a slide for every main feature (${doc.querySelectorAll(".onboard-dot").length} slides)`, doc.querySelectorAll(".onboard-dot").length >= 5);
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
  globalSearchInput.value = "xin chao";
  globalSearchInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  check("search without Vietnamese diacritics still matches ('xin chao' -> 'Xin chào')", doc.querySelectorAll("#cardList .card").length >= 1);
  globalSearchInput.value = "привет";
  globalSearchInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  searchCards = doc.querySelectorAll("#cardList .card");

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
  const todayAct = JSON.parse(window.localStorage.getItem("fv_activity") || "{}");
  check("marking an item known while browsing counts as study activity (streak)", Object.values(todayAct).some(v => v >= 1));
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
  const wordCard = doc.querySelector("#cardList .card");
  wordCard.click();
  wordCard.querySelector('[data-act="speak-ex"]').click();
  const wordItem = window.LANG_PACKS.ru.words.find(w => w.id === parseInt(wordCard.getAttribute("data-id"), 10));
  check("example sentence has its own speak button", lastSpoken === wordItem.example_ru);
  wordCard.click();

  // 8. tab câu giao tiếp
  doc.querySelector('.tab[data-tab="sentences"]').click();
  check("sentences tab shows topic grid (3 quick + 13 cats)", doc.querySelectorAll(".topic-tile").length === 3 + 13);

  // 8b. tab Ghép câu từng bước
  doc.querySelector('.tab[data-tab="builder"]').click();
  check("builder tab lists 36 lessons", doc.querySelectorAll(".bd-tile").length === 36);
  check("builder lessons grouped into 3 levels", doc.querySelectorAll(".bd-level").length === 3);
  check("builder list suggests the next lesson to study", /Bài 1/.test(doc.getElementById("bdContinue").textContent));
  doc.getElementById("bdContinue").click();
  const L1 = window.LANG_PACKS.ru.builder[0];
  check("lesson view shows pivot word", doc.querySelector(".bd-pivot-t").textContent === L1.pivot.t);
  check("lesson view shows 3 branches of word -> phrase -> sentence", doc.querySelectorAll(".bd-branch").length === 3 && doc.querySelectorAll(".bd-branch .bd-node").length === 9);
  check("pivot is highlighted inside phrases/sentences", doc.querySelectorAll(".bd-branch .bd-t .hl").length >= 6);
  for (const [id, label] of [["bdFormula","sentence formula"],["bdPoints","usage rules"],["bdMistakes","common mistakes"],["bdCompare","comparison with Vietnamese"],["bdDialog","sample dialogue"],["bdMore","extra examples"],["bdTip","memory tip"]])
    check(`lesson has a '${label}' section`, !!doc.getElementById(id));
  check("formula highlights the pivot block", doc.querySelectorAll("#bdFormula .fb-P").length >= 1);
  check("each branch explains how it is built", doc.querySelectorAll(".bd-how").length === 3);
  check("lesson shows 6 extra examples", doc.querySelectorAll("#bdMore .bd-ex").length === 6);
  check("dialogue rendered as chat bubbles", doc.querySelectorAll("#bdDialog .bd-msg").length >= 3);
  doc.querySelectorAll(".bd-branch .bd-node")[2].click();
  check("tapping a node speaks it", lastSpoken === L1.branches[0].steps[2].t);
  doc.querySelector("#bdMore .bd-ex").click();
  check("tapping an extra example speaks it", lastSpoken === L1.more[0].t);
  doc.getElementById("bdPlay").click();
  check("'watch step by step' animation dims nodes then lights the first one", doc.querySelectorAll(".bd-node.dim").length === 8 && doc.querySelectorAll(".bd-node.lit").length === 1);
  doc.getElementById("bdPlay").click();
  check("animation can be stopped", doc.querySelectorAll(".bd-node.dim").length === 0);

  // luyện tập: trả lời theo dữ liệu thật; câu thứ 2 cố tình trả lời sai
  const allSentences = L1.branches.map(b => b.steps[2]).concat(L1.more || []);
  const findStep = vi => allSentences.find(x => x.vi === vi);
  function pickTokens(tokens){
    for (const t of tokens) {
      const tile = Array.from(doc.querySelectorAll("#bdBank .bd-word")).find(b => !b.disabled && b.textContent === t);
      tile.click();
    }
  }
  doc.getElementById("bdPractice").click();
  const totalItems = parseInt(doc.querySelector(".bd-practice .list-head-title").textContent.split("/")[1], 10);
  check(`practice mixes fill-the-pivot and arrange items (${totalItems} items)`, totalItems >= 6 && !!doc.querySelector(".bd-options"));
  let sawArrange = false, sawCombo = false, hintTested = false;
  for (let n = 0; n < totalItems; n++) {
    const wantWrong = n === 1;
    if (doc.querySelector(".bd-options")) {
      const stp = findStep(doc.querySelector(".bd-prompt-vi.small").textContent);
      const opt = Array.from(doc.querySelectorAll(".bd-opt")).find(o => (o.getAttribute("data-o") === stp.hl[0]) !== wantWrong);
      opt.click();
      if (wantWrong) check("wrong pivot choice is rejected and the full sentence shown", !!doc.querySelector(".bd-feedback.wrong") && !!doc.querySelector(".bd-correct"));
    } else {
      sawArrange = true;
      const stp = findStep(doc.querySelector(".bd-prompt-vi").textContent);
      check(`arrange item ${n+1} offers its tokens + 1 distractor tile`, doc.querySelectorAll("#bdBank .bd-word").length === stp.tokens.length + 1);
      if (wantWrong) {
        pickTokens(stp.tokens.slice().reverse());
        doc.getElementById("bdCheck").click();
        check("wrong order is rejected", !!doc.querySelector(".bd-feedback.wrong"));
        doc.getElementById("bdRetry").click();
      }
      if (!hintTested && !wantWrong) { hintTested = true; doc.getElementById("bdHint").click(); check("hint places the first correct tile", doc.querySelector("#bdAnswer .bd-word").textContent === stp.tokens[0]); doc.querySelector("#bdAnswer .bd-word").click(); }
      pickTokens(stp.tokens);
      doc.getElementById("bdCheck").click();
      check(`arrange item ${n+1} accepts the correct order`, !!doc.querySelector(".bd-feedback.ok"));
    }
    if (doc.querySelector(".bd-combo")) sawCombo = true;
    doc.getElementById("bdNext").click();
  }
  check("practice included sentence-arrange items", sawArrange);
  check("combo counter appears after consecutive first-try answers", sawCombo);
  check("finishing practice shows stars and score", !!doc.querySelector(".bd-done") && /\d+\/\d+/.test(doc.querySelector(".bd-score").textContent));
  check("finishing practice launches confetti", !!window.document.querySelector(".confetti"));
  const savedStars = JSON.parse(window.localStorage.getItem("fv_builder_ru") || "{}")["1"];
  check(`lesson stars saved per language (${savedStars && savedStars.stars}★)`, savedStars && savedStars.stars >= 1);
  doc.getElementById("bdBackLesson").click();
  window.onNativeBack();
  check("back from lesson returns to lesson list", doc.querySelectorAll(".bd-tile").length === 36);
  check("finished lesson shows its stars on the list", doc.querySelector('.bd-tile[data-lesson="1"]').classList.contains("done"));
  check("header shows lessons done count on builder tab", /\d+\/36 bài/.test(doc.getElementById("hdrStat").textContent));

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

  // 9a. gia sư 3D: jsdom không có WebGL -> app phải tự ẩn gia sư, không lỗi, không hiện nút bật/tắt
  check("tutor bar stays hidden when WebGL is unavailable", doc.getElementById("tutorBar").hidden === true);
  check("floating tutor also hidden when WebGL is unavailable", doc.getElementById("tutorFloat").hidden === true);
  window.onNativeBack();
  check("tutor toggle not offered when WebGL is unavailable", !doc.getElementById("tutorToggle"));

  // dựng nhân vật bằng three.js thật và chạy logic chuyển động (không cần WebGL để render)
  loadScript("vendor/three.min.js");
  const T = window.THREE;
  const tutorCh = window.Tutor._buildForTest(T);
  const tst = window.Tutor._state;
  let meshCount = 0;
  tutorCh.root.traverse(o => { if (o.isMesh) meshCount++; });
  check(`tutor character builds from three.js primitives (${meshCount} meshes)`, meshCount >= 20);
  const nowS = () => window.performance.now() / 1000;
  function runFrames(n){ for (let i = 0; i < n; i++) window.Tutor._update(0.016, nowS() + i*0.016); }
  runFrames(30);
  const closedMouth = tutorCh.inner.scale.y;
  window.Tutor.setTalking(true); window.Tutor.wordPulse();
  let maxOpen = 0;
  for (let i = 0; i < 60; i++){ window.Tutor._update(0.016, nowS() + i*0.016); maxOpen = Math.max(maxOpen, tutorCh.inner.scale.y); }
  check("tutor mouth opens while TTS is speaking", maxOpen > closedMouth + 0.2);
  window.Tutor.setTalking(false); runFrames(40);
  check("tutor mouth closes again after speaking", tutorCh.inner.scale.y < 0.2);
  window.Tutor.react("happy", 1500); runFrames(10);
  check("happy reaction squints eyes (smiling eyes)", tutorCh.eyes[0].scale.y <= 0.55 && tutorCh.smile.rotation.z === Math.PI);
  window.Tutor.react("sad", 1500); runFrames(10);
  check("sad reaction flips mouth into a frown", tutorCh.smile.rotation.z === 0);
  window.Tutor.react("celebrate", 2000);
  window.Tutor._update(0.016, tst.emotionStart + 0.4);
  check("celebrate reaction spins the character", tutorCh.root.rotation.y > 1);
  window.Tutor._update(0.016, tst.emotionUntil + 0.1);
  check("emotion returns to neutral after it expires", tst.emotion === "neutral");
  doc.getElementById("rvStart").click(); // mở lại 1 phiên ôn tập để bước 9b có phiên đang chạy mà thoát ra

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

  // 9d. chế độ Nghe - Gõ lại (dictation)
  doc.querySelector('.rv-mode-row [data-mode="dictation"]').click();
  check("dictation mode toggle activates", doc.querySelector('.rv-mode-row [data-mode="dictation"]').classList.contains("active"));
  doc.getElementById("rvStart").click();
  check("dictation mode shows input field", !!doc.getElementById("dictInput"));
  check("dictation auto-speaks the card on show", !!lastSpoken);

  let dictAnswer = lastSpoken; // renderDictationCard() tự phát âm it.ru ngay khi thẻ hiện ra
  doc.getElementById("dictInput").value = dictAnswer;
  doc.getElementById("dictSubmit").click();
  check("dictation shows exact-match feedback when typed text matches the audio", doc.querySelectorAll(".dict-feedback.dict-exact").length === 1);
  check("dictation reveals the correct answer after submitting", !!doc.querySelector(".dict-answer .ru"));
  doc.getElementById("dictNext").click();
  check("dictation advances to question 2 after tapping next", doc.querySelector(".review-progress").textContent.indexOf("2 /") !== -1);

  doc.getElementById("dictInput").value = "zzz_definitely_wrong_zzz";
  doc.getElementById("dictSubmit").click();
  check("dictation shows wrong feedback for an unrelated answer", doc.querySelectorAll(".dict-feedback.dict-wrong").length === 1);
  doc.getElementById("dictNext").click();

  window.onNativeBack();
  doc.querySelector('.rv-mode-row [data-mode="flash"]').click(); // đưa về mặc định thẻ ghi nhớ

  const hardOpt = doc.querySelector('#rvCat option[value="__hard"]');
  check("cards answered wrong appear in a '⚠️ Thẻ hay quên' review group", !!hardOpt);
  const rvCat = doc.getElementById("rvCat");
  rvCat.value = "__hard"; rvCat.dispatchEvent(new window.Event("change", {bubbles:true}));
  doc.getElementById("rvStart").click();
  check("reviewing the hard-cards group starts a session", !!doc.getElementById("flashCard"));
  window.onNativeBack();
  doc.getElementById("rvCat").value = "all"; doc.getElementById("rvCat").dispatchEvent(new window.Event("change", {bubbles:true}));

  // 9c. dashboard tiến trình học (streak, biểu đồ 7 ngày, tiến độ theo ngôn ngữ, sao lưu/khôi phục)
  doc.getElementById("streakBadge").click();
  check("dashboard opens via streak badge", doc.getElementById("dashBack").hidden === false);
  check("dashboard shows a streak count after reviewing today", /🔥 [1-9]/.test(doc.querySelector(".dash-streak").textContent));
  check("dashboard shows 7-day activity bar chart", doc.querySelectorAll(".dash-bar-col").length === 7);
  check("dashboard shows progress for all 4 languages", doc.querySelectorAll(".dash-lang-row").length === 4);

  check("dashboard shows all 9 defined achievement badges", doc.querySelectorAll(".badge-chip").length === 9);
  let badgeTitle = Array.from(doc.querySelectorAll(".dash-section-title")).find(el => el.textContent.indexOf("Thành tích") !== -1);
  check("badge section title shows earned count out of 9", !!badgeTitle && /\(\d+\/9\)/.test(badgeTitle.textContent));

  check("reminder toggle reflects initial disabled state", !doc.getElementById("reminderToggle").checked);
  check("reminder time input starts disabled", doc.getElementById("reminderTime").disabled);
  doc.getElementById("reminderToggle").checked = true;
  doc.getElementById("reminderToggle").dispatchEvent(new window.Event("change", {bubbles:true}));
  check("enabling reminder toggle calls Android.setReminder", reminderState.enabled === true);
  check("reminder time input becomes enabled after turning on", !doc.getElementById("reminderTime").disabled);

  doc.getElementById("reminderTime").value = "07:30";
  doc.getElementById("reminderTime").dispatchEvent(new window.Event("change", {bubbles:true}));
  check("changing reminder time calls Android.setReminder with new time", reminderState.hour === 7 && reminderState.minute === 30);

  doc.getElementById("reminderToggle").checked = false;
  doc.getElementById("reminderToggle").dispatchEvent(new window.Event("change", {bubbles:true}));
  check("disabling reminder toggle calls Android.cancelReminder", reminderState.enabled === false);
  doc.querySelector('#setTheme [data-v="dark"]').click();
  check("dark theme setting applies data-theme=dark", window.document.documentElement.getAttribute("data-theme") === "dark");
  doc.querySelector('#setTheme [data-v="light"]').click();
  check("light theme setting applies data-theme=light", window.document.documentElement.getAttribute("data-theme") === "light");
  doc.querySelector('#setZoom [data-v="115"]').click();
  check("text size setting is saved", window.localStorage.getItem("fv_text_zoom") === "115");

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
  doc.querySelector('.tab[data-tab="review"]').click();
  doc.querySelector('.rv-mode-row [data-mode="dictation"]').click();
  doc.getElementById("rvStart").click();
  const zhItem = window.LANG_PACKS.zh.words.find(w => w.ru === lastSpoken);
  const plainPinyin = zhItem.phonetic.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  doc.getElementById("dictInput").value = plainPinyin;
  doc.getElementById("dictSubmit").click();
  check(`Chinese dictation accepts toneless pinyin ('${plainPinyin}' for ${zhItem.ru})`, !!doc.querySelector(".dict-feedback.dict-exact"));
  window.onNativeBack();
  doc.querySelector('.rv-mode-row [data-mode="flash"]').click();
  doc.querySelector('.tab[data-tab="words"]').click();

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
