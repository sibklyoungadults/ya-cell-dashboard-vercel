# YA Cell Dashboard — Vercel deployment

This is a standalone copy of the pastor dashboard (Cell Rooms, Cell List, WA Messages,
Newcomers) that fetches live data straight from the public `sibklyoungadults@gmail.com`
Google Calendar via a Vercel serverless function — no dependency on Cowork.

Two files matter:
- `index.html` — the whole dashboard UI (unchanged from the Cowork version, except it
  now calls `/api/events` instead of `window.cowork.callMcpTool`)
- `api/events.js` — a serverless function that calls the Google Calendar API with an
  API key and returns the same `{ events: [...] }` shape the frontend expects

## 1. Make the calendar public

The API key approach only works for calendars set to public. In Google Calendar:

1. Open Google Calendar (as the owner of `sibklyoungadults@gmail.com`, or an account
   with edit access to that calendar).
2. Hover the calendar in the left sidebar → **⋮ → Settings and sharing**.
3. Under **Access permissions**, check **Make available to public**.
4. Choose **See all event details** (not just free/busy).

**Heads up:** this makes the calendar's events readable by anyone who has the calendar
ID and an API key — not just through this dashboard. If that's a concern, use a
service-account share instead (view-only, calendar stays private) — happy to build
that version if you'd rather not make it public.

## 2. Get a Google Calendar API key

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and create a
   new project (or use an existing one).
2. In **APIs & Services → Library**, search for **Google Calendar API** and click
   **Enable**.
3. In **APIs & Services → Credentials**, click **Create Credentials → API key**.
4. Copy the key. Click **Restrict key** and:
   - Under **API restrictions**, choose **Restrict key** → select **Google Calendar
     API** only.
   - Under **Application restrictions**, you can leave it unrestricted for now
     (server-side calls from Vercel don't have a browser origin/IP you can pin easily)
     — the API-only restriction above is what actually matters since this key never
     reaches the browser.

## 3. Push this project to GitHub

```bash
cd ya-cell-dashboard-vercel
git init
git add .
git commit -m "YA Cell dashboard, live Google Calendar via Vercel"
```

Create a new empty repo on [github.com/new](https://github.com/new), then:

```bash
git remote add origin https://github.com/<your-username>/ya-cell-dashboard.git
git branch -M main
git push -u origin main
```

## 4. Import into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in (GitHub login is easiest).
2. Click **Import** next to the `ya-cell-dashboard` repo.
3. Framework preset: leave as **Other** — no build command needed, Vercel will serve
   `index.html` as-is and auto-detect `api/events.js` as a serverless function.
4. Before deploying, expand **Environment Variables** and add:
   - Key: `GOOGLE_CALENDAR_API_KEY`
   - Value: the API key from step 2
5. Click **Deploy**.

## 5. Verify

Once deployed, visit `https://your-project.vercel.app` — the status dot in the header
should turn green ("Live · just now") within a couple seconds. If it shows "Cached data"
instead, open `https://your-project.vercel.app/api/events?timeMin=2026-07-30T00:00:00%2B08:00&timeMax=2026-09-13T00:00:00%2B08:00`
directly in the browser to see the raw error message (usually a missing/incorrect
API key, the Calendar API not enabled, or the calendar not actually public yet).

Share the `vercel.app` URL (or add a custom domain in Vercel's project settings) with
your third party — they'll see the same live room bookings, WA message templates, and
can upload their own newcomer CSV independently (that part stays entirely in-browser,
per visitor, same as before).

## Updating later

Any change to `index.html` (e.g. WhatsApp template wording, the AV setup link) — edit
the file, commit, push. Vercel redeploys automatically on every push to `main`.
