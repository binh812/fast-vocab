/* Video bài giảng "Ghép câu" dựng bằng code (video-as-code).
   - plan(): từ dữ liệu 1 bài -> kịch bản (các câu thoại + thời điểm), không cần DOM (dùng được trong Node để tạo giọng đọc).
   - mount(): dựng sân khấu 9:16 trong 1 phần tử; seek(t) vẽ đúng khung hình ở giây t (tua được, nên vừa phát
     trong app vừa render từng khung thành MP4 bằng tools/render_lesson_video.js cho ra hình giống hệt nhau).
   Giọng đọc: thuyết minh tiếng Việt + câu mẫu bằng giọng ngôn ngữ đích. Trong app dùng TTS của máy;
   khi xuất MP4 dùng file giọng đọc thật và truyền độ dài thật vào opts.durations. */
(function(root){
"use strict";

var LANG_NAME = {ru:"tiếng Nga", en:"tiếng Anh", fr:"tiếng Pháp", zh:"tiếng Trung"};
var LANG_FLAG = {ru:"🇷🇺", en:"🇬🇧", fr:"🇫🇷", zh:"🇨🇳"};
var GAP = 0.28;          // nghỉ giữa 2 câu đọc (giây)
var FORMULA_VI = {S:"Chủ ngữ", V:"Động từ", O:"Tân ngữ", A:"Tính từ", Q:"Từ hỏi", X:"Khác"};

function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }

/* tách câu thuyết minh tiếng Việt thành các đoạn theo chữ viết, để chữ Hán/Kirin trong lời giảng được đọc bằng
   giọng ngôn ngữ đó (giọng Việt đọc "不" sẽ sai). Tiếng Anh/Pháp cùng chữ Latin nên giữ nguyên. */
var FOREIGN_RE = {zh: /[\u3400-\u9fff\uf900-\ufaff\u3002\uff0c\uff1f\uff01\u3001]+/g, ru: /[\u0400-\u04ff][\u0400-\u04ff\s\-]*[\u0400-\u04ff]|[\u0400-\u04ff]/g};
function splitByScript(text, lang){
  var re = FOREIGN_RE[lang];
  if(!re) return [{lang:"vi", text:text}];
  var out = [], last = 0, m;
  re.lastIndex = 0;
  while((m = re.exec(text))){
    if(m.index > last) out.push({lang:"vi", text:text.slice(last, m.index)});
    out.push({lang:lang, text:m[0]});
    last = m.index + m[0].length;
  }
  if(last < text.length) out.push({lang:"vi", text:text.slice(last)});
  return out.filter(function(p){ return /[\p{L}\p{N}]/u.test(p.text); });
}

/* ước lượng thời gian đọc khi chưa có file giọng thật (phát trong app) */
// hệ số đo từ giọng đọc thật (edge-tts, đã cắt khoảng lặng): Việt ~0.056s/ký tự, Trung ~0.23s/chữ Hán;
// cộng biên độ cho TTS của máy (thường đọc chậm hơn chút)
function estimate(lang, text){
  var n = String(text).length;
  if(lang === "zh") return 0.25 + (String(text).match(/[\u3400-\u9fff]/g) || []).length * 0.26;
  if(lang === "vi") return 0.2 + n * 0.064;
  return 0.2 + n * 0.066;
}
function audioKey(lang, text){ return lang + "|" + text; }

/* ---------------- kịch bản ---------------- */
function plan(lesson, lang, opts){
  opts = opts || {};
  var durs = opts.durations || null;
  var T = 0.5, cues = [], scenes = [], sc = null;
  function dur(l, text){
    var k = audioKey(l, text);
    return durs && durs[k] != null ? durs[k] + 0.12 : estimate(l, text) * (opts.slack || 1);
  }
  function cue(l, text, sub){
    var d = dur(l, text);
    var c = {at:T, dur:d, lang:l, text:text, sub:sub, scene:sc && sc.name};
    cues.push(c);
    T += d + GAP;
    return c;
  }
  function narr(text, sub){ // thuyết minh tiếng Việt (có thể chen đoạn chữ ngoại ngữ)
    var s = {kind:"vi", text:sub || text};
    var start = T;
    // phần trong ngoặc chỉ hiện ở phụ đề, không đọc (đọc vụn từng chữ trong ngoặc nghe rất rời rạc)
    var spoken = String(text).replace(/\s*[（(][^）)]*[）)]/g, "").replace(/\s+([,.;:!?])/g, "$1");
    splitByScript(spoken, lang).forEach(function(p){ cue(p.lang, p.text.trim(), s); });
    return {at:start, end:T};
  }
  function say(it, extra){ // câu mẫu bằng ngôn ngữ đích
    var c = cue(lang, it.t, {kind:"target", t:it.t, ph:it.ph, vph:it.vph, vi:(extra && extra.vi) || it.vi, hl:it.hl});
    return c;
  }
  function wait(s){ T += s; }
  function scene(name, emotion, bg){ if(sc) sc.end = T; sc = {name:name, at:T, emotion:emotion, bg:bg, marks:{}}; scenes.push(sc); return sc; }
  function mark(k){ sc.marks[k] = T; }

  // 1. mở đầu
  scene("intro", "happy", 0);
  mark("title"); wait(0.9);
  narr("Bài " + lesson.id + ". Cách nói “" + lesson.vi + "” trong " + LANG_NAME[lang] + ".");
  mark("pivot");
  say({t:lesson.pivot.t, ph:lesson.pivot.ph, vph:lesson.pivot.vph, vi:lesson.vi, hl:[lesson.pivot.t]});
  wait(0.2);
  narr(lesson.note);
  wait(0.4);

  // 2. công thức câu
  if(lesson.formula && lesson.formula.length){
    scene("formula", "think", 1);
    mark("blocks"); wait(0.3 + lesson.formula.length * 0.35);
    var names = lesson.formula.map(function(b){ return b.k === "P" ? lesson.vi : (FORMULA_VI[b.k] || b.t).toLowerCase(); });
    narr("Công thức: " + names.join(", cộng ") + ".");
    var pb = lesson.formula.filter(function(b){ return b.k === "P"; })[0];
    if(pb) say({t:pb.t, ph:lesson.pivot.ph, vph:lesson.pivot.vph, vi:lesson.vi, hl:[pb.t]});
    wait(0.6);
  }

  // 3. ghép từng bước, 3 nhánh
  lesson.branches.forEach(function(b, bi){
    scene("branch" + bi, "think", 2 + bi % 2);
    wait(0.5);
    // nhánh đầu giảng kỹ từng bước; 2 nhánh sau đi nhanh (chỉ đọc nghĩa câu cuối) cho video gọn
    var full = bi === 0;
    mark("s1"); say(b.steps[0]); if(full) narr(b.steps[0].vi); else wait(0.3);
    mark("chip"); wait(full ? 0.7 : 0.5);
    mark("s2"); say(b.steps[1]); if(full) narr(b.steps[1].vi); else wait(0.3);
    wait(0.2);
    mark("s3"); say(b.steps[2]); narr(b.steps[2].vi);
    if(bi === 0 && lesson.how && lesson.how[0]){ mark("how"); narr(lesson.how[0]); }
    mark("done"); wait(0.7);
  });

  // 4. lỗi hay gặp
  var mk = lesson.mistakes && lesson.mistakes[0];
  if(mk){
    scene("mistake", "sad", 4);
    mark("wrong"); wait(0.6);
    narr("Lỗi hay gặp: " + mk.why);
    mark("right");
    say({t:mk.right, ph:"", vi:"Câu đúng"});
    wait(0.6);
  }

  // 5. hội thoại mẫu
  if(lesson.dialog && lesson.dialog.length){
    scene("dialog", "happy", 5);
    wait(0.4);
    lesson.dialog.forEach(function(d, di){ mark("d" + di); say(d); wait(0.15); });
    wait(0.5);
  }

  // 6. kết
  scene("outro", "celebrate", 6);
  mark("tip"); wait(0.5);
  if(lesson.tip) narr(lesson.tip);
  mark("cta");
  narr("Giờ hãy vào phần Luyện tập để tự ghép câu nhé!");
  wait(1.2);
  sc.end = T;
  return {lesson:lesson, lang:lang, cues:cues, scenes:scenes, duration:T};
}

/* ---------------- dựng hình & chuyển động ---------------- */
var EASE = {
  out: function(p){ return 1 - Math.pow(1 - p, 3); },
  back: function(p){ var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  inout: function(p){ return p < .5 ? 4*p*p*p : 1 - Math.pow(-2*p + 2, 3) / 2; },
  lin: function(p){ return p; }
};
var PROPS = ["o", "x", "y", "s", "r"];
var DEF = {o:1, x:0, y:0, s:1, r:0};

function highlight(text, hl, spaced){
  text = String(text || "");
  var parts = (hl || []).filter(Boolean).sort(function(a, b){ return b.length - a.length; });
  var out = "", i = 0;
  while(i < text.length){
    var hit = null;
    for(var k=0;k<parts.length;k++){
      var w = parts[k];
      if(text.substr(i, w.length).toLowerCase() !== w.toLowerCase()) continue;
      if(spaced && /\p{L}/u.test(w[0]) && i > 0 && /\p{L}/u.test(text[i-1])) continue;
      if(spaced && /\p{L}/u.test(w[w.length-1]) && /\p{L}/u.test(text[i + w.length] || "")) continue;
      hit = text.substr(i, w.length); break;
    }
    if(hit){ out += '<b class="lv-hl">' + esc(hit) + '</b>'; i += hit.length; }
    else { out += esc(text[i]); i++; }
  }
  return out;
}

var TUTOR_SVG =
  '<svg viewBox="0 0 200 200" width="100%" height="100%">'+
   '<g class="t2-body"><path d="M28 205 Q30 150 100 146 Q170 150 172 205 Z" fill="#1B3A6B"/>'+
    '<path d="M78 148 Q100 168 122 148 L118 142 Q100 156 82 142 Z" fill="#F5F3EE"/>'+
    '<rect x="88" y="126" width="24" height="22" rx="8" fill="#f1c7a1"/></g>'+
   '<g class="t2-head">'+
    '<ellipse cx="44" cy="92" rx="9" ry="14" fill="#e3ad86"/><ellipse cx="156" cy="92" rx="9" ry="14" fill="#e3ad86"/>'+
    '<ellipse cx="100" cy="88" rx="56" ry="60" fill="#f1c7a1"/>'+
    '<path d="M44 82 Q40 26 100 24 Q162 24 158 82 Q150 50 118 46 Q92 62 56 56 Q48 66 44 82 Z" fill="#3a2a1f"/>'+
    '<ellipse cx="66" cy="112" rx="10" ry="6" fill="#ff8a8a" opacity=".35"/><ellipse cx="134" cy="112" rx="10" ry="6" fill="#ff8a8a" opacity=".35"/>'+
    '<g class="t2-eyes"><g class="t2-eye" transform="translate(79 92)"><ellipse rx="10" ry="10" fill="#fff"/><circle r="5.5" cy="1" fill="#2b1d14"/><circle r="1.8" cx="2" cy="-2" fill="#fff"/></g>'+
     '<g class="t2-eye" transform="translate(121 92)"><ellipse rx="10" ry="10" fill="#fff"/><circle r="5.5" cy="1" fill="#2b1d14"/><circle r="1.8" cx="2" cy="-2" fill="#fff"/></g></g>'+
    '<circle cx="79" cy="92" r="15" fill="none" stroke="#222" stroke-width="3"/><circle cx="121" cy="92" r="15" fill="none" stroke="#222" stroke-width="3"/>'+
    '<path d="M94 90 Q100 86 106 90" fill="none" stroke="#222" stroke-width="3"/>'+
    '<rect class="t2-brow l" x="68" y="68" width="22" height="4.5" rx="2.2" fill="#3a2a1f"/><rect class="t2-brow r" x="110" y="68" width="22" height="4.5" rx="2.2" fill="#3a2a1f"/>'+
    '<ellipse cx="100" cy="106" rx="5" ry="4" fill="#e3ad86"/>'+
    '<ellipse class="t2-mouth" cx="100" cy="126" rx="11" ry="3" fill="#7a2230"/>'+
    '<path class="t2-smile" d="M86 124 Q100 138 114 124" fill="none" stroke="#b5535f" stroke-width="3.5" stroke-linecap="round"/>'+
   '</g></svg>';

/* gia sư 2D: trạng thái hoàn toàn theo thời gian t (không ngẫu nhiên) để mỗi lần render ra giống nhau */
function driveTutor2D(svg, t, talking, emotion){
  var happy = emotion === "happy" || emotion === "celebrate", sad = emotion === "sad", think = emotion === "think";
  var bob = Math.sin(t * 1.6) * 2;
  if(emotion === "celebrate") bob -= Math.abs(Math.sin(t * 7)) * 8;
  var tilt = sad ? 7 : think ? -6 : Math.sin(t * 0.5) * 3;
  svg.head.setAttribute("transform", "translate(0 " + bob.toFixed(2) + ") rotate(" + tilt.toFixed(2) + " 100 110)");
  svg.body.setAttribute("transform", "translate(0 " + (bob * 0.4).toFixed(2) + ")");
  var blink = (t % 3.7) < 0.13 ? 0.12 : 1;
  var eyeY = Math.min(blink, happy ? 0.55 : 1);
  svg.eyes.forEach(function(e, i){ e.setAttribute("transform", "translate(" + (i ? 121 : 79) + " 92) scale(1 " + eyeY + ")"); });
  var by = happy ? -4 : sad ? 2 : 0;
  svg.browL.setAttribute("transform", "translate(0 " + (think ? -5 : by) + ") rotate(" + (sad ? 12 : 0) + " 79 70)");
  svg.browR.setAttribute("transform", "translate(0 " + by + ") rotate(" + (sad ? -12 : 0) + " 121 70)");
  var open = talking ? 3 + 11 * Math.abs(Math.sin(t * 16) * Math.sin(t * 7.3 + 1.1)) : 3;
  svg.mouth.setAttribute("ry", open.toFixed(2));
  svg.smile.style.display = open > 6 ? "none" : "";
  svg.smile.setAttribute("d", sad ? "M88 132 Q100 122 112 132" : happy ? "M82 122 Q100 142 118 122" : "M88 125 Q100 134 112 125");
}

function mount(container, lesson, lang, opts){
  opts = opts || {};
  var P = plan(lesson, lang, opts);
  var spaced = lang !== "zh";
  container.innerHTML =
    '<div class="lv-stage">'+
      '<div class="lv-bgs"></div>'+
      '<div class="lv-top"><span>🧩 Ghép câu · Bài ' + lesson.id + '</span><span>' + LANG_FLAG[lang] + ' ' + esc(LANG_NAME[lang]) + '</span></div>'+
      '<div class="lv-prog"><i></i></div>'+
      '<div class="lv-layer"></div>'+
      '<div class="lv-bottom"><div class="lv-tutor"></div><div class="lv-sub"></div></div>'+
    '</div>';
  var stage = container.querySelector(".lv-stage");
  // gia sư: "3d" (three.js, mặc định khi có WebGL) | "2d" (SVG) | false (không có)
  var tutorMode = opts.tutor === false ? "none" : opts.tutor === "2d" || !(root.Tutor && root.Tutor.isSupported()) ? "2d" : "3d";
  var t2 = null;
  if(tutorMode === "2d"){
    var tEl = stage.querySelector(".lv-tutor");
    tEl.innerHTML = TUTOR_SVG;
    t2 = {head:tEl.querySelector(".t2-head"), body:tEl.querySelector(".t2-body"), eyes:[].slice.call(tEl.querySelectorAll(".t2-eye")),
          browL:tEl.querySelector(".t2-brow.l"), browR:tEl.querySelector(".t2-brow.r"), mouth:tEl.querySelector(".t2-mouth"), smile:tEl.querySelector(".t2-smile")};
  }
  var layer = stage.querySelector(".lv-layer");
  var bgs = stage.querySelector(".lv-bgs");
  var subEl = stage.querySelector(".lv-sub");
  var progEl = stage.querySelector(".lv-prog i");
  var els = [];

  // nền từng cảnh (đổi màu mượt giữa các cảnh)
  var BG = [
    "linear-gradient(160deg,#1B3A6B,#2B5FE8)", "linear-gradient(160deg,#16656e,#1f8a8a)",
    "linear-gradient(160deg,#4c1d95,#7c3aed)", "linear-gradient(160deg,#9a3412,#ea580c)",
    "linear-gradient(160deg,#7f1d1d,#dc2626)", "linear-gradient(160deg,#065f46,#10b981)",
    "linear-gradient(160deg,#a16207,#f59e0b)"
  ];
  var bgEls = P.scenes.map(function(s){
    var d = document.createElement("div");
    d.className = "lv-bg"; d.style.background = BG[s.bg % BG.length];
    bgs.appendChild(d);
    return {el:d, s:s};
  });

  function E(cls, html, cx, cy){
    var d = document.createElement("div");
    d.className = "lv-el " + cls;
    d.innerHTML = html;
    d.style.left = cx + "px"; d.style.top = cy + "px";
    layer.appendChild(d);
    var e = {el:d, k:[]};
    els.push(e);
    return e;
  }
  function key(e, t, props, ease){ var k = {t:t, ease:ease || "out"}; PROPS.forEach(function(p){ k[p] = props[p] != null ? props[p] : (e.k.length ? e.k[e.k.length-1][p] : DEF[p]); }); e.k.push(k); }
  function show(e, t, from, d, ease){
    from = from || {o:0, y:40, s:0.92};
    var start = {o:0, x:0, y:0, s:1, r:0}; for(var p in from) start[p] = from[p];
    key(e, t, start);
    key(e, t + (d || 0.5), {o:1, x:0, y:0, s:1, r:0}, ease || "back");
  }
  function hide(e, t, to, d){
    key(e, t, {}, "lin");
    var end = {o:0, y:-30, s:0.96}; for(var p in to || {}) end[p] = to[p];
    key(e, t + (d || 0.35), end, "out");
  }
  function card(it, cls){
    return '<div class="lv-t">' + highlight(it.t, it.hl, spaced) + '</div>'+
      (it.ph ? '<div class="lv-ph">' + esc(it.ph) + '</div>' : '')+
      (it.vph ? '<div class="lv-vph">' + esc(it.vph) + '</div>' : '')+
      (it.vi ? '<div class="lv-vi">' + esc(it.vi) + '</div>' : '');
  }

  P.scenes.forEach(function(s){
    var m = s.marks, end = s.end;
    if(s.name === "intro"){
      var a = E("lv-kicker", "BÀI " + lesson.id, 270, 150);   show(a, m.title, {o:0, y:-30});
      var b = E("lv-big", esc(lesson.vi), 270, 225);           show(b, m.title + 0.25, {o:0, s:0.6});
      var c = E("lv-pivot", card({t:lesson.pivot.t, ph:lesson.pivot.ph, vph:lesson.pivot.vph}), 270, 470);
      show(c, m.pivot - 0.2, {o:0, s:0.3, r:-12}, 0.7);
      [a, b, c].forEach(function(e){ hide(e, end - 0.35); });
    }
    if(s.name === "formula"){
      var h = E("lv-head", "📐 Công thức câu", 270, 140); show(h, s.at, {o:0, y:-20});
      var n2 = lesson.formula.length, gapY = Math.min(118, 520 / n2);
      lesson.formula.forEach(function(blk, i){
        var y = 230 + i * gapY + (5 - n2) * gapY / 2 * (n2 < 5 ? 1 : 0);
        var e = E("lv-fb lv-fb-" + blk.k, (blk.k === "P" ? '<small>TỪ TRỤ</small>' : '') + esc(blk.t), 270, y);
        show(e, m.blocks + i * 0.35, {o:0, x:i % 2 ? 160 : -160, s:0.8}, 0.55);
        if(i < n2 - 1){ var plus = E("lv-plus", "+", 270, y + gapY / 2); show(plus, m.blocks + i * 0.35 + 0.2, {o:0, s:0.4}, 0.3); hide(plus, end - 0.35); }
        hide(e, end - 0.35);
      });
      hide(h, end - 0.35);
    }
    if(/^branch/.test(s.name)){
      var bi = +s.name.slice(6), br = lesson.branches[bi];
      var hd = E("lv-head", "🧩 Ghép từng bước · " + (bi + 1) + "/" + lesson.branches.length, 270, 130); show(hd, s.at, {o:0, y:-20});
      var c1 = E("lv-card s1", card(br.steps[0]), 270, 255);
      var ar1 = E("lv-arrow", "↓", 270, 352);
      var chip = E("lv-chip", esc(lesson.pivot.t), 90, 450);
      var c2 = E("lv-card s2", card(br.steps[1]), 270, 450);
      var ar2 = E("lv-arrow", "↓", 270, 548);
      var c3 = E("lv-card s3", card(br.steps[2]), 270, 650);
      show(c1, m.s1 - 0.3, {o:0, y:40, s:0.85});
      show(chip, m.chip - 0.1, {o:0, x:-80, s:0.5}, 0.4);
      key(chip, m.s2 - 0.35, {}, "lin"); key(chip, m.s2 + 0.05, {o:0, x:150, s:0.6}, "inout"); // bay vào ghép với từ
      show(ar1, m.s2 - 0.3, {o:0, y:-15}, 0.3);
      show(c2, m.s2 - 0.1, {o:0, s:0.6}, 0.55);
      show(ar2, m.s3 - 0.35, {o:0, y:-15}, 0.3);
      show(c3, m.s3 - 0.15, {o:0, y:50, s:0.8}, 0.6);
      // câu hoàn chỉnh nảy nhẹ khi xong
      if(m.done){ key(c3, m.done - 0.1, {}, "lin"); key(c3, m.done + 0.15, {s:1.06}, "out"); key(c3, m.done + 0.4, {s:1}, "out"); }
      [hd, c1, ar1, c2, ar2, c3].forEach(function(e){ hide(e, end - 0.35); });
    }
    if(s.name === "mistake"){
      var mk = lesson.mistakes[0];
      var hm = E("lv-head", "⚠️ Lỗi người Việt hay gặp", 270, 140); show(hm, s.at, {o:0, y:-20});
      var w = E("lv-card lv-wrong", '<div class="lv-tag">❌ Sai</div><div class="lv-t"><s>' + esc(mk.wrong) + '</s></div>', 270, 300);
      show(w, m.wrong - 0.3, {o:0, x:-120});
      key(w, m.right - 0.2, {}, "lin"); key(w, m.right + 0.1, {s:0.92, o:0.6}, "out");
      var r = E("lv-card lv-right", '<div class="lv-tag">✅ Đúng</div><div class="lv-t">' + esc(mk.right) + '</div>', 270, 480);
      show(r, m.right - 0.2, {o:0, x:120});
      var why = E("lv-note", esc(mk.why), 270, 660); show(why, m.wrong + 0.6, {o:0, y:30});
      [hm, w, r, why].forEach(function(e){ hide(e, end - 0.35); });
    }
    if(s.name === "dialog"){
      var hdl = E("lv-head", "💬 Hội thoại mẫu", 270, 130); show(hdl, s.at, {o:0, y:-20});
      // mỗi lúc chỉ 2 bong bóng (1 cặp hỏi - đáp); cặp sau thay cặp trước -> câu dài không tràn xuống phụ đề
      lesson.dialog.forEach(function(d, di){
        var left = d.who === "A";
        var e = E("lv-bubble " + (left ? "a" : "b"), '<span class="lv-who">' + (left ? "🧑" : "👩") + '</span>' + card(d), left ? 240 : 300, di % 2 ? 520 : 300);
        show(e, m["d" + di] - 0.15, {o:0, x:left ? -60 : 60, s:0.85}, 0.45);
        var nextPair = m["d" + (di - di % 2 + 2)];
        hide(e, nextPair ? nextPair - 0.45 : end - 0.35, {o:0, y:-40}, 0.3);
      });
      hide(hdl, end - 0.35);
    }
    if(s.name === "outro"){
      var star = E("lv-big", "🎉", 270, 210); show(star, s.at, {o:0, s:0.2, r:-30}, 0.7);
      var tip = E("lv-note lv-tip", "💡 Mẹo nhớ<br>" + esc(lesson.tip || ""), 270, 400); show(tip, m.tip, {o:0, y:30});
      var cta = E("lv-cta", "🎯 Vào Luyện tập để tự ghép câu!", 270, 600); show(cta, m.cta, {o:0, s:0.5}, 0.6);
      key(cta, m.cta + 0.8, {}, "lin"); key(cta, m.cta + 1.1, {s:1.07}, "inout"); key(cta, m.cta + 1.4, {s:1}, "inout");
    }
  });

  function valueAt(e, t){
    var k = e.k, v = {};
    if(!k.length || t <= k[0].t){ PROPS.forEach(function(p){ v[p] = k.length ? k[0][p] : DEF[p]; }); return v; }
    var last = k[k.length - 1];
    if(t >= last.t){ PROPS.forEach(function(p){ v[p] = last[p]; }); return v; }
    for(var i=1;i<k.length;i++){
      if(t <= k[i].t){
        var a = k[i-1], b = k[i], span = b.t - a.t;
        var p = span > 0 ? EASE[b.ease]((t - a.t) / span) : 1;
        PROPS.forEach(function(q){ v[q] = a[q] + (b[q] - a[q]) * p; });
        return v;
      }
    }
    return v;
  }

  var lastSubKey = null;
  function seek(t){
    els.forEach(function(e){
      var v = valueAt(e, t);
      e.el.style.opacity = Math.max(0, Math.min(1, v.o)).toFixed(3);
      e.el.style.transform = "translate(-50%,-50%) translate(" + v.x.toFixed(1) + "px," + v.y.toFixed(1) + "px) scale(" + v.s.toFixed(3) + ") rotate(" + v.r.toFixed(1) + "deg)";
      e.el.style.visibility = v.o <= 0.001 ? "hidden" : "visible";
    });
    // nền: cảnh hiện tại hiện dần trên cảnh trước
    var si = 0;
    for(var i=0;i<P.scenes.length;i++) if(t >= P.scenes[i].at) si = i;
    bgEls.forEach(function(b, i){
      var o = i < si ? 1 : i === si ? Math.min(1, (t - b.s.at) / 0.6 + (i === 0 ? 1 : 0)) : 0;
      b.el.style.opacity = o.toFixed(3);
    });
    progEl.style.width = (Math.min(1, t / P.duration) * 100).toFixed(2) + "%";
    // phụ đề theo câu đang đọc
    var cur = null;
    for(var j=0;j<P.cues.length;j++){ if(P.cues[j].at <= t) cur = P.cues[j]; else break; }
    var subKey = cur && cur.sub && (cur.at + cur.dur + 1.5 > t) ? (cur.sub.kind === "vi" ? "vi:" + cur.sub.text : "t:" + cur.sub.t) : "";
    if(subKey !== lastSubKey){
      lastSubKey = subKey;
      if(!subKey) subEl.innerHTML = "";
      else if(cur.sub.kind === "vi") subEl.innerHTML = '<div class="lv-sub-vi">' + esc(cur.sub.text) + '</div>';
      else subEl.innerHTML = '<div class="lv-sub-t">' + highlight(cur.sub.t, cur.sub.hl, spaced) + '</div>' +
        (cur.sub.ph ? '<div class="lv-sub-ph">' + esc(cur.sub.ph) + (cur.sub.vph ? ' · ' + esc(cur.sub.vph) : '') + '</div>' : '') +
        (cur.sub.vi ? '<div class="lv-sub-vi small">' + esc(cur.sub.vi) + '</div>' : '');
    }
    // gia sư: nói khi đang có câu đọc, cảm xúc theo cảnh
    if(tutorMode !== "none"){
      var talking = !!(cur && t < cur.at + cur.dur);
      var emo = P.scenes[si].emotion;
      if(/^branch/.test(P.scenes[si].name) && t >= (P.scenes[si].marks.s3 || 1e9)) emo = "happy";
      if(P.scenes[si].name === "mistake" && t >= (P.scenes[si].marks.right || 1e9)) emo = "happy";
      if(tutorMode === "3d") root.Tutor.drive(t, talking, emo);
      else driveTutor2D(t2, t, talking, emo);
    }
    return cur;
  }

  return {plan:P, duration:P.duration, cues:P.cues, scenes:P.scenes, stage:stage, tutorEl:stage.querySelector(".lv-tutor"), tutorMode:tutorMode, seek:seek};
}

var api = {plan:plan, mount:mount, audioKey:audioKey, splitByScript:splitByScript};
if(typeof module !== "undefined" && module.exports) module.exports = api;
else root.LessonVideo = api;
})(typeof window !== "undefined" ? window : this);
