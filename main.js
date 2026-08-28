const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ConfigStore = require('./server/config-store');
const { startServer } = require('./server/index');

let mainWindow;
let configStore;

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    title: 'Twitch Pinned Message Overlay',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Charge le dashboard d'administration local
  mainWindow.loadURL(`http://localhost:${port}/admin`);
}

app.whenReady().then(async () => {
  // 1. Initialise le store dans le dossier utilisateur sécurisé
  configStore = new ConfigStore(app.getPath('userData'));

  // 2. Démarre le serveur Express local
  const port = await startServer(configStore);

  // 3. Handlers IPC pour la communication sécurisée Electron <-> Front
  ipcMain.handle('get-config', () => configStore.getAll());
  ipcMain.handle('save-config', (event, data) => {
    configStore.saveConfig(data);
    return true;
  });

  // 4. Crée la fenêtre de l'application
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});