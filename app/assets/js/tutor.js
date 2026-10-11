/* Gia sư 3D: nhân vật dựng hoàn toàn bằng khối hình three.js (không dùng model tải ngoài),
   mấp máy miệng theo giọng đọc TTS và phản ứng theo kết quả ôn tập. three.js chỉ được nạp
   khi gia sư hiện lần đầu, để không làm chậm lúc mở app. */
(function(){
"use strict";

var supported = null, threeQueue = null;
var renderer = null, scene, camera, ch = null, stageEl = null, bubbleEl = null;
var running = false, rafId = 0, lastT = 0, lowPower = false, lastRender = 0;
var st = {
  talking:false, talkUntil:0, energy:0, mouth:0.12,
  emotion:"neutral", emotionStart:0, emotionUntil:0,
  nextBlink:2, blinkT:-1
};

function now(){ return ((window.performance && performance.now) ? performance.now() : Date.now()) / 1000; }

function isSupported(){
  if(supported !== null) return supported;
  try{
    var c = document.createElement("canvas");
    supported = !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  }catch(e){ supported = false; }
  return supported;
}

function loadThree(cb){
  if(window.THREE){ cb(true); return; }
  if(threeQueue){ threeQueue.push(cb); return; }
  threeQueue = [cb];
  var s = document.createElement("script");
  s.src = "vendor/three.min.js";
  function done(ok){ var q = threeQueue; threeQueue = null; q.forEach(function(f){ f(ok); }); }
  s.onload = function(){ done(!!window.THREE); };
  s.onerror = function(){ done(false); };
  document.head.appendChild(s);
}

/* ---------- dựng nhân vật ---------- */
function buildCharacter(T){
  function mat(color, extra){
    var o = {color:color, roughness:0.65, metalness:0};
    for(var k in extra) o[k] = extra[k];
    return new T.MeshStandardMaterial(o);
  }
  var SKIN = mat(0xf1c7a1), SKIN_D = mat(0xe3ad86), HAIR = mat(0x3a2a1f, {roughness:0.85});
  var WHITE = mat(0xffffff, {roughness:0.3}), IRIS = mat(0x2b1d14, {roughness:0.2});
  var SHIRT = mat(0x1B3A6B), COLLAR = mat(0xf5f3ee), FRAME = mat(0x222222, {roughness:0.4});
  var MOUTH = mat(0x7a2230, {roughness:0.5}), LIP = mat(0xb5535f);
  var CHEEK = new T.MeshBasicMaterial({color:0xff8a8a, transparent:true, opacity:0.32, depthWrite:false});
  var GLINT = new T.MeshBasicMaterial({color:0xffffff});

  var root = new T.Group();

  var torso = new T.Mesh(new T.CapsuleGeometry(0.85, 0.6, 8, 24), SHIRT);
  torso.scale.set(1, 1, 0.7); torso.position.y = -1.3; root.add(torso);
  var neck = new T.Mesh(new T.CylinderGeometry(0.26, 0.3, 0.5, 20), SKIN);
  neck.position.y = -0.2; root.add(neck);
  var collar = new T.Mesh(new T.TorusGeometry(0.34, 0.08, 10, 28), COLLAR);
  collar.rotation.x = Math.PI/2; collar.position.y = -0.38; root.add(collar);

  var head = new T.Group(); head.position.y = 0.72; root.add(head);
  var skull = new T.Mesh(new T.SphereGeometry(1, 40, 32), SKIN);
  skull.scale.set(0.95, 1.05, 0.95); head.add(skull);

  // tóc: chỏm cầu nghiêng ra sau để chân tóc phía trước nằm trên lông mày, cộng 1 lọn mái
  var hair = new T.Mesh(new T.SphereGeometry(1.05, 40, 24, 0, Math.PI*2, 0, Math.PI*0.52), HAIR);
  hair.scale.set(0.97, 1.06, 0.99); hair.rotation.x = -0.6; hair.position.set(0, 0.04, -0.03); head.add(hair);
  var fringe = new T.Mesh(new T.SphereGeometry(0.5, 24, 16), HAIR);
  fringe.scale.set(1.3, 0.4, 0.7); fringe.position.set(0.15, 0.68, 0.55); fringe.rotation.z = -0.25; head.add(fringe);

  var eyes = [], brows = [];
  [-1, 1].forEach(function(s){
    var ear = new T.Mesh(new T.SphereGeometry(0.18, 16, 12), SKIN_D);
    ear.scale.set(0.55, 1, 0.8); ear.position.set(s*0.92, 0.02, 0); head.add(ear);

    var eye = new T.Group(); eye.position.set(s*0.33, 0.12, 0.83); head.add(eye);
    var white = new T.Mesh(new T.SphereGeometry(0.17, 20, 16), WHITE); white.scale.z = 0.6; eye.add(white);
    var iris = new T.Mesh(new T.SphereGeometry(0.095, 16, 12), IRIS); iris.position.z = 0.085; eye.add(iris);
    var glint = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), GLINT); glint.position.set(0.035, 0.04, 0.17); eye.add(glint);
    eyes.push(eye);

    var rim = new T.Mesh(new T.TorusGeometry(0.24, 0.025, 8, 32), FRAME);
    rim.position.set(s*0.33, 0.12, 1.0); head.add(rim);

    var brow = new T.Mesh(new T.CapsuleGeometry(0.035, 0.22, 4, 8), HAIR);
    brow.rotation.z = Math.PI/2; brow.position.set(s*0.33, 0.4, 0.86); head.add(brow);
    brows.push(brow);

    var cheek = new T.Mesh(new T.SphereGeometry(0.13, 16, 12), CHEEK);
    cheek.scale.set(1, 0.7, 0.25); cheek.position.set(s*0.56, -0.2, 0.76); cheek.rotation.y = s*0.6; head.add(cheek);
  });
  var bridge = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.2, 8), FRAME);
  bridge.rotation.z = Math.PI/2; bridge.position.set(0, 0.16, 1.0); head.add(bridge);

  var nose = new T.Mesh(new T.SphereGeometry(0.09, 16, 12), SKIN_D);
  nose.position.set(0, -0.08, 0.95); head.add(nose);

  var mouth = new T.Group(); mouth.position.set(0, -0.4, 0.86); head.add(mouth);
  var inner = new T.Mesh(new T.SphereGeometry(0.16, 20, 14), MOUTH);
  inner.scale.set(1.15, 0.12, 0.4); mouth.add(inner);
  // cung môi: nửa vòng xuyến, xoay 180° thành hình chữ U (cười), giữ nguyên thành ∩ (buồn)
  var smile = new T.Mesh(new T.TorusGeometry(0.17, 0.028, 8, 24, Math.PI), LIP);
  smile.rotation.z = Math.PI; smile.position.set(0, 0.06, 0.03); mouth.add(smile);

  return {root:root, head:head, torso:torso, eyes:eyes, brows:brows, inner:inner, smile:smile};
}

/* ---------- chuyển động mỗi khung hình ---------- */
function approach(cur, target, dt, speed){ return cur + (target - cur) * Math.min(1, dt*speed); }

function update(dt, t){
  if(!ch) return;
  if(st.emotion !== "neutral" && t > st.emotionUntil) st.emotion = "neutral";
  var e = st.emotion, ea = t - st.emotionStart;
  var cheerful = e === "happy" || e === "celebrate";

  // miệng: khi đang nói thì mở/khép theo nhịp, mỗi từ TTS báo về (wordPulse) làm nhịp mạnh hơn
  var talking = st.talking || t < st.talkUntil;
  st.energy = Math.max(0, st.energy - dt*3);
  var target = 0.12;
  if(talking) target = 0.2 + (0.35 + 0.45*st.energy) * Math.abs(Math.sin(t*16) * Math.sin(t*7.3 + 1.1));
  st.mouth = approach(st.mouth, target, dt, 18);
  ch.inner.scale.y = st.mouth;
  ch.smile.visible = st.mouth < 0.3;

  // chớp mắt ngẫu nhiên; mắt híp lại khi vui
  st.nextBlink -= dt;
  if(st.nextBlink <= 0){ st.blinkT = 0; st.nextBlink = 2 + Math.random()*3.5; }
  var eyeY = 1;
  if(st.blinkT >= 0){
    st.blinkT += dt;
    var p = st.blinkT / 0.16;
    if(p >= 1) st.blinkT = -1; else eyeY = Math.abs(1 - 2*p)*0.9 + 0.1;
  }
  if(cheerful) eyeY = Math.min(eyeY, 0.55);
  ch.eyes[0].scale.y = ch.eyes[1].scale.y = eyeY;

  // lông mày: nhướng khi vui, chau đầu trong khi buồn, nhướng 1 bên khi suy nghĩ
  var browY = cheerful ? 0.45 : e === "sad" ? 0.37 : 0.4;
  var browTilt = e === "sad" ? 0.28 : 0;
  ch.brows[0].position.y = approach(ch.brows[0].position.y, e === "think" ? 0.44 : browY, dt, 10);
  ch.brows[1].position.y = approach(ch.brows[1].position.y, e === "think" ? 0.38 : browY, dt, 10);
  ch.brows[0].rotation.z = Math.PI/2 + browTilt; // lông mày trái: đầu trong (phía +x) nhướng lên
  ch.brows[1].rotation.z = Math.PI/2 - browTilt;

  var frown = e === "sad";
  ch.smile.rotation.z = frown ? 0 : Math.PI;
  ch.smile.position.y = frown ? -0.12 : 0.06;
  var ss = cheerful ? 1.25 : e === "think" ? 0.6 : 0.85;
  ch.smile.scale.set(ss, frown ? ss*0.7 : ss, 1);

  // đầu/thân: lắc lư nhẹ khi rảnh, gật đầu + nhún khi vui, xoay 1 vòng khi ăn mừng, nghiêng đầu khi buồn/suy nghĩ
  var hx = Math.sin(t*0.7)*0.04, hy = Math.sin(t*0.5)*0.12, hz = 0;
  var bob = Math.sin(t*1.6)*0.02, spin = 0;
  if(talking) hx += Math.sin(t*5)*0.03;
  if(e === "happy"){
    hx += Math.sin(ea*14) * 0.15 * Math.max(0, 1 - ea/0.9);
    bob += Math.abs(Math.sin(ea*9)) * 0.18 * Math.max(0, 1 - ea/0.7);
  } else if(e === "celebrate"){
    bob += Math.abs(Math.sin(ea*8)) * 0.3 * Math.max(0, 1 - ea/1.6);
    if(ea < 0.8) spin = (ea/0.8) * Math.PI*2;
  } else if(e === "sad"){
    hz = 0.18; hx += 0.12; hy *= 0.3;
  } else if(e === "think"){
    hz = -0.12; hy = 0.2 + Math.sin(t*0.8)*0.05;
  }
  ch.head.rotation.x = approach(ch.head.rotation.x, hx, dt, 10);
  ch.head.rotation.y = approach(ch.head.rotation.y, hy, dt, 6);
  ch.head.rotation.z = approach(ch.head.rotation.z, hz, dt, 6);
  ch.root.position.y = bob;
  ch.root.rotation.y = spin;
  ch.torso.scale.x = 1 + Math.sin(t*1.6)*0.015;
}

/* ---------- renderer & vòng lặp ---------- */
function resize(){
  if(!renderer || !stageEl) return;
  var w = stageEl.clientWidth || 120, h = stageEl.clientHeight || 120;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function frame(ms){
  if(!running) return;
  rafId = requestAnimationFrame(frame);
  var t = ms / 1000;
  var dt = lastT ? Math.min(0.05, t - lastT) : 0.016;
  lastT = t;
  update(dt, t);
  // avatar nhỏ nổi ở góc: chỉ vẽ ~24 hình/giây cho đỡ tốn pin (chuyển động vẫn tính theo thời gian thực)
  if(lowPower && t - lastRender < 1/24) return;
  lastRender = t;
  var w = Math.round((stageEl.clientWidth || 120) * renderer.getPixelRatio());
  if(renderer.domElement.width !== w) resize();
  renderer.render(scene, camera);
}

function attach(stage, bubble, cb){
  stageEl = stage; bubbleEl = bubble;
  if(renderer){
    if(renderer.domElement.parentNode !== stage) stage.appendChild(renderer.domElement);
    resize(); cb(true); return;
  }
  if(!isSupported()){ cb(false); return; }
  loadThree(function(ok){
    if(!ok){ supported = false; cb(false); return; }
    try{
      var T = window.THREE;
      renderer = new T.WebGLRenderer({antialias:true, alpha:true});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputEncoding = T.sRGBEncoding;
      scene = new T.Scene();
      camera = new T.PerspectiveCamera(28, 1, 0.1, 50);
      // khung chân dung: đầu nằm giữa khung tròn (đã chiếu thử: đầu ở -0.48..0.70 toạ độ màn hình),
      // chừa chỗ cho động tác nhún khi ăn mừng mà không cắt tóc, vẫn thấy vai/cổ áo
      camera.position.set(0, 0.6, 7.4);
      camera.lookAt(0, 0.55, 0);
      scene.add(new T.HemisphereLight(0xffffff, 0xb9a48f, 0.85));
      var key = new T.DirectionalLight(0xffffff, 0.9); key.position.set(2, 3, 4); scene.add(key);
      var rim = new T.DirectionalLight(0x9fc4ff, 0.5); rim.position.set(-3, 2, -3); scene.add(rim);
      ch = buildCharacter(T);
      scene.add(ch.root);
      stage.appendChild(renderer.domElement);
      resize();
      cb(true);
    }catch(e){
      supported = false; renderer = null; ch = null;
      cb(false);
    }
  });
}

function start(){
  if(!renderer || running) return;
  running = true; lastT = 0;
  rafId = requestAnimationFrame(frame);
}
function stop(){
  running = false;
  if(rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

window.addEventListener("resize", resize);

window.Tutor = {
  isSupported: isSupported,
  attach: attach,
  start: start,
  stop: stop,
  say: function(text, target){
    // khung thoại có thể được chỉ định (thanh lớn hoặc avatar nổi); lời chào có thể được gửi
    // trước khi attach() xong (đang nạp three.js) nên mặc định tự tìm khung thoại
    var el = target || bubbleEl || document.getElementById("tutorBubble");
    if(!el) return;
    el.textContent = text;
    el.classList.remove("pop");
    void el.offsetWidth; // khởi động lại animation "pop"
    el.classList.add("pop");
  },
  react: function(emotion, ms){
    st.emotion = emotion;
    st.emotionStart = now();
    st.emotionUntil = st.emotionStart + (ms || 1800)/1000;
  },
  setLowPower: function(on){ lowPower = !!on; },
  setTalking: function(on){ st.talking = on; if(!on) st.talkUntil = 0; },
  talkFor: function(ms){ st.talkUntil = now() + ms/1000; },
  wordPulse: function(){ st.energy = 1; },
  // cho smoke test: dựng nhân vật và chạy chuyển động mà không cần WebGL
  _buildForTest: function(T){ ch = buildCharacter(T); return ch; },
  _update: update,
  _state: st
};
})();
