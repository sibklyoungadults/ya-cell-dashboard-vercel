// ============================================================================
// GET /api/ya-cells  — Cell Intro data (served by api/ya-cells.js)
//
// Fetches the public MASTER sheet as CSV, keeps active Young Adults cells and
// renders each one with template.js. Responds with:
//   { cells: [{ name, leaders, area, days, text }], days, areas,
//     warnings, notices, fetchedAt }
// Only the rendered text and the search/filter fields are sent: no phone
// numbers or e-mail addresses leave the server.
//
// Login: middleware.js protects this route (team session cookie required).
// Cache: 5 minutes on Vercel's CDN. "Refresh now" adds ?fresh=… which skips it.
// Sheet: YA_SHEET_ID / YA_SHEET_GID env vars (defaults below).
// ============================================================================
import { TEMPLATE } from './template.js';
import { buildCells, sortDays } from './sheet.js';

const DEFAULT_SHEET_ID = '1GXXuCdNCSE30HElHC7-LKWeMLVDarBmOEuyOeevJnts';
const DEFAULT_SHEET_GID = '497483873';

export default async function handler(req, res) {
  const fresh = req.query && req.query.fresh;
  const sheetId = (process.env.YA_SHEET_ID || DEFAULT_SHEET_ID).trim();
  const gid = (process.env.YA_SHEET_GID || DEFAULT_SHEET_GID).trim();
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/export?format=csv&gid=${encodeURIComponent(gid)}`;

  try {
    const r = await fetch(url, { redirect: 'follow', cache: 'no-store' });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || type.includes('text/html')) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({
        error: r.ok ? 'Google returned a sign-in page instead of CSV: the sheet must be shared as “Anyone with the link can view”.'
                    : `Google Sheets error (${r.status}). Check YA_SHEET_ID / YA_SHEET_GID.`
      });
    }
    const csv = await r.text();
    const { cells, warnings, notices } = buildCells(csv, TEMPLATE);
    const days = sortDays([...new Set(cells.flatMap(c => c.days))]);
    const areas = [...new Set(cells.map(c => c.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

    res.setHeader('Cache-Control', fresh ? 'no-store' : 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ cells, days, areas, warnings, notices, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('ya-cells: sheet read failed', err);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Could not reach Google Sheets: ' + (err.message || err) });
  }
}
