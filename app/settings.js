import { dbGet, dbSet, SLOTS, MODELS, DEFAULT_SETTINGS, uid, EGG_URL, HEADPHONES, BOOK, decoFor, defaultDeco } from './shared.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let chars = [], activeId = null, settings = { ...DEFAULT_SETTINGS }, editing = null;

function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }
async function saveChars() { await dbSet('chars', chars); await dbSet('active', activeId); window.desk.broadcast({ type: 'chars' }); }
async function saveSettings() { await dbSet('settings', settings); window.desk.broadcast({ type: 'settings' }); }

/* ---------------- Sekmeler ---------------- */
function goto(tab) {
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('main section').forEach((s) => (s.hidden = s.id !== 'tab-' + tab));
  if (tab === 'chars') renderChars();
  if (tab === 'prefs') renderPrefs();
  if (tab === 'brain') renderBrain();
}
document.querySelector('nav').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) goto(b.dataset.tab); });
window.desk.onGoto((t) => goto(t));

/* ---------------- Arkadaşlarım ---------------- */
function renderChars() {
  const el = $('#tab-chars');
  if (editing) return renderDetail();
  el.innerHTML = `<h2>Arkadaşlarım</h2><p class="muted">Bir fotoğraf ya da çizim yükle, arka planını silelim, o da masaüstünde yaşasın. Birden fazla arkadaşın olabilir; hangisi masaüstünde olacaksa onu seç.</p>
  <div class="grid">${chars.map((c) => `<button class="cc" data-id="${c.id}">${c.id === activeId ? '<span class="badge">Masaüstünde</span>' : ''}<div class="th checker">${c.imgs.normal ? `<img src="${c.imgs.normal}">` : '<span class="muted">Resim yok</span>'}</div><b>${esc(c.name)}</b></button>`).join('')}
  <button class="cc add" id="addChar"><span>＋</span><b>Yeni arkadaş</b><span class="muted" style="font-size:12px">Fotoğraf yükle</span></button></div>
  ${chars.length ? '' : `<p class="muted" style="margin-top:18px">Şimdilik masaüstünde minik bir yumurta var 🥚</p>`}`;
  el.querySelectorAll('.cc[data-id]').forEach((b) => b.addEventListener('click', () => { editing = b.dataset.id; renderDetail(); }));
  $('#addChar').addEventListener('click', () => {
    const c = { id: uid(), name: 'Yeni arkadaş', imgs: {}, eyes: null };
    pickImage(async (url) => {
      c.imgs.normal = url;
      chars.push(c);
      if (!activeId || !chars.find((x) => x.id === activeId)) activeId = c.id;
      await saveChars();
      editing = c.id; renderDetail();
      toast('Kaydedildi! Şimdi gözlerini işaretleyebilirsin 👀');
    });
  });
}

function renderDetail() {
  const c = chars.find((x) => x.id === editing);
  if (!c) { editing = null; return renderChars(); }
  const el = $('#tab-chars');
  el.innerHTML = `<div class="row" style="margin-bottom:12px"><button class="btn small" id="back">← Arkadaşlarım</button></div>
  <div class="row"><input class="field" id="cname" value="${esc(c.name)}" style="font-weight:700;font-size:15px;width:240px">
  ${c.id === activeId ? '<span class="btn small" style="background:var(--butter);border-color:#e3c070">Masaüstünde 💛</span>' : '<button class="btn main small" id="useIt">Masaüstüne koy</button>'}
  <button class="btn small" id="eyesBtn" ${c.imgs.normal ? '' : 'disabled'}>👀 ${c.eyes ? 'Gözleri düzenle' : 'Gözlerini işaretle'}</button>
  <button class="btn small" id="decoBtn" ${c.imgs.normal ? '' : 'disabled'}>🎧 Süsleri yerleştir</button>
  <span style="flex:1"></span><button class="btn small danger" id="delChar">Arkadaşı sil</button></div>
  <p class="muted" style="margin:12px 0 0">Her hâl için ayrı bir çizim koyabilirsin. Koymadıklarında normal hâli kullanılır, ben de üstüne süs eklerim (kulaklık, kitap, Zzz…).</p>
  <div class="slots">${SLOTS.map((s) => `<div class="slot"><div class="th ${c.imgs[s.key] ? 'checker' : 'empty'}">${c.imgs[s.key] ? `<img src="${c.imgs[s.key]}">` : 'Boş'}</div><b>${s.label}</b><small>${s.hint}</small>
    <div class="row"><button class="btn small" data-up="${s.key}">${c.imgs[s.key] ? 'Değiştir' : 'Yükle'}</button>${c.imgs[s.key] && s.key !== 'normal' ? `<button class="btn small danger" data-rm="${s.key}">Kaldır</button>` : ''}</div></div>`).join('')}</div>`;
  $('#back').addEventListener('click', () => { editing = null; renderChars(); });
  $('#cname').addEventListener('change', async (e) => { c.name = e.target.value.trim() || 'Arkadaşım'; await saveChars(); });
  const u = $('#useIt'); if (u) u.addEventListener('click', async () => { activeId = c.id; await saveChars(); renderDetail(); toast('Masaüstüne geçti 💛'); });
  $('#eyesBtn').addEventListener('click', () => openEyes(c));
  $('#decoBtn').addEventListener('click', () => openDeco(c));
  $('#delChar').addEventListener('click', async () => {
    if (!confirm(`"${c.name}" silinsin mi? Bu geri alınamaz.`)) return;
    chars = chars.filter((x) => x.id !== c.id);
    if (activeId === c.id) activeId = chars[0]?.id || null;
    await saveChars(); editing = null; renderChars();
  });
  el.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => pickImage(async (url) => {
    c.imgs[b.dataset.up] = url;
    if (b.dataset.up === 'normal' && c.eyes) { c.eyes = null; toast('Resim değişti, gözleri tekrar işaretlemelisin 👀'); }
    await saveChars(); renderDetail();
  })));
  el.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', async () => { delete c.imgs[b.dataset.rm]; await saveChars(); renderDetail(); }));
}

/* ---------------- Resim seçme + arka plan silme ---------------- */
let pickCb = null;
function pickImage(cb) { pickCb = cb; $('#file').value = ''; $('#file').click(); }
$('#file').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const bmp = await createImageBitmap(f);
    openEditor(bmp, pickCb);
  } catch (err) { alert('Bu resmi açamadım. PNG ya da JPG dener misin?'); }
});

function openEditor(bmp, done) {
  const MAX = 1000;
  const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  const W = Math.round(bmp.width * k), H = Math.round(bmp.height * k);
  const src = document.createElement('canvas'); src.width = W; src.height = H;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(bmp, 0, 0, W, H);
  const px = sctx.getImageData(0, 0, W, H).data;
  const N = W * H;

  let hasAlpha = false;
  for (let i = 3; i < px.length; i += 16) if (px[i] < 250) { hasAlpha = true; break; }

  const st = { auto: !hasAlpha, method: 'ai', tol: 18, largest: true, shrink: 0, brush: 28, tool: 'erase', bgView: 'checker' };
  let aiAlpha = null, aiState = 'idle';
  const autoA = new Uint8ClampedArray(N);
  let manual = new Uint8Array(N);
  const undo = [];
  const out = new ImageData(W, H);
  out.data.set(px);
  const work = document.createElement('canvas'); work.width = W; work.height = H;
  const wctx = work.getContext('2d');

  const root = $('#modalRoot');
  root.innerHTML = `<div class="overlay"><div class="modal">
    <div class="mh"><h2>Arka planı temizle</h2><span class="muted">Karakterin dışında kalan her şeyi sil.</span></div>
    <div class="mb">
      <div class="view checker" id="view"><canvas id="cv"></canvas><div class="cursor" id="cur" hidden></div>
        <div id="busy" hidden style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,250,240,.72);font-weight:600;text-align:center;padding:20px">✨ Yapay zekâ arka planı siliyor…<br><span class="muted" style="font-weight:400">Birkaç saniye sürer</span></div></div>
      <div class="tools">
        <div class="tool"><label><input type="checkbox" id="auto" ${st.auto ? 'checked' : ''}> Arka planı otomatik sil</label>
          <div class="seg" id="methodSeg"><button data-m="ai" class="on">✨ Yapay zekâ</button><button data-m="color">🎨 Renge göre</button></div>
          <div id="tolBox" hidden><span class="muted" style="font-size:12px">Hassasiyet</span><input type="range" id="tol" min="4" max="70" value="${st.tol}">
          <span class="muted" style="font-size:12px">Kenarlarda kâğıt kalırsa artır; karakterden parça gidiyorsa azalt.</span></div>
          <label style="font-weight:500"><input type="checkbox" id="largest" checked> Sadece ana karakteri tut</label>
          <span class="muted" style="font-size:12px">Kenarı içeri çek</span><input type="range" id="shrink" min="0" max="24" value="${st.shrink}"></div>
        <div class="tool"><label>Fırça</label>
          <div class="seg" id="toolSeg"><button data-t="erase" class="on">🧽 Sil</button><button data-t="restore">🖌️ Geri getir</button></div>
          <span class="muted" style="font-size:12px">Fırça boyu</span><input type="range" id="brush" min="4" max="90" value="${st.brush}">
          <button class="btn small" id="undo">↶ Geri al</button></div>
        <div class="tool"><label>Önizleme zemini</label>
          <div class="seg" id="bgSeg"><button data-b="checker" class="on">Damalı</button><button data-b="desk">Yeşil</button><button data-b="dark">Koyu</button></div></div>
      </div>
    </div>
    <div class="mf"><button class="btn" id="cancel">Vazgeç</button><button class="btn main" id="save">Kaydet</button></div>
  </div></div>`;

  const cv = $('#cv'), view = $('#view'), cur = $('#cur');
  const ctx = cv.getContext('2d');
  function fitCanvas() {
    const r = view.getBoundingClientRect();
    const s = Math.min((r.width - 20) / W, (r.height - 20) / H, 1.5);
    cv.width = Math.round(W * s); cv.height = Math.round(H * s);
    draw();
  }
  function draw() { wctx.putImageData(out, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(work, 0, 0, cv.width, cv.height); }
  function finalA(i) { return manual[i] === 1 ? 0 : manual[i] === 2 ? px[i * 4 + 3] : autoA[i]; }
  function rebuildAll() { const d = out.data; for (let i = 0; i < N; i++) d[i * 4 + 3] = finalA(i); draw(); }

  async function runAI() {
    aiState = 'running'; $('#busy').hidden = false; $('#save').disabled = true;
    try {
      const m = await import('./vendor/bgremove.js');
      const blob = await new Promise((r) => src.toBlob(r, 'image/png'));
      const res = await m.removeBackground(blob, { publicPath: new URL('vendor/bg/', location.href).href, model: 'small', output: { format: 'image/png' } });
      const bm = await createImageBitmap(res);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(bm, 0, 0, W, H);
      const d = cx.getImageData(0, 0, W, H).data;
      aiAlpha = new Uint8Array(N); for (let i = 0; i < N; i++) aiAlpha[i] = d[i * 4 + 3];
      aiState = 'done';
    } catch (e) {
      console.error(e); aiState = 'error';
      toast('Yapay zekâ çalışamadı, renge göre siliyorum');
      setMethod('color');
    }
    if (!$('#busy')) return; // pencere kapandı
    $('#busy').hidden = true; $('#save').disabled = false;
    computeAuto();
  }

  function computeAI() {
    const a = aiAlpha, nbs = (i) => { const x = i % W, y = (i / W) | 0; return [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]; };
    const keep = new Uint8Array(N);
    const q = new Int32Array(N); let qh = 0, qt = 0;
    if (st.largest) {
      // en büyük belirgin parçayı bul (yerdeki şeker gibi ayrı nesneler gitsin)
      const lab = new Int32Array(N); let best = 0, bestSize = 0, id = 0;
      for (let s0 = 0; s0 < N; s0++) {
        if (a[s0] < 110 || lab[s0]) continue;
        id++; let size = 0; qh = 0; qt = 0; q[qt++] = s0; lab[s0] = id;
        while (qh < qt) { const i = q[qh++]; size++; for (const n of nbs(i)) if (n >= 0 && !lab[n] && a[n] >= 110) { lab[n] = id; q[qt++] = n; } }
        if (size > bestSize) { bestSize = size; best = id; }
      }
      const depth = new Uint8Array(N); qh = 0; qt = 0;
      for (let i = 0; i < N; i++) if (lab[i] === best) { keep[i] = 1; q[qt++] = i; }
      // yumuşak kenarları ekle
      while (qh < qt) { const i = q[qh++]; if (depth[i] >= 8) continue; for (const n of nbs(i)) if (n >= 0 && !keep[n] && a[n] > 8) { keep[n] = 1; depth[n] = depth[i] + 1; q[qt++] = n; } }
      // içerideki küçük delikleri doldur
      const outside = new Uint8Array(N); qh = 0; qt = 0;
      const pushO = (i) => { if (!outside[i] && !keep[i]) { outside[i] = 1; q[qt++] = i; } };
      for (let x = 0; x < W; x++) { pushO(x); pushO((H - 1) * W + x); }
      for (let y = 0; y < H; y++) { pushO(y * W); pushO(y * W + W - 1); }
      while (qh < qt) { const i = q[qh++]; for (const n of nbs(i)) if (n >= 0) pushO(n); }
      const seen = new Uint8Array(N);
      for (let s0 = 0; s0 < N; s0++) {
        if (outside[s0] || keep[s0] || seen[s0]) continue;
        const comp = []; qh = 0; qt = 0; q[qt++] = s0; seen[s0] = 1;
        while (qh < qt) { const i = q[qh++]; comp.push(i); for (const n of nbs(i)) if (n >= 0 && !outside[n] && !keep[n] && !seen[n]) { seen[n] = 1; q[qt++] = n; } }
        if (comp.length < bestSize * 0.015) for (const i of comp) keep[i] = 2;
      }
    } else for (let i = 0; i < N; i++) keep[i] = a[i] > 8 ? 1 : 0;
    // karakterin içi tam opak olsun (açık renkli eller vs. yarı saydam kalmasın)
    const dIn = new Uint16Array(N);
    for (let i = 0; i < N; i++) dIn[i] = keep[i] ? 65535 : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!dIn[i]) continue; dIn[i] = Math.min(dIn[i], (y > 0 ? dIn[i - W] : 0) + 1, (x > 0 ? dIn[i - 1] : 0) + 1); }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!dIn[i]) continue; dIn[i] = Math.min(dIn[i], (y < H - 1 ? dIn[i + W] : 0) + 1, (x < W - 1 ? dIn[i + 1] : 0) + 1); }
    const isBg = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (!keep[i]) { autoA[i] = 0; isBg[i] = 1; continue; }
      let v = keep[i] === 2 ? 255 : a[i];
      if (dIn[i] > 5 && v > 40) v = 255;
      autoA[i] = Math.round(v * px[i * 4 + 3] / 255);
    }
    return isBg;
  }

  function setMethod(m) {
    st.method = m;
    $('#methodSeg').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.m === m));
    $('#tolBox').hidden = m !== 'color';
    st.shrink = m === 'color' ? 4 : 0; $('#shrink').value = st.shrink;
    computeAuto();
  }

  function computeAuto() {
    if (!st.auto) { for (let i = 0; i < N; i++) autoA[i] = px[i * 4 + 3]; rebuildAll(); return; }
    if (st.method === 'ai') {
      if (aiState === 'running') return;
      if (!aiAlpha) { runAI(); return; }
      applyShrink(computeAI());
      return;
    }
    // kenarlardan arka plan rengini bul
    // Kâğıt dokusu çoğunlukla açık-koyu farkıdır; karakter ise renk tonuyla ayrılır.
    // Bu yüzden renk tonu (sarılık/kırmızılık) farkına parlaklıktan çok daha fazla ağırlık veriyoruz.
    const lab = (i) => { const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2]; return [(r + g + b) / 3, r - g, (r + g) / 2 - b]; };
    const Ls = [], As = [], Bs = [];
    const take = (x, y) => { const v = lab(y * W + x); Ls.push(v[0]); As.push(v[1]); Bs.push(v[2]); };
    for (let x = 0; x < W; x += 3) { take(x, 0); take(x, H - 1); }
    for (let y = 0; y < H; y += 3) { take(0, y); take(W - 1, y); }
    const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
    const bl = med(Ls), ba = med(As), bb = med(Bs);
    const dist = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const v = lab(i), dL = v[0] - bl, dA = v[1] - ba, dB = v[2] - bb;
      dist[i] = Math.sqrt(0.3 * dL * dL + 9 * (dA * dA + dB * dB));
      if (px[i * 4 + 3] < 20) dist[i] = 0;
    }
    const tol = st.tol;
    const isBg = new Uint8Array(N);
    const q = new Int32Array(N); let qh = 0, qt = 0;
    const push = (i) => { if (!isBg[i] && dist[i] < tol) { isBg[i] = 1; q[qt++] = i; } };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (qh < qt) {
      const i = q[qh++], x = i % W, y = (i / W) | 0;
      if (x > 0) push(i - 1); if (x < W - 1) push(i + 1);
      if (y > 0) push(i - W); if (y < H - 1) push(i + W);
    }
    if (st.largest) {
      // Gölge gibi soluk alanlar parçaları birbirine bağlamasın diye, önce sadece belirgin
      // ("çekirdek") pikseller üzerinden en büyük parçayı buluyoruz, sonra onun hemen çevresini ekliyoruz.
      const nbs = (i) => { const x = i % W, y = (i / W) | 0; return [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]; };
      const coreT = Math.max(40, tol * 2.2);
      // ince köprüleri (gölge, kırıntı) kırmak için çekirdeği biraz aşındır
      const ero = Math.max(3, Math.round(Math.max(W, H) / 40));
      const dt = new Uint16Array(N);
      for (let i = 0; i < N; i++) dt[i] = (!isBg[i] && dist[i] > coreT) ? 65535 : 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (!dt[i]) continue;
        const up = y > 0 ? dt[i - W] : 0, lf = x > 0 ? dt[i - 1] : 0;
        dt[i] = Math.min(dt[i], up + 1, lf + 1);
      }
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x; if (!dt[i]) continue;
        const dn = y < H - 1 ? dt[i + W] : 0, rt = x < W - 1 ? dt[i + 1] : 0;
        dt[i] = Math.min(dt[i], dn + 1, rt + 1);
      }
      const isCore = (i) => dt[i] > ero;
      const lab = new Int32Array(N); let best = 0, bestSize = 0, id = 0;
      for (let s = 0; s < N; s++) {
        if (!isCore(s) || lab[s]) continue;
        id++; let size = 0; qh = 0; qt = 0; q[qt++] = s; lab[s] = id;
        while (qh < qt) {
          const i = q[qh++]; size++;
          for (const n of nbs(i)) if (n >= 0 && !lab[n] && isCore(n)) { lab[n] = id; q[qt++] = n; }
        }
        if (size > bestSize) { bestSize = size; best = id; }
      }
      if (bestSize > N * 0.002) {
        const keep = new Uint8Array(N), depth = new Uint8Array(N);
        qh = 0; qt = 0;
        for (let i = 0; i < N; i++) if (lab[i] === best) { keep[i] = 1; q[qt++] = i; }
        // 1) aşındırmayla kaybolanı geri ver (sadece belirgin piksellerden)
        while (qh < qt) {
          const i = q[qh++];
          if (depth[i] >= ero + 1) continue;
          for (const n of nbs(i)) if (n >= 0 && !keep[n] && dt[n] > 0) { keep[n] = 1; depth[n] = depth[i] + 1; q[qt++] = n; }
        }
        // 2) karakterin dış çizgisindeki küçük boşlukları kapat, içini doldur
        //    (açık renkli baş/göbek gibi soluk iç bölgeler böylece silinmez)
        const distTo = (m) => {
          const o = new Uint16Array(N);
          for (let i = 0; i < N; i++) o[i] = m[i] ? 0 : 65535;
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!o[i]) continue; o[i] = Math.min(o[i], (y > 0 ? o[i - W] : 65534) + 1, (x > 0 ? o[i - 1] : 65534) + 1); }
          for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!o[i]) continue; o[i] = Math.min(o[i], (y < H - 1 ? o[i + W] : 65534) + 1, (x < W - 1 ? o[i + 1] : 65534) + 1); }
          return o;
        };
        const c = Math.round(ero * 1.8);
        const dk = distTo(keep);
        const notDil = new Uint8Array(N); for (let i = 0; i < N; i++) notDil[i] = dk[i] > c ? 1 : 0;
        const dn = distTo(notDil);
        const closed = new Uint8Array(N); for (let i = 0; i < N; i++) closed[i] = (keep[i] || dn[i] > c) ? 1 : 0;
        const outside = new Uint8Array(N); qh = 0; qt = 0;
        const pushO = (i) => { if (!outside[i] && !closed[i]) { outside[i] = 1; q[qt++] = i; } };
        for (let x = 0; x < W; x++) { pushO(x); pushO((H - 1) * W + x); }
        for (let y = 0; y < H; y++) { pushO(y * W); pushO(y * W + W - 1); }
        while (qh < qt) { const i = q[qh++]; for (const n of nbs(i)) if (n >= 0) pushO(n); }
        const inner = new Uint8Array(N);
        for (let i = 0; i < N; i++) {
          if (outside[i]) continue;
          if (keep[i] || !closed[i] || dist[i] >= tol * 1.8) inner[i] = 1; // çekirdek, kapalı iç bölge ya da belirgin renk
        }
        // 3) yumuşak kenar için birkaç piksel (kâğıt olmayan)
        qh = 0; qt = 0;
        for (let i = 0; i < N; i++) { depth[i] = 0; if (inner[i]) q[qt++] = i; }
        while (qh < qt) {
          const i = q[qh++];
          if (depth[i] >= 3) continue;
          for (const n of nbs(i)) if (n >= 0 && !inner[n] && !isBg[n]) { inner[n] = 1; depth[n] = depth[i] + 1; q[qt++] = n; }
        }
        for (let i = 0; i < N; i++) isBg[i] = inner[i] ? 0 : 1;
      }
    }
    // kenar yumuşatma
    const near = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (isBg[i]) continue;
      const x = i % W, y = (i / W) | 0;
      outer: for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        if (isBg[yy * W + xx]) { near[i] = 1; break outer; }
      }
    }
    const lo = tol * 0.6, hi = tol * 1.7;
    for (let i = 0; i < N; i++) {
      if (isBg[i]) { autoA[i] = 0; continue; }
      let a = px[i * 4 + 3];
      if (near[i]) { const t = Math.min(1, Math.max(0, (dist[i] - lo) / (hi - lo))); a = Math.round(a * (0.25 + 0.75 * t * t * (3 - 2 * t))); }
      autoA[i] = a;
    }
    applyShrink(isBg);
  }

  function applyShrink(isBg) {
    if (st.method === 'ai' && st.shrink === 0) { rebuildAll(); return; }
    // kenarı içeri çek + yumuşat (yaklaşık gerçek mesafeyle, köşeli olmasın)
    const ed = new Float32Array(N);
    for (let i = 0; i < N; i++) ed[i] = isBg[i] ? 0 : 1e9;
    const D = Math.SQRT2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!ed[i]) continue;
      let v = ed[i];
      if (x > 0) v = Math.min(v, ed[i - 1] + 1); else v = Math.min(v, 1);
      if (y > 0) { v = Math.min(v, ed[i - W] + 1); if (x > 0) v = Math.min(v, ed[i - W - 1] + D); if (x < W - 1) v = Math.min(v, ed[i - W + 1] + D); } else v = Math.min(v, 1);
      ed[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; if (!ed[i]) continue;
      let v = ed[i];
      if (x < W - 1) v = Math.min(v, ed[i + 1] + 1); else v = Math.min(v, 1);
      if (y < H - 1) { v = Math.min(v, ed[i + W] + 1); if (x < W - 1) v = Math.min(v, ed[i + W + 1] + D); if (x > 0) v = Math.min(v, ed[i + W - 1] + D); } else v = Math.min(v, 1);
      ed[i] = v;
    }
    const sh = st.shrink, fe = 2.5;
    for (let i = 0; i < N; i++) {
      if (!autoA[i]) continue;
      const t = Math.min(1, Math.max(0, (ed[i] - sh) / fe));
      autoA[i] = Math.round(autoA[i] * t);
    }
    rebuildAll();
  }

  let tolTimer = null;
  $('#auto').addEventListener('change', (e) => { st.auto = e.target.checked; computeAuto(); });
  $('#tol').addEventListener('input', (e) => { st.tol = +e.target.value; clearTimeout(tolTimer); tolTimer = setTimeout(computeAuto, 120); });
  $('#largest').addEventListener('change', (e) => { st.largest = e.target.checked; computeAuto(); });
  $('#methodSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMethod(b.dataset.m); });
  $('#shrink').addEventListener('input', (e) => { st.shrink = +e.target.value; clearTimeout(tolTimer); tolTimer = setTimeout(computeAuto, 120); });
  $('#brush').addEventListener('input', (e) => { st.brush = +e.target.value; });
  $('#toolSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st.tool = b.dataset.t; $('#toolSeg').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); });
  $('#bgSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; view.className = 'view ' + (b.dataset.b === 'checker' ? 'checker' : b.dataset.b); $('#bgSeg').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); });
  $('#undo').addEventListener('click', () => { if (undo.length) { manual = undo.pop(); rebuildAll(); } });

  let painting = false;
  function paintAt(e) {
    const r = cv.getBoundingClientRect();
    const sx = W / r.width, cx = (e.clientX - r.left) * sx, cy = (e.clientY - r.top) * sx;
    const rad = st.brush * sx / 2, v = st.tool === 'erase' ? 1 : 2;
    const x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(W - 1, Math.ceil(cx + rad));
    const y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(H - 1, Math.ceil(cy + rad));
    const d = out.data;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > rad * rad) continue;
      const i = y * W + x; manual[i] = v; d[i * 4 + 3] = finalA(i);
    }
    draw();
  }
  function moveCursor(e) {
    const r = view.getBoundingClientRect();
    cur.hidden = false; cur.style.left = (e.clientX - r.left) + 'px'; cur.style.top = (e.clientY - r.top) + 'px';
    cur.style.width = cur.style.height = st.brush + 'px';
  }
  cv.addEventListener('pointerdown', (e) => { painting = true; cv.setPointerCapture(e.pointerId); undo.push(manual.slice()); if (undo.length > 25) undo.shift(); paintAt(e); });
  cv.addEventListener('pointermove', (e) => { moveCursor(e); if (painting) paintAt(e); });
  cv.addEventListener('pointerup', () => { painting = false; });
  cv.addEventListener('pointerleave', () => { cur.hidden = true; });

  $('#cancel').addEventListener('click', () => { root.innerHTML = ''; });
  $('#save').addEventListener('click', () => {
    // boş kenarları kırp, boyutu küçült
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    const d = out.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { alert('Her şey silinmiş görünüyor 🙈 Biraz geri getir.'); return; }
    const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.03);
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const s = Math.min(1, 440 / ch, 560 / cw);
    wctx.putImageData(out, 0, 0);
    const fin = document.createElement('canvas'); fin.width = Math.round(cw * s); fin.height = Math.round(ch * s);
    const fctx = fin.getContext('2d'); fctx.imageSmoothingQuality = 'high';
    fctx.drawImage(work, x0, y0, cw, ch, 0, 0, fin.width, fin.height);
    root.innerHTML = '';
    done(fin.toDataURL('image/png'));
  });

  computeAuto();
  requestAnimationFrame(fitCanvas);
}

/* ---------------- Süsleri yerleştir ---------------- */
function openDeco(c) {
  const KINDS = { phones: { svg: HEADPHONES, ratio: 62 / 100, label: '🎧 Kulaklık', hint: 'Müzik dinlerken' }, book: { svg: BOOK, ratio: 56 / 100, label: '📖 Kitap', hint: 'Okurken / çalışırken' } };
  const pos = { phones: { ...decoFor(c, 'phones') }, book: { ...decoFor(c, 'book') } };
  let kind = 'phones';
  const root = $('#modalRoot');
  root.innerHTML = `<div class="overlay"><div class="modal" style="width:min(820px,100%)">
    <div class="mh"><h2>Süsleri yerleştir</h2><span class="muted">Süsü fareyle tutup karakterin üstünde istediğin yere sürükle.</span></div>
    <div class="mb"><div class="view checker" id="view" style="min-height:420px"><div id="stagebox" style="position:relative;display:inline-block"><img id="dimg" src="${c.imgs.normal}" style="display:block;max-height:400px;max-width:100%;user-select:none" draggable="false"><div id="dd" style="position:absolute;cursor:grab;touch-action:none"></div></div></div>
    <div class="tools">
      <div class="tool"><label>Hangi süs?</label><div class="seg" id="kindSeg">${Object.entries(KINDS).map(([k, v]) => `<button data-k="${k}" class="${k === kind ? 'on' : ''}">${v.label}</button>`).join('')}</div><span class="muted" style="font-size:12px" id="khint"></span></div>
      <div class="tool"><label>Boyutu</label><input type="range" id="dsize" min="10" max="130" value="50"><button class="btn small" id="dreset">Otomatik yerine dön</button></div>
    </div></div>
    <div class="mf"><button class="btn" id="cancel">Vazgeç</button><button class="btn main" id="save">Kaydet</button></div>
  </div></div>`;
  const img = $('#dimg'), dd = $('#dd');
  function render() {
    const w = img.clientWidth, h = img.clientHeight, p = pos[kind], K = KINDS[kind];
    dd.innerHTML = K.svg; dd.firstChild.style.display = 'block'; dd.firstChild.style.width = '100%';
    const dw = p.s * w; dd.style.width = dw + 'px';
    dd.style.left = (p.x * w - dw / 2) + 'px'; dd.style.top = (p.y * h - dw * K.ratio / 2) + 'px';
    $('#dsize').value = Math.round(p.s * 100); $('#khint').textContent = K.hint;
  }
  img.onload = render; if (img.complete) requestAnimationFrame(render);
  let drag = null;
  dd.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, p: { ...pos[kind] } }; dd.setPointerCapture(e.pointerId); dd.style.cursor = 'grabbing'; });
  dd.addEventListener('pointermove', (e) => {
    if (!drag) return; if (e.buttons === 0) { drag = null; return; }
    const w = img.clientWidth, h = img.clientHeight;
    pos[kind].x = Math.max(-0.2, Math.min(1.2, drag.p.x + (e.clientX - drag.x) / w));
    pos[kind].y = Math.max(-0.2, Math.min(1.2, drag.p.y + (e.clientY - drag.y) / h));
    render();
  });
  const end = () => { drag = null; dd.style.cursor = 'grab'; };
  dd.addEventListener('pointerup', end); dd.addEventListener('pointercancel', end);
  $('#dsize').addEventListener('input', (e) => { pos[kind].s = +e.target.value / 100; render(); });
  $('#kindSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; kind = b.dataset.k; $('#kindSeg').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); render(); });
  $('#dreset').addEventListener('click', () => { pos[kind] = defaultDeco({ eyes: c.eyes }, kind); render(); });
  $('#cancel').addEventListener('click', () => { root.innerHTML = ''; });
  $('#save').addEventListener('click', async () => { c.deco = { phones: pos.phones, book: pos.book }; await saveChars(); root.innerHTML = ''; toast('Süsler yerleştirildi 🎧📖'); });
}

/* ---------------- Gözler ---------------- */
function openEyes(c) {
  const im = new Image();
  im.onload = () => {
    const W = im.naturalWidth, H = im.naturalHeight;
    const base = document.createElement('canvas'); base.width = W; base.height = H;
    const bctx = base.getContext('2d', { willReadFrequently: true }); bctx.drawImage(im, 0, 0);
    const pts = c.eyes ? c.eyes.pts.map((p) => ({ x: p.x, y: p.y })) : [];
    let r = c.eyes ? c.eyes.r : 0.045;
    let closed = false;

    const root = $('#modalRoot');
    root.innerHTML = `<div class="overlay"><div class="modal" style="width:min(820px,100%)">
      <div class="mh"><h2>Gözlerini işaretle 👀</h2><span class="muted">İki gözünün tam ortasına birer kere tıkla. Göz kırpabilsin diye.</span></div>
      <div class="mb"><div class="view checker" id="view" style="min-height:420px"><canvas id="cv" style="cursor:crosshair"></canvas></div>
      <div class="tools"><div class="tool"><label>Göz büyüklüğü</label><input type="range" id="rad" min="10" max="140" value="${Math.round(r * 1000)}">
        <span class="muted" style="font-size:12px">Kahverengi daire gözün tamamını kaplasın, çok taşmasın.</span></div>
        <div class="tool"><button class="btn" id="try">😌 Göz kırpmayı dene</button><button class="btn small" id="clear">Noktaları temizle</button>
        <span class="muted" style="font-size:12px">Kapak rengi göz çevresinden otomatik alınır.</span></div></div></div>
      <div class="mf">${c.eyes ? '<button class="btn danger" id="rmEyes" style="margin-right:auto">Gözleri kaldır</button>' : ''}<button class="btn" id="cancel">Vazgeç</button><button class="btn main" id="save">Kaydet</button></div>
    </div></div>`;
    const cv = $('#cv'), view = $('#view'), ctx = cv.getContext('2d');
    let s = 1;
    function fit() { const b = view.getBoundingClientRect(); s = Math.min((b.width - 20) / W, (b.height - 20) / H, 2); cv.width = Math.round(W * s); cv.height = Math.round(H * s); draw(); }
    function lidColor(p) {
      const R = r * W, cx = p.x * W, cy = p.y * H; let tr = 0, tg = 0, tb = 0, n = 0;
      for (let a = -150; a <= -30; a += 10) for (const k of [1.5, 1.8, 2.1]) {
        const x = Math.round(cx + Math.cos(a * Math.PI / 180) * R * k), y = Math.round(cy + Math.sin(a * Math.PI / 180) * R * k);
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const d = bctx.getImageData(x, y, 1, 1).data; if (d[3] < 200) continue;
        tr += d[0]; tg += d[1]; tb += d[2]; n++;
      }
      if (!n) return '#fff7e6';
      return `rgb(${Math.round(tr / n)},${Math.round(tg / n)},${Math.round(tb / n)})`;
    }
    function draw() {
      ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(im, 0, 0, cv.width, cv.height);
      const R = r * W * s * 1.18;
      for (const p of pts) {
        const x = p.x * W * s, y = p.y * H * s;
        if (closed) {
          ctx.fillStyle = lidColor(p); ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#3b2c22'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y - R * 0.3, R * 0.65, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(140,90,60,.9)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }
    cv.addEventListener('click', (e) => {
      const b = cv.getBoundingClientRect();
      const p = { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height };
      if (pts.length >= 2) {
        const dd = pts.map((q) => (q.x - p.x) ** 2 + (q.y - p.y) ** 2);
        pts[dd[0] < dd[1] ? 0 : 1] = p;
      } else pts.push(p);
      draw();
    });
    $('#rad').addEventListener('input', (e) => { r = +e.target.value / 1000; draw(); });
    $('#clear').addEventListener('click', () => { pts.length = 0; draw(); });
    $('#try').addEventListener('click', () => { if (!pts.length) return toast('Önce gözlere tıkla 👀'); closed = true; draw(); setTimeout(() => { closed = false; draw(); }, 450); });
    $('#cancel').addEventListener('click', () => { root.innerHTML = ''; });
    const rm = $('#rmEyes'); if (rm) rm.addEventListener('click', async () => { c.eyes = null; await saveChars(); root.innerHTML = ''; renderDetail(); });
    $('#save').addEventListener('click', async () => {
      if (!pts.length) return toast('Önce gözlere tıkla 👀');
      c.eyes = { r, pts: pts.map((p) => ({ x: p.x, y: p.y, lid: lidColor(p) })) };
      await saveChars(); root.innerHTML = ''; renderDetail();
      toast('Gözler kaydedildi! Artık göz kırpıyor 😌');
    });
    requestAnimationFrame(fit);
  };
  im.src = c.imgs.normal;
}

/* ---------------- Ayarlar ---------------- */
async function renderPrefs() {
  const login = await window.desk.getLogin();
  const el = $('#tab-prefs');
  el.innerHTML = `<h2>Ayarlar</h2>
  <div class="set"><label>Arkadaşının adı</label><input class="field" id="petName" value="${esc(settings.petName)}" style="width:260px"><span class="muted">Sohbette kendini bu adla tanıtır.</span></div>
  <div class="set"><label>Sana ne desin?</label><input class="field" id="userName" value="${esc(settings.userName)}" style="width:260px"></div>
  <div class="set"><label>Boyutu</label><input type="range" id="size" min="110" max="280" value="${settings.size}" style="width:300px;accent-color:#b8916a"></div>
  <div class="set"><label class="switch"><input type="checkbox" id="walk" ${settings.walk ? 'checked' : ''}> Ekranın altında gezinsin</label><span class="muted">Kapalıyken koyduğun yerde durur.</span></div>
  <div class="set"><label class="switch"><input type="checkbox" id="chatty" ${settings.chatty ? 'checked' : ''}> Arada kendiliğinden konuşsun</label><span class="muted">Su içmeyi hatırlatır, okurken cesaret verir. Acıkınca yine de söyler.</span></div>
  <div class="set"><label class="switch"><input type="checkbox" id="login" ${login ? 'checked' : ''}> Mac açılınca o da açılsın</label></div>
  <div class="set"><div class="row"><button class="btn" id="resetPos">Arkadaşımı köşeye getir</button><button class="btn danger" id="quit">Uygulamayı kapat</button></div><span class="muted">Kapatınca bir dahaki açılışta kaldığı yerden devam eder.</span></div>`;
  const bind = (id, key, fn = (v) => v) => $('#' + id).addEventListener('change', async (e) => { settings[key] = fn(e.target.type === 'checkbox' ? e.target.checked : e.target.value); await saveSettings(); });
  bind('petName', 'petName', (v) => v.trim() || 'Minik');
  bind('userName', 'userName', (v) => v.trim() || 'Buse');
  bind('walk', 'walk'); bind('chatty', 'chatty');
  $('#size').addEventListener('input', async (e) => { settings.size = +e.target.value; await saveSettings(); });
  $('#login').addEventListener('change', (e) => window.desk.setLogin(e.target.checked));
  $('#resetPos').addEventListener('click', () => window.desk.resetPosition());
  $('#quit').addEventListener('click', () => window.desk.quit());
}

/* ---------------- Sohbet beyni ---------------- */
async function renderBrain() {
  const el = $('#tab-brain');
  el.innerHTML = `<h2>Sohbet beyni</h2><p class="muted" style="max-width:620px">Arkadaşın, internete ya da Claude'a bağlanmadan doğrudan senin Mac'inde çalışan küçük bir yapay zekâyla konuşur. Beyni ilk açtığında bir kere indirilir, sonra internetsiz de çalışır. Küçük modeller olduğu için bazen tuhaf cümleler kurabilir; Türkçesi Claude kadar iyi değildir.</p>
  ${MODELS.map((m) => `<label class="model ${m.id === settings.model ? 'on' : ''}"><input type="radio" name="model" value="${m.id}" ${m.id === settings.model ? 'checked' : ''}><div><b>${m.label}</b>${m.note === 'Önerilen' ? '<span class="tag">Önerilen</span>' : ''}<div class="muted">${m.size} · ${m.note !== 'Önerilen' ? m.note : 'Hız ve anlayış dengesi iyi'}</div><div class="muted" data-cache="${m.id}"></div></div></label>`).join('')}
  <div class="row" style="margin-top:16px"><button class="btn" id="delCache">İndirilmiş beyinleri sil (yer aç)</button></div>`;
  el.querySelectorAll('input[name=model]').forEach((r) => r.addEventListener('change', async (e) => { settings.model = e.target.value; await saveSettings(); renderBrain(); toast('Değişti. Sohbette "Aç" diyerek yeni beyni açabilirsin.'); }));
  try {
    const webllm = await import('./vendor/web-llm.js');
    const cfg = { ...webllm.prebuiltAppConfig, cacheBackend: 'indexeddb' };
    for (const m of MODELS) {
      const ok = await webllm.hasModelInCache(m.id, cfg);
      const d = el.querySelector(`[data-cache="${m.id}"]`); if (d) d.textContent = ok ? '✓ İndirilmiş' : '';
    }
    $('#delCache').addEventListener('click', async () => {
      if (!confirm('İndirilen tüm sohbet beyinleri silinsin mi? Sonra tekrar indirmen gerekir.')) return;
      for (const m of MODELS) { try { await webllm.deleteModelAllInfoInCache(m.id, cfg); } catch (e) {} }
      toast('Silindi'); renderBrain();
    });
  } catch (e) { $('#delCache').disabled = true; }
}

/* ---------------- Başlangıç ---------------- */
(async function init() {
  chars = await dbGet('chars', []);
  activeId = await dbGet('active', null);
  settings = { ...DEFAULT_SETTINGS, ...(await dbGet('settings', {})) };
  const t = (location.hash || '#chars').slice(1);
  goto(['chars', 'prefs', 'brain'].includes(t) ? t : 'chars');
})();
