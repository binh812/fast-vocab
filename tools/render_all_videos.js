// Xuất MP4 hàng loạt cho mọi bài Ghép câu của các ngôn ngữ (gọi render_lesson_video.js cho từng bài).
// Bỏ qua video đã có -> dừng giữa chừng rồi chạy lại sẽ làm tiếp. Ghi tiến độ vào <thư mục ra>/render_log.txt
// Dùng:  node tools/render_all_videos.js <thư mục ra> [ngôn ngữ, mặc định zh,ru,en,fr] [--res 720] [--tutor3d]
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(process.argv[2] || "videos");
const LANGS = (process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : "zh,ru,en,fr").split(",");
const pass = process.argv.slice(2).filter((a, i, arr) => a.startsWith("--") || (i > 0 && arr[i - 1].startsWith("--")));
const ROOT = path.resolve(__dirname, "..");
const LANG_DIR = { zh: "TiengTrung", ru: "TiengNga", en: "TiengAnh", fr: "TiengPhap" };
const LOG = path.join(OUT, "render_log.txt");

function slug(vi){
  return vi.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
function log(msg){
  const line = `[${new Date().toLocaleString("vi-VN")}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG, line + "\n");
}

fs.mkdirSync(OUT, { recursive: true });
const jobs = [];
for (const lang of LANGS) {
  const s = fs.readFileSync(path.join(ROOT, "app/assets/data", lang, "builder.js"), "utf8");
  const lessons = JSON.parse(s.slice(s.indexOf(".builder = ") + 11).trim().replace(/;$/, ""));
  for (const l of lessons) {
    const dir = path.join(OUT, LANG_DIR[lang] || lang);
    jobs.push({ lang, id: l.id, file: path.join(dir, `Bai_${String(l.id).padStart(2, "0")}_${slug(l.vi)}.mp4`) });
  }
}
const t0 = Date.now();
let done = 0, failed = 0;
// chạy tối đa 3 lượt: lượt sau làm bù các bài lỗi tạm thời ở lượt trước
for (let pass_ = 1; pass_ <= 3; pass_++) {
  const todo = jobs.filter(j => !fs.existsSync(j.file));
  if (!todo.length) break;
  log(`Lượt ${pass_}: ${jobs.length} video, đã có ${jobs.length - todo.length}, còn ${todo.length}. Tham số: ${pass.join(" ") || "(mặc định)"}`);
  failed = 0;
  for (const j of todo) {
    fs.mkdirSync(path.dirname(j.file), { recursive: true });
    const tmp = j.file.replace(/\.mp4$/, ".rendering.mp4");
    const ts = Date.now();
    try {
      const out = execFileSync("node", [path.join(__dirname, "render_lesson_video.js"), j.lang, String(j.id), tmp, ...pass], { stdio: ["ignore", "pipe", "pipe"] }).toString();
      fs.renameSync(tmp, j.file); // chỉ đổi tên khi render xong -> file dở dang không bị tính là đã xong
      done++;
      const warn = out.split("\n").filter(l => l.startsWith("⚠️"));
      const left = jobs.filter(x => !fs.existsSync(x.file)).length;
      const avg = (Date.now() - t0) / done / 1000;
      log(`✅ ${j.lang} bài ${j.id} (${Math.round((Date.now() - ts) / 1000)}s) — còn ${left} video, ước ~${Math.round(avg * left / 60)} phút` + (warn.length ? `\n    ${warn.join("\n    ")}` : ""));
    } catch (e) {
      failed++;
      try { fs.unlinkSync(tmp); } catch (_) {}
      log(`❌ ${j.lang} bài ${j.id}: ${String(e.stderr || e.message).trim().split("\n").pop()}`);
    }
  }
}
const remain = jobs.filter(j => !fs.existsSync(j.file)).length;
log(`Kết thúc: ${done} video mới, còn thiếu ${remain}, mất ${Math.round((Date.now() - t0) / 60000)} phút.`);
