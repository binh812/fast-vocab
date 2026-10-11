// Xuất video bài giảng "Ghép câu" thành MP4 (dọc 1080x1920) — video-as-code:
//   kịch bản + hình từ app/assets/js/lesson_video.js (giống hệt chế độ xem video trong app),
//   giọng đọc neural từ edge-tts (cần mạng lúc render), Chromium headless chụp từng khung, FFmpeg ghép.
// Dùng:  node tools/render_lesson_video.js <ngôn ngữ ru|en|fr|zh> <số bài> [file ra.mp4] [--fps 24] [--tutor3d] [--preview <thư mục>]
//   --tutor3d: dùng gia sư 3D (cần Chromium vẽ được WebGL — chạy trên PC; Chromium trên Termux bị lỗi GPU nên mặc định dùng bản 2D)
// Cần:   chromium-browser, ffmpeg, edge-tts (pip install edge-tts)
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const LV = require("../app/assets/js/lesson_video.js");

const ROOT = path.resolve(__dirname, "..");
const lang = process.argv[2] || "zh";
const lessonId = parseInt(process.argv[3] || "1", 10);
const out = path.resolve(process.argv[4] && !process.argv[4].startsWith("--") ? process.argv[4] : `video_${lang}_bai${lessonId}.mp4`);
const fpsArg = process.argv.indexOf("--fps");
const FPS = fpsArg > 0 ? parseInt(process.argv[fpsArg + 1], 10) : 24;
const CACHE = path.join(ROOT, "build", "video_cache");
const TUTOR = process.argv.includes("--tutor3d") ? "3d" : "2d";
const RATE = { vi: "+8%" }; // lời giảng tiếng Việt đọc nhanh hơn chút; câu mẫu ngoại ngữ giữ tốc độ chuẩn cho dễ nghe
const VOICES = {
  vi: "vi-VN-HoaiMyNeural", zh: "zh-CN-XiaoxiaoNeural", ru: "ru-RU-SvetlanaNeural",
  en: "en-US-JennyNeural", fr: "fr-FR-DeniseNeural",
};

function loadLesson(){
  const s = fs.readFileSync(path.join(ROOT, "app/assets/data", lang, "builder.js"), "utf8");
  const lessons = JSON.parse(s.slice(s.indexOf(".builder = ") + 11).trim().replace(/;$/, ""));
  const l = lessons.find(x => x.id === lessonId);
  if (!l) throw new Error("không có bài " + lessonId);
  return l;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* 1. giọng đọc: mỗi câu 1 file mp3 (có cache theo nội dung) + đo độ dài thật */
function synth(cues){
  fs.mkdirSync(CACHE, { recursive: true });
  const durations = {}, files = {};
  const uniq = [...new Map(cues.map(c => [LV.audioKey(c.lang, c.text), c])).values()];
  uniq.forEach((c, i) => {
    const k = LV.audioKey(c.lang, c.text);
    const f = path.join(CACHE, crypto.createHash("md5").update(VOICES[c.lang] + "|" + (RATE[c.lang] || "") + "|" + c.text).digest("hex") + ".m4a");
    if (!fs.existsSync(f) || fs.statSync(f).size < 500) {
      process.stdout.write(`\r  giọng đọc ${i + 1}/${uniq.length}   `);
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const raw = f + ".raw.mp3";
          execFileSync("edge-tts", ["--voice", VOICES[c.lang], ...(RATE[c.lang] ? ["--rate=" + RATE[c.lang]] : []), "--text", c.text, "--write-media", raw], { stdio: "ignore" });
          // cắt khoảng lặng đầu/cuối của file giọng (edge-tts để dư ~0.5s mỗi đầu -> video dài lê thê)
          execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-af",
            "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse",
            "-c:a", "aac", "-b:a", "128k", f]);
          fs.unlinkSync(raw);
          break;
        }
        catch (e) { if (attempt === 2) throw new Error("edge-tts lỗi với: " + c.text); }
      }
    }
    files[k] = f;
    durations[k] = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
  });
  process.stdout.write("\n");
  return { durations, files };
}

/* 2. Chromium headless qua DevTools Protocol */
async function openBrowser(){
  const port = 9600 + Math.floor(Math.random() * 300);
  const profile = fs.mkdtempSync(path.join(require("os").tmpdir(), "fvvideo-"));
  const chrome = spawn("chromium-browser", [
    "--headless=new", "--no-sandbox", "--hide-scrollbars", "--mute-audio", "--allow-file-access-from-files",
    "--use-gl=angle", "--use-angle=swiftshader-webgl", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
    "--remote-debugging-port=" + port, "--user-data-dir=" + profile, "about:blank",
  ], { stdio: "ignore" });
  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    await sleep(400);
    try { const pg = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === "page"); if (pg) wsUrl = pg.webSocketDebuggerUrl; } catch (e) {}
  }
  if (!wsUrl) throw new Error("Chromium không khởi động được");
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.addEventListener("open", r));
  let id = 0; const pending = {};
  ws.addEventListener("message", ev => { const m = JSON.parse(ev.data); if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async expr => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "JS error");
    return r.result.result.value;
  };
  return { send, evalJs, close: () => { ws.close(); chrome.kill(); } };
}

async function main(){
  const t0 = Date.now();
  const lesson = loadLesson();
  console.log(`Bài ${lesson.id} · ${lesson.vi} (${lang})`);
  const draft = LV.plan(lesson, lang);
  const { durations, files } = synth(draft.cues);

  const b = await openBrowser();
  await b.send("Emulation.setDeviceMetricsOverride", { width: 540, height: 960, deviceScaleFactor: 2, mobile: true });
  await b.send("Page.navigate", { url: "file://" + path.join(__dirname, "video_render.html") });
  await sleep(1500);
  const info = await b.evalJs(`new Promise(function(done){
    var lesson = ${JSON.stringify(lesson)};
    window.V = LessonVideo.mount(document.getElementById("host"), lesson, ${JSON.stringify(lang)}, {durations: ${JSON.stringify(durations)}, tutor: ${JSON.stringify(TUTOR)}});
    var finish = function(){ done({duration: V.duration, tutor: V.tutorMode, cues: V.cues.map(function(c){ return {at:c.at, lang:c.lang, text:c.text}; })}); };
    if(V.tutorMode === "3d") Tutor.attach(V.tutorEl, null, finish); else finish();
  })`);
  console.log(`  thời lượng ${info.duration.toFixed(1)}s · ${info.cues.length} câu đọc · gia sư: ${info.tutor}`);

  /* --preview <thư mục>: chỉ chụp vài khung đại diện mỗi cảnh (để chỉnh thiết kế nhanh), không xuất video */
  const pv = process.argv.indexOf("--preview");
  if (pv > 0) {
    const dir = path.resolve(process.argv[pv + 1] || "video_preview");
    fs.mkdirSync(dir, { recursive: true });
    const scenes = await b.evalJs(`V.scenes.map(function(s){ return {name:s.name, at:s.at, end:s.end}; })`);
    for (const sc of scenes) for (const f of [0.35, 0.8]) {
      const t = sc.at + (sc.end - sc.at) * f;
      await b.evalJs(`V.seek(${t.toFixed(3)}); 0`);
      const shot = await b.send("Page.captureScreenshot", { format: "jpeg", quality: 85 });
      fs.writeFileSync(path.join(dir, `${sc.name}_${Math.round(f * 100)}.jpg`), Buffer.from(shot.result.data, "base64"));
    }
    b.close();
    console.log("preview ->", dir);
    return;
  }

  /* 3. hình: chụp từng khung -> FFmpeg */
  const silent = out.replace(/\.mp4$/, ".video.mp4");
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p", silent], { stdio: ["pipe", "inherit", "inherit"] });
  const total = Math.ceil(info.duration * FPS);
  for (let f = 0; f < total; f++) {
    await b.evalJs(`V.seek(${(f / FPS).toFixed(4)}); 0`);
    const shot = await b.send("Page.captureScreenshot", { format: "jpeg", quality: 90 });
    const buf = Buffer.from(shot.result.data, "base64");
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
    if (f % FPS === 0) process.stdout.write(`\r  khung hình ${f}/${total} (${Math.round(f / total * 100)}%)   `);
  }
  ff.stdin.end();
  await new Promise(r => ff.on("close", r));
  b.close();
  process.stdout.write("\n");

  /* 4. tiếng: đặt từng câu đọc đúng thời điểm rồi ghép với hình */
  const inputs = [], filters = [];
  info.cues.forEach((c, i) => {
    inputs.push("-i", files[LV.audioKey(c.lang, c.text)]);
    const ms = Math.round(c.at * 1000);
    filters.push(`[${i + 1}:a]adelay=${ms}|${ms}[a${i}]`);
  });
  const mix = info.cues.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${info.cues.length}:normalize=0:dropout_transition=0,apad[aout]`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", silent, ...inputs,
    "-filter_complex", filters.join(";") + ";" + mix,
    "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out]);
  fs.unlinkSync(silent);
  console.log(`✅ ${out} (${(fs.statSync(out).size / 1048576).toFixed(1)}MB, mất ${Math.round((Date.now() - t0) / 1000)}s)`);
}
main().catch(e => { console.error("LỖI:", e.message); process.exit(1); });
