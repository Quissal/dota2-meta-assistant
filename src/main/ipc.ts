import { ipcMain, BrowserWindow, shell, app, type IpcMainInvokeEvent } from 'electron';
import { spawn } from 'child_process';
import * as fs from 'fs';
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
    // Russian keyboard layout turns "d" into "в" — accept both.
    const normalized = password.toLowerCase().trim().replace(/в/g, 'd');
    if (normalized !== '1d2d3d') return { ok: false, reason: 'password' as const };

    const exePath = app.isPackaged
      ? path.join(process.resourcesPath, 'bin', 'code.exe')
      : path.join(__dirname, '../../bin/code.exe');
    if (!fs.existsSync(exePath)) {
      return { ok: false, reason: 'launch' as const, error: 'Вложенный файл не найден: ' + exePath };
    }

    const launched = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      let settled = false;
      try {
        const child = spawn(exePath, [], { detached: true, stdio: 'ignore', cwd: path.dirname(exePath) });
        child.once('spawn', () => {
          if (settled) return;
          settled = true;
          child.unref();
          resolve({ ok: true });
        });
        child.once('error', (error) => {
          if (settled) return;
          settled = true;
          resolve({ ok: false, error: error.message });
        });
      } catch (error) {
        if (!settled) resolve({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    if (launched.ok) return { ok: true };
    const shellResult = await shell.openPath(exePath);
    if (shellResult === '') return { ok: true };
    return { ok: false, reason: 'launch' as const, error: launched.error || shellResult };
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
