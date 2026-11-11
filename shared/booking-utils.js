// ============================================================================
// booking-utils.js
// Shared parsing/formatting/matching helpers used by BOTH the public site
// (index.html) and the team-only dashboard (team/index.html).
//
// This file has NO auth logic and NO fetch calls in it on purpose — it's pure
// functions over already-fetched event data, so it's easy for a future
// maintainer to test or reuse without touching the network/auth code.
// ============================================================================

// ── Fallback data (used only if /api/calendar is unreachable) ──────────────
// Kept small and clearly out of date on purpose — it's an emergency display
// so the page isn't blank, not a source of truth. Update it occasionally if
// you want, but it is NOT required for the site to work correctly.
const FALLBACK_EVENTS = [
  { date: "2026-09-18T19:00:00+08:00", description: "Hospitality 2, M3-3: VVAVES CO.OP\nM3-5: Rooted & Grounded\nM3-6,7: Happy Space\nGuest Lounge + Piano: HEAppy Home\nM6-1: Seekers of Rest\nM6-2: PayVvave" },
  { date: "2026-09-25T19:00:00+08:00", description: "Guest Lounge: Rooted & Grounded\nHospitality 2, M3-3: VVAVES CO.OP\nM3-6,7: Happy Space\nM6-1: Seekers of Rest\nM6-2: PayVvave" }
];

// ── Canonical cell-name order (as defined by the pastor) ────────────────────
const CELL_ORDER = [
  "The Dwelling","Oasis","Selah","Restored","Restful Presence","Seekers of Rest","Sprouts",
  "Lion & Lamb","Happinest","Happy Space","HEAppy Home","Happy Corner","Pocketful of Joy",
  "Nest of Joy (N'Joy)","Everlasting Covenant (E'Cove)","WOW!","VVAVESSTORE","the VVAVES co.op",
  "PayVVave","Rooted & Grounded","SPRING","The Branch","The Oak","Afresh","Light up",
  "Peace and Joy","Safe Haven","Duracell","LiveWire"
];

function normCell(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}
const CELL_ORDER_NORM = CELL_ORDER.map(normCell);

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

// Returns the index of cgRaw's best match in CELL_ORDER (unmatched → end of list)
function cellOrderIndex(cgRaw) {
  const q = normCell(cgRaw);
  if (!q) return CELL_ORDER.length;
  let idx = CELL_ORDER_NORM.indexOf(q);
  if (idx !== -1) return idx;
  let best = -1, bestLen = -1;
  CELL_ORDER_NORM.forEach((c, i) => {
    if (q.includes(c) || c.includes(q)) {
      const len = Math.min(c.length, q.length);
      if (len > bestLen) { bestLen = len; best = i; }
    }
  });
  if (best !== -1) return best;
  let bestDist = Infinity, bestIdx = -1;
  CELL_ORDER_NORM.forEach((c, i) => {
    const d = levenshtein(q, c);
    const threshold = Math.max(2, Math.floor(Math.min(q.length, c.length) * 0.3));
    if (d <= threshold && d < bestDist) { bestDist = d; bestIdx = i; }
  });
  if (bestIdx !== -1) return bestIdx;
  return CELL_ORDER.length;
}

// ── Room / description parsing ──────────────────────────────────────────────
const AC_ROOMS = ['guest lounge', 'm6-2', 'sanc'];
function isAC(room)     { return AC_ROOMS.some(s => room.toLowerCase().includes(s)); }
function hasPiano(str)  { return /piano/i.test(str); }
function hasGuitar(str) { return /guitar/i.test(str); }

function parseLine(line) {
  line = line.trim();
  if (!line) return null;
  const ci = line.indexOf(':');
  if (ci > 0) {
    const room = line.substring(0, ci).trim();
    const cg   = line.substring(ci + 1).trim();
    if (room && cg) return { room, cg };
  }
  return null;
}

function cleanRoomName(room) {
  return room
    .replace(/\s*\+\s*(piano|guitar|cajon|first aid kit)(\s*\+\s*(piano|guitar|cajon|first aid kit))*/gi, '')
    .replace(/,\s*$/, '').trim();
}

// ── Date/time formatting (all in Asia/Singapore locale display) ────────────
function fmtDateLong(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtShort(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtDateNoTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtDateCopy(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtTodayHeader() {
  const d = new Date();
  const datePart = d.toLocaleDateString('en-SG', { day: 'numeric', month: 'long' });
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12; if (h === 0) h = 12;
  return `${datePart} ${h}:${m}${ampm}`;
}
// Short form used in the WhatsApp-friendly copy text, e.g. "1 Oct, 3:15pm"
function fmtTodayHeaderShort() {
  const d = new Date();
  const datePart = d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12; if (h === 0) h = 12;
  return `${datePart}, ${h}:${m}${ampm}`;
}
// Per-booking line date for the month-grouped copy text, e.g. "Fri 2, 7:00pm"
// (no month shown here since it's already in the group's month header)
function fmtBookingLineDate(iso) {
  const d = new Date(iso);
  const wd = d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric' });
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12; if (h === 0) h = 12;
  return `${wd}, ${h}:${m}${ampm}`;
}
// Groups bookings by calendar month for the copy text. Key is numeric
// (year*12+month) so it sorts/compares cheaply; label is "October" for the
// current year, "October 2027" once it's a different year than today.
function monthGroupKey(iso) {
  const d = new Date(iso);
  return d.getFullYear() * 12 + d.getMonth();
}
function monthGroupLabel(iso) {
  const d = new Date(iso);
  const name = d.toLocaleDateString('en-SG', { month: 'long' });
  return d.getFullYear() === new Date().getFullYear() ? name : `${name} ${d.getFullYear()}`;
}
function isToday(iso) {
  const d = new Date(iso), t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function joinList(arr) {
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr[0] + ' and ' + arr[1];
  return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
}

// ── SGT date-boundary helpers (used to build API query ranges) ─────────────
function getSGTMidnight(offsetDays) {
  const sgtNow = new Date(Date.now() + 8 * 3600 * 1000);
  sgtNow.setUTCHours(0, 0, 0, 0);
  sgtNow.setUTCDate(sgtNow.getUTCDate() + offsetDays);
  const p = n => n.toString().padStart(2, '0');
  return `${sgtNow.getUTCFullYear()}-${p(sgtNow.getUTCMonth() + 1)}-${p(sgtNow.getUTCDate())}T00:00:00+08:00`;
}
function getSGTEndOfDecember() {
  const sgtNow = new Date(Date.now() + 8 * 3600 * 1000);
  const year = sgtNow.getUTCFullYear();
  return `${year}-12-31T23:59:59+08:00`;
}
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// ── Copy to clipboard (textarea fallback, works inside iframes too) ────────
function copyToClipboard(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, 99999);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  document.body.removeChild(ta);
  return ok;
}
function flashCopied(btn, label) {
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = '✅ Copied!';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = label || orig; btn.classList.remove('copied'); }, 1800);
}

// ── Calendar fetch — talks to OUR /api/calendar function, not Google or ────
// Cowork directly. Both the public page and the team page call this same
// helper; the difference between them is only which date range they ask for.
//
// Returns a Promise<Array<{date, description}>> — throws on failure so the
// caller can decide how to fall back (FALLBACK_EVENTS, cached data, etc).
async function fetchCalendarEvents({ startTime, endTime, fullText = 'YA Cell', maxResults = 100 }) {
  const params = new URLSearchParams({ startTime, endTime, fullText, maxResults: String(maxResults) });
  let allEvents = [];
  let pageToken;
  let guard = 0;

  do {
    if (pageToken) params.set('pageToken', pageToken); else params.delete('pageToken');
    const res = await fetch('/api/calendar?' + params.toString());
    if (!res.ok) throw new Error('Calendar API error: ' + res.status);
    const data = await res.json();
    allEvents = allEvents.concat(
      (data.events || [])
        .filter(ev => ev.summary && ev.summary.includes('YA Cell') && ev.start)
        .map(ev => ({
          date: ev.start.dateTime || ev.start.date,
          description: (ev.description || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        }))
    );
    pageToken = data.nextPageToken;
    guard++;
  } while (pageToken && guard < 10);

  return allEvents;
}

// ============================================================================
// ROOM BOOKING REQUEST FORM — shared helpers (public page)
// ============================================================================
// Canonical bookable rooms. Each line below is exactly ONE bookable unit, even
// though some contain commas (e.g. "M3-6,7" is one room, not two). Defined by
// the pastor — do not split these on commas/ampersands when matching.
const BOOKABLE_ROOMS = [
  "Hospitality 2, M3-3",
  "M3-4",
  "M3-5",
  "M3-6,7",
  "M3-8",
  "Guest Lounge",
  "M6-1",
  "M6-2,3"
];

// Structural metadata for each room: which building ("m3"/"m6"/none) and
// which room number(s) it covers. Used instead of plain fuzzy text matching
// because short codes like "M3-4" / "M3-5" / "M3-7" / "M3-8" are all only
// ONE character apart, so generic edit-distance matching confuses them
// (e.g. a stray "M3-7" would wrongly snap to "M3-4"). Matching on the
// building + exact number set avoids that.
const ROOM_META = [
  { building: 'm3', numbers: ['3'] },        // Hospitality 2, M3-3
  { building: 'm3', numbers: ['4'] },        // M3-4
  { building: 'm3', numbers: ['5'] },        // M3-5
  { building: 'm3', numbers: ['6', '7'] },   // M3-6,7
  { building: 'm3', numbers: ['8'] },        // M3-8
  { building: null, numbers: [] },           // Guest Lounge
  { building: 'm6', numbers: ['1'] },        // M6-1
  { building: 'm6', numbers: ['2', '3'] }    // M6-2,3
];

// Normalizes a room string for plain-text fuzzy matching: lowercase, strip
// EVERYTHING that isn't a letter or digit.
function normRoom(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}
const BOOKABLE_ROOMS_NORM = BOOKABLE_ROOMS.map(normRoom);

// Matches a raw room string (as it appears before the colon in a calendar
// event description, e.g. "Guest Lounge + Piano", "M3-6 & 7") to its index
// in BOOKABLE_ROOMS. Returns -1 if nothing matches closely enough — callers
// should treat that as "unrecognized room, ignore for availability purposes"
// rather than silently assigning it to the wrong room.
function roomOrderIndex(roomRaw) {
  const cleaned = cleanRoomName(roomRaw);
  const lower = String(cleaned).toLowerCase();

  // Building-coded rooms (M3-*, M6-*): match on building + room number(s),
  // never on generic text similarity, since e.g. "M3-7" and "M3-4" look
  // almost identical as plain strings but are different rooms.
  const buildingMatch = lower.match(/m\s*-?\s*([36])/);
  if (buildingMatch) {
    const building = 'm' + buildingMatch[1];
    const withoutBuilding = lower.replace(/m\s*-?\s*[36]/, '');
    const nums = withoutBuilding.match(/\d+/g) || [];
    if (nums.length) {
      const numSet = new Set(nums);
      // 1) exact same number set
      let idx = ROOM_META.findIndex(r => r.building === building &&
        r.numbers.length === numSet.size && r.numbers.every(n => numSet.has(n)));
      if (idx !== -1) return idx;
      // 2) raw mentions a subset of a canonical combined room's numbers
      //    (e.g. a lone "M3-7" belongs to the combined "M3-6,7" room)
      idx = ROOM_META.findIndex(r => r.building === building &&
        [...numSet].every(n => r.numbers.includes(n)));
      if (idx !== -1) return idx;
      // 3) raw mentions a superset (e.g. "M3-6,7,8" — be lenient)
      idx = ROOM_META.findIndex(r => r.building === building &&
        r.numbers.length > 0 && r.numbers.every(n => numSet.has(n)));
      if (idx !== -1) return idx;
    }
    // Building detected but no usable/matching number — don't fall through
    // to fuzzy text matching across OTHER buildings/rooms; just no match.
    return -1;
  }

  // Non-building, named rooms (e.g. "Guest Lounge", or descriptive text like
  // "Hospitality, M3-3" which the building branch above already handles via
  // its M3-3 number — this branch is for names with no M3/M6 token at all).
  const q = normRoom(cleaned);
  if (!q) return -1;

  let idx = BOOKABLE_ROOMS_NORM.indexOf(q);
  if (idx !== -1) return idx;

  let best = -1, bestLen = -1;
  BOOKABLE_ROOMS_NORM.forEach((r, i) => {
    if (ROOM_META[i].building) return; // skip building-coded rooms here
    if (q.includes(r) || r.includes(q)) {
      const len = Math.min(r.length, q.length);
      if (len > bestLen) { bestLen = len; best = i; }
    }
  });
  if (best !== -1) return best;

  let bestDist = Infinity, bestIdx = -1;
  BOOKABLE_ROOMS_NORM.forEach((r, i) => {
    if (ROOM_META[i].building) return; // skip building-coded rooms here
    const d = levenshtein(q, r);
    const threshold = Math.max(2, Math.floor(Math.min(q.length, r.length) * 0.3));
    if (d <= threshold && d < bestDist) { bestDist = d; bestIdx = i; }
  });
  return bestIdx;
}

// Returns the event's calendar date as "YYYY-MM-DD" in Asia/Singapore local
// time, regardless of what timezone the ISO string's offset says.
function dateOnlySGT(iso) {
  // Every event in this calendar already carries a +08:00 offset, so the
  // date portion of the ISO string IS the SGT calendar date — no need to
  // re-derive it from a UTC epoch (which would require timezone math).
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : new Date(iso).toISOString().slice(0, 10);
}

// Given the full events list and a "YYYY-MM-DD" date string, returns:
//   { bookedRoomIndices: Set<number>, bookedCells: Set<number>, unmatchedRooms: string[] }
// bookedRoomIndices / bookedCells are indices into BOOKABLE_ROOMS / CELL_ORDER.
// This only looks at events falling on that exact calendar date (ignores
// time) because in practice one date = one cell night = one shared pool of
// rooms, however many separate calendar events happen to represent it.
function getBookingsForDate(events, dateStr) {
  const bookedRoomIndices = new Set();
  const bookedCells = new Set();
  const unmatchedRooms = [];

  (events || []).forEach(ev => {
    if (dateOnlySGT(ev.date) !== dateStr || !ev.description) return;
    ev.description.split('\n').map(parseLine).filter(Boolean).forEach(({ room, cg }) => {
      const ri = roomOrderIndex(room);
      if (ri !== -1) bookedRoomIndices.add(ri); else unmatchedRooms.push(room);
      const ci = cellOrderIndex(cg);
      if (ci < CELL_ORDER.length) bookedCells.add(ci);
    });
  });

  return { bookedRoomIndices, bookedCells, unmatchedRooms };
}
