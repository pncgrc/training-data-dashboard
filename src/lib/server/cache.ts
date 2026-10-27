// Caches API responses so the dashboard doesn't hit Garmin on every load.
// Backed by Next's data cache: .next/cache locally, Vercel's Data Cache when deployed.
// unstable_cache (not 'use cache') because entries must persist across requests and deploys.

import 'server-only';
import { revalidateTag, unstable_cache } from 'next/cache';

const TTL_MS = Number(process.env.CACHE_TTL_MINUTES || 60) * 60 * 1000;

// Keys double as cache tags, so ?refresh can invalidate a single entry.
// Next applies the invalidation when the request ends, so the entry a refresh
// writes is stale too: the next normal load fetches once more and caches that.
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  { ttlMs = TTL_MS, refresh = false }: { ttlMs?: number; refresh?: boolean } = {},
): Promise<T> {
  if (refresh) revalidateTag(key, { expire: 0 });
  return unstable_cache(fetcher, [key], { tags: [key], revalidate: Math.round(ttlMs / 1000) })();
}
