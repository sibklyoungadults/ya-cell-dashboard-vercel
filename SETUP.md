# YA Cell Dashboard — Setup Guide

This is written for whoever maintains this next, even if that's not the person who set it up originally. If you're picking this up cold, read this whole file before changing anything.

## What this is

Two sites sharing one codebase:

- **Public site** (`/index.html`) — anyone with the link can see "Bookings by Date" and submit a room booking **request** via the "Request a Booking" tab (which writes to a Google Sheet for a human to review — see step 4b below). No login. This is also where future public panels (Host Roster, Baptism, DNA & Member Installation) will live later.
- **Team area** (`/team/index.html`) — password-gated. Has Bookings by Cell Group, Send Reminder, Newcomers, and Email Templates.

There's no database and no user accounts — just one shared team password, and calendar data pulled live from Google Calendar on every page load.

## One-time setup (do these in order)

### 1. Make the YA Cell Google Calendar publicly readable

The site reads events with a plain API key (no OAuth), which only works if the calendar allows public read access.

1. Open Google Calendar, signed in as the calendar's owner (`sibklyoungadults@gmail.com` or whoever manages it).
2. Find the "YA Cell" calendar in the left sidebar → click the three dots → **Settings and sharing**.
3. Under **Access permissions**, check **"Make available to public"**. Choose **"See only free/busy"** if you want to hide details, or **"See all event details"** if the room/cell-group info is meant to be visible (it needs to be "See all event details" for this dashboard to show anything useful).
4. Scroll down to **Integrate calendar** and copy the **Calendar ID** (it's just the calendar's email address, e.g. `sibklyoungadults@gmail.com`) — you'll need it in step 3 below.

### 2. Create a Google Calendar API key

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project (or use an existing one) — e.g. "YA Cell Dashboard."
2. **APIs & Services → Library** → search "Google Calendar API" → click **Enable**.
3. **APIs & Services → Credentials** → **Create Credentials → API key**.
4. Click into the new key → under **API restrictions**, choose **"Restrict key"** and select only **Google Calendar API**. This means even if the key leaked, it couldn't be used for anything else.
5. Copy the key — you'll paste it into Vercel in step 4.

### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/log in (works with your GitHub account directly).
2. **Add New → Project** → import the GitHub repo this code lives in.
3. Framework preset: leave as **"Other"** (this isn't a Next.js/React app). Leave build settings default — there's nothing to build, it's static files + serverless functions.
4. Click **Deploy**. It'll fail or half-work the first time because environment variables aren't set yet — that's expected, continue to step 4.

### 4. Set environment variables

In the Vercel project → **Settings → Environment Variables**, add these four (see `.env.example` in this repo for the same list with notes):

| Name | Value |
|---|---|
| `TEAM_PASSWORD` | Whatever password the team will type in at `/team/login.html`. Change it any time by just updating this value — no code change needed. |
| `SESSION_SECRET` | A long random string. Generate one in Terminal with `openssl rand -base64 32`. Anyone who has this can forge a valid login, so treat it like a password. |
| `GOOGLE_CALENDAR_API_KEY` | The key from step 2. |
| `GOOGLE_CALENDAR_ID` | The calendar ID from step 1 (e.g. `sibklyoungadults@gmail.com`). |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | From step 4b below. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | From step 4b below. |
| `BOOKING_SHEET_ID` | From step 4b below. |

After adding them, go to **Deployments** → click the **⋯** on the latest deployment → **Redeploy** (environment variable changes need a redeploy to take effect).

### 4b. Set up Room Booking Requests (Google Sheet)

The "Request a Booking" tab on the public page doesn't touch the calendar directly — it writes each submission as a new row in a Google Sheet that a human reviews, then manually creates the real calendar event. This needs a Google Sheet plus a **service account** (a robot Google account that can write to just that one sheet, without needing anyone's personal Google login).

1. **Create the sheet.** Go to [sheets.google.com](https://sheets.google.com), create a new blank spreadsheet (name it something like "YA Cell Booking Requests"). In row 1, add these headers across columns A–I: `Submitted At`, `Cell Group`, `Name`, `Contact`, `Date`, `Time`, `Room`, `Instruments`, `Status`.
2. **Get the Sheet ID.** Look at the spreadsheet's URL: `https://docs.google.com/spreadsheets/d/THIS-LONG-ID-HERE/edit`. Copy the long ID part — that's `BOOKING_SHEET_ID`.
3. **Create a service account.**
   - In the same (or a new) Google Cloud project from step 2 above, go to **APIs & Services → Library** → search "Google Sheets API" → **Enable**.
   - Go to **APIs & Services → Credentials** → **Create Credentials → Service account**. Give it any name (e.g. "ya-cell-booking-writer") and finish the wizard (you can skip granting it project-level roles — it only needs access to the one sheet, granted in step 5 below).
   - Click into the new service account → **Keys** tab → **Add Key → Create new key → JSON**. This downloads a `.json` file — **keep it private, never commit it to git.**
4. **Pull two values out of that downloaded JSON file:**
   - `client_email` → this is `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
   - `private_key` → this is `GOOGLE_SERVICE_ACCOUNT_KEY`. Paste the *entire* value into Vercel exactly as it appears in the JSON (including the `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----` lines and the `\n` sequences inside it) — Vercel's environment variable field handles this fine as one long string; the code un-escapes the `\n`s automatically.
5. **Share the sheet with the service account.** Back in the Google Sheet from step 1, click **Share**, paste in the service account's `client_email` (looks like `something@your-project.iam.gserviceaccount.com`), give it **Editor** access, and send/share (uncheck "notify" since it's a robot account, not a person).
6. Add the three values above (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `BOOKING_SHEET_ID`) to Vercel's environment variables alongside the others in step 4, then redeploy.
7. Test by submitting a dummy request on the public site's "Request a Booking" tab, and confirm a new row appears in the sheet within a few seconds.

**Changing the room list or time slots:** the 8 bookable rooms live in `shared/booking-utils.js` as `BOOKABLE_ROOMS`, and the time slot options live in `index.html` as `TIME_SLOTS` — edit either array directly, no other code changes needed.

### 5. Test it

- Visit your Vercel URL (something like `ya-cell-dashboard.vercel.app`) — you should see the public Bookings by Date page with live data.
- Click the "Request a Booking" tab, fill out a test request, and confirm it both shows a success message and appears as a new row in the Google Sheet from step 4b.
- Visit `/team/login.html`, enter the team password, and confirm you land on `/team/index.html` with all four tabs working.
- Try visiting `/team/index.html` directly in a private/incognito window (no login) — it should redirect you to the login page. If it doesn't, the middleware isn't running — see Troubleshooting below.

### 6. (Optional) Connect a custom domain

Vercel project → **Settings → Domains** → add your own domain if you have one, following Vercel's on-screen DNS instructions. Not required — the `.vercel.app` URL works fine on its own.

## Changing the team password later

Just update `TEAM_PASSWORD` in Vercel's environment variables and redeploy (or click "Redeploy" — no code change needed). Anyone already logged in stays logged in until their session expires (12 hours) or they log out; there's no way to force-expire existing sessions short of also changing `SESSION_SECRET`, which will log everyone out immediately.

## Adding a new public panel (Host Roster, Baptism, DNA & Member Installation)

1. Create a new page, e.g. `/host-roster.html`, following the same pattern as `index.html` (link `/shared/dashboard.css`, use `/shared/booking-utils.js` if it needs the same date/formatting helpers).
2. If it needs its own data source, add a new `/api/*.js` file the same way `api/calendar.js` was added.
3. Add a link to it from `index.html`'s `.panel-preview-row` (replace "Coming soon" with a real `<a>` link once the page exists).

No changes are needed to the team area or the login system for this — the public site and the team area are completely independent.

## Adding a new team-only feature

Add it as a new tab inside `/team/index.html` the same way Cell Group / Send Reminder / Newcomers / Email Templates were done — it's automatically behind the same password since `middleware.js` protects everything under `/team/*`.

## Troubleshooting

**"Server not configured yet" shown on the public page or in Newcomers/Cell Group tabs**
→ One of the environment variables isn't set. Check Vercel → Settings → Environment Variables against the table in step 4, then redeploy.

**Visiting `/team/index.html` directly does NOT redirect to login**
→ Check that `middleware.js` is at the project's root (not inside a subfolder) and that `package.json` has `"type": "module"`. Vercel only picks up middleware at the root.

**Login says "Wrong password" even with the right password**
→ Double check there's no extra space in the `TEAM_PASSWORD` value in Vercel, and that you redeployed after setting it.

**Calendar data isn't showing / "Cached data" status stays forever**
→ Usually means the calendar isn't actually public yet (redo step 1) or the API key is restricted to the wrong API/referrer (redo step 2). Open the browser's DevTools → Network tab, find the failed `/api/calendar` request, and check its response body for the actual error message from Google.

**I lost the `SESSION_SECRET` or `TEAM_PASSWORD` and need to reset them**
→ That's fine, there's no data tied to them. Just generate/pick new ones and update the environment variables in Vercel, then redeploy.

**"Request a Booking" form shows "Something went wrong submitting your request"**
→ Check the Vercel function logs (**Deployments → latest → Functions → `api/submit-booking`**) for the actual error. Almost always one of: (a) the Google Sheet wasn't shared with the service account's `client_email` (redo step 4b.5), (b) `GOOGLE_SERVICE_ACCOUNT_KEY` got mangled when pasted (make sure the whole private key, `-----BEGIN...` through `-----END...`, was pasted), or (c) the Sheets API wasn't enabled on the Google Cloud project (redo step 4b.3).

**The Room dropdown on the booking form always says "No rooms available"**
→ This reads live calendar data the same way Bookings by Date does, so it's usually the same root cause as "Calendar data isn't showing" above — check that first. If calendar data IS showing correctly but rooms still look wrong, double-check `BOOKABLE_ROOMS` in `shared/booking-utils.js` still matches how rooms are actually written in calendar event descriptions (e.g. if someone starts typing a 9th room name that doesn't match any entry, it's silently ignored rather than wrongly blocking an existing room).
