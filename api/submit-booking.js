// ============================================================================
// POST /api/submit-booking
// Body: { cell, name, contact, date, time, room, piano, guitar }
//
// Appends one row to a Google Sheet (via lib/google-sheets.js) representing
// a room booking REQUEST — this does NOT create a calendar event. A human
// still reviews the sheet and adds the actual event to the calendar; this
// just gives leaders a public, no-login way to submit a request and gives
// the YA team a single list to review.
//
// Intentionally public (no session check) — same reasoning as api/calendar.js:
// the request form lives on the public page, not behind /team.
//
// Server-side validation is deliberately minimal but present: we re-check
// required fields and reject obviously malformed input, but we do NOT
// re-run the "room already booked" / "cell already booked that date" checks
// here, because that logic lives client-side against live calendar data
// (see shared/booking-utils.js's getBookingsForDate). A race between two
// people submitting at once is possible but rare for a small-team booking
// form, and the sheet is reviewed by a human before anything hits the
// calendar anyway.
// ============================================================================

import { appendRow } from '../lib/google-sheets.js';

const MAX_LEN = 200; // sane upper bound for any single text field

function clean(v) {
  return typeof v === 'string' ? v.trim().slice(0, MAX_LEN) : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const cell    = clean(body.cell);
  const name    = clean(body.name);
  const contact = clean(body.contact);
  const date    = clean(body.date);
  const time    = clean(body.time);
  const room    = clean(body.room);
  const piano   = Boolean(body.piano);
  const guitar  = Boolean(body.guitar);

  if (!cell || !name || !contact || !date || !time || !room) {
    return res.status(400).json({ error: 'Missing required field(s)' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  const instruments = [piano ? 'Piano' : null, guitar ? 'Guitar' : null].filter(Boolean).join(', ');
  const submittedAt = new Date().toISOString();

  try {
    await appendRow([
      submittedAt,
      cell,
      name,
      contact,
      date,
      time,
      room,
      instruments,
      'Pending review' // status column — the reviewer can change this manually in the sheet
    ]);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Failed to append booking row to Google Sheet:', err);
    return res.status(502).json({ error: 'Could not record this request right now. Please try again shortly.' });
  }
}
