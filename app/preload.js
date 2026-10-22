const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desk', {
  setIgnore: (v) => ipcRenderer.send('ignore', v),
  focus: () => ipcRenderer.send('focus-pet'),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragMove: () => ipcRenderer.send('drag-move'),
  dragEnd: () => ipcRenderer.send('drag-end'),
  walkStep: (dx) => ipcRenderer.invoke('walk-step', dx),
  openSettings: (tab) => ipcRenderer.send('open-settings', tab),
  broadcast: (msg) => ipcRenderer.send('broadcast', msg),
  onBroadcast: (fn) => ipcRenderer.on('broadcast', (e, m) => fn(m)),
  onGoto: (fn) => ipcRenderer.on('goto', (e, t) => fn(t)),
  getLogin: () => ipcRenderer.invoke('get-login'),
  setLogin: (v) => ipcRenderer.send('set-login', v),
  resetPosition: () => ipcRenderer.send('reset-position'),
  quit: () => ipcRenderer.send('quit'),
  openLink: (u) => ipcRenderer.send('open-link', u)
});
