// Ortak: depolama, varsayılanlar
const DB_NAME = 'arkadasim', STORE = 'kv';

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function dbGet(key, fallback) {
  const db = await openDB();
  return new Promise((res) => {
    const t = db.transaction(STORE).objectStore(STORE).get(key);
    t.onsuccess = () => res(t.result === undefined ? fallback : t.result);
    t.onerror = () => res(fallback);
  });
}
export async function dbSet(key, val) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export const SLOTS = [
  { key: 'normal', label: 'Normal hâli', hint: 'Zorunlu — her zaman bu kullanılır' },
  { key: 'eat', label: 'Yemek yerken', hint: 'İsteğe bağlı' },
  { key: 'sleep', label: 'Uyurken', hint: 'İsteğe bağlı' },
  { key: 'read', label: 'Kitap okurken', hint: 'İsteğe bağlı' },
  { key: 'music', label: 'Müzik dinlerken', hint: 'İsteğe bağlı' },
  { key: 'happy', label: 'Mutlu', hint: 'İsteğe bağlı' },
  { key: 'sad', label: 'Aç / üzgün', hint: 'İsteğe bağlı' }
];

export const MODELS = [
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Dengeli', size: '~1 GB', note: 'Önerilen' },
  { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', label: 'Hafif ve hızlı', size: '~400 MB', note: 'Daha basit cevaplar' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', label: 'Daha akıllı', size: '~1,5 GB', note: 'Türkçesi biraz daha iyi, daha yavaş' }
];

export const DEFAULT_SETTINGS = {
  petName: 'Minik',
  userName: 'Buse',
  walk: true,
  chatty: true,
  model: MODELS[0].id,
  size: 170
};

export const DEFAULT_STATS = { food: 80, joy: 80, energy: 80, t: Date.now(), asleep: false };

export function uid() { return Math.random().toString(36).slice(2, 10); }

// Varsayılan karakter: kendi çizdiğimiz minik yumurta
export const EGG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 230">
<g stroke="#5b4636" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
<path d="M100 14 C150 14 182 90 182 140 C182 190 146 220 100 220 C54 220 18 190 18 140 C18 90 50 14 100 14Z" fill="#fff7e6"/>
<path d="M30 150 L52 132 L70 152 L92 130 L110 152 L130 132 L150 152 L170 134" fill="none" stroke="#c9a77a" stroke-width="3"/>
</g>
<ellipse cx="62" cy="120" rx="15" ry="8" fill="#f4b3a5" opacity=".8"/><ellipse cx="138" cy="120" rx="15" ry="8" fill="#f4b3a5" opacity=".8"/>
<circle cx="76" cy="104" r="7" fill="#2b2220"/><circle cx="124" cy="104" r="7" fill="#2b2220"/>
<circle cx="78.5" cy="101.5" r="2.2" fill="#fff"/><circle cx="126.5" cy="101.5" r="2.2" fill="#fff"/>
<path d="M92 120 Q100 128 108 120" fill="none" stroke="#5b4636" stroke-width="3.5" stroke-linecap="round"/>
</svg>`;
export const EGG_URL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(EGG_SVG);
export const EGG_EYES = { pts: [{ x: 0.38, y: 0.452 }, { x: 0.62, y: 0.452 }], r: 0.045, lid: '#fff7e6' };

export function clamp(v, a = 0, b = 100) { return Math.max(a, Math.min(b, v)); }

// ---- Süsler (kulaklık, kitap, defter) ----
export const HEADPHONES = `<svg viewBox="0 0 100 62" xmlns="http://www.w3.org/2000/svg"><g stroke="#7a6352" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 40 C12 10 88 10 86 40" fill="none" stroke="#9fb6c6" stroke-width="5.5"/><path d="M14 40 C12 10 88 10 86 40" fill="none" stroke="#7a6352" stroke-width="1" opacity=".45"/><path d="M20 26 C30 15 50 13 60 14" fill="none" stroke="#fff" stroke-width="1.6" opacity=".55"/><ellipse cx="13" cy="46" rx="9" ry="13" fill="#c9dae5"/><ellipse cx="15.5" cy="46" rx="4.5" ry="8.5" fill="#f2c4b5" stroke="none"/><ellipse cx="87" cy="46" rx="9" ry="13" fill="#c9dae5"/><ellipse cx="84.5" cy="46" rx="4.5" ry="8.5" fill="#f2c4b5" stroke="none"/><path d="M8 39 C8 36 10 35 11 35" fill="none" stroke="#fff" stroke-width="1.4" opacity=".7"/><path d="M82 39 C82 36 84 35 85 35" fill="none" stroke="#fff" stroke-width="1.4" opacity=".7"/></g></svg>`;
export const BOOK = `<svg viewBox="0 0 100 56" xmlns="http://www.w3.org/2000/svg"><g stroke="#8a7462" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14 C21 7 38 8 50 15 C62 8 79 7 94 14 L94 49 C79 43 62 44 50 51 C38 44 21 43 6 49Z" fill="#bfdcb0"/><path d="M10 15 C23 10 38 11 50 17 L50 47 C38 41 23 41 10 45Z" fill="#fffaf2"/><path d="M90 15 C77 10 62 11 50 17 L50 47 C62 41 77 41 90 45Z" fill="#fffaf2"/><path d="M50 17 L50 47" fill="none" stroke-width="1.3"/><path d="M17 22 L40 24 M17 29 L40 31 M17 36 L35 37 M60 24 L83 22 M60 31 L83 29 M60 37 L78 36" fill="none" stroke="#e6d9c6" stroke-width="1.5"/><path d="M70 9 L70 20 L73 17 L76 20 L76 8" fill="#f4c6bb" stroke-width="1.3"/></g></svg>`;
export const NOTEBOOK = `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><g stroke="#8a7462" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="10" width="58" height="44" rx="6" fill="#fffaf2"/><path d="M18 10 L18 54" fill="none" stroke="#f4c6bb" stroke-width="5"/><path d="M28 22 L62 22 M28 30 L62 30 M28 38 L54 38" fill="none" stroke="#e6d9c6" stroke-width="1.5"/><g transform="rotate(-38 80 30)"><rect x="64" y="26" width="32" height="8" rx="2" fill="#f6e2a8"/><path d="M96 26 L103 30 L96 34Z" fill="#f3e9d6"/><rect x="60" y="26" width="5" height="8" rx="1.5" fill="#f4c6bb"/></g></g></svg>`;

// Süsün resim üzerindeki varsayılan yeri: x,y = merkez (resmin oranı olarak), s = genişlik (resim genişliğinin oranı)
export function defaultDeco(c, kind) {
  const e = c && c.eyes && c.eyes.pts && c.eyes.pts.length === 2 ? c.eyes.pts : null;
  if (kind === 'phones') {
    if (e) { const mx = (e[0].x + e[1].x) / 2, my = (e[0].y + e[1].y) / 2, d = Math.abs(e[1].x - e[0].x); return { x: mx, y: Math.max(0.08, my - d * 0.6), s: Math.min(0.8, d * 2.3) }; }
    return { x: 0.5, y: 0.2, s: 0.45 };
  }
  return { x: 0.5, y: 0.8, s: 0.38 };
}
export function decoFor(c, kind) { return (c && c.deco && c.deco[kind]) || defaultDeco(c, kind); }
