import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { registerIpcHandlers } from './ipc-handlers';

const isDev = process.env.NODE_ENV === 'development';

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'GeniusAI Infinity — Accounting',
    backgroundColor: '#0f1216',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload needs Node to bridge DB IPC
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  return win;
}

app.whenReady().then(() => {
  // Default DB location under the OS app-data dir keeps it offline & per-user.
  const dataDir = path.join(app.getPath('userData'), 'companies');
  fs.mkdirSync(dataDir, { recursive: true });

  registerIpcHandlers(ipcMain, dialog, dataDir);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
