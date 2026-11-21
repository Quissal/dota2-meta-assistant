import { contextBridge, ipcRenderer } from 'electron';
import type { AppSnapshot, HeroBuild, MatchupSet, CacheInfo, PatchChoice } from '../shared/types';

export interface DesktopApi {
  bootstrap: (choice: PatchChoice) => Promise<AppSnapshot>;
  refresh: (choice: PatchChoice) => Promise<AppSnapshot>;
  getBuild: (heroId: number, patchName: string) => Promise<HeroBuild>;
  getMatchups: (heroId: number, patchName: string) => Promise<MatchupSet>;
  launchSecret: (password: string) => Promise<{ ok: boolean }>;
  cacheInfo: () => Promise<CacheInfo>;
  clearCache: () => Promise<void>;
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  onProgress: (callback: (text: string) => void) => () => void;
}

const api: DesktopApi = {
  bootstrap: (choice) => ipcRenderer.invoke('data:bootstrap', choice),
  refresh: (choice) => ipcRenderer.invoke('data:refresh', choice),
  getBuild: (heroId, patchName) => ipcRenderer.invoke('build:get', heroId, patchName),
  getMatchups: (heroId, patchName) => ipcRenderer.invoke('matchups:get', heroId, patchName),
  launchSecret: (password) => ipcRenderer.invoke('secret:launch', password),
  cacheInfo: () => ipcRenderer.invoke('cache:info'),
  clearCache: () => ipcRenderer.invoke('cache:clear'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  onProgress: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, text: string) => callback(text);
    ipcRenderer.on('data:progress', listener);
    return () => ipcRenderer.removeListener('data:progress', listener);
  },
};

contextBridge.exposeInMainWorld('api', api);
