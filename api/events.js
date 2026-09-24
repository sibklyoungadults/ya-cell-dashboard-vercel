// Vercel serverless function: GET /api/events?timeMin=...&timeMax=...
// Reads the public "sibklyoungadults@gmail.com" Google Calendar directly via
// the Calendar API (v3), using an API key stored in the GOOGLE_CALENDAR_API_KEY
// environment variable. No OAuth needed because the calendar is public.

const CALENDAR_ID = 'sibklyoungadults@gmail.com';
const SEARCH_TEXT = 'YA Cell';

module.exports = async (req, res) => {
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

    const params = new URLSearchParams({
      key: apiKey,
      q: SEARCH_TEXT,
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
    });

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params.toString()}`;
    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok) {
      res.status(r.status).json({ error: data.error ? data.error.message : 'Google Calendar API error' });
      return;
    }

    const events = (data.items || [])
      .filter(ev => ev.summary && ev.summary.includes('YA Cell') && ev.start)
      .map(ev => ({
        date: ev.start.dateTime || ev.start.date,
        description: (ev.description || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n'),
      }));

    // Cache at the edge for 2 minutes so repeated visits don't hammer the Calendar API
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    res.status(200).json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unexpected server error' });
  }
};
