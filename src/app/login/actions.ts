'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionToken, passwordMatches, SESSION_COOKIE, SESSION_MAX_AGE_S } from '@/lib/server/auth';

export interface LoginState {
  error?: string;
}

const FAILED_LOGIN_DELAY_MS = 1000;

// Only same-site paths, so the login form can't be used as an open redirect.
const safeNext = (next: FormDataEntryValue | null) =>
  typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/';

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  let ok: boolean;
  try {
    ok = passwordMatches(String(form.get('password') ?? ''));
  } catch {
    return { error: 'Login is not configured. Set DASHBOARD_PASSWORD and AUTH_SECRET.' };
  }
  if (!ok) {
    // Slows down password guessing.
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
    return { error: 'Wrong password.' };
  }

  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
  });
  redirect(safeNext(form.get('next')));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
