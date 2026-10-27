// File-based cache for API responses so the dashboard doesn't hit Garmin on every load.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const DIR = join(import.meta.dirname, '..', 'data', 'cache');
const TTL_MS = Number(process.env.CACHE_TTL_MINUTES || 60) * 60 * 1000;

function fileFor(key) {
  return join(DIR, createHash('sha1').update(key).digest('hex') + '.json');
}

export async function cached(key, fetcher, { ttlMs = TTL_MS, refresh = false } = {}) {
  const file = fileFor(key);
  if (!refresh) {
    try {
      const entry = JSON.parse(await readFile(file, 'utf8'));
      if (Date.now() - entry.savedAt < ttlMs) return entry.data;
    } catch {
      // Missing or unreadable cache entry; fall through to fetch.
    }
  }

  const data = await fetcher();
  await mkdir(DIR, { recursive: true });
  await writeFile(file, JSON.stringify({ key, savedAt: Date.now(), data }));
  return data;
}
