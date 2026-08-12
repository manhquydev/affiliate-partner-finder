const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('affiliateDesktop', {
  getDefaults: () => ipcRenderer.invoke('desktop:defaults'),
  getStatus: () => ipcRenderer.invoke('desktop:status'),
  startJob: (opts) => ipcRenderer.invoke('desktop:start', opts),
  stopJob: () => ipcRenderer.invoke('desktop:stop'),
  openOutDir: () => ipcRenderer.invoke('desktop:open-out'),
  openCsv: () => ipcRenderer.invoke('desktop:open-csv'),
  inspectOutDir: (out) => ipcRenderer.invoke('desktop:inspect-out', out),
  onStatus: (cb) => {
    const handler = (_e, status) => cb(status);
    ipcRenderer.on('desktop:status', handler);
    return () => ipcRenderer.removeListener('desktop:status', handler);
  },
});
