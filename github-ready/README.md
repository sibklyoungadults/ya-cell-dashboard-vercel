# YA Cell Dashboard (Vercel)

A portal for YA cell leaders and admins:

- **Leaders (public view):** see the tabs you choose in ⚙️ Portal Settings (by default only **🏠 Cell Bookings**). No login needed.
- **Pastor/Admin (passcode):** every tab, plus **⚙️ Portal Settings** to show or hide tabs, rename them, edit descriptions, the welcome note, collection details, WhatsApp templates and a custom tab, with **👁 Preview as leader**.

Bookings are read **live** from two public Google Calendars on every load and refresh (no cached data):

| Calendar | ID |
|---|---|
| sibklyoungadults | `sibklyoungadults@gmail.com` |
| Young Adults | `sibkl.org.my_jfku94u1g9l5ju3sb7or5j9obc@group.calendar.google.com` |

## Files

| File | What it does |
|---|---|
| `index.html` | The whole dashboard UI |
| `portal-config.json` | Portal Settings: tab names/visibility, descriptions, welcome note, collection details, WhatsApp templates, custom tab |
| `api/events.js` | Serverless function: reads "YA Cell" events from both calendars with your API key |
| `vercel.json` | Turns off caching for the page, settings and bookings |
| `favicon*`, `apple-touch-icon.png`, `icon-*.png`, `site.webmanifest` | Icons and home-screen install |
| `package.json`, `.gitignore` | Project basics |

## 1. Check both calendars are public

The API key can only read public calendars. For **each** calendar, in Google Calendar:
hover the calendar → **⋮ → Settings and sharing → Access permissions** → tick **Make available to public** → **See all event details**.

> The Young Adults calendar belongs to the sibkl.org.my Google Workspace. If the public option is greyed out, a Workspace admin must allow external sharing.

## 2. Google Calendar API key

Skip if your Vercel project already has `GOOGLE_CALENDAR_API_KEY`.

1. [console.cloud.google.com](https://console.cloud.google.com/) → create or pick a project.
2. **APIs & Services → Library** → **Google Calendar API** → **Enable**.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. **Restrict key** → API restrictions → **Google Calendar API** only. The key stays on the server and never reaches the browser.

## 3. Push to GitHub

**Updating your existing repo** (replace everything with these files):

```bash
cd path/to/your/ya-cell-dashboard          # your existing local clone
# copy all files from this folder in, overwriting the old ones, then:
git add -A
git commit -m "Live two-calendar bookings, Portal Settings, unassigned rooms"
git push
```

Delete the old `draft` file from the repo if it is still there (`git rm draft`).

**No terminal?** On github.com open the repo → **Add file → Upload files** → drag in every file and the `api` folder → **Commit changes**.

**New repo instead:**

```bash
cd ya-cell-dashboard
git init
git add -A
git commit -m "YA Cell dashboard"
git branch -M main
git remote add origin https://github.com/<your-username>/ya-cell-dashboard.git
git push -u origin main
```

## 4. Vercel

- **Existing project:** pushing to `main` redeploys automatically. Check **Settings → Environment Variables** has `GOOGLE_CALENDAR_API_KEY`.
- **New project:** [vercel.com/new](https://vercel.com/new) → **Import** the repo → Framework preset **Other** (no build command) → add `GOOGLE_CALENDAR_API_KEY` → **Deploy**.

## 5. Verify

1. Open your `vercel.app` link: the header dot turns green with **Live · just now**.
2. If it says **Not loaded**, open
   `https://<your-project>.vercel.app/api/events?timeMin=2026-11-11T00:00:00%2B08:00&timeMax=2027-03-11T00:00:00%2B08:00`
   to see the exact error (usually: key missing, Calendar API not enabled, or a calendar not public).
3. If only one calendar fails, the page still shows the other and says which one is missing.

## Changing Portal Settings (on Vercel)

The page can't save itself on Vercel, so settings live in `portal-config.json`:

1. Unlock **🔒 Pastor/Admin** → **⚙️ Portal Settings** → make your edits → **👁 Preview as leader** to check.
2. **Save changes** → review the list → **Confirm**. The new settings are copied to your clipboard (and shown in a box).
3. In GitHub open `portal-config.json` → ✏️ **Edit** → select all → paste → **Commit changes**.
4. Vercel redeploys in about a minute. Undo by reverting that commit in the file's **History**.

You can also edit `portal-config.json` directly in GitHub. In WhatsApp templates: `{date}` `{cell}` `{location}` `{av_link}`; `{extras}` on its own line adds piano/guitar lines; lines starting `#.` are auto-numbered; lines starting `- ` become WhatsApp bullets.

## Bookings format (Google Calendar)

- Event title contains **YA Cell** (any capitalisation).
- Description: one line per room, `Room: Cell`, e.g. `M6-1: The Dwelling`. Add `+ Piano` / `+ Guitar` to the room for instruments.
- Rooms booked on the event with no description lines show as **Unassigned** (admin tabs only).

## Admin passcode

The passcode only hides the admin tabs; it is not real security because the page source is public. Don't put personal details in Portal Settings. To change it, run `echo -n "newpass" | shasum -a 256` and paste the result into `ADMIN_HASH` in `index.html`.
