// ============================================================================
// portal.js — Portal Settings shared by the public site and the team area.
//
// Settings live in /portal-config.json (edit them from Team → ⚙️ Portal
// Settings, then commit the copied JSON to that file in GitHub). If the file
// can't be loaded, PORTAL_DEFAULTS below are used so the site still works.
//
// "Preview as leader": the team page stores its unsaved draft in this
// browser's localStorage and opens /?preview=1, which reads the draft
// instead of portal-config.json. Nothing is published by previewing.
// ============================================================================
const PORTAL_DEFAULTS = {
  "version": 1,
  "welcomeNote": "",
  "tabs": {
    "cells": {
      "label": "🏠 Cell Bookings",
      "showToLeaders": true,
      "intro": "Find your cell group to see its upcoming room bookings. Tap a booking for key, aircon remote and instrument collection details."
    },
    "rooms": {
      "label": "📋 Bookings by Date",
      "showToLeaders": false,
      "intro": "All YA Cell room bookings for one date. Pick a date above. ❄️ marks rooms that need the aircon remote. “Unassigned” means the room is reserved for YA but no cell has been given it yet."
    },
    "request": {
      "label": "📝 Request a Booking",
      "showToLeaders": false,
      "intro": ""
    },
    "custom": {
      "label": "📌 Notes",
      "showToLeaders": false,
      "enabled": false,
      "intro": "",
      "content": "Write anything leaders should know here: announcements, contacts, room rules.\n\nUse *asterisks* for bold. Links like https://example.com become clickable."
    },
    "celllist": {
      "label": "🗂️ Bookings by Cell Group",
      "intro": "Every cell’s upcoming dates and rooms. Tap 📋 Copy for a WhatsApp-ready summary of one cell, or Copy All for every cell. Rooms with no cell yet are grouped under Unassigned."
    },
    "wagen": {
      "label": "💬 Send Reminder",
      "intro": "Ready-to-send WhatsApp reminders for each cell on the chosen date, with key, AV guide and return instructions. Rooms that need the aircon remote use Template 2. Tap 📋 Copy and paste it into the cell’s chat."
    },
    "newcomers": {
      "label": "👥 Newcomers",
      "intro": "Load your newcomer list (CSV) to sort and filter by last contact. Last-contacted dates in amber are 31–60 days ago, and red means 60+ days. The file stays on your device and isn’t uploaded or shared."
    },
    "edm": {
      "label": "📧 Email Templates",
      "intro": ""
    }
  },
  "collection": {
    "key": "🔑 *Key*: collect/return at guard post (level 4). Can collect from 5pm onwards.",
    "av": "🎥 *Sound system & projector guide*: {av_link}",
    "aircon": "❄️ *Aircon remote*: collect/return at guard post (level 4). Please switch off all aircons.",
    "piano": "🎹 *Piano*: collect/return at office front desk.",
    "guitar": "🎸 *Guitar*: collect/return at office front desk.",
    "signage": "🪧 *CG signage*: return to guard post (level 4) together with the keys."
  },
  "wa": {
    "avLink": "https://tiny.cc/ya26cgroom",
    "template1": "*Date:* {date}\n\n*Cell group:* {cell}\n\n*Location:* {location}\n\n*Note:*\n#. *Key collection/return*🔑: guard post (level 4).\n- Can collect anytime from 5pm & onwards\n#. *Sound system & projector setup guide*🎥: {av_link}\n{extras}\n#. *CG Signange return*🪧: guard post (level 4)\n- Pls return together with keys ✨",
    "template2": "*Date:* {date}\n\n*Cell group:* {cell}\n\n*Location:* {location}\n\n*Note:*\n#. *Key collection/return*🔑: guard post (level 4).\n- Can collect anytime from 5pm & onwards\n#. *Sound system & projector setup guide*🎥: {av_link}\n#. *Aircon Remote collection/return* ❄️: guard post (level 4)\n- Pls check all aircons are switched off ☺️\n{extras}\n#. *CG Signange return*🪧: guard post (level 4)\n- Pls return together with keys ✨",
    "pianoLine": "#. *Piano collection/return*🎹: office front desk",
    "guitarLine": "#. *Guitar collection/return*🎸: office front desk"
  }
};
const PORTAL_DRAFT_KEY = 'yaPortalDraft';
const PUBLIC_TABS = ['cells', 'rooms', 'request', 'custom'];
const TEAM_TABS   = ['celllist', 'wagen', 'newcomers', 'edm'];

function portalDeepCopy(o) { return JSON.parse(JSON.stringify(o)); }
// Fill any missing keys from the defaults (so an older portal-config.json keeps working)
function portalWithDefaults(cfg, def = PORTAL_DEFAULTS) {
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return portalDeepCopy(def);
  const out = {};
  Object.keys(def).forEach(k => {
    const d = def[k], v = cfg[k];
    out[k] = (d && typeof d === 'object' && !Array.isArray(d)) ? portalWithDefaults(v, d) : (v === undefined ? d : v);
  });
  Object.keys(cfg).forEach(k => { if (!(k in out)) out[k] = cfg[k]; });
  return out;
}
function isPortalPreview() { return /[?&]preview=1\b/.test(location.search); }
async function loadPortalConfig() {
  if (isPortalPreview()) {
    try { const d = JSON.parse(localStorage.getItem(PORTAL_DRAFT_KEY)); if (d) return portalWithDefaults(d); } catch (e) {}
  }
  try {
    const r = await fetch('/portal-config.json', { cache: 'no-store' });
    if (r.ok) return portalWithDefaults(await r.json());
  } catch (e) { console.warn('portal-config.json not loaded, using defaults', e); }
  return portalDeepCopy(PORTAL_DEFAULTS);
}

// Text with *bold* and clickable links (everything else escaped)
function rich(s) {
  let t = String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  t = t.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, u => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//, '')}</a>`);
  t = t.replace(/\*([^*\n]+)\*/g, '<b>$1</b>');
  return t;
}
function richParagraphs(s) {
  const t = String(s || '').trim();
  return t ? t.split(/\n\s*\n/).map(p => '<p>' + rich(p).replace(/\n/g, '<br>') + '</p>').join('') : '';
}
// Fill every [data-intro="tab"] element with that tab's description
function renderPortalIntros(cfg) {
  document.querySelectorAll('[data-intro]').forEach(el => {
    const txt = ((cfg.tabs || {})[el.dataset.intro] || {}).intro || '';
    el.innerHTML = rich(txt); el.style.display = txt ? '' : 'none';
  });
}

// ── WhatsApp templates ─────────────────────────────────────────────────────
// {date} {cell} {location} {av_link}; {extras} on its own line adds the piano /
// guitar lines; lines starting "#." are numbered; lines starting "- " become
// WhatsApp bullets (same invisible spacing characters WhatsApp uses).
const WA_NUM = n => n + '.⁠ ⁠';
const WA_BULLET = '•⁠  ⁠';
function fillWATemplate(tpl, vars, extras) {
  const lines = [];
  String(tpl || '').split('\n').forEach(l => { if (l.trim() === '{extras}') extras.forEach(x => lines.push(x)); else lines.push(l); });
  let n = 1;
  return lines.map(l => {
    l = l.replace(/\{(date|cell|location|av_link)\}/g, (m, k) => vars[k] != null ? vars[k] : m);
    if (/^#\.\s?/.test(l)) return WA_NUM(n++) + l.replace(/^#\.\s?/, '');
    if (/^[-•]\s+/.test(l)) return WA_BULLET + l.replace(/^[-•]\s+/, '');
    return l;
  }).join('\n');
}
function buildWAMessage(cfg, special, date, cg, loc, piano, guitar) {
  const w = cfg.wa || {};
  const extras = [];
  if (piano)  extras.push(w.pianoLine || '');
  if (guitar) extras.push(w.guitarLine || '');
  return fillWATemplate(special ? w.template2 : w.template1, { date, cell: cg, location: loc, av_link: w.avLink || '' }, extras);
}
