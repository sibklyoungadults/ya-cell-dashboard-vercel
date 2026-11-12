# YA Cell Dashboard

Public room-booking site for YA cell leaders, plus a password-protected team area.

| Where | What |
|---|---|
| `/` (public) | 📋 Bookings by Date · 🏠 Cell Bookings · 📝 Request a Booking · optional custom tab. Which tabs show is set in Portal Settings. |
| `/team/` (login) | 🗂️ Bookings by Cell Group · 💬 Send Reminder · 👥 Newcomers · 📧 Email Templates · ⚙️ Portal Settings |

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
| `vercel.json` | Turns off caching for settings and API responses |
