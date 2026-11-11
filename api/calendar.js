// ============================================================================
// GET /api/calendar?startTime=...&endTime=...&fullText=...&maxResults=...&pageToken=...
//
// Thin proxy in front of Google Calendar's public v3 REST API. This exists
// because the browser can't call Google Calendar directly without either
// exposing an API key in client-side JS (fine for a read-only key, actually
// — see below) or going through OAuth. We use the simplest option that
// still works from a static site with no user login:
//
//   The calendar itself is set to "Make available to public" (see SETUP.md),
//   and we call the Calendar API with a plain API key (GOOGLE_CALENDAR_API_KEY,
//   restricted to the Calendar API only in Google Cloud Console). No OAuth,
//   no refresh tokens, no service account — just one key stored as a Vercel
//   environment variable, never committed to git.
//
// This route is intentionally PUBLIC (no session check) — both the public
// Bookings-by-Date page and the password-gated team pages call it, and the
// underlying data (which room/cell booked which date) is meant to be public
// per the "public dashboard" requirement. If that ever changes, add a
// session check here the same way api/newcomers.js (if you add one) would.
// ============================================================================

export default async function handler(req, res) {
  const apiKey     = process.env.GOOGLE_CALENDAR_API_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!apiKey || !calendarId) {
    console.error('GOOGLE_CALENDAR_API_KEY or GOOGLE_CALENDAR_ID is not set in this environment.');
    return res.status(500).json({ error: 'Server not configured yet' });
  }

  const { startTime, endTime, fullText, maxResults, pageToken } = req.query;

  const params = new URLSearchParams({
    key: apiKey,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults || 100)
  });
  if (startTime) params.set('timeMin', startTime);
  if (endTime)   params.set('timeMax', endTime);
  if (fullText)  params.set('q', fullText);
  if (pageToken) params.set('pageToken', pageToken);

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;

  try {
    const googleRes = await fetch(url);
    const data = await googleRes.json();

    if (!googleRes.ok) {
      console.error('Google Calendar API error:', data);
      return res.status(googleRes.status).json({ error: data.error?.message || 'Google Calendar API error' });
    }

    // Reshape to the same field names the front-end already expects, so
    // shared/booking-utils.js doesn't need to know this is Google's raw
    // "items" shape.
    const events = (data.items || []).map(item => ({
      summary: item.summary,
      description: item.description,
      start: item.start
    }));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ events, nextPageToken: data.nextPageToken });
  } catch (err) {
    console.error('Failed to reach Google Calendar:', err);
    return res.status(502).json({ error: 'Failed to reach Google Calendar' });
  }
}
