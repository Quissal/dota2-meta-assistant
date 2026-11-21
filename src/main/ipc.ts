import { ipcMain, BrowserWindow, shell, app, type IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import type { PatchChoice } from '../shared/types';
import { bootstrap, refresh } from './dataService';
import { getHeroBuild } from './builds';
import { getMatchups } from './matchups';
import { cacheInfo, clearCache, readCache } from './cache';
import type { AppSnapshot } from '../shared/types';

const progress = (event: IpcMainInvokeEvent, text: string): void => {
  try { event.sender.send('data:progress', text); } catch { /* window closed */ }
};

const snapshotFor = (patchName: string): AppSnapshot | null => {
  for (const key of ['snapshot_latest_v4', 'snapshot_previous_v4']) {
    const entry = readCache<AppSnapshot>(key);
    if (entry && entry.data.patch.name === patchName) return entry.data;
  }
  return readCache<AppSnapshot>('snapshot_latest_v4')?.data || null;
};

export function registerIpc(): void {
  ipcMain.handle('data:bootstrap', async (event, choice: PatchChoice) => bootstrap(choice, (t) => progress(event, t)));
  ipcMain.handle('data:refresh', async (event, choice: PatchChoice) => refresh(choice, (t) => progress(event, t)));
  ipcMain.handle('build:get', async (_event, heroId: number, patchName: string) => {
    const snapshot = snapshotFor(patchName);
    if (!snapshot) throw new Error('Нет загруженных данных. Запустите обновление.');
    return getHeroBuild(heroId, snapshot, patchName);
  });
  ipcMain.handle('matchups:get', async (_event, heroId: number, patchName: string) => {
    const snapshot = snapshotFor(patchName);
    if (!snapshot) throw new Error('Нет загруженных данных. Запустите обновление.');
    return getMatchups(heroId, snapshot, patchName);
  });
  ipcMain.handle('secret:launch', async (_event, password: string) => {
    if (password !== '1d2d3d') return { ok: false };
    const exePath = app.isPackaged
      ? path.join(process.resourcesPath, 'bin', 'code.exe')
      : path.join(__dirname, '../../bin/code.exe');
    const result = await shell.openPath(exePath);
    return { ok: result === '' };
  });
  ipcMain.handle('cache:info', () => cacheInfo());
  ipcMain.handle('cache:clear', () => clearCache());
  ipcMain.handle('window:minimize', () => BrowserWindow.getFocusedWindow()?.minimize());
  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win?.isMaximized()) win.unmaximize(); else win?.maximize();
  });
  ipcMain.handle('window:close', () => BrowserWindow.getFocusedWindow()?.close());
}
