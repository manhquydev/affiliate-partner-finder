const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('affiliateDesktop', {
  getDefaults: () => ipcRenderer.invoke('desktop:defaults'),
  getStatus: () => ipcRenderer.invoke('desktop:status'),
  startJob: (opts) => ipcRenderer.invoke('desktop:start', opts),
  stopJob: () => ipcRenderer.invoke('desktop:stop'),
  openOutDir: (out) => ipcRenderer.invoke('desktop:open-out', out),
  openCsv: (out) => ipcRenderer.invoke('desktop:open-csv', out),
  inspectOutDir: (out) => ipcRenderer.invoke('desktop:inspect-out', out),
  pickOutDir: () => ipcRenderer.invoke('desktop:pick-out-dir'),
  newOutDir: () => ipcRenderer.invoke('desktop:new-out-dir'),
  listRuns: () => ipcRenderer.invoke('desktop:list-runs'),
  openRunsRoot: () => ipcRenderer.invoke('desktop:open-runs-root'),
  onStatus: (cb) => {
    const handler = (_e, status) => cb(status);
    ipcRenderer.on('desktop:status', handler);
    return () => ipcRenderer.removeListener('desktop:status', handler);
  },
});
