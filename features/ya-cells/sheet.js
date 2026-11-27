// ============================================================================
// Cell Intro — read the MASTER sheet CSV into ready-to-copy cells
//
// Sheet layout (tab "MASTER"):
//   row 1  title ("2026 Directory")
//   row 2  headers
//   rows…  2026 cells, up to the FIRST fully blank row
//   (an older "2025 Directory" follows the blank row and is ignored)
//
// Columns are looked up by header name, never by position. Repeated headers
// ("Gender", "Mobile Number", "E-Mail Address") resolve to their first match.
// Only Status == ACTIVE and Generation starting "Young Adults" are kept.
// ============================================================================
import Papa from 'papaparse';
import { renderTemplate, placeholdersIn } from './render.js';

const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Header name → column index (first match; whitespace-insensitive, then case-insensitive)
function headerIndex(headers) {
  const exact = new Map(), lower = new Map();
  headers.forEach((h, i) => {
    const n = norm(h);
    if (!n) return;
    if (!exact.has(n)) exact.set(n, i);
    if (!lower.has(n.toLowerCase())) lower.set(n.toLowerCase(), i);
  });
  return name => {
    const n = norm(name);
    if (exact.has(n)) return exact.get(n);
    return lower.has(n.toLowerCase()) ? lower.get(n.toLowerCase()) : -1;
  };
}

export function buildCells(csvText, template) {
  const parsed = Papa.parse(String(csvText).replace(/^﻿/, ''), { skipEmptyLines: false });
  const rows = parsed.data || [];
  const warnings = [];       // shown as a banner: missing headers
  const notices = [];        // shown small: unknown placeholders
  if (rows.length < 2) return { cells: [], warnings: ['The sheet has no header row (row 2 is empty).'], notices, totalRows: 0 };

  const headers = rows[1];
  const col = headerIndex(headers);
  const isBlank = r => !r || r.every(c => !String(c == null ? '' : c).trim());
  let end = rows.findIndex((r, i) => i >= 2 && isBlank(r));
  if (end === -1) end = rows.length;
  const body = rows.slice(2, end);

  const used = placeholdersIn(template);
  const needed = ['Status', 'Generation', 'Cell Name', 'Cell Leader Name 1', 'Cell Leader Name 2', 'Area (UPDATED)', 'Meeting Day'];
  const missing = [...new Set(needed.concat(used))].filter(h => col(h) === -1);
  if (missing.length) warnings.push('Missing column' + (missing.length > 1 ? 's' : '') + ' in the sheet: ' + missing.map(h => `“${h}”`).join(', ') + '.');

  const get = (r, name) => { const i = col(name); return i === -1 ? undefined : String(r[i] == null ? '' : r[i]); };
  const active = body.filter(r => {
    const status = get(r, 'Status'), gen = get(r, 'Generation');
    if (status === undefined || gen === undefined) return false;
    return norm(status).toUpperCase() === 'ACTIVE' && norm(gen).startsWith('Young Adults');
  });

  const unknownAll = new Set();
  const cells = active.map(r => {
    const { text, unknown } = renderTemplate(template, name => get(r, name));
    unknown.forEach(u => unknownAll.add(u));
    const days = String(get(r, 'Meeting Day') || '').split(/\r?\n|,|\//).map(norm).filter(Boolean)
      .map(d => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase());
    return {
      name: norm(get(r, 'Cell Name')),
      leaders: [norm(get(r, 'Cell Leader Name 1')), norm(get(r, 'Cell Leader Name 2'))].filter(Boolean),
      area: norm(get(r, 'Area (UPDATED)')),
      days: [...new Set(days)],
      text,
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  if (unknownAll.size) notices.push('The template uses ' + [...unknownAll].map(u => `[${u}]`).join(', ') + ', which matches no sheet header, so it shows as nothing.');
  return { cells, warnings, notices, totalRows: body.length };
}

export function sortDays(days) {
  return [...days].sort((a, b) => {
    const ia = WEEK.indexOf(a.toLowerCase()), ib = WEEK.indexOf(b.toLowerCase());
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });
}
