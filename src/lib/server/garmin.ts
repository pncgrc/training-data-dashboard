// Minimal client for the Garmin Connect Personal API.
// The API key is exchanged for a short-lived (24h) access token; there are no
// refresh tokens, so we just request a new one with the key when it expires.

import 'server-only';

const BASE = process.env.GARMIN_API_BASE || 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

type Params = Record<string, string | number | null | undefined>;

let token: { value: string; expiresAt: number } | null = null;

export class GarminError extends Error {
  constructor(message: string, public status: number, public body?: string) {
    super(message);
  }
}

function apiKey() {
  const key = process.env.GARMIN_API_KEY;
  if (!key) throw new GarminError('GARMIN_API_KEY is not set. Copy .env.example to .env and add your key.', 500);
  return key;
}

// The token response format isn't documented, so accept a bare token string
// or a JSON object with common field names.
function parseToken(text: string) {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { access_token: text.trim() };
  }
  if (typeof body === 'string') body = { access_token: body };
  const fields = body as Record<string, unknown>;
  const value = fields.access_token ?? fields.accessToken ?? fields.token;
  if (typeof value !== 'string' || !value) {
    throw new GarminError(`Unexpected token response fields: ${Object.keys(fields).join(', ')}`, 502);
  }
  const expiresIn = Number(fields.expires_in ?? fields.expiresIn ?? 24 * 60 * 60);
  return { value, expiresAt: Date.now() + expiresIn * 1000 };
}

export async function getAccessToken({ force = false } = {}) {
  if (!force && token && Date.now() < token.expiresAt - EXPIRY_MARGIN_MS) return token.value;

  const res = await fetch(BASE + TOKEN_PATH, {
    method: 'POST',
    // No JSON Accept header here: the token endpoint answers 406 to it.
    headers: { Authorization: `ApiKey ${apiKey()}`, Accept: '*/*' },
  });
  const text = await res.text();
  if (!res.ok) throw new GarminError(`Token request failed (${res.status})`, res.status, text);

  token = parseToken(text);
  return token.value;
}

async function request(path: string, params: Params, accept: string) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }

  for (let attempt = 0; ; attempt++) {
    const accessToken = await getAccessToken({ force: attempt > 0 });
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Accept: accept } });
    // A 401 may mean the token was revoked early; retry once with a fresh one.
    if (res.status === 401 && attempt === 0) continue;
    if (!res.ok) throw new GarminError(`GET ${path} failed (${res.status})`, res.status, await res.text());
    console.log(`[garmin] GET ${path}`);
    return res;
  }
}

export async function garminGet<T = unknown>(path: string, params: Params = {}): Promise<T> {
  const text = await (await request(path, params, 'application/json')).text();
  return (text ? JSON.parse(text) : null) as T;
}

export async function garminDownload(path: string, params: Params = {}) {
  const res = await request(path, params, '*/*');
  return Buffer.from(await res.arrayBuffer());
}
