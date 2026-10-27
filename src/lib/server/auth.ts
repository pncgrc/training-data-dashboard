// Single-user password login. The session cookie holds an expiry time signed
// with AUTH_SECRET, so no session store is needed.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return s;
}

const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

// Compares digests so both sides have equal length and timing doesn't leak the value.
const sha256 = (s: string) => createHash('sha256').update(s).digest();
const safeEqual = (a: string, b: string) => timingSafeEqual(sha256(a), sha256(b));

export function passwordMatches(input: string) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) throw new Error('DASHBOARD_PASSWORD is not set');
  return safeEqual(input, password);
}

export function createSessionToken() {
  const expires = String(Date.now() + SESSION_MAX_AGE_S * 1000);
  return `${expires}.${sign(expires)}`;
}

export function isValidSession(token: string | undefined) {
  if (!token || !process.env.AUTH_SECRET) return false;
  const [expires, signature] = token.split('.');
  if (!expires || !signature || !(Number(expires) > Date.now())) return false;
  return safeEqual(signature, sign(expires));
}
