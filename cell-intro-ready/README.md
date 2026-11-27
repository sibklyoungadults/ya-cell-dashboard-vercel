# YA Cell Dashboard

Public room-booking site for YA cell leaders, plus a password-protected team area.

| Where | What |
|---|---|
| `/` (public) | 📋 Bookings by Date · 🏠 Cell Bookings · 📝 Request a Booking · optional custom tab. Which tabs show is set in Portal Settings. |
| `/team/` (login) | 📋 Bookings by Date · 🗂️ Bookings by Cell Group · 💬 Send Reminder · 📇 Cell Intro · 👥 Newcomers · 📧 Email Templates · ⚙️ Portal Settings |

- **Live bookings** from two Google Calendars (sibklyoungadults + Young Adults), read on every load, every 5 minutes and on Refresh. No cached data.
- **Unassigned rooms:** a "YA Cell" event with no description lists its booked rooms as Unassigned.
- **Portal Settings:** show/hide public tabs, rename tabs, edit descriptions, welcome note, collection details, WhatsApp templates and a custom tab. Saved in `portal-config.json`.

**Setup, environment variables and how to publish settings: see [SETUP.md](SETUP.md).**

## Files

| File | Purpose |
|---|---|
| `index.html` | Public site |
| `team/index.html`, `team/login.html` | Team area (protected by `middleware.js`) |
| `shared/booking-utils.js` | Calendar fetch + merge, Unassigned rooms, parsing helpers (both sites) |
| `shared/portal.js` | Portal Settings loading, preview, WhatsApp templates (both sites) |
| `shared/dashboard.css` | Styles for both sites |
| `portal-config.json` | Portal Settings values (edit via Team → ⚙️ Portal Settings) |
| `api/calendar.js` | Reads both calendars with `GOOGLE_CALENDAR_API_KEY` |
| `api/login.js`, `api/logout.js`, `lib/session.js`, `middleware.js` | Team login |
| `api/submit-booking.js`, `lib/google-sheets.js` | Request a Booking → Google Sheet |
| `vercel.json` | Turns off caching for settings and API responses (except Cell Intro, cached 5 min) |
| `features/ya-cells/` | Cell Intro tab: `template.js` (the wording), `render.js`, `sheet.js`, `handler.js`, `ui.js`, `ya-cells.css`, `render.test.js` |
| `api/ya-cells.js` | Route for the Cell Intro data (team login required) |
| `.env.example` | Every environment variable the site uses |

## YA Cells tab – how to change the template

The **📇 Cell Intro** tab (team area) lists every active Young Adults cell as ready-to-paste WhatsApp text. It reads the public cell chart live: tab **MASTER**, set by `YA_SHEET_ID` and `YA_SHEET_GID`. Rows must have **Status = ACTIVE** and a **Generation** starting with "Young Adults". Only the 2026 table counts: it runs from row 3 down to the first fully blank row. Results are cached for 5 minutes, and **↻ Refresh now** reads the sheet straight away.

**To change the wording**, edit **`features/ya-cells/template.js`** in GitHub (✏️ Edit → change the text between the backticks → Commit). Vercel redeploys in about a minute.

- **Placeholders** are the sheet's header names exactly as written in row 2, in square brackets: `[Cell Name]`, `[Area (UPDATED)]`, `[Meeting Day]`… If a header appears twice ("Gender", "Mobile Number", "E-Mail Address"), the first column is used.
- **WhatsApp formatting** (`*bold*`, `_italic_`) passes through unchanged.
- **Empty values**: an empty placeholder disappears with the ", " next to it. A line whose placeholders are all empty is dropped, and so is a label line ending in ":" just above it (e.g. "More about this cell:").
- **Line breaks** inside a sheet cell become single spaces.
- **Times**: `8:30:00 PM` becomes `8.30pm`.
- **Several meeting days**: when Meeting Day and Meeting Time each have several lines, they're paired: `Saturday, 10.30am / Wednesday, 8.30pm`.
- **Mistyped placeholders**: a placeholder that matches no header shows as nothing, with a small note in the tab. A column the tab needs that's missing from the sheet (e.g. a renamed header) shows a yellow warning naming it.
- **Tab name and description**: change them in ⚙️ Portal Settings → Tabs → Team area.
- **Tests**: `npm install && npm test` checks the renderer (Node 22+).
