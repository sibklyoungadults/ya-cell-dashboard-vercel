// ============================================================================
// google-sheets.js
// Minimal Google Sheets writer using a service account — no `googleapis` or
// `google-auth-library` dependency needed. We manually build + sign a JWT
// with Node's built-in `crypto` (same "use only built-ins" approach as
// lib/session.js), exchange it for an access token, then call the Sheets
// REST API directly with `fetch`. This keeps the project dependency-free
// aside from @vercel/edge.
//
// Requires three environment variables (see SETUP.md for how to get these):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL — the service account's client_email
//   GOOGLE_SERVICE_ACCOUNT_KEY   — the service account's private_key
//                                  (paste it WITH \n escaped as literal
//                                  "\n" — Vercel's env var UI handles this
//                                  fine if you paste the whole JSON value's
//                                  private_key string directly)
//   BOOKING_SHEET_ID             — the spreadsheet ID from its URL
//                                  (.../d/<THIS PART>/edit)
//
// This file is Node-runtime only (uses `crypto`), which is fine — it's only
// ever imported from api/submit-booking.js, a standard Vercel Node function,
// never from middleware.js (which runs on the Edge runtime).
// ============================================================================

import crypto from 'crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Builds and signs a JWT asserting this service account, per Google's
// "OAuth 2.0 for Server to Server Applications" flow.
function buildSignedJwt(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: clientEmail,
    scope: SHEETS_SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  // privateKey may have literal "\n" sequences if pasted as a single-line env
  // var value — normalize those to real newlines before signing.
  const normalizedKey = privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey;
  const signature = signer.sign(normalizedKey);
  const sig = signature.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${unsigned}.${sig}`;
}

async function getAccessToken() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey  = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!clientEmail || !privateKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_KEY is not set');
  }

  const assertion = buildSignedJwt(clientEmail, privateKey);
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to get access token: ${data.error_description || data.error || res.status}`);
  }
  return data.access_token;
}

// Appends one row to the given sheet (defaults to the first sheet/tab).
// `values` is a plain array of cell values, in column order.
export async function appendRow(values, sheetName) {
  const sheetId = process.env.BOOKING_SHEET_ID;
  if (!sheetId) throw new Error('BOOKING_SHEET_ID is not set');

  const accessToken = await getAccessToken();
  const range = sheetName ? `${sheetName}!A:Z` : 'A:Z';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: [values] })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Sheets API error: ${data.error?.message || res.status}`);
  }
  return data;
}
