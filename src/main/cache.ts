import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface CacheEntry<T> {
  data: T;
  updatedAt: string;
}

const getCacheDir = (): string => {
  const dir = path.join(app.getPath('userData'), 'cache');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const filePath = (name: string): string => path.join(getCacheDir(), `${name}.json`);

export function readCache<T>(name: string): CacheEntry<T> | null {
  try {
    const file = filePath(name);
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf8');
    if (raw.length > 40 * 1024 * 1024) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

export function writeCache<T>(name: string, data: T): void {
  try {
    const file = filePath(name);
    const tmp = `${file}.tmp`;
    const payload: CacheEntry<T> = { data, updatedAt: new Date().toISOString() };
    fs.writeFileSync(tmp, JSON.stringify(payload), 'utf8');
    fs.renameSync(tmp, file);
  } catch (error) {
    console.error('[cache] write failed', name, error);
  }
}

export function cacheInfo(): { files: { name: string; size: number; updatedAt: string }[]; totalSize: number; path: string } {
  const dir = getCacheDir();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    const stat = fs.statSync(path.join(dir, f));
    let updatedAt = stat.mtime.toISOString();
    try {
      const entry = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (entry && entry.updatedAt) updatedAt = entry.updatedAt;
    } catch { /* ignore */ }
    return { name: f, size: stat.size, updatedAt };
  });
  return { files, totalSize: files.reduce((s, f) => s + f.size, 0), path: dir };
}

export function clearCache(): void {
  const dir = getCacheDir();
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.json')) {
      try { fs.unlinkSync(path.join(dir, f)); } catch { /* ignore */ }
    }
  }
}

export function isFresh(entry: CacheEntry<unknown> | null, maxAgeMs: number): boolean {
  if (!entry) return false;
  return Date.now() - new Date(entry.updatedAt).getTime() < maxAgeMs;
}
