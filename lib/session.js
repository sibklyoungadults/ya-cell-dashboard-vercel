// ============================================================================
// lib/session.js
//
// Tiny signed-cookie "session" — no database, no user accounts, just a
// timestamped token signed with a server-only secret (SESSION_SECRET env
// var) so the browser can hold it but can't forge or read it.
//
// Uses only Web Crypto (crypto.subtle) + TextEncoder so this ONE file works
// unchanged in both runtimes Vercel uses here:
//   - middleware.js        → Edge Runtime (no Node "crypto" module)
//   - api/login.js         → Node.js serverless function (Node 18+ has
//                             globalThis.crypto too, so this still works)
//
// Token format (all one string, stored in a cookie):
//   base64url(JSON.stringify({ exp })) + "." + base64url(hmac-sha256 signature)
// ============================================================================

const COOKIE_NAME = 'ya_cell_team_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours — re-enter password once/day-ish

function b64urlEncode(bytes) {
  let str = '';
  bytes.forEach(b => { str += String.fromCharCode(b); });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecodeToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - b64url.length % 4) % 4);
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function getKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function createSessionToken(secret) {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = b64urlEncode(new TextEncoder().encode(payload));
  const key = await getKey(secret);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  const sigB64 = b64urlEncode(new Uint8Array(sigBuf));
  return `${payloadB64}.${sigB64}`;
}

async function verifySessionToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return false;

  try {
    const key = await getKey(secret);
    const sigBytes = b64urlDecodeToBytes(sigB64);
    const valid = await crypto.subtle.verify(
      'HMAC', key, sigBytes, new TextEncoder().encode(payloadB64)
    );
    if (!valid) return false;

    const payload = JSON.parse(new TextDecoder().decode(b64urlDecodeToBytes(payloadB64)));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch (e) {
    return false;
  }
}

// Parses a Cookie header string into { name: value } — good enough for our
// single cookie, no external dependency needed.
function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

export { COOKIE_NAME, SESSION_TTL_MS, createSessionToken, verifySessionToken, parseCookies };
