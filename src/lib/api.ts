// Client-side fetch for the dashboard's own /api routes.

export async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}
