const { app, BrowserWindow, ipcMain, screen, protocol, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Veri klasörü yolunda Türkçe harf olmasın (yoksa dosyalar yüklenemiyor); görünen ad Türkçe kalabilir
app.setPath('userData', path.join(app.getPath('appData'), 'Arkadasim'));
app.setName('Arkadasim');
app.commandLine.appendSwitch('enable-unsafe-webgpu');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

let pet = null;
let settings = null;
let drag = null;

const W = 380, H = 560;

function createPet() {
  const wa = screen.getPrimaryDisplay().workArea;
  pet = new BrowserWindow({
    width: W, height: H,
    x: wa.x + wa.width - W - 20,
    y: wa.y + wa.height - H,
    transparent: true, frame: false, hasShadow: false, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, fullscreenable: false,
    backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false }
  });
  pet.setAlwaysOnTop(true, 'floating');
  pet.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  pet.setIgnoreMouseEvents(true, { forward: true });
  pet.loadURL('app://pet/pet.html');
  pet.on('closed', () => { pet = null; });
  pet.on('blur', () => { drag = null; });
}

function openSettings(tab) {
  if (settings) { settings.show(); settings.focus(); if (tab) settings.webContents.send('goto', tab); return; }
  settings = new BrowserWindow({
    width: 860, height: 680, minWidth: 720, minHeight: 560,
    title: 'Arkadaşım — Ayarlar',
    backgroundColor: '#fbf6ec',
    titleBarStyle: 'hiddenInset',
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  settings.loadURL('app://pet/settings.html' + (tab ? '#' + tab : ''));
  settings.on('closed', () => { settings = null; });
}

app.whenReady().then(() => {
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.icns': 'image/icns' };
  protocol.handle('app', async (req) => {
    try {
      const u = new URL(req.url);
      const p = path.normalize(path.join(__dirname, decodeURIComponent(u.pathname)));
      if (!p.startsWith(__dirname)) return new Response('no', { status: 403 });
      if (process.env.PET_DEBUG) fs.appendFileSync(process.env.PET_DEBUG, 'PROTO ' + req.url + ' ' + p + '\n');
      const data = await fs.promises.readFile(p);
      return new Response(data, { status: 200, headers: { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' } });
    } catch (e) {
      if (process.env.PET_DEBUG) fs.appendFileSync(process.env.PET_DEBUG, 'ERR ' + req.url + ' ' + (e && e.stack) + '\n');
      return new Response('yok', { status: 404 });
    }
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: app.name, submenu: [
      { label: 'Ayarlar…', accelerator: 'Cmd+,', click: () => openSettings() },
      { label: 'Arkadaşımı buraya getir', click: () => resetPosition() },
      { type: 'separator' },
      { role: 'quit', label: 'Kapat' }
    ] },
    { role: 'editMenu', label: 'Düzen' }
  ]));

  createPet();
  app.on('activate', () => { if (!pet) createPet(); else openSettings(); });
});

function resetPosition() {
  if (!pet) return;
  const wa = screen.getPrimaryDisplay().workArea;
  pet.setPosition(wa.x + wa.width - W - 20, wa.y + wa.height - H);
}

app.on('window-all-closed', () => app.quit());

ipcMain.on('ignore', (e, v) => { if (pet) pet.setIgnoreMouseEvents(v, { forward: true }); });
ipcMain.on('focus-pet', () => { if (pet) pet.focus(); });

ipcMain.on('drag-start', () => {
  if (!pet) return;
  drag = { win: pet.getPosition(), cur: screen.getCursorScreenPoint() };
});
ipcMain.on('drag-move', () => {
  if (!pet || !drag) return;
  const c = screen.getCursorScreenPoint();
  pet.setPosition(drag.win[0] + c.x - drag.cur.x, drag.win[1] + c.y - drag.cur.y);
});
ipcMain.on('drag-end', () => { drag = null; });

ipcMain.handle('walk-step', (e, dx) => {
  if (!pet || drag) return { edge: false };
  const [x, y] = pet.getPosition();
  const d = screen.getDisplayNearestPoint({ x: x + W / 2, y: y + H / 2 }).workArea;
  let nx = x + dx, edge = false;
  const minX = d.x - 60, maxX = d.x + d.width - W + 60;
  if (nx < minX) { nx = minX; edge = true; }
  if (nx > maxX) { nx = maxX; edge = true; }
  pet.setPosition(Math.round(nx), y);
  return { edge };
});

ipcMain.on('open-settings', (e, tab) => openSettings(tab));
ipcMain.on('broadcast', (e, msg) => {
  for (const w of BrowserWindow.getAllWindows()) if (w.webContents !== e.sender) w.webContents.send('broadcast', msg);
});
ipcMain.handle('get-login', () => app.getLoginItemSettings().openAtLogin);
ipcMain.on('set-login', (e, v) => app.setLoginItemSettings({ openAtLogin: !!v }));
ipcMain.on('reset-position', () => resetPosition());
ipcMain.on('quit', () => app.quit());
ipcMain.on('open-link', (e, url) => { if (/^https:\/\//.test(url)) shell.openExternal(url); });
