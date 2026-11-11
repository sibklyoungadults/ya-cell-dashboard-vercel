// Vercel serverless function: GET /api/events?timeMin=...&timeMax=...
// Reads "YA Cell" events from both public church calendars with the Google Calendar API (v3),
// using the API key in the GOOGLE_CALENDAR_API_KEY environment variable. No OAuth needed
// because both calendars are public. Never cached: every request reads the calendars live.

const CALENDARS = [
  { id: 'sibklyoungadults@gmail.com', name: 'sibklyoungadults' },
  { id: 'sibkl.org.my_jfku94u1g9l5ju3sb7or5j9obc@group.calendar.google.com', name: 'Young Adults' },
];
const SEARCH_TEXT = 'YA Cell'; // Google's search ignores upper/lower case

async function readCalendar(apiKey, calendarId, timeMin, timeMax) {
  const items = [];
  let pageToken;
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      key: apiKey, q: SEARCH_TEXT, timeMin, timeMax,
      singleEvents: 'true', orderBy: 'startTime', maxResults: '2500', timeZone: 'Asia/Kuala_Lumpur',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ? data.error.message : `Google Calendar API error (${r.status})`);
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return items;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'GOOGLE_CALENDAR_API_KEY is not set in Vercel project settings.' });
      return;
    }
    const { timeMin, timeMax } = req.query;
    if (!timeMin || !timeMax) {
      res.status(400).json({ error: 'timeMin and timeMax query params are required.' });
      return;
    }

    const results = await Promise.allSettled(CALENDARS.map(c => readCalendar(apiKey, c.id, timeMin, timeMax)));
    const failed = [], errors = [];
    results.forEach((r, i) => { if (r.status === 'rejected') { failed.push(CALENDARS[i].name); errors.push(`${CALENDARS[i].name}: ${r.reason.message}`); } });
    if (failed.length === CALENDARS.length) {
      res.status(502).json({ error: errors.join(' | ') });
      return;
    }

    // Only the fields the page needs. The page merges both calendars and turns
    // booked rooms without description lines into "Unassigned" rows.
    const events = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .filter(ev => ev.status !== 'cancelled' && ev.summary && /ya\s*cell/i.test(ev.summary) && ev.start)
      .map(ev => ({
        status: ev.status,
        summary: ev.summary,
        description: ev.description || '',
        start: { dateTime: ev.start.dateTime, date: ev.start.date },
        location: ev.location || '',
        attendees: (ev.attendees || []).filter(a => a.resource).map(a => ({ resource: true, displayName: a.displayName })),
      }));

    res.status(200).json({ events, failed, errors });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
};
