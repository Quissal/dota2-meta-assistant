import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const dir = (): string => {
  const p = path.join(app.getPath('userData'), 'image-cache');
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  return p;
};

const inflight = new Map<string, Promise<string>>();

export async function getCachedImage(url: string): Promise<string> {
  const target = decodeURIComponent(url);
  const hash = crypto.createHash('sha1').update(target).digest('hex');
  const ext = target.toLowerCase().includes('.png') ? '.png' : '.jpg';
  const file = path.join(dir(), hash + ext);

  if (fs.existsSync(file) && fs.statSync(file).size > 100) return file;
  const pending = inflight.get(target);
  if (pending) return pending;

  const task = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(target, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 100) throw new Error('empty image');
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, buffer);
      fs.renameSync(tmp, file);
      return file;
    } finally {
      clearTimeout(timer);
    }
  })();

  inflight.set(target, task);
  try { return await task; } finally { inflight.delete(target); }
}
