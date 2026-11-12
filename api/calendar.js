// ============================================================================
// GET /api/calendar?startTime=...&endTime=...&fullText=...
//
// Thin proxy in front of Google Calendar's public v3 REST API, reading BOTH
// YA calendars and returning one combined list. The browser never sees the
// API key: it is stored as GOOGLE_CALENDAR_API_KEY in Vercel and the key
// should be restricted to the Calendar API only in Google Cloud Console.
//
// Calendars read (each must be "Make available to public → See all event
// details"; see SETUP.md):
//   - sibklyoungadults@gmail.com
//   - plus GOOGLE_CALENDAR_ID if it is set and is a different calendar
//
// The Young Adults calendar (sibkl.org.my Workspace) can't be made public, so
// its YA CELL events reach the site by inviting sibklyoungadults@gmail.com as a
// guest: they then appear on that public calendar. If Young Adults is ever made
// public, add it back to CALENDARS below (the commented line).
//
// This route is intentionally PUBLIC (no session check): both the public
// pages and the password-gated team pages call it, and which room/cell is
// booked on which date is meant to be public.
//
// Never cached: every request reads the calendars live.
// If one calendar fails, the other's events are still returned and the
// failed calendar is named in `failed` so the page can say what's missing.
// ============================================================================

const CALENDARS = [
  { id: 'sibklyoungadults@gmail.com', name: 'sibklyoungadults' },
  // { id: 'sibkl.org.my_jfku94u1g9l5ju3sb7or5j9obc@group.calendar.google.com', name: 'Young Adults' },
];

function calendarList() {
  const list = [...CALENDARS];
  const extra = (process.env.GOOGLE_CALENDAR_ID || '').trim();
  if (extra && !list.some(c => c.id.toLowerCase() === extra.toLowerCase())) list.push({ id: extra, name: extra });
  return list;
}

async function readCalendar(apiKey, calendarId, { startTime, endTime, fullText }) {
  const items = [];
  let pageToken;
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      key: apiKey,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
      timeZone: 'Asia/Kuala_Lumpur'
    });
    if (startTime) params.set('timeMin', startTime);
    if (endTime)   params.set('timeMax', endTime);
    if (fullText)  params.set('q', fullText);   // Google's search ignores upper/lower case
    if (pageToken) params.set('pageToken', pageToken);

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;
    const googleRes = await fetch(url);
    const data = await googleRes.json();
    if (!googleRes.ok) throw new Error(data.error?.message || `Google Calendar API error (${googleRes.status})`);
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return items;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_CALENDAR_API_KEY is not set in this environment.');
    return res.status(500).json({ error: 'Server not configured yet (GOOGLE_CALENDAR_API_KEY missing)' });
  }

  const { startTime, endTime } = req.query;
  const fullText = req.query.fullText || 'YA Cell';
  const calendars = calendarList();

  const results = await Promise.allSettled(calendars.map(c => readCalendar(apiKey, c.id, { startTime, endTime, fullText })));
  const failed = [], errors = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      failed.push(calendars[i].name);
      errors.push(`${calendars[i].name}: ${r.reason.message}`);
      console.error('Google Calendar read failed:', calendars[i].id, r.reason);
    }
  });
  if (failed.length === calendars.length) {
    return res.status(502).json({ error: errors.join(' | ') || 'Failed to reach Google Calendar' });
  }

  // Reshape to only what the front-end needs (shared/booking-utils.js merges
  // the calendars by start time and lists rooms with no cell as "Unassigned").
  const events = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .filter(item => item.status !== 'cancelled')
    .map(item => ({
      summary: item.summary,
      description: item.description,
      start: item.start,
      location: item.location || '',
      rooms: (item.attendees || []).filter(a => a.resource && a.displayName).map(a => a.displayName)
    }));

  return res.status(200).json({ events, failed, errors });
}
