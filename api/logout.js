// ============================================================================
// POST /api/logout — clears the team session cookie.
// ============================================================================
import { COOKIE_NAME } from '../lib/session.js';

export default async function handler(req, res) {
  res.setHeader('Set-Cookie', [`${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`]);
  return res.status(200).json({ ok: true });
}
