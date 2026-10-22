import { dbGet, dbSet, DEFAULT_SETTINGS, DEFAULT_STATS, EGG_URL, EGG_EYES, MODELS, clamp, HEADPHONES, BOOK, NOTEBOOK, decoFor } from './shared.js';

const $ = (s) => document.querySelector(s);
const petEl = $('#pet'), flipEl = $('#flip'), bodyEl = $('#body'), img = $('#petImg'), fx = $('#fx');
const menuEl = $('#menu'), panelEl = $('#panel'), bubbleEl = $('#bubble'), barsEl = $('#bars');
const timerEl = $('#timer'), timerText = $('#timerText');

let settings = { ...DEFAULT_SETTINGS };
let stats = { ...DEFAULT_STATS };
let chars = [], activeId = null;
let mode = 'idle';            // idle | eat | sleep | read | study | music | play
let session = null;           // okuma/çalışma oturumu
let song = '';
let panel = null;
let dragging = false;
let transientUntil = 0;
let lastNag = 0, lastChatter = Date.now(), lastInteract = Date.now();
let chatHistory = [];
let log = { days: {} };

const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fill = (s, extra = {}) => s.replace(/\{u\}/g, settings.userName || 'Buse').replace(/\{(\w+)\}/g, (m, k) => (k in extra ? extra[k] : m));
const today = () => new Date().toISOString().slice(0, 10);

/* ---------------- Cümleler ---------------- */
const L = {
  morning: ['Günaydın {u}! ☀️ Bugün beraberiz.', 'Günaydııın! Kahvaltı yaptın mı?', 'Sabah sabah seni görmek ne güzel 💛'],
  afternoon: ['Selam {u}! Geldin, sevindim.', 'Merhaba! Bugün neler yapıyoruz?', 'Seni bekliyordum 💛'],
  evening: ['İyi akşamlar {u}! Günün nasıl geçti?', 'Akşam oldu, biraz kitap mı okusak?', 'Hoş geldin! Çay var mı? 🍵'],
  night: ['Geç oldu {u}... Biraz dinlenmeyi unutma 🌙', 'Gece kuşu musun bugün?', 'Ben de uyanığım, yanındayım 🌙'],
  click: ['Hı? Beni mi çağırdın?', 'Buradayım {u}!', 'Bir şey mi yapalım?', 'Pıt! 💛', 'Hihi', 'Evet evet?'],
  tickle: ['Hahaha dur dur! 🤭', 'Gıdıklama yaaa!', 'Hihihi, yeter yeter!'],
  hungry: ['Karnım guruldadı... 🥺', '{u}, acıktım galiba...', 'Bir kurabiye olsa ne güzel olurdu 🍪', 'Mmm, bir şeyler mi yesek?'],
  sleepy: ['Esniyorum... biraz uyusam mı? 😪', 'Gözlerim kapanıyor...', 'Çok yoruldum, minik bir şekerleme?'],
  bored: ['Biraz oynayalım mı? 🎈', 'Sıkıldım... beraber bir şey yapalım mı?', 'Hadi bir oyun oynayalım!'],
  random: ['Bugün nasıl geçiyor?', 'Su içmeyi unutma {u}! 💧', 'Ne güzel çalışıyorsun.', 'Yanındayım, unutma 💛', 'Biraz uzağa bak, gözlerin dinlensin 🌿', 'Omuzlarını bir gevşet bakalım.', 'Bugün sana iyi bir şey olsun istiyorum.'],
  full: ['Doydum! Bir lokma daha yersem patlarım 😵', 'Çok tokum, teşekkür ederim 💛'],
  readStart: ['Tamam, ben de kitabımı açtım. Sessiz olacağım 🤫', 'Okuma saati! Sayfa sayfa gidelim 📖', 'Ben de yanında okuyorum, hadi başlayalım.'],
  studyStart: ['Hadi çalışalım! Ben de yanında not alıyorum ✏️', 'Çalışma zamanı! Sen yaparsın 💪', 'Odaklanalım, bitince kutlarız.'],
  readMid: ['Sayfa çevirdim 📖', 'Odaklanmışsın, harika gidiyorsun.', 'Ben buradayım, devam!', 'Az kaldı, böyle devam 💛'],
  readDone: ['Bitti! {m} dakika beraber {k} 🎉', 'Yaşasın! {m} dakika oldu, çok iyiydin 🎉', 'Tamamdır! {m} dakika. Bir mola hak ettin 🍵'],
  musicStart: ['Hadi sallanalım 🎶', 'Bu şarkıyı sevdim!', 'Ooo, müzik zamanı 🎧'],
  musicStop: ['Güzeldi! Yine dinleyelim 🎶', 'Kulaklarım mutlu 🎧'],
  sleepStart: ['İyi uykular bana... 💤', 'Biraz kestireceğim. Zzz...'],
  wake: ['Günaydııın! Enerjim yerine geldi ☀️', 'Uyandım! Ne kaçırdım?', 'Oh, ne güzel uyudum 💛'],
  tooTired: ['Çok yorgunum, önce biraz uyuyayım mı? 😪'],
  dropped: ['Vay! Yeni yerim burası mı?', 'Uçtum! 🕊️', 'Burası da güzelmiş.'],
  playDone: ['{n} kalp yakaladın! Çok eğlendim 💗', 'Süpersin! {n} kalp! 💗'],
  noBrain: ['(Sohbet beynimi açarsan daha güzel konuşurum 💬)']
};

const FOODS = [
  { e: '🍪', n: 'Kurabiye', f: 25, j: 6, say: ['Çıtır çıtır! En sevdiğim 🍪', 'Mmm, kurabiye! Kırıntılar her yerde hihi'] },
  { e: '🍓', n: 'Çilek', f: 14, j: 10, say: ['Çilek! Tatlı tatlı 🍓', 'Mmm, ne kadar sulu!'] },
  { e: '🌽', n: 'Mısır', f: 20, j: 4, say: ['Mısır taneleri, nam nam 🌽'] },
  { e: '🧁', n: 'Kek', f: 28, j: 12, en: -4, say: ['Kek! Bugün özel gün mü? 🧁', 'Şekerden uçacağım!'] },
  { e: '🍉', n: 'Karpuz', f: 16, j: 8, say: ['Karpuz! Yaz geri geldi 🍉'] },
  { e: '🥐', n: 'Kruvasan', f: 24, j: 6, say: ['Pofuduk kruvasan 🥐'] },
  { e: '🫐', n: 'Mersin', f: 12, j: 9, say: ['Minik mavi toplar! 🫐'] },
  { e: '🧃', n: 'Meyve suyu', f: 8, j: 6, en: 6, say: ['Lık lık lık 🧃 Enerji geldi!'] }
];

/* ---------------- Karakter ve görüntü ---------------- */
function activeChar() { return chars.find((c) => c.id === activeId) || chars[0] || null; }
function slotFor(m) {
  if (m === 'eat') return 'eat';
  if (m === 'sleep') return 'sleep';
  if (m === 'read' || m === 'study') return 'read';
  if (m === 'music') return 'music';
  return 'normal';
}
let shownSlot = 'normal', shownSrc = '';
function currentImage() {
  const c = activeChar();
  if (!c) return { src: EGG_URL, slot: 'normal', eyes: EGG_EYES };
  let want = slotFor(mode);
  if (mode === 'idle' && Date.now() < transientUntil && c.imgs.happy) want = 'happy';
  if (mode === 'idle' && isSad() && c.imgs.sad) want = 'sad';
  const src = c.imgs[want] || c.imgs.normal || EGG_URL;
  const slot = c.imgs[want] ? want : 'normal';
  return { src, slot, eyes: slot === 'normal' ? c.eyes : null };
}
function refreshImage() {
  const cur = currentImage();
  shownSlot = cur.slot;
  img.style.height = settings.size + 'px';
  if (cur.src !== shownSrc) { shownSrc = cur.src; img.src = cur.src; }
  else afterImage();
}
img.addEventListener('load', afterImage);

let hitCanvas = document.createElement('canvas'), hitCtx = hitCanvas.getContext('2d', { willReadFrequently: true });
function afterImage() {
  const w = img.clientWidth, h = img.clientHeight;
  if (!w || !h) return;
  hitCanvas.width = w; hitCanvas.height = h;
  hitCtx.clearRect(0, 0, w, h);
  try { hitCtx.drawImage(img, 0, 0, w, h); } catch (e) {}
  buildLids();
  buildDecor();
}
function alphaAt(clientX, clientY) {
  const r = img.getBoundingClientRect();
  let x = clientX - r.left, y = clientY - r.top;
  if (x < 0 || y < 0 || x > r.width || y > r.height) return false;
  if (flipEl.classList.contains('left')) x = r.width - x;
  try {
    const d = hitCtx.getImageData(Math.floor(x * hitCanvas.width / r.width), Math.floor(y * hitCanvas.height / r.height), 1, 1).data;
    return d[3] > 25;
  } catch (e) { return true; }
}

/* ---- göz kapakları ---- */
let lids = [];
function currentEyes() { return currentImage().eyes; }
function buildLids() {
  lids.forEach((l) => l.remove()); lids = [];
  const eyes = currentEyes();
  if (!eyes || !eyes.pts || eyes.pts.length === 0) return;
  const w = img.clientWidth, h = img.clientHeight;
  const d = eyes.r * 2 * w * 1.18;
  for (const p of eyes.pts) {
    const l = document.createElement('div');
    l.className = 'lid';
    l.style.width = d + 'px'; l.style.height = d + 'px';
    l.style.left = (p.x * w - d / 2) + 'px'; l.style.top = (p.y * h - d / 2) + 'px';
    l.style.background = p.lid || eyes.lid || '#fff7e6';
    fx.appendChild(l); lids.push(l);
  }
  setSleepingLids();
}
function setSleepingLids() { lids.forEach((l) => l.classList.toggle('sleep', mode === 'sleep')); }
async function blink() {
  if (!lids.length || mode === 'sleep') return;
  lids.forEach((l) => l.classList.add('closed'));
  await wait(120);
  lids.forEach((l) => l.classList.remove('closed'));
  if (Math.random() < 0.25) { await wait(160); lids.forEach((l) => l.classList.add('closed')); await wait(110); lids.forEach((l) => l.classList.remove('closed')); }
}
(function blinkLoop() { setTimeout(() => { blink(); blinkLoop(); }, 2400 + Math.random() * 3800); })();

/* ---- süsler: kulaklık, kitap, defter ---- */

function buildDecor() {
  fx.querySelectorAll('.deco').forEach((d) => d.remove());
  const w = img.clientWidth, h = img.clientHeight;
  const has = (s) => shownSlot === s;
  const c = activeChar();
  const place = (svg, kind, ratio) => {
    const p = decoFor(c, kind), d = deco(svg), dw = p.s * w;
    d.style.width = dw + 'px'; d.style.left = (p.x * w - dw / 2) + 'px'; d.style.top = (p.y * h - dw * ratio / 2) + 'px';
  };
  if (mode === 'music' && !has('music')) place(HEADPHONES, 'phones', 62 / 100);
  if ((mode === 'read' || mode === 'study') && !has('read')) place(mode === 'read' ? BOOK : NOTEBOOK, 'book', mode === 'read' ? 56 / 100 : 60 / 100);
}
function deco(svg) { const d = document.createElement('div'); d.className = 'deco'; d.innerHTML = svg; fx.appendChild(d); return d; }

function floatAt(text, x, y, cls = 'float', size) {
  const s = document.createElement('div');
  s.className = cls; s.textContent = text;
  s.style.left = x + 'px'; s.style.top = y + 'px';
  if (size) s.style.fontSize = size + 'px';
  petEl.appendChild(s);
  setTimeout(() => s.remove(), 3200);
}
function hearts(n = 3) {
  const w = petEl.clientWidth;
  for (let i = 0; i < n; i++) setTimeout(() => floatAt(rnd(['💗', '💛', '🤍', '✨']), w * 0.15 + Math.random() * w * 0.7, 10 + Math.random() * 30), i * 180);
}

/* ---------------- Hareket ---------------- */
function isSad() { return stats.food < 25 || stats.joy < 25; }
function baseClass() {
  if (mode !== 'idle') return mode === 'play' ? 'idle' : mode;
  return isSad() ? 'sad' : 'idle';
}
let transientTimer = null;
function setBody(cls) { bodyEl.className = cls; }
function settle() { if (!dragging && !walking) setBody(baseClass()); refreshImage(); }
function transient(cls, ms) {
  if (dragging) return;
  clearTimeout(transientTimer);
  setBody(''); void bodyEl.offsetWidth; setBody(cls);
  if (cls === 'happy') { transientUntil = Date.now() + ms; refreshImage(); }
  transientTimer = setTimeout(settle, ms);
}
function setMode(m) {
  mode = m;
  stats.asleep = m === 'sleep';
  $('#sleepIcon').textContent = m === 'sleep' ? '☀️' : '😴';
  $('#sleepLabel').textContent = m === 'sleep' ? 'Uyan' : 'Uyu';
  setSleepingLids();
  settle();
  saveStats();
}

let walking = false;
async function walk() {
  if (walking || mode !== 'idle' || panel || !menuEl.hidden || dragging || !settings.walk) return;
  walking = true;
  const dir = Math.random() < 0.5 ? -1 : 1;
  flipEl.classList.toggle('left', dir < 0);
  setBody('walk');
  const steps = 50 + Math.floor(Math.random() * 90);
  for (let i = 0; i < steps; i++) {
    if (dragging || mode !== 'idle' || panel || !menuEl.hidden) break;
    const r = await window.desk.walkStep(dir * 2);
    if (r.edge) break;
    await wait(33);
  }
  walking = false;
  settle();
  if (Math.random() < 0.5) setTimeout(() => flipEl.classList.remove('left'), 1500);
}

async function lookAround() {
  flipEl.classList.add('left'); await wait(900);
  flipEl.classList.remove('left'); await wait(700);
}

/* ---------------- Konuşma balonu ---------------- */
let bubbleTimer = null;
function say(text, ms) {
  if (!text) return;
  bubbleEl.hidden = false; bubbleEl.classList.remove('fade');
  bubbleEl.textContent = text;
  clearTimeout(bubbleTimer);
  const dur = ms || Math.min(9000, 2600 + text.length * 70);
  bubbleTimer = setTimeout(() => { bubbleEl.classList.add('fade'); setTimeout(() => { bubbleEl.hidden = true; bubbleEl.classList.remove('fade'); }, 400); }, dur);
}
function sayL(key, extra) { say(fill(rnd(L[key]), extra)); }

/* ---------------- İstatistikler ---------------- */
function applyMinutes(min) {
  const asleep = mode === 'sleep';
  const together = ['read', 'study', 'music'].includes(mode);
  stats.food = clamp(stats.food - min * (asleep ? 0.12 : 0.25), 0, 100);
  stats.joy = clamp(stats.joy + min * (together ? 0.2 : asleep ? -0.05 : -0.15), 0, 100);
  stats.energy = clamp(stats.energy + min * (asleep ? 0.8 : together ? -0.06 : -0.12), 0, 100);
}
function saveStats() { stats.t = Date.now(); dbSet('stats', stats); }
function renderBars() {
  for (const [id, v] of [['#barFood', stats.food], ['#barJoy', stats.joy], ['#barEnergy', stats.energy]]) {
    const u = $(id); u.style.width = v + '%'; u.classList.toggle('low', v < 30);
  }
}
function addLog(kind, mins) {
  const d = today();
  log.days[d] = log.days[d] || { read: 0, study: 0 };
  log.days[d][kind] += mins;
  dbSet('log', log);
}

/* ---------------- Ana döngü ---------------- */
let lastTick = Date.now(), lastSave = Date.now(), nextIdle = Date.now() + 8000;
setInterval(() => {
  const now = Date.now();
  applyMinutes((now - lastTick) / 60000);
  lastTick = now;
  renderBars();
  if (now - lastSave > 30000) { saveStats(); lastSave = now; }

  if (session) tickSession(now);
  if (mode === 'sleep') {
    if (Math.random() < 0.33) floatAt(rnd(['z', 'Z', 'z']), petEl.clientWidth * 0.62, 6, 'zzz', 13 + Math.random() * 8);
    if (stats.energy >= 99.5) { setMode('idle'); transient('hop', 600); sayL('wake'); }
  }
  if (mode === 'music' && Math.random() < 0.4) floatAt(rnd(['♪', '♫', '♬']), petEl.clientWidth * (Math.random() < 0.5 ? 0.08 : 0.82), 20 + Math.random() * 40, 'float', 18);

  if (mode === 'idle' && !dragging && !walking && !panel) {
    const quiet = now - lastInteract < 4000;
    if (!quiet && now - lastNag > 15 * 60000) {
      if (stats.food < 30) { sayL('hungry'); transient('wiggle', 500); lastNag = now; }
      else if (stats.energy < 15) { sayL('sleepy'); lastNag = now; }
      else if (stats.joy < 30) { sayL('bored'); transient('hop', 600); lastNag = now; }
    }
    if (settings.chatty && now - lastChatter > (7 + Math.random() * 6) * 60000 && menuEl.hidden) {
      lastChatter = now; sayL('random');
    }
    if (now > nextIdle && menuEl.hidden) {
      nextIdle = now + 9000 + Math.random() * 16000;
      const r = Math.random();
      if (r < 0.35) walk();
      else if (r < 0.55) transient('hop', 600);
      else if (r < 0.7) lookAround();
      else if (r < 0.8) transient('wiggle', 520);
    }
  }
}, 1000);

/* ---------------- Fare: tıklama, sürükleme, içinden geçme ---------------- */
let ignoring = true;
function setIgnore(v) { if (v !== ignoring) { ignoring = v; window.desk.setIgnore(v); } }
let barsTimer = null;
document.addEventListener('mousemove', (e) => {
  if (dragging) { setIgnore(false); return; }
  const el = document.elementFromPoint(e.clientX, e.clientY);
  let hit = !!(el && el.closest('.hit'));
  let onPet = false;
  if (hit && el.closest('#pet')) { hit = alphaAt(e.clientX, e.clientY); onPet = hit; }
  setIgnore(!hit);
  petEl.style.cursor = onPet ? '' : 'default';
  if (onPet) { if (!barsTimer && barsEl.hidden) barsTimer = setTimeout(() => { barsEl.hidden = false; }, 450); }
  else { clearTimeout(barsTimer); barsTimer = null; barsEl.hidden = true; }
});
document.addEventListener('mouseleave', () => { setIgnore(true); clearTimeout(barsTimer); barsTimer = null; barsEl.hidden = true; });

let down = null, clicks = [];
petEl.addEventListener('pointerdown', (e) => {
  if (!alphaAt(e.clientX, e.clientY)) return;
  down = { x: e.screenX, y: e.screenY };
  petEl.setPointerCapture(e.pointerId);
});
// Sürükleme bırakıldığında bazen "bırakma" olayı kaçabiliyor; o zaman arkadaş fareyi takip etmeye devam ediyordu.
// Bunu önlemek için: fare tuşu artık basılı değilse ya da pencere odağını kaybederse sürüklemeyi hemen bitir.
function cancelDrag() {
  if (!down && !dragging) return;
  down = null;
  if (dragging) { dragging = false; window.desk.dragEnd(); petEl.classList.remove('dragging'); settle(); }
}
['pointercancel', 'lostpointercapture'].forEach((ev) => petEl.addEventListener(ev, cancelDrag));
window.addEventListener('blur', cancelDrag);
document.addEventListener('mouseup', () => { if (dragging) setTimeout(cancelDrag, 0); });
document.addEventListener('mousemove', (e) => { if ((down || dragging) && e.buttons === 0) cancelDrag(); }, true);
petEl.addEventListener('pointermove', (e) => {
  if (!down) return;
  if (e.buttons === 0) { cancelDrag(); return; }
  if (!dragging && Math.hypot(e.screenX - down.x, e.screenY - down.y) > 5) {
    dragging = true; window.desk.dragStart();
    petEl.classList.add('dragging'); setBody('drag');
    hideMenu(); barsEl.hidden = true;
  }
  if (dragging) window.desk.dragMove();
});
petEl.addEventListener('pointerup', () => {
  if (!down) return;
  down = null;
  if (dragging) {
    dragging = false; window.desk.dragEnd();
    petEl.classList.remove('dragging');
    transient('hop', 600);
    if (Math.random() < 0.4) sayL('dropped');
    return;
  }
  onPetClick();
});

function onPetClick() {
  lastInteract = Date.now();
  const now = Date.now();
  clicks = clicks.filter((t) => now - t < 1500); clicks.push(now);
  if (clicks.length >= 4) {
    clicks = [];
    transient('wiggle', 520); sayL('tickle'); hearts(2);
    stats.joy = clamp(stats.joy + 3);
    return;
  }
  if (menuEl.hidden) {
    showMenu();
    if (mode === 'sleep') { say('Zzz... hı? 😪'); }
    else { transient('hop', 600); if (Math.random() < 0.45) sayL('click'); }
  } else {
    hideMenu();
  }
}

let menuTimer = null;
function showMenu() {
  menuEl.hidden = false;
  clearTimeout(menuTimer);
  menuTimer = setTimeout(() => { if (!panel) hideMenu(); }, 14000);
}
function hideMenu() { menuEl.hidden = true; closePanel(); }

menuEl.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  lastInteract = Date.now();
  clearTimeout(menuTimer);
  const act = b.dataset.act;
  if (act === 'settings') { window.desk.openSettings(); hideMenu(); return; }
  if (act === 'sleep') { toggleSleep(); hideMenu(); return; }
  if (panel === act) { closePanel(); return; }
  openPanel(act);
});

/* ---------------- Paneller ---------------- */
function closePanel() {
  panel = null; panelEl.hidden = true; panelEl.innerHTML = '';
  if (gameState) endGame(true);
}
function openPanel(name) {
  if (gameState) endGame(true);
  panel = name; panelEl.hidden = false;
  ({ feed: panelFeed, play: panelPlay, read: panelRead, music: panelMusic, chat: panelChat })[name]();
}
function head(title) {
  return `<div class="ph">${title}<button class="x" data-close title="Kapat">✕</button></div>`;
}
panelEl.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closePanel(); });

/* yemek */
function panelFeed() {
  panelEl.innerHTML = head('Ne yesin?') + `<div class="pb"><div class="foods">${FOODS.map((f, i) => `<button class="food" data-i="${i}"><span>${f.e}</span>${f.n}</button>`).join('')}</div></div>`;
  panelEl.querySelectorAll('.food').forEach((b) => b.addEventListener('click', () => feed(FOODS[+b.dataset.i])));
}
let eating = false;
async function feed(f) {
  if (eating) return;
  if (mode === 'sleep') { say('Zzz... uyurken yiyemem 😴'); return; }
  if (stats.food > 95) { sayL('full'); transient('wiggle', 520); return; }
  eating = true; lastInteract = Date.now();
  const prev = mode;
  const w = petEl.clientWidth, h = petEl.clientHeight;
  const s = document.createElement('div');
  s.className = 'snack'; s.textContent = f.e;
  s.style.left = (w / 2 - 15) + 'px'; s.style.top = '-60px';
  petEl.appendChild(s);
  await wait(30);
  s.style.transform = `translateY(${h * 0.55 + 40}px) scale(.8)`;
  await wait(520);
  if (prev === 'idle' || prev === 'play') setMode('eat'); else setBody('eat');
  for (let i = 0; i < 7; i++) {
    setTimeout(() => {
      const c = document.createElement('div');
      c.className = 'crumb';
      c.style.left = (w / 2 - 10 + Math.random() * 20) + 'px'; c.style.top = (h * 0.6) + 'px';
      c.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
      c.style.background = rnd(['#b98653', '#d9a46a', '#8a5a3b']);
      petEl.appendChild(c); setTimeout(() => c.remove(), 1000);
    }, i * 200);
  }
  setTimeout(() => { s.style.opacity = '0'; }, 700);
  await wait(1700);
  s.remove();
  stats.food = clamp(stats.food + f.f); stats.joy = clamp(stats.joy + f.j); stats.energy = clamp(stats.energy + (f.en || 0));
  if (mode === 'eat') setMode('idle'); else settle();
  transient('happy', 1400); hearts(3);
  say(rnd(f.say));
  renderBars(); saveStats();
  eating = false;
}

/* oyun */
let gameState = null;
function panelPlay() {
  if (mode === 'sleep') { closePanel(); say('Zzz... önce beni uyandır 😴'); return; }
  if (stats.energy < 12) { closePanel(); sayL('tooTired'); return; }
  panelEl.innerHTML = head('Kalp yakala! 💗') + `<div class="pb"><p class="muted" style="margin:0 0 8px">Düşen kalplere tıkla. 20 saniyen var!</p><div id="game"><div id="gameScore">0</div></div><div class="row" style="margin-top:8px;justify-content:center"><button class="btn main" id="gameGo">Başla</button></div></div>`;
  $('#gameGo').addEventListener('click', startGame);
}
function startGame() {
  const g = $('#game'); $('#gameGo').hidden = true;
  gameState = { score: 0, end: Date.now() + 20000, spawn: null, raf: null, hearts: [] };
  setMode('play');
  gameState.spawn = setInterval(() => {
    const el = document.createElement('div');
    el.className = 'heart'; el.textContent = rnd(['💗', '💛', '💜', '🩷', '💚']);
    const x = 10 + Math.random() * (g.clientWidth - 40);
    el.style.left = x + 'px'; el.style.top = '-30px';
    const hh = { el, y: -30, v: 1.3 + Math.random() * 1.4 };
    el.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      if (el.classList.contains('pop')) return;
      el.classList.add('pop'); gameState.score++;
      $('#gameScore').textContent = gameState.score;
      if (gameState.score % 3 === 0) transient('happy', 900);
      setTimeout(() => el.remove(), 260);
    });
    g.appendChild(el); gameState.hearts.push(hh);
  }, 520);
  const loop = () => {
    if (!gameState) return;
    for (const hh of gameState.hearts) { hh.y += hh.v; hh.el.style.top = hh.y + 'px'; }
    gameState.hearts = gameState.hearts.filter((hh) => { if (hh.y > 180) { hh.el.remove(); return false; } return true; });
    if (Date.now() > gameState.end) { endGame(false); return; }
    gameState.raf = requestAnimationFrame(loop);
  };
  gameState.raf = requestAnimationFrame(loop);
}
function endGame(silent) {
  const gs = gameState; if (!gs) return;
  gameState = null;
  clearInterval(gs.spawn); cancelAnimationFrame(gs.raf);
  if (mode === 'play') setMode('idle');
  if (silent) return;
  stats.joy = clamp(stats.joy + Math.min(30, 6 + gs.score * 2));
  stats.energy = clamp(stats.energy - 8);
  renderBars(); saveStats();
  transient('happy', 1400); hearts(5);
  sayL('playDone', { n: gs.score });
  const g = $('#game');
  if (g) g.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-weight:700">${gs.score} kalp! 💗<button class="btn" id="again">Bir daha</button></div>`;
  const a = $('#again'); if (a) a.addEventListener('click', () => panelPlay());
}

/* okuma / çalışma */
function panelRead() {
  const d = log.days[today()] || { read: 0, study: 0 };
  const done = d.read + d.study;
  let kind = 'read', mins = 25;
  panelEl.innerHTML = head('Birlikte ne yapalım?') + `<div class="pb">
    <div class="chips" id="kinds"><button class="chip on" data-k="read">📖 Kitap okuyalım</button><button class="chip" data-k="study">✏️ Ders çalışalım</button></div>
    <div class="chips" id="mins">${[15, 25, 45, 60].map((m) => `<button class="chip ${m === 25 ? 'on' : ''}" data-m="${m}">${m} dk</button>`).join('')}</div>
    <div class="row"><input class="field" id="what" placeholder="Ne okuyorsun? (isteğe bağlı)"><button class="btn main" id="goRead">Başla</button></div>
    <p class="muted" style="margin:8px 0 0">${done ? `Bugün beraber ${done} dakika geçirdik 💛` : 'Ben yanında sessizce okurum, sen bitince kutlarız.'}</p></div>`;
  const pick = (box, attr, cb) => box.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; box.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b)); cb(b.dataset[attr]); });
  pick($('#kinds'), 'k', (v) => { kind = v; $('#what').placeholder = v === 'read' ? 'Ne okuyorsun? (isteğe bağlı)' : 'Hangi ders? (isteğe bağlı)'; });
  pick($('#mins'), 'm', (v) => { mins = +v; });
  const go = () => startSession(kind, mins, $('#what').value.trim());
  $('#goRead').addEventListener('click', go);
  $('#what').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}
function startSession(kind, mins, what) {
  session = { kind, mins, what, start: Date.now(), end: Date.now() + mins * 60000, nextMid: Date.now() + 10 * 60000 };
  hideMenu();
  setMode(kind);
  timerEl.hidden = false; tickSession(Date.now());
  say(what ? fill(rnd(kind === 'read' ? ['"{w}" mı? Çok merak ettim! Ben de yanında okuyorum 📖', 'Ooo, {w}! Hadi başlayalım 📖'] : ['{w} çalışıyoruz! Sen yaparsın 💪', 'Tamam, {w}! Ben de not alıyorum ✏️']), { w: what }) : fill(rnd(L[kind === 'read' ? 'readStart' : 'studyStart'])));
}
function tickSession(now) {
  const left = Math.max(0, session.end - now);
  const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
  timerText.textContent = `${session.kind === 'read' ? '📖' : '✏️'} ${m}:${String(s).padStart(2, '0')}`;
  if (now > session.nextMid && left > 60000) { session.nextMid = now + 10 * 60000; if (settings.chatty) sayL('readMid'); }
  if (left <= 0) finishSession(true);
}
function finishSession(completed) {
  if (!session) return;
  const s = session; session = null;
  timerEl.hidden = true;
  const mins = Math.round((Date.now() - s.start) / 60000);
  if (mins > 0) addLog(s.kind, mins);
  setMode('idle');
  if (completed) {
    stats.joy = clamp(stats.joy + 15);
    transient('happy', 1400); hearts(6);
    sayL('readDone', { m: s.mins, k: s.kind === 'read' ? 'okuduk' : 'çalıştık' });
  } else {
    say(mins > 0 ? `${mins} dakika da olsa güzeldi 💛` : 'Tamam, sonra devam ederiz 💛');
  }
}
$('#timerStop').addEventListener('click', () => finishSession(false));

/* müzik */
function panelMusic() {
  if (mode === 'music') {
    panelEl.innerHTML = head('Birlikte dinliyoruz 🎧') + `<div class="pb"><p style="margin:2px 0 10px">${song ? `Şu an: <b>${esc(song)}</b>` : 'Müzik açık, sallanıyoruz 🎶'}</p><div class="row"><input class="field" id="song" placeholder="Şarkı değişti mi?"><button class="btn" id="changeSong">Değiştir</button></div><div class="row" style="margin-top:8px;justify-content:flex-end"><button class="btn main" id="stopMusic">Müziği bitir</button></div></div>`;
    $('#changeSong').addEventListener('click', () => { const v = $('#song').value.trim(); if (v) startMusic(v); });
    $('#stopMusic').addEventListener('click', () => { setMode('idle'); song = ''; closePanel(); sayL('musicStop'); });
    return;
  }
  panelEl.innerHTML = head('Ne dinliyorsun? 🎧') + `<div class="pb"><p class="muted" style="margin:0 0 8px">Ben müziği duyamıyorum ama ne dinlediğini söylersen kulaklığımı takıp seninle sallanırım.</p><div class="row"><input class="field" id="song" placeholder="Şarkı ya da sanatçı (boş da olur)"><button class="btn main" id="goMusic">Dinleyelim</button></div></div>`;
  const go = () => startMusic($('#song').value.trim());
  $('#goMusic').addEventListener('click', go);
  $('#song').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}
async function startMusic(s) {
  if (mode === 'sleep') { setMode('idle'); }
  if (session) finishSession(false);
  song = s; setMode('music'); closePanel(); hideMenu();
  if (!s) { sayL('musicStart'); return; }
  say(`${s}! ${rnd(L.musicStart)}`);
  if (engineState === 'ready') {
    const t = await aiOnce(`Şu an birlikte "${s}" dinliyoruz. Bu şarkı ya da sanatçı hakkında tek kısa, tatlı ve neşeli bir cümle söyle.`);
    if (t && mode === 'music') say(t);
  }
}

/* uyku */
function toggleSleep() {
  if (mode === 'sleep') { setMode('idle'); transient('hop', 600); sayL('wake'); return; }
  if (session) finishSession(false);
  song = '';
  setMode('sleep'); sayL('sleepStart');
}

/* ---------------- Sohbet ---------------- */
// Electron'un özel adresinde en sağlam saklama yolu IndexedDB
const appCfg = () => ({ ...webllm.prebuiltAppConfig, cacheBackend: 'indexeddb' });
let engine = null, engineState = 'off', engineProgress = 0, engineText = '', webllm = null;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function panelChat() {
  panelEl.innerHTML = head(`${esc(settings.petName)} ile sohbet 💬`) + `<div id="brainBox"></div><div id="msgs"></div><div class="chatbar"><input class="field" id="chatIn" placeholder="Bir şey yaz…" autocomplete="off"><button class="btn main" id="chatGo">Gönder</button></div>`;
  renderBrain(); renderMsgs();
  const go = () => { const v = $('#chatIn').value.trim(); if (!v) return; $('#chatIn').value = ''; sendChat(v); };
  $('#chatGo').addEventListener('click', go);
  $('#chatIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  window.desk.focus();
  setTimeout(() => $('#chatIn') && $('#chatIn').focus(), 50);
}
function renderBrain() {
  const box = $('#brainBox'); if (!box) return;
  const m = MODELS.find((x) => x.id === settings.model) || MODELS[0];
  if (engineState === 'ready') { box.innerHTML = ''; return; }
  if (engineState === 'loading') { box.innerHTML = `<div class="brain" style="display:block">Sohbet beynim açılıyor… %${Math.round(engineProgress * 100)}<div class="prog"><i style="width:${engineProgress * 100}%"></i></div></div>`; return; }
  if (engineState === 'nogpu') { box.innerHTML = `<div class="brain">Bu bilgisayarda sohbet beynim çalışamadı, basit cevaplarla konuşuyorum.</div>`; return; }
  if (engineState === 'error') { box.innerHTML = `<div class="brain"><span>Sohbet beynim açılamadı. İnternetini kontrol edip tekrar dener misin?</span><button class="btn" id="brainGo">Tekrar dene</button></div>`; }
  else box.innerHTML = `<div class="brain"><span>Şimdilik basit konuşuyorum. Sohbet beynimi açarsan seni gerçekten anlarım. (${m.size}, bir kere iner)</span><button class="btn" id="brainGo">Aç</button></div>`;
  const b = $('#brainGo'); if (b) b.addEventListener('click', () => loadBrain());
}
function renderMsgs() {
  const box = $('#msgs'); if (!box) return;
  const items = chatHistory.slice(-30);
  box.innerHTML = items.length ? items.map((m) => `<div class="m ${m.role === 'user' ? 'me' : 'it'}">${esc(m.content)}</div>`).join('') : `<div class="m it">${esc(fill(greetingLine()))}</div>`;
  box.scrollTop = box.scrollHeight;
}

async function loadBrain(silent) {
  if (engineState === 'loading' || engineState === 'ready') return;
  if (!navigator.gpu) { engineState = 'nogpu'; renderBrain(); return; }
  engineState = 'loading'; engineProgress = 0; renderBrain();
  try {
    webllm = webllm || await import('./vendor/web-llm.js');
    engine = await webllm.CreateMLCEngine(settings.model, {
      appConfig: appCfg(),
      initProgressCallback: (r) => { engineProgress = r.progress || 0; engineText = r.text || ''; renderBrain(); }
    });
    engineState = 'ready'; renderBrain();
    if (!silent) say('Oh, şimdi her şeyi daha iyi anlıyorum! 💡');
  } catch (e) {
    console.error(e);
    engineState = 'error'; renderBrain();
  }
}

function moodWords() {
  const w = (v, a, b, c) => (v > 66 ? a : v > 33 ? b : c);
  return {
    food: w(stats.food, 'tok', 'biraz aç', 'çok aç'),
    joy: w(stats.joy, 'çok yerinde', 'idare eder', 'biraz düşük'),
    energy: w(stats.energy, 'dolu', 'orta', 'çok yorgun')
  };
}
function systemPrompt() {
  const mw = moodWords();
  const now = new Date();
  const modeLine = {
    idle: '', eat: 'Şu an yemek yiyorsun.', sleep: 'Şu an uyukluyorsun, uykulu konuş.',
    read: `Şu an onunla birlikte kitap okuyorsun${session && session.what ? ` (${session.what})` : ''}.`,
    study: `Şu an onunla birlikte ders çalışıyorsun${session && session.what ? ` (${session.what})` : ''}.`,
    music: `Şu an birlikte müzik dinliyorsunuz${song ? ` (${song})` : ''}.`, play: 'Şu an oyun oynuyorsunuz.'
  }[mode] || '';
  return `Sen "${settings.petName}" adında minik, tatlı bir masaüstü arkadaşısın. ${settings.userName} adlı kişinin bilgisayar ekranında yaşıyorsun. O seni besliyor, seninle kitap okuyor, ders çalışıyor, müzik dinliyor ve sohbet ediyor; sen de ona eşlik ediyorsun.
Kurallar:
- Her zaman Türkçe konuş. Sade ve doğru Türkçe kullan.
- Cevapların çok kısa olsun: en fazla iki kısa cümle.
- Sıcak, neşeli, sevimli ve biraz şakacı ol. Bazen bir emoji kullanabilirsin.
- Liste, başlık ya da uzun açıklama yapma.
- Bilmediğin bir şeyi uydurma; emin değilsen tatlı bir şekilde bilmediğini söyle.
Şu anki hâlin: karnın ${mw.food}, keyfin ${mw.joy}, enerjin ${mw.energy}. ${modeLine}
Saat ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}.`;
}

let chatBusy = false;
async function sendChat(text) {
  if (chatBusy) return;
  chatBusy = true; lastInteract = Date.now();
  chatHistory.push({ role: 'user', content: text });
  renderMsgs();
  const box = $('#msgs');
  const out = document.createElement('div'); out.className = 'm it'; out.textContent = '…';
  if (box) { box.appendChild(out); box.scrollTop = box.scrollHeight; }
  let reply = '';
  if (engineState === 'ready') {
    try {
      const msgs = [{ role: 'system', content: systemPrompt() }, ...chatHistory.slice(-10)];
      const stream = await engine.chat.completions.create({ messages: msgs, stream: true, temperature: 0.8, top_p: 0.9, max_tokens: 110, frequency_penalty: 0.3 });
      for await (const ch of stream) {
        reply += ch.choices[0]?.delta?.content || '';
        out.textContent = reply;
        const b = $('#msgs'); if (b) b.scrollTop = b.scrollHeight;
      }
      reply = reply.trim();
    } catch (e) { console.error(e); reply = ''; }
  }
  if (!reply) {
    await wait(500 + Math.random() * 500);
    reply = fill(cannedReply(text));
    if (engineState !== 'ready' && Math.random() < 0.25) reply += '\n' + L.noBrain[0];
  }
  out.textContent = reply;
  chatHistory.push({ role: 'assistant', content: reply });
  chatHistory = chatHistory.slice(-40);
  dbSet('chat', chatHistory);
  if (!panel || panel !== 'chat') say(reply);
  if (/sev|tatlı|canım|💗|❤/i.test(text)) { hearts(3); stats.joy = clamp(stats.joy + 4); }
  else stats.joy = clamp(stats.joy + 1);
  transient('hop', 600);
  chatBusy = false;
}
async function aiOnce(instruction) {
  if (engineState !== 'ready') return '';
  try {
    const r = await engine.chat.completions.create({ messages: [{ role: 'system', content: systemPrompt() }, { role: 'user', content: instruction }], temperature: 0.8, max_tokens: 70 });
    return (r.choices[0]?.message?.content || '').trim();
  } catch (e) { return ''; }
}

function cannedReply(t) {
  const s = t.toLocaleLowerCase('tr');
  const mw = moodWords();
  const rules = [
    [/(merhaba|selam|hey|naber)/, ['Selam {u}! Seni gördüğüme sevindim 💛', 'Merhabaaa! Bugün neler yapıyoruz?']],
    [/nasılsın|nasıl gidiyor|iyi misin/, [`Karnım ${mw.food}, keyfim ${mw.joy}! Sen nasılsın?`, 'Seninle olunca hep iyiyim 💛 Sen?']],
    [/(aç mısın|acık|karnın)/, [stats.food < 40 ? 'Evet, çok acıktım! Bir kurabiye? 🥺🍪' : 'Şu an tokum, teşekkür ederim 💛']],
    [/(yorgun|yoruldum|uykum)/, ['Biraz mola ver, ben de yanında dinlenirim 💛', 'Bir bardak su iç, sonra devam edersin.']],
    [/(üzgün|kötü|mutsuz|ağla|canım sıkkın|stres)/, ['Sana sarılabilseydim hemen sarılırdım 🤍 Anlatmak ister misin?', 'Yanındayım. Bazen günler zor geçiyor, ama sen çok güçlüsün.']],
    [/(mutlu|harika|süper|iyiyim|çok iyi)/, ['Yaşasın! Senin mutluluğun benim mutluluğum 💗', 'Ooo, ne güzel! Kutlayalım mı? 🎉']],
    [/(kitap|oku|roman)/, ['Kitapları çok seviyorum! Birlikte okuyalım mı? 📖', 'Hangi kitap? Anlat anlat!']],
    [/(şarkı|müzik|dinl)/, ['Müzik zamanı! Kulaklığımı takayım mı? 🎧', 'Ne dinliyorsun? Ben de sallanmak istiyorum 🎶']],
    [/(ders|tez|çalış|ödev|spss)/, ['Hadi beraber çalışalım, ben de yanında not alırım ✏️', 'Sen yaparsın! Küçük küçük ilerleyelim 💪']],
    [/(seviyorum|sevdim|tatlısın|canımsın)/, ['Ben de seni çok seviyorum! 💗', 'Utandım şimdi 🙈💗']],
    [/(teşekkür|sağ ol|sağol)/, ['Rica ederim! 💛', 'Her zaman!']],
    [/(adın ne|kimsin|sen ne)/, [`Ben ${settings.petName}! Senin masaüstü arkadaşınım 💛`]],
    [/(iyi geceler|uyu)/, ['İyi geceler {u}! Tatlı rüyalar 🌙', 'Uyku vakti mi? Sen de dinlen 🌙']],
    [/(günaydın)/, ['Günaydııın! ☀️ Bugün güzel bir gün olacak.']],
    [/\?$/, ['Hmm, bunu bilmiyorum ama birlikte düşünebiliriz 🤔', 'Güzel soru! Sen ne düşünüyorsun?']]
  ];
  for (const [re, ans] of rules) if (re.test(s)) return rnd(ans);
  return rnd(['Anlat anlat, dinliyorum! 👂', 'Ooo, ilginç!', 'Seni dinlemek çok güzel 💛', 'Hihi, öyle mi?', 'Bunu bana anlattığın için sevindim.']);
}

function greetingLine() {
  const h = new Date().getHours();
  return rnd(L[h < 12 && h >= 5 ? 'morning' : h < 18 && h >= 5 ? 'afternoon' : h < 23 && h >= 5 ? 'evening' : 'night']);
}

/* ---------------- Ayarlardan gelen haberler ---------------- */
window.desk.onBroadcast(async (m) => {
  if (m.type === 'chars') { chars = await dbGet('chars', []); activeId = await dbGet('active', null); shownSrc = ''; refreshImage(); transient('happy', 1400); hearts(4); }
  if (m.type === 'settings') {
    const old = settings.model;
    settings = { ...DEFAULT_SETTINGS, ...(await dbGet('settings', {})) };
    refreshImage();
    if (old !== settings.model) { try { if (engine) await engine.unload(); } catch (e) {} engine = null; engineState = 'off'; maybeAutoLoad(); }
  }
  if (m.type === 'eyes-test') { blink(); }
});

async function maybeAutoLoad() {
  try {
    if (!navigator.gpu) return;
    webllm = webllm || await import('./vendor/web-llm.js');
    if (await webllm.hasModelInCache(settings.model, appCfg())) loadBrain(true);
  } catch (e) {}
}

/* ---------------- Başlangıç ---------------- */
(async function init() {
  settings = { ...DEFAULT_SETTINGS, ...(await dbGet('settings', {})) };
  chars = await dbGet('chars', []);
  activeId = await dbGet('active', null);
  log = await dbGet('log', { days: {} });
  chatHistory = await dbGet('chat', []);
  const saved = await dbGet('stats', null);
  if (saved) {
    stats = { ...DEFAULT_STATS, ...saved };
    mode = stats.asleep ? 'sleep' : 'idle';
    const away = Math.min(12 * 60, (Date.now() - (saved.t || Date.now())) / 60000);
    applyMinutes(away);
    stats.food = Math.max(stats.food, 12); stats.joy = Math.max(stats.joy, 15); stats.energy = Math.max(stats.energy, 10);
  }
  setMode(mode);
  renderBars();
  setTimeout(() => {
    transient('hop', 600);
    if (!chars.length) {
      say(`Merhaba ${settings.userName}! Ben şimdilik bir yumurtayım 🥚 Bana tıkla → ⚙️ Ayarlar'dan bana bir görünüm ver!`, 9000);
    } else say(fill(greetingLine()));
  }, 700);
  if (!chars.length) setTimeout(() => window.desk.openSettings('chars'), 2500);
  setTimeout(maybeAutoLoad, 4000);
})();
