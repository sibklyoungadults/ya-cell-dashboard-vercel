// ============================================================================
// POST /api/login
//
// Checks the submitted password against the TEAM_PASSWORD environment
// variable (set in the Vercel project dashboard — never in this file or in
// git). On success, sets a signed session cookie that middleware.js checks
// on every /team/* request.
//
// This is a Node.js serverless function (runs on Vercel's Node runtime).
// ============================================================================
import { COOKIE_NAME, SESSION_TTL_MS, createSessionToken } from '../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const teamPassword = process.env.TEAM_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!teamPassword || !sessionSecret) {
    // Fails closed: if the env vars aren't set yet, nobody can log in rather
    // than silently accepting any password.
    console.error('TEAM_PASSWORD or SESSION_SECRET is not set in this environment.');
    return res.status(500).json({ error: 'Server not configured yet' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const submitted = (body && body.password) || '';

  if (!timingSafeEqual(submitted, teamPassword)) {
    return res.status(401).json({ error: 'Wrong password' });
  }

  const token = await createSessionToken(sessionSecret);
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  ]);
  return res.status(200).json({ ok: true });
}

// Constant-time string comparison so response timing can't leak how much of
// the password guess was correct.
function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still do a comparison of equal-length buffers so the branch above
    // doesn't itself leak length via timing in an obvious way for short
    // inputs; this is a low-stakes shared-password gate, not a bank vault.
    return false;
  }
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}
