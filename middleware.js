// ============================================================================
// middleware.js — Vercel Edge Middleware
//
// Runs BEFORE any request under /team/* is served. Checks for a valid signed
// session cookie (see lib/session.js); if missing/expired, redirects to the
// password page instead of serving the page. This is what actually makes
// the /team pages "login required" — hiding a nav tab in JS alone would NOT
// be secure, since the page's HTML would still be sent to anyone who asks.
//
// `matcher` below scopes this to /team/* only — the public site (/) and the
// API routes (login/calendar) are never touched by this file.
// ============================================================================
import { next } from '@vercel/edge';
import { COOKIE_NAME, verifySessionToken, parseCookies } from './lib/session.js';

export const config = {
  matcher: ['/team/:path*']
};

export default async function middleware(request) {
  const url = new URL(request.url);

  // The login page itself must always be reachable, or nobody could ever
  // log in.
  if (url.pathname === '/team/login.html' || url.pathname === '/team/login') {
    return next();
  }

  const secret = process.env.SESSION_SECRET;
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const token = cookies[COOKIE_NAME];

  const valid = Boolean(secret) && Boolean(token) && await verifySessionToken(token, secret);
  if (!valid) {
    const loginUrl = new URL('/team/login.html', request.url);
    loginUrl.searchParams.set('next', url.pathname);
    return Response.redirect(loginUrl, 302);
  }

  return next();
}
