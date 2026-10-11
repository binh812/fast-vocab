// Chụp màn hình giao diện app ở nhiều kích thước thiết bị bằng Chromium headless (DevTools Protocol),
// để rà soát bố cục dọc/ngang, điện thoại/máy gập/tablet mà không cần cài APK.
// Dùng:  node tools/screens.js <thư mục ra> [lọc tên màn hình] [lọc tên kích thước]
// Cần:   chromium-browser (Termux: pkg install x11-repo && pkg install chromium)
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(process.argv[2] || "screens");
const ONLY_SCREEN = process.argv[3] || "";
const ONLY_SIZE = process.argv[4] || "";
const INDEX = "file://" + path.resolve(__dirname, "..", "app", "assets", "index.html");

const SIZES = [
  { name: "phone-small",     w: 320,  h: 640  },
  { name: "phone",           w: 393,  h: 852  },
  { name: "phone-land",      w: 852,  h: 393  },
  { name: "fold-cover",      w: 344,  h: 882  },
  { name: "fold-open",       w: 673,  h: 841  },
  { name: "fold-open-land",  w: 841,  h: 673  },
  { name: "tablet",          w: 800,  h: 1280 },
  { name: "tablet-land",     w: 1280, h: 800  },
];

// mỗi màn hình: đoạn JS chạy trong trang để đưa app tới đúng trạng thái
const SCREENS = [
  { name: "01-words-grid",  js: `tab("words")` },
  { name: "02-words-list",  js: `tab("words"); q('.topic-tile[data-topic="food_drink"]').click(); q("#cardList .card").click()` },
  { name: "03-search",      js: `tab("search"); var i=q("#globalSearchInput"); i.value="xin chao"; i.dispatchEvent(new Event("input"))` },
  { name: "04-builder-list",js: `tab("builder")` },
  { name: "05-builder-lesson", js: `tab("builder"); q('.bd-tile[data-lesson="4"]').click()` },
  { name: "06-builder-lesson-mid", js: `tab("builder"); q('.bd-tile[data-lesson="4"]').click(); document.getElementById("bdDialog").scrollIntoView()` },
  { name: "07-builder-practice", js: `tab("builder"); q('.bd-tile[data-lesson="4"]').click(); q("#bdPractice").click(); var o=document.querySelector(".bd-opt"); if(o) o.click()` },
  { name: "08-builder-arrange", js: `tab("builder"); q('.bd-tile[data-lesson="4"]').click(); q("#bdPractice").click();
                                    for(var k=0;k<6 && document.querySelector(".bd-options");k++){ q(".bd-opt").click(); q("#bdNext").click(); }
                                    var w=document.querySelectorAll("#bdBank .bd-word"); if(w[0]) w[0].click(); if(w[1]) w[1].click();` },
  { name: "09-review-setup", js: `tab("review")` },
  { name: "10-flashcard",    js: `tab("review"); q("#rvStart").click(); q("#flashCard").click()` },
  { name: "11-quiz",         js: `tab("review"); q('[data-mode="quiz"]').click(); q("#rvStart").click(); q(".quiz-opt").click()` },
  { name: "12-dictation",    js: `tab("review"); q('[data-mode="dictation"]').click(); q("#rvStart").click()` },
  { name: "13-dashboard",    js: `tab("words"); q("#streakBadge").click()` },
  { name: "14-onboarding",   js: `tab("words"); q("#helpBtn").click()` },
  { name: "15-lang-picker",  js: `tab("words"); q("#langBtn").click()` },
  { name: "16-dark-builder", js: `localStorage.setItem("fv_theme","dark"); document.documentElement.setAttribute("data-theme","dark"); tab("builder"); q('.bd-tile[data-lesson="4"]').click()` },
];

const PRELUDE = `
  function q(s){ var e=document.querySelector(s); if(!e) throw new Error("missing "+s); return e; }
  function tab(t){ q('.tab[data-tab="'+t+'"]').click(); }
`;

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function main(){
  fs.mkdirSync(OUT, { recursive: true });
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(require("os").tmpdir(), "fvchrome-"));
  const chrome = spawn("chromium-browser", [
    "--headless=new", "--no-sandbox", "--disable-gpu-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    "--allow-file-access-from-files", "--hide-scrollbars", "--mute-audio",
    "--remote-debugging-port=" + port, "--user-data-dir=" + profile, "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    await sleep(500);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const pg = list.find(t => t.type === "page");
      if (pg) wsUrl = pg.webSocketDebuggerUrl;
    } catch (e) {}
  }
  if (!wsUrl) throw new Error("Chromium did not start");

  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.addEventListener("open", r));
  let id = 0; const pending = {}; const consoleErrors = [];
  ws.addEventListener("message", ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; }
    if (m.method === "Runtime.exceptionThrown") consoleErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable");
  await send("Page.enable");

  for (const size of SIZES.filter(s => s.name.includes(ONLY_SIZE))) {
    await send("Emulation.setDeviceMetricsOverride", { width: size.w, height: size.h, deviceScaleFactor: 1.5, mobile: size.w < 900 });
    for (const sc of SCREENS.filter(s => s.name.includes(ONLY_SCREEN))) {
      // trạng thái sạch mỗi lần: bỏ qua onboarding, ngôn ngữ Trung (có thêm dòng đọc bồi = trường hợp nhiều chữ nhất)
      await send("Page.navigate", { url: INDEX });
      await sleep(600);
      await send("Runtime.evaluate", { expression: `localStorage.clear(); localStorage.setItem("fv_onboarded","1"); localStorage.setItem("fv_lang","zh"); localStorage.setItem("fv_theme","light");` });
      await send("Page.reload");
      await sleep(1800);
      const r = await send("Runtime.evaluate", { expression: PRELUDE + sc.js, returnByValue: true });
      if (r.result && r.result.exceptionDetails) consoleErrors.push(`${sc.name}@${size.name}: ` + r.result.exceptionDetails.exception?.description);
      await sleep(900);
      const shot = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(OUT, `${sc.name}__${size.name}.png`), Buffer.from(shot.result.data, "base64"));
      // phát hiện tràn ngang: phần tử nào rộng hơn màn hình
      const ov = await send("Runtime.evaluate", { returnByValue: true, expression: `
        (function(){ var W=document.documentElement.clientWidth, out=[];
          function inScroller(e){ for(var p=e.parentElement;p;p=p.parentElement){ var o=getComputedStyle(p).overflowX; if(o==="auto"||o==="scroll"||o==="hidden") return true; } return false; }
          document.querySelectorAll("body *").forEach(function(e){ var r=e.getBoundingClientRect();
            if(r.width>0 && (r.right>W+1 || r.left<-1) && getComputedStyle(e).position!=="fixed" && !inScroller(e)) out.push((e.className||e.tagName)+" "+Math.round(r.left)+".."+Math.round(r.right)); });
          return out.slice(0,5); })()` });
      const over = ov.result && ov.result.result && ov.result.result.value;
      if (over && over.length) console.log(`OVERFLOW ${sc.name}@${size.name} (W=${size.w}):`, over.join(" | "));
    }
  }
  if (consoleErrors.length) console.log("JS ERRORS:\n" + consoleErrors.join("\n"));
  ws.close(); chrome.kill();
  console.log("screenshots ->", OUT);
}
main().catch(e => { console.error(e); process.exit(1); });
