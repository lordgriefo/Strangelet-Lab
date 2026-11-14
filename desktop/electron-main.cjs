// Electron Main Process for Strangelet Lab Desktop Native VST Host
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
const nativePluginWindows = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0E0E12',
    title: 'Strangelet Lab - Native Audio Workstation',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // IPC Handlers for Native VST3 / AU Management
  ipcMain.handle('vst:scan-plugins', async () => {
    // Standard system VST3 search directories
    const scanPaths = process.platform === 'win32'
      ? ['C:\\Program Files\\Common Files\\VST3', 'C:\\Program Files\\VstPlugins']
      : ['/Library/Audio/Plug-Ins/VST3', '/Library/Audio/Plug-Ins/Components'];

    const discovered = [];
    for (const dir of scanPaths) {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          files.forEach(f => {
            if (f.endsWith('.vst3') || f.endsWith('.component')) {
              discovered.push({
                id: `native-${f.replace(/\.[^/.]+$/, "")}`,
                name: f.replace(/\.[^/.]+$/, ""),
                vendor: 'System VST3',
                version: '1.0',
                format: f.endsWith('.component') ? 'AU' : 'VST3',
                path: path.join(dir, f),
                category: 'EQ',
                hasNativeGui: true,
                parameterCount: 64,
                latencySamples: 0
              });
            }
          });
        } catch (e) {
          console.error('Scan error:', e);
        }
      }
    }
    return discovered;
  });

  ipcMain.handle('vst:toggle-editor', async (event, instanceId) => {
    let win = nativePluginWindows.get(instanceId);
    if (win && !win.isDestroyed()) {
      if (win.isVisible()) {
        win.hide();
        return { isOpen: false };
      } else {
        win.show();
        return { isOpen: true };
      }
    }

    win = new BrowserWindow({
      width: 800,
      height: 600,
      parent: mainWindow,
      title: `Native VST Editor [${instanceId}]`,
      backgroundColor: '#16161E',
      autoHideMenuBar: true
    });

    win.loadURL(`data:text/html,<html><body style="background:#16161E;color:#E0E0FF;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><h3>Native VST3 GUI Frame (${instanceId})</h3></body></html>`);
    nativePluginWindows.set(instanceId, win);
    return { isOpen: true };
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
