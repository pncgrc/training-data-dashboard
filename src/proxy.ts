// Sends visitors without a valid session to /login. API routes answer 401 instead.

import { NextResponse, type NextRequest } from 'next/server';
import { isValidSession, SESSION_COOKIE } from '@/lib/server/auth';

export function proxy(req: NextRequest) {
  if (isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const login = new URL('/login', req.url);
  if (pathname !== '/') login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except the login page and static assets.
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
};
