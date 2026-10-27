// Serves the cached Garmin data under /api/*. Routes are defined in lib/server/routes.ts.

import type { NextRequest } from 'next/server';
import { isValidSession, SESSION_COOKIE } from '@/lib/server/auth';
import { cached } from '@/lib/server/cache';
import { GarminError } from '@/lib/server/garmin';
import { routes } from '@/lib/server/routes';

// Paging through a long activity list can take a while.
export const maxDuration = 60;

export async function GET(req: NextRequest, { params }: { params: Promise<{ route: string[] }> }) {
  // Proxy also checks this; repeat it here so the data never depends on the proxy matcher alone.
  if (!isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  const name = (await params).route.join('/');
  const route = Object.hasOwn(routes, name) ? routes[name] : undefined;
  if (!route) return Response.json({ error: 'Unknown API route' }, { status: 404 });

  try {
    const q = req.nextUrl.searchParams;
    const [key, fetcher, ttlMs] = route(q);
    return Response.json(await cached(key, fetcher, { ttlMs, refresh: q.has('refresh') }));
  } catch (err) {
    const status = err instanceof GarminError ? err.status : 500;
    const message = err instanceof Error ? err.message : String(err);
    const body = err instanceof GarminError && err.body ? `\n${err.body.slice(0, 500)}` : '';
    console.error(`[api] /api/${name}: ${message}${body}`);
    return Response.json({ error: message }, { status });
  }
}
