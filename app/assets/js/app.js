(function(){
"use strict";

/* ---------- languages (kiến trúc mở rộng: Nga sẵn sàng, các thứ tiếng khác thêm sau) ---------- */
var LANGS = [
  {code:"ru", flag:"🇷🇺", name:"Tiếng Nga",  ttsHint:"ru-RU", ready:true},
  {code:"en", flag:"🇬🇧", name:"Tiếng Anh",  ttsHint:"en-US", ready:true},
  {code:"fr", flag:"🇫🇷", name:"Tiếng Pháp", ttsHint:"fr-FR", ready:true},
  {code:"zh", flag:"🇨🇳", name:"Tiếng Trung", ttsHint:"zh-CN", ready:true}
];
function langInfo(code){ for(var i=0;i<LANGS.length;i++) if(LANGS[i].code===code) return LANGS[i]; return LANGS[0]; }

var WORD_CATS = {
  greetings:{icon:"👋", name:"Chào hỏi"}, numbers_time:{icon:"🔢", name:"Số & Thời gian"},
  verbs:{icon:"⚡", name:"Động từ"}, family_people:{icon:"👪", name:"Gia đình & Con người"},
  food_drink:{icon:"🍽️", name:"Đồ ăn & Thức uống"}, everyday_objects_tech:{icon:"📱", name:"Đồ vật & Công nghệ"},
  transport:{icon:"🚗", name:"Giao thông"}, hotel:{icon:"🏨", name:"Khách sạn"},
  city_directions:{icon:"🧭", name:"Thành phố & Chỉ đường"}, shopping_money:{icon:"🛍️", name:"Mua sắm & Tiền bạc"},
  airport_customs:{icon:"✈️", name:"Sân bay & Hải quan"}, health:{icon:"🏥", name:"Sức khỏe & Y tế"},
  weather_nature:{icon:"⛅", name:"Thời tiết & Tự nhiên"}, work_business:{icon:"💼", name:"Công việc & Kinh doanh"},
  emotions_adjectives:{icon:"😊", name:"Cảm xúc & Tính từ"}
};
var SENT_CATS = {
  greetings:{icon:"👋", name:"Chào hỏi"}, small_talk:{icon:"💬", name:"Xã giao"},
  farewell_thanks:{icon:"🙏", name:"Cảm ơn / Tạm biệt"}, airport:{icon:"✈️", name:"Sân bay"},
  telecom:{icon:"📶", name:"Điện thoại / Internet"}, bank_money:{icon:"🏦", name:"Ngân hàng"},
  hotel:{icon:"🏨", name:"Khách sạn"}, restaurant:{icon:"🍜", name:"Nhà hàng"},
  shopping:{icon:"🛍️", name:"Mua sắm"}, directions_transport:{icon:"🧭", name:"Đường đi / Di chuyển"},
  emergency_medical:{icon:"🚑", name:"Khẩn cấp / Y tế"}, business:{icon:"💼", name:"Công việc"},
  idioms_slang:{icon:"🎭", name:"Thành ngữ & Tiếng lóng"}
};
var POS_MAP = {n:"DT", v:"ĐT", adj:"TT", adv:"TRT", pron:"ĐgT", prep:"GT", conj:"LT", num:"ST", interj:"TH", phrase:"CỤM"};

var ONBOARD_SLIDES = [
  {icon:"🌐", title:"Chọn ngôn ngữ & chiều tra cứu",
   desc:"Bấm vào lá cờ ở góc trên bên trái để đổi ngôn ngữ (Nga/Anh/Pháp/Trung). Mỗi ngôn ngữ có 2 chiều tra cứu — đổi bằng nút gạt trong thanh công cụ."},
  {icon:"🗂️", title:"Duyệt theo chủ đề",
   desc:"Tab Từ vựng và Câu giao tiếp chia theo chủ đề thực tế. Bấm 🔊 để nghe phát âm, ★ để đánh dấu yêu thích, ✓ khi đã thuộc — bấm vào thẻ để xem cách dùng và ví dụ."},
  {icon:"🔎", title:"Tìm kiếm toàn cục",
   desc:"Tab Tìm kiếm tra cứu xuyên suốt từ vựng, câu giao tiếp và thành ngữ cùng lúc. Tích chọn phạm vi muốn tìm — app sẽ nhớ lựa chọn này cho lần sau."},
  {icon:"🔁", title:"Ôn tập theo lịch lặp thông minh",
   desc:"Tab Ôn tập dùng lịch lặp ngắt quãng (spaced repetition): thẻ bạn nhớ tốt sẽ giãn ra vài ngày/tuần mới ôn lại, thẻ hay quên sẽ quay lại sớm hơn — hiệu quả hơn nhiều so với ôn ngẫu nhiên."}
];

/* ---------- storage (namespaced theo ngôn ngữ) ---------- */
function loadSet(key){
  try{ var raw = localStorage.getItem(key); if(!raw) return {}; var arr = JSON.parse(raw);
    var o = {}; for(var i=0;i<arr.length;i++) o[arr[i]] = true; return o; }catch(e){ return {}; }
}
function saveSet(key, obj){
  try{ var arr = Object.keys(obj).map(function(k){return parseInt(k,10);}); localStorage.setItem(key, JSON.stringify(arr)); }catch(e){}
}
function getLang(){ try{ return localStorage.getItem("fv_lang") || "ru"; }catch(e){ return "ru"; } }
function setLangStore(code){ try{ localStorage.setItem("fv_lang", code); }catch(e){} }
function getDir(){ try{ return localStorage.getItem("fv_dir") || "fwd"; }catch(e){ return "fwd"; } }
function setDirStore(d){ try{ localStorage.setItem("fv_dir", d); }catch(e){} }
function getSearchScope(){
  try{
    var raw = localStorage.getItem("fv_search_scope");
    if(!raw) return {words:true, sentences:true, idioms:true};
    var o = JSON.parse(raw);
    return {words: o.words!==false, sentences: o.sentences!==false, idioms: o.idioms!==false};
  }catch(e){ return {words:true, sentences:true, idioms:true}; }
}
function saveSearchScope(scope){ try{ localStorage.setItem("fv_search_scope", JSON.stringify(scope)); }catch(e){} }
function isOnboarded(){ try{ return localStorage.getItem("fv_onboarded") === "1"; }catch(e){ return true; } }
function setOnboarded(){ try{ localStorage.setItem("fv_onboarded", "1"); }catch(e){} }

var known = {}, fav = {}, srs = {};
function known_key(type, lang){ return "fv_known_"+type+"_"+lang; }
function fav_key(type, lang){ return "fv_fav_"+type+"_"+lang; }
function srs_key(type, lang){ return "fv_srs_"+type+"_"+lang; }
function loadSrsSet(key){
  try{ var raw = localStorage.getItem(key); if(!raw) return {}; return JSON.parse(raw); }catch(e){ return {}; }
}
function saveSrsSet(key, obj){ try{ localStorage.setItem(key, JSON.stringify(obj)); }catch(e){} }
function loadUserData(lang){
  known = { words: loadSet(known_key("words", lang)), sentences: loadSet(known_key("sentences", lang)) };
  fav   = { words: loadSet(fav_key("words", lang)),   sentences: loadSet(fav_key("sentences", lang)) };
  srs   = { words: loadSrsSet(srs_key("words", lang)), sentences: loadSrsSet(srs_key("sentences", lang)) };
}
function persistKnown(type){ saveSet(known_key(type, state.lang), known[type]); }
function persistFav(type){ saveSet(fav_key(type, state.lang), fav[type]); }
function persistSrs(type){ saveSrsSet(srs_key(type, state.lang), srs[type]); }

/* ---------- spaced repetition (SM-2 rút gọn) ---------- */
// quality: 1 = Quên, 3 = Khó, 4 = Tốt, 5 = Dễ
function sm2(rec, quality){
  if(quality < 3){
    rec.reps = 0;
    rec.interval = 1;
  } else {
    if(rec.reps === 0) rec.interval = 1;
    else if(rec.reps === 1) rec.interval = 6;
    else rec.interval = Math.round(rec.interval * rec.ease);
    rec.reps += 1;
  }
  rec.ease = Math.max(1.3, rec.ease + (0.1 - (5-quality)*(0.08+(5-quality)*0.02)));
  rec.due = Date.now() + rec.interval*24*60*60*1000;
  return rec;
}
function newSrsRecord(){ return {ease:2.5, interval:0, reps:0, due:0}; }
function previewInterval(rec, quality){
  var copy = {ease:rec.ease, interval:rec.interval, reps:rec.reps, due:rec.due};
  sm2(copy, quality);
  return copy.interval;
}
function fmtDays(d){
  if(d <= 1) return "1 ngày";
  if(d < 30) return d + " ngày";
  if(d < 365) return Math.round(d/30) + " tháng";
  return Math.round(d/365) + " năm";
}
function reviewCounts(pool, topic){
  var items = filteredItems(pool, topic, "all");
  var srsPool = srs[pool];
  var now = Date.now();
  var due = 0, fresh = 0;
  items.forEach(function(it){
    var rec = srsPool[it.id];
    if(!rec) fresh++;
    else if(rec.due <= now) due++;
  });
  return {due:due, fresh:fresh, total:items.length};
}
function buildReviewQueue(pool, topic, count){
  var items = filteredItems(pool, topic, "all");
  var srsPool = srs[pool];
  var now = Date.now();
  var overdue = [], fresh = [], later = [];
  items.forEach(function(it){
    var rec = srsPool[it.id];
    if(!rec) fresh.push(it);
    else if(rec.due <= now) overdue.push({it:it, due:rec.due});
    else later.push({it:it, due:rec.due});
  });
  overdue.sort(function(a,b){ return a.due - b.due; });
  later.sort(function(a,b){ return a.due - b.due; });
  var queue = overdue.map(function(x){return x.it;}).concat(shuffle(fresh));
  if(queue.length < count){
    queue = queue.concat(later.map(function(x){return x.it;}));
  }
  return queue.slice(0, count);
}

/* ---------- helpers ---------- */
function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function shuffle(a){
  var arr = a.slice();
  for(var i=arr.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=arr[i]; arr[i]=arr[j]; arr[j]=t; }
  return arr;
}
function cmp(a, b, locale){
  try{ return String(a||"").localeCompare(String(b||""), locale); }
  catch(e){ return String(a||"") < String(b||"") ? -1 : 1; }
}
function speak(text){ try{ if(window.Android && Android.speak) Android.speak(text); }catch(e){} }
function speakSlow(text){ try{ if(window.Android && Android.speakSlow) Android.speakSlow(text); }catch(e){} }
function setNativeLang(code){ try{ if(window.Android && Android.setLang) Android.setLang(code); }catch(e){} }
function showToast(msg){
  var t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg; t.classList.add("show");
  clearTimeout(showToast._h);
  showToast._h = setTimeout(function(){ t.classList.remove("show"); }, 1700);
}

/* ---------- state ---------- */
var state = {
  lang: getLang(),
  dir: getDir(),           // fwd = tiếng đích -> Việt, rev = Việt -> tiếng đích
  tab: "words",             // words | sentences | review
  view: "topics",           // topics | list
  topic: "all",              // all | <category slug>
  status: "all",             // all | fav | unknown
  globalSearch: "",          // ô tìm kiếm toàn cục (tab "search")
  searchScope: getSearchScope(), // {words, sentences, idioms} - phạm vi tìm kiếm, nhớ trạng thái qua localStorage
  renderedCount: 0,
  batch: 40,
  onboardStep: 0,
  review: { pool:null, topic:"all", count:20, dir:null, queue:[], idx:0, revealed:false, gained:0 }
};
loadUserData(state.lang);

/* ---------- data access ---------- */
function packFor(lang){ return (window.LANG_PACKS && window.LANG_PACKS[lang]) || {words:[], sentences:[]}; }
function dataFor(type){ return packFor(state.lang)[type] || []; }
function catsFor(type){ return type==="words" ? WORD_CATS : SENT_CATS; }

function catCounts(type){
  var data = dataFor(type), cats = catsFor(type);
  var counts = {}; for(var k in cats) counts[k] = 0;
  for(var i=0;i<data.length;i++){ var c = data[i].category; if(counts[c]==null) counts[c]=0; counts[c]++; }
  return counts;
}

function matchesStatus(type, it, status){
  if(status === "fav") return !!fav[type][it.id];
  if(status === "unknown") return !known[type][it.id];
  return true;
}

function filteredItems(type, topic, status){
  var data = dataFor(type);
  var out = data.filter(function(it){
    if(topic !== "all" && it.category !== topic) return false;
    if(!matchesStatus(type, it, status)) return false;
    return true;
  });
  var locale = state.dir === "fwd" ? (langInfo(state.lang).code) : "vi";
  var field = state.dir === "fwd" ? "ru" : "meaning";
  out.sort(function(a,b){ return cmp(a[field], b[field], locale); });
  return out;
}

function matchesSearch(it, q){
  var hay = (it.ru + " " + (it.phonetic||"") + " " + (it.meaning||"")).toLowerCase();
  return hay.indexOf(q) !== -1;
}

/* tìm kiếm toàn cục: gộp từ vựng + câu giao tiếp + thành ngữ theo phạm vi đã chọn */
function searchResults(){
  var q = state.globalSearch.trim().toLowerCase();
  if(!q) return [];
  var scope = state.searchScope;
  var out = [];
  if(scope.words){
    dataFor("words").forEach(function(it){
      if(matchesSearch(it, q)) out.push({type:"words", item:it});
    });
  }
  var sentData = dataFor("sentences");
  if(scope.sentences){
    sentData.forEach(function(it){
      if(it.category !== "idioms_slang" && matchesSearch(it, q)) out.push({type:"sentences", item:it});
    });
  }
  if(scope.idioms){
    sentData.forEach(function(it){
      if(it.category === "idioms_slang" && matchesSearch(it, q)) out.push({type:"sentences", item:it});
    });
  }
  var locale = state.dir === "fwd" ? (langInfo(state.lang).code) : "vi";
  var field = state.dir === "fwd" ? "ru" : "meaning";
  out.sort(function(a,b){ return cmp(a.item[field], b.item[field], locale); });
  return out;
}

/* ---------- shell ---------- */
var app = document.getElementById("app");

function buildShell(){
  app.innerHTML =
    '<div class="hdr">'+
      '<div class="hdr-top">'+
        '<button class="lang-btn" id="langBtn"></button>'+
        '<div class="hdr-mid"><div class="hdr-title" id="hdrTitle"></div>'+
          '<div class="hdr-sub" id="hdrSub"></div></div>'+
        '<div class="hdr-stat" id="hdrStat"></div>'+
        '<button class="help-btn" id="helpBtn" title="Hướng dẫn dùng app">❓</button>'+
      '</div>'+
      '<div class="tabs" id="tabs">'+
        '<div class="tab" data-tab="words">Từ vựng</div>'+
        '<div class="tab" data-tab="sentences">Câu giao tiếp</div>'+
        '<div class="tab" data-tab="search">Tìm kiếm</div>'+
        '<div class="tab" data-tab="review">Ôn tập</div>'+
      '</div>'+
    '</div>'+
    '<div class="toolbar" id="toolbar"></div>'+
    '<div class="main" id="main"></div>'+
    '<div class="review-wrap" id="reviewWrap" style="display:none;"></div>'+
    '<div class="toast" id="toast"></div>'+
    '<div class="modal-back" id="langModalBack" hidden>'+
      '<div class="lang-sheet" id="langSheet"></div>'+
    '</div>'+
    '<div class="modal-back" id="onboardBack" hidden>'+
      '<div class="onboard-sheet" id="onboardSheet"></div>'+
    '</div>';

  document.getElementById("tabs").addEventListener("click", function(e){
    var t = e.target.closest(".tab"); if(!t) return;
    setTab(t.getAttribute("data-tab"));
  });
  document.getElementById("main").addEventListener("click", onMainClick);
  document.getElementById("main").addEventListener("scroll", onListScroll);
  document.getElementById("langBtn").addEventListener("click", openLangModal);
  document.getElementById("langModalBack").addEventListener("click", function(e){
    if(e.target.id === "langModalBack") closeLangModal();
  });
  document.getElementById("helpBtn").addEventListener("click", openOnboard);
  document.getElementById("onboardBack").addEventListener("click", function(e){
    if(e.target.id === "onboardBack") closeOnboard();
  });
}

function refreshHeaderChrome(){
  var li = langInfo(state.lang);
  document.getElementById("langBtn").textContent = li.flag;
  document.getElementById("hdrTitle").textContent = li.flag + " " + li.name + " Bỏ Túi";
  document.getElementById("hdrSub").textContent = dataFor("words").length + " từ vựng & " + dataFor("sentences").length + " câu giao tiếp";
}

function openLangModal(){
  var sheet = document.getElementById("langSheet");
  var html = '<div class="lang-sheet-title">Chọn ngôn ngữ</div>';
  LANGS.forEach(function(l){
    html += '<div class="lang-row'+(l.code===state.lang?" active":"")+(l.ready?"":" locked")+'" data-lang="'+l.code+'" data-ready="'+(l.ready?"1":"0")+'">'+
      '<span class="lang-flag">'+l.flag+'</span><span class="lang-name">'+esc(l.name)+'</span>'+
      (l.ready ? (l.code===state.lang ? '<span class="lang-check">✓</span>' : '') : '<span class="lang-soon">Sắp ra mắt</span>')+
    '</div>';
  });
  sheet.innerHTML = html;
  sheet.querySelectorAll(".lang-row").forEach(function(row){
    row.addEventListener("click", function(){
      var ready = row.getAttribute("data-ready") === "1";
      var code = row.getAttribute("data-lang");
      if(!ready){ showToast("🔜 " + langInfo(code).name + " sẽ được bổ sung trong bản cập nhật sau"); return; }
      selectLang(code);
      closeLangModal();
    });
  });
  document.getElementById("langModalBack").hidden = false;
}
function closeLangModal(){ document.getElementById("langModalBack").hidden = true; }

/* ---------- onboarding (hướng dẫn dùng app) ---------- */
function openOnboard(){
  state.onboardStep = 0;
  renderOnboardStep();
  document.getElementById("onboardBack").hidden = false;
}
function closeOnboard(){
  document.getElementById("onboardBack").hidden = true;
  setOnboarded();
}
function renderOnboardStep(){
  var sheet = document.getElementById("onboardSheet");
  var i = state.onboardStep;
  var slide = ONBOARD_SLIDES[i];
  var isLast = i === ONBOARD_SLIDES.length - 1;
  var dots = ONBOARD_SLIDES.map(function(_, idx){
    return '<span class="onboard-dot'+(idx===i?" active":"")+'"></span>';
  }).join("");

  sheet.innerHTML =
    '<div class="onboard-icon">'+slide.icon+'</div>'+
    '<div class="onboard-title">'+esc(slide.title)+'</div>'+
    '<div class="onboard-desc">'+esc(slide.desc)+'</div>'+
    '<div class="onboard-dots">'+dots+'</div>'+
    '<div class="onboard-actions">'+
      (i > 0 ? '<button class="onboard-btn ghost" id="obPrev">‹ Trước</button>' : '<button class="onboard-btn ghost" id="obSkip">Bỏ qua</button>')+
      '<button class="onboard-btn primary" id="obNext">'+(isLast ? "Bắt đầu học! 🚀" : "Tiếp theo ›")+'</button>'+
    '</div>';

  var prevBtn = document.getElementById("obPrev");
  if(prevBtn) prevBtn.addEventListener("click", function(){ state.onboardStep--; renderOnboardStep(); });
  var skipBtn = document.getElementById("obSkip");
  if(skipBtn) skipBtn.addEventListener("click", closeOnboard);
  document.getElementById("obNext").addEventListener("click", function(){
    if(isLast){ closeOnboard(); return; }
    state.onboardStep++; renderOnboardStep();
  });
}

function selectLang(code){
  if(code === state.lang) return;
  state.lang = code; setLangStore(code);
  loadUserData(code);
  setNativeLang(code);
  refreshHeaderChrome();
  setTab(state.tab);
}

function setTab(tab){
  state.tab = tab; state.view = "topics"; state.topic = "all"; state.status = "all";
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function(el){
    el.classList.toggle("active", el.getAttribute("data-tab") === tab);
  });
  var mainEl = document.getElementById("main");
  var toolbar = document.getElementById("toolbar");
  var reviewWrap = document.getElementById("reviewWrap");
  if(tab === "review"){
    mainEl.style.display = "none"; toolbar.style.display = "none"; reviewWrap.style.display = "flex";
    renderReviewSetup();
  } else {
    mainEl.style.display = "block"; toolbar.style.display = "block"; reviewWrap.style.display = "none";
    renderToolbar(); renderMain();
  }
  updateHdrStat();
}

function updateHdrStat(){
  var el = document.getElementById("hdrStat");
  if(state.tab === "review" || state.tab === "search"){ el.textContent = ""; return; }
  var type = state.tab;
  var total = dataFor(type).length;
  var k = Object.keys(known[type]).length;
  el.textContent = k + "/" + total + " đã thuộc";
}

/* ---------- toolbar (direction toggle cho Từ vựng/Câu giao tiếp, hoặc ô tìm kiếm toàn cục) ---------- */
function renderToolbar(){
  if(state.tab === "search"){ renderSearchToolbar(); return; }
  var li = langInfo(state.lang);
  var toolbar = document.getElementById("toolbar");
  toolbar.innerHTML =
    '<div class="dir-row">'+
      '<div class="dir-btn'+(state.dir==="fwd"?" active":"")+'" data-dir="fwd">'+esc(li.name)+' → Việt</div>'+
      '<div class="dir-btn'+(state.dir==="rev"?" active":"")+'" data-dir="rev">Việt → '+esc(li.name)+'</div>'+
    '</div>';

  toolbar.querySelector(".dir-row").addEventListener("click", function(e){
    var b = e.target.closest(".dir-btn"); if(!b) return;
    state.dir = b.getAttribute("data-dir"); setDirStore(state.dir);
    renderToolbar(); renderMain();
  });
}

function renderSearchToolbar(){
  var toolbar = document.getElementById("toolbar");
  var scope = state.searchScope;
  toolbar.innerHTML =
    '<div class="search-row">'+
      '<div class="search"><span>🔎</span><input id="globalSearchInput" type="text" placeholder="Tìm từ vựng, câu giao tiếp, thành ngữ..." value="'+esc(state.globalSearch)+'"></div>'+
    '</div>'+
    '<div class="chips" id="searchScopeChips">'+
      '<div class="chip scope-chip'+(scope.words?" active":"")+'" data-scope="words">'+(scope.words?"☑":"☐")+' Từ vựng</div>'+
      '<div class="chip scope-chip'+(scope.sentences?" active":"")+'" data-scope="sentences">'+(scope.sentences?"☑":"☐")+' Câu giao tiếp</div>'+
      '<div class="chip scope-chip'+(scope.idioms?" active":"")+'" data-scope="idioms">'+(scope.idioms?"☑":"☐")+' Thành ngữ & Tiếng lóng</div>'+
    '</div>';

  document.getElementById("globalSearchInput").addEventListener("input", function(e){
    state.globalSearch = e.target.value; renderSearchMain();
  });
  document.getElementById("searchScopeChips").addEventListener("click", function(e){
    var c = e.target.closest(".scope-chip"); if(!c) return;
    var key = c.getAttribute("data-scope");
    state.searchScope[key] = !state.searchScope[key];
    saveSearchScope(state.searchScope);
    renderSearchToolbar();
    renderSearchMain();
  });
}

/* ---------- main area: topic grid, card list, hoặc kết quả tìm kiếm toàn cục ---------- */
function renderMain(){
  if(state.tab === "search"){ renderSearchMain(); return; }
  if(state.view === "list"){ renderListView(); }
  else { renderTopicGrid(); }
}

function renderSearchMain(){
  var main = document.getElementById("main");
  var q = state.globalSearch.trim();
  if(!q){
    main.innerHTML = '<div class="empty">🔎 Nhập từ khoá để tìm kiếm xuyên suốt từ vựng, câu giao tiếp và thành ngữ...</div>';
    return;
  }
  main.innerHTML = '<div class="list" id="cardList"></div>';
  currentFiltered = searchResults();
  state.renderedCount = 0;
  var list = document.getElementById("cardList");
  if(currentFiltered.length === 0){
    list.innerHTML = '<div class="empty">Không tìm thấy kết quả nào 🤔</div>';
    return;
  }
  appendBatch();
}

function renderTopicGrid(){
  var main = document.getElementById("main");
  var type = state.tab;
  var cats = catsFor(type);
  var counts = catCounts(type);
  var favCount = Object.keys(fav[type]).length;
  var unkCount = dataFor(type).length - Object.keys(known[type]).length;

  var html = '<div class="topic-grid">';
  html += topicTileHtml("all", "🔀", "Tất cả (tra cứu A-Z)", dataFor(type).length, "quick");
  html += topicTileHtml("fav-status", "★", "Yêu thích", favCount, "quick");
  html += topicTileHtml("unknown-status", "○", "Chưa thuộc", unkCount, "quick");
  for(var k in cats){
    html += topicTileHtml(k, cats[k].icon, cats[k].name, counts[k]||0, "");
  }
  html += '</div>';
  main.innerHTML = html;
}
function topicTileHtml(key, icon, name, count, extraClass){
  return '<div class="topic-tile '+extraClass+'" data-topic="'+key+'">'+
    '<div class="topic-icon">'+icon+'</div>'+
    '<div class="topic-name">'+esc(name)+'</div>'+
    '<div class="topic-count">'+count+'</div>'+
  '</div>';
}

function renderListView(){
  var main = document.getElementById("main");
  var type = state.tab;
  var backLabel = listHeadLabel(type);

  var html = '<div class="list-head">';
  html += '<button class="back-btn" id="backToTopics">‹ Chủ đề</button>';
  html += '<div class="list-head-title">'+esc(backLabel)+'</div>';
  html += '</div>';
  html += '<div class="chips" id="statusChips">'+
    '<div class="chip'+(state.status==="all"?" active":"")+'" data-status="all">Tất cả</div>'+
    '<div class="chip'+(state.status==="fav"?" active":"")+'" data-status="fav">★ Yêu thích</div>'+
    '<div class="chip'+(state.status==="unknown"?" active":"")+'" data-status="unknown">○ Chưa thuộc</div>'+
  '</div>';
  html += '<div class="list" id="cardList"></div>';
  main.innerHTML = html;

  document.getElementById("backToTopics").addEventListener("click", function(){
    state.view = "topics"; renderMain();
  });
  document.getElementById("statusChips").addEventListener("click", function(e){
    var c = e.target.closest(".chip"); if(!c) return;
    state.status = c.getAttribute("data-status"); renderListView();
  });
  state.view = "list";
  resetAndRenderCards();
}

function topicLabel(type, topic){
  if(topic === "all") return "Tất cả (A-Z)";
  var cats = catsFor(type);
  return cats[topic] ? (cats[topic].icon + " " + cats[topic].name) : topic;
}
function listHeadLabel(type){
  var base = topicLabel(type, state.topic);
  var statusLabel = state.status === "fav" ? "★ Yêu thích" : state.status === "unknown" ? "○ Chưa thuộc" : "";
  if(!statusLabel) return base;
  if(state.topic === "all") return statusLabel;
  return base + " · " + statusLabel;
}

/* ---------- card list rendering (batched) ---------- */
var currentFiltered = [];

function resetAndRenderCards(){
  var items = filteredItems(state.tab, state.topic, state.status);
  currentFiltered = items.map(function(it){ return {type: state.tab, item: it}; });
  state.renderedCount = 0;
  var list = document.getElementById("cardList");
  if(!list) return;
  list.innerHTML = "";
  if(currentFiltered.length === 0){
    list.innerHTML = '<div class="empty">Không tìm thấy kết quả nào 🤔</div>';
    return;
  }
  appendBatch();
}

function appendBatch(){
  var list = document.getElementById("cardList");
  if(!list) return;
  var showTag = state.tab === "search";
  var start = state.renderedCount;
  var end = Math.min(currentFiltered.length, start + state.batch);
  var html = "";
  for(var i=start;i<end;i++){ html += cardHtml(currentFiltered[i].type, currentFiltered[i].item, showTag); }
  list.insertAdjacentHTML("beforeend", html);
  state.renderedCount = end;
}

function onListScroll(e){
  if(state.tab === "review") return;
  if(state.tab !== "search" && state.view !== "list") return;
  var main = e.target;
  if(main.scrollTop + main.clientHeight > main.scrollHeight - 300){
    if(state.renderedCount < currentFiltered.length) appendBatch();
  }
}

function cardHtml(type, it, showTag){
  var isFav = !!fav[type][it.id];
  var isKnown = !!known[type][it.id];
  var posBadge = (type==="words" && it.pos) ? ' <span class="pos">'+esc(POS_MAP[it.pos]||it.pos)+'</span>' : "";
  var fwd = state.dir === "fwd";
  var primary = fwd ? esc(it.ru)+posBadge : esc(it.meaning);
  var secondary = fwd ? esc(it.meaning) : esc(it.ru)+posBadge;
  var phonLine = '<div class="phon">['+esc(it.phonetic||"")+']</div>';
  var detail = type==="words"
    ? '<div class="lbl">Cách dùng</div><div>'+esc(it.usage||"")+'</div>'+
      '<div class="lbl">Ví dụ</div><div class="ex-ru">'+esc(it.example_ru||"")+'</div><div class="ex-vi">'+esc(it.example_vi||"")+'</div>'
    : '<div class="lbl">Ghi chú</div><div>'+esc(it.note||"")+'</div>';
  var tagLine = "";
  if(showTag){
    var cats = catsFor(type);
    var cat = cats[it.category];
    var typeLabel = type === "words" ? "📖 Từ vựng" : (it.category === "idioms_slang" ? "🎭 Thành ngữ & tiếng lóng" : "💬 Câu giao tiếp");
    tagLine = '<div class="card-tag">'+typeLabel+(cat ? " · "+esc(cat.name) : "")+'</div>';
  }
  return (
    '<div class="card" data-id="'+it.id+'" data-type="'+type+'">'+
      tagLine+
      '<div class="card-top">'+
        '<div class="card-main">'+
          '<div class="primary">'+primary+'</div>'+
          (fwd ? phonLine : '')+
          '<div class="secondary">'+secondary+'</div>'+
          (fwd ? '' : phonLine)+
        '</div>'+
        '<div class="card-actions">'+
          '<button class="act-btn" data-act="speak" title="Phát âm">🔊</button>'+
          '<button class="act-btn'+(isFav?" on":"")+'" data-act="fav" title="Yêu thích">★</button>'+
          '<button class="act-btn'+(isKnown?" known":"")+'" data-act="known" title="Đã thuộc">✓</button>'+
        '</div>'+
      '</div>'+
      '<div class="card-detail">'+detail+
        '<div class="slow-row"><button class="slow-btn" data-act="slow">🐢 Phát chậm</button></div>'+
      '</div>'+
    '</div>'
  );
}

function onMainClick(e){
  var topicTile = e.target.closest(".topic-tile");
  if(topicTile){
    var key = topicTile.getAttribute("data-topic");
    if(key === "fav-status"){ state.topic = "all"; state.status = "fav"; }
    else if(key === "unknown-status"){ state.topic = "all"; state.status = "unknown"; }
    else { state.topic = key; state.status = "all"; }
    state.view = "list";
    renderMain();
    return;
  }

  var actBtn = e.target.closest("[data-act]");
  var cardEl = e.target.closest(".card");
  if(!cardEl) return;
  var id = parseInt(cardEl.getAttribute("data-id"), 10);
  var type = cardEl.getAttribute("data-type") || state.tab;
  var it = dataFor(type).filter(function(x){ return x.id === id; })[0];
  if(!it) return;

  if(actBtn){
    var act = actBtn.getAttribute("data-act");
    if(act === "speak"){ speak(it.ru); }
    else if(act === "slow"){ speakSlow(it.ru); }
    else if(act === "fav"){
      if(fav[type][id]) delete fav[type][id]; else fav[type][id] = true;
      persistFav(type);
      actBtn.classList.toggle("on");
    }
    else if(act === "known"){
      if(known[type][id]) delete known[type][id]; else known[type][id] = true;
      persistKnown(type);
      actBtn.classList.toggle("known");
      updateHdrStat();
      if(state.status === "unknown") resetAndRenderCards();
    }
    return;
  }
  cardEl.classList.toggle("open");
}

/* ---------- Review (flashcards) ---------- */
function renderReviewSetup(){
  var wrap = document.getElementById("reviewWrap");
  var pool = state.review.pool || "words";
  var topic = state.review.topic || "all";
  var cats = catsFor(pool);
  var li = langInfo(state.lang);
  var dir = state.review.dir || state.dir;
  var counts = reviewCounts(pool, topic);
  var catOpts = '<option value="all">Tất cả chủ đề</option>';
  for(var k in cats) catOpts += '<option value="'+k+'"'+(topic===k?" selected":"")+'>'+cats[k].icon+' '+esc(cats[k].name)+'</option>';

  wrap.innerHTML =
    '<div class="review-setup">'+
      '<div class="row">'+
        '<select id="rvPool">'+
          '<option value="words"'+(pool==="words"?" selected":"")+'>📖 Từ vựng</option>'+
          '<option value="sentences"'+(pool==="sentences"?" selected":"")+'>💬 Câu giao tiếp</option>'+
        '</select>'+
      '</div>'+
      '<div class="row"><select id="rvCat">'+catOpts+'</select></div>'+
      '<div class="row"><select id="rvDir">'+
        '<option value="fwd"'+(dir==="fwd"?" selected":"")+'>'+esc(li.name)+' → Việt</option>'+
        '<option value="rev"'+(dir==="rev"?" selected":"")+'>Việt → '+esc(li.name)+'</option>'+
      '</select></div>'+
      '<div class="row"><select id="rvCount">'+
        [10,20,40,80].map(function(n){ return '<option value="'+n+'"'+(state.review.count===n?" selected":"")+'>'+n+' thẻ / phiên</option>'; }).join("")+
      '</select></div>'+
      '<div class="review-due-info">🔴 <b>'+counts.due+'</b> thẻ cần ôn hôm nay · 🆕 <b>'+counts.fresh+'</b> thẻ mới · tổng '+counts.total+'</div>'+
      '<button class="big-btn" id="rvStart">▶️ Bắt đầu ôn tập</button>'+
      '<div class="hdr-sub" style="color:#6b7280;margin-top:10px;">Ôn theo lịch lặp ngắt quãng: ưu tiên thẻ đến hạn/mới, thẻ nhớ tốt sẽ giãn cách xa hơn. Bấm vào thẻ hoặc nút loa để nghe phát âm.</div>'+
    '</div>';

  document.getElementById("rvPool").addEventListener("change", function(e){
    state.review.pool = e.target.value; state.review.topic = "all"; renderReviewSetup();
  });
  document.getElementById("rvCat").addEventListener("change", function(e){ state.review.topic = e.target.value; renderReviewSetup(); });
  document.getElementById("rvDir").addEventListener("change", function(e){ state.review.dir = e.target.value; });
  document.getElementById("rvCount").addEventListener("change", function(e){ state.review.count = parseInt(e.target.value,10); renderReviewSetup(); });
  document.getElementById("rvStart").addEventListener("click", startReview);
}

function startReview(){
  var pool = state.review.pool = state.review.pool || "words";
  var topic = state.review.topic = state.review.topic || "all";
  var count = state.review.count = state.review.count || 20;
  if(!state.review.dir) state.review.dir = state.dir;
  var queue = buildReviewQueue(pool, topic, count);
  if(queue.length === 0){ showToast("Không có thẻ nào trong chủ đề này"); return; }
  state.review.queue = queue;
  state.review.idx = 0;
  state.review.revealed = false;
  state.review.gained = 0;
  renderReviewCard();
}

function renderReviewCard(){
  var wrap = document.getElementById("reviewWrap");
  var rv = state.review;
  if(rv.idx >= rv.queue.length){
    wrap.innerHTML =
      '<div class="review-done">'+
        '<div class="big">🎉</div>'+
        '<div style="font-size:17px;font-weight:800;margin-top:8px;">Hoàn thành phiên ôn tập!</div>'+
        '<div style="color:#6b7280;margin-top:6px;">Đã thuộc thêm '+rv.gained+' / '+rv.queue.length+' thẻ.</div>'+
        '<button class="big-btn" id="rvAgain">🔁 Ôn phiên khác</button>'+
      '</div>';
    document.getElementById("rvAgain").addEventListener("click", function(){ renderReviewSetup(); });
    updateHdrStat();
    return;
  }
  var type = rv.pool;
  var it = rv.queue[rv.idx];
  var fwd = rv.dir !== "rev";
  var front = fwd ? it.ru : it.meaning;
  var revealBlock = type === "words"
    ? '<div class="meaning">'+esc(fwd ? it.meaning : it.ru)+'</div>'+
      (fwd ? '' : '<div class="phon">['+esc(it.phonetic||"")+']</div>')+
      '<div class="phon" style="margin-top:8px;">'+esc(it.usage||"")+'</div>'+
      '<div class="ex-ru" style="margin-top:8px;">'+esc(it.example_ru||"")+'</div>'+
      '<div class="ex-vi">'+esc(it.example_vi||"")+'</div>'
    : '<div class="meaning">'+esc(fwd ? it.meaning : it.ru)+'</div>'+
      (fwd ? '' : '<div class="phon">['+esc(it.phonetic||"")+']</div>')+
      '<div class="phon" style="margin-top:8px;">'+esc(it.note||"")+'</div>';

  var rec = srs[type][it.id] || newSrsRecord();
  var gradeRow = rv.revealed
    ? '<div class="grade-row">'+
        '<button class="grade-btn grade-again" data-q="1">Quên<span>'+fmtDays(previewInterval(rec,1))+'</span></button>'+
        '<button class="grade-btn grade-hard" data-q="3">Khó<span>'+fmtDays(previewInterval(rec,3))+'</span></button>'+
        '<button class="grade-btn grade-good" data-q="4">Tốt<span>'+fmtDays(previewInterval(rec,4))+'</span></button>'+
        '<button class="grade-btn grade-easy" data-q="5">Dễ<span>'+fmtDays(previewInterval(rec,5))+'</span></button>'+
      '</div>'
    : '';

  wrap.innerHTML =
    '<div class="review-stage">'+
      '<div class="review-progress">Thẻ '+(rv.idx+1)+' / '+rv.queue.length+'</div>'+
      '<div class="flash'+(rv.revealed?" show":"")+'" id="flashCard">'+
        '<div class="ru">'+esc(front)+'</div>'+
        (fwd ? '<div class="phon">['+esc(it.phonetic||"")+']</div>' : '')+
        (rv.revealed ? '<div class="reveal">'+revealBlock+'</div>' : '<div class="tapline">👆 Chạm để xem '+(fwd?"nghĩa":"tiếng "+esc(langInfo(state.lang).name))+'</div>')+
      '</div>'+
      '<div class="review-controls">'+
        '<button class="rc-btn rc-speak" id="rvSpeak">🔊</button>'+
      '</div>'+
      gradeRow+
    '</div>';

  document.getElementById("flashCard").addEventListener("click", function(){
    rv.revealed = !rv.revealed; renderReviewCard();
  });
  document.getElementById("rvSpeak").addEventListener("click", function(e){ e.stopPropagation(); speak(it.ru); });
  var gradeRowEl = wrap.querySelector(".grade-row");
  if(gradeRowEl){
    gradeRowEl.addEventListener("click", function(e){
      var b = e.target.closest(".grade-btn"); if(!b) return;
      e.stopPropagation();
      gradeCard(parseInt(b.getAttribute("data-q"), 10));
    });
  }
}

function gradeCard(quality){
  var rv = state.review;
  var type = rv.pool;
  var it = rv.queue[rv.idx];
  var rec = srs[type][it.id] || newSrsRecord();
  sm2(rec, quality);
  srs[type][it.id] = rec;
  persistSrs(type);

  if(quality < 3){
    if(known[type][it.id]){ delete known[type][it.id]; persistKnown(type); }
  } else if(rec.reps >= 2){
    if(!known[type][it.id]){ known[type][it.id] = true; persistKnown(type); rv.gained++; }
  }
  nextReviewCard();
}

function nextReviewCard(){
  var rv = state.review;
  rv.idx++; rv.revealed = false;
  renderReviewCard();
}

/* ---------- điều hướng nút Back của hệ thống ---------- */
window.onNativeBack = function(){
  // 1. đang mở bảng hướng dẫn dùng app -> đóng lại
  var onboardModal = document.getElementById("onboardBack");
  if(onboardModal && !onboardModal.hidden){ closeOnboard(); return; }

  // 1b. đang mở bảng chọn ngôn ngữ -> đóng lại
  var modal = document.getElementById("langModalBack");
  if(modal && !modal.hidden){ closeLangModal(); return; }

  // 2. đang trong 1 phiên ôn tập (kể cả màn hình kết quả) -> quay về màn hình cài đặt ôn tập
  if(state.tab === "review" && state.review.queue && state.review.queue.length > 0){
    state.review.queue = [];
    renderReviewSetup();
    return;
  }

  // 3. có thẻ đang mở rộng chi tiết -> thu gọn lại
  var openCard = document.querySelector(".card.open");
  if(openCard){ openCard.classList.remove("open"); return; }

  // 4. đang ở tab Tìm kiếm và có nội dung tìm -> xoá ô tìm kiếm
  if(state.tab === "search" && state.globalSearch){
    state.globalSearch = "";
    var gsi = document.getElementById("globalSearchInput");
    if(gsi) gsi.value = "";
    renderSearchMain();
    return;
  }

  // 5. đang xem danh sách trong 1 chủ đề -> quay lại lưới chủ đề
  if(state.tab !== "review" && state.tab !== "search" && state.view === "list"){
    state.view = "topics";
    renderMain();
    return;
  }

  // 6. đang ở tab khác "Từ vựng" -> coi "Từ vựng" là màn hình gốc
  if(state.tab !== "words"){
    setTab("words");
    return;
  }

  // 7. đã ở màn hình gốc, không còn gì để lùi -> thoát app
  try{ if(window.Android && Android.exitApp) Android.exitApp(); }catch(e){}
};

/* ---------- boot ---------- */
buildShell();
refreshHeaderChrome();
setTab("words");
setNativeLang(state.lang);
if(!isOnboarded()) openOnboard();

window.onTtsReady = function(ok){
  if(!ok) showToast("⚠️ Thiết bị chưa có giọng đọc " + langInfo(state.lang).name.toLowerCase() + " cho Text-to-Speech");
};
})();
