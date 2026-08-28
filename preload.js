const { contextBridge, ipcRenderer } = require('electron');

// Exposition d'API sécurisées pour le Dashboard Admin
contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (data) => ipcRenderer.invoke('save-config', data)
});