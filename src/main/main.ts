import { app, BrowserWindow, shell, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { registerIpc } from './ipc';
import { getCachedImage } from './images';

const isDev = !app.isPackaged;

protocol.registerSchemesAsPrivileged([{
  scheme: 'd2img',
  privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: false },
}]);

async function registerImageProtocol(): Promise<void> {
  protocol.handle('d2img', async (request) => {
    try {
      const encoded = request.url.replace(/^d2img:\/\/image\//, '');
      const file = await getCachedImage(encoded);
      const type = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
      return new Response(fs.readFileSync(file), {
        headers: { 'content-type': type, 'cache-control': 'public, max-age=31536000' },
      });
    } catch (error) {
      console.error('[image] failed', error);
      return new Response('', { status: 404 });
    }
  });
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0a0c0f',
    title: 'Dota 2 Meta Assistant',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) { void shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  await registerImageProtocol();
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
