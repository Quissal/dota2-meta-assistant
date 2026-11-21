const BASE = 'https://api.opendota.com/api';
const TIMEOUT = 25000;

let queue: Promise<void> = Promise.resolve();
let lastRequest = 0;
const MIN_INTERVAL = 90;

function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = MIN_INTERVAL - (Date.now() - lastRequest);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequest = Date.now();
    return task();
  });
  queue = run.then(() => undefined, () => undefined);
  return run;
}

async function rawGet<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Dota2MetaAssistant/1.0 (desktop client)', Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function getJson<T>(endpoint: string, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await throttled(() => rawGet<T>(BASE + endpoint));
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function explorerQuery<T>(sql: string, retries = 2): Promise<T[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await throttled(() => rawGet<{ rows?: T[]; err?: string }>(
        BASE + '/explorer?sql=' + encodeURIComponent(sql)
      ));
      if (result.err) throw new Error(result.err);
      return result.rows ?? [];
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}
