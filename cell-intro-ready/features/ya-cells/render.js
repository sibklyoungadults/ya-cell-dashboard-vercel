// ============================================================================
// Cell Intro — template renderer (pure functions, no dependencies)
//
// renderTemplate(template, lookup) → { text, unknown }
//   lookup(headerName) returns the cell's raw value for that header, or
//   undefined when the sheet has no such header (an "unknown placeholder").
//   `unknown` lists the placeholder names that matched no header.
//
// Used by handler.js on the server and by render.test.js.
// ============================================================================

const PLACEHOLDER_RE = /\[([^\]]+)\]/g;

// Every distinct [Header Name] used in a template, in order of appearance.
export function placeholdersIn(template) {
  const out = [];
  for (const m of String(template).matchAll(PLACEHOLDER_RE)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

// "8:30:00 PM" → "8.30pm", "10:00:00 AM" → "10.00am", "8:30 pm" → "8.30pm".
// Anything that isn't a clock time is returned unchanged.
export function formatTime(value) {
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp])\.?\s*[Mm]\.?$/);
  return m ? `${Number(m[1])}.${m[2]}${m[3].toLowerCase()}m` : value;
}

// Trim and collapse inner line breaks (and the spaces around them) to one space.
export function collapse(value) {
  return String(value == null ? '' : value).replace(/\s*[\r\n]+\s*/g, ' ').trim();
}

function splitLines(value) {
  return String(value == null ? '' : value).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function cleanValue(value) { return formatTime(collapse(value)); }

// Render one run of tokens (literal strings and {name} placeholders) with the
// given values. An empty placeholder takes one neighbouring ", " with it:
// the following one if there is one, otherwise the preceding one.
function renderTokens(tokens, valueOf) {
  let out = '';
  let stripNextComma = false;
  tokens.forEach(tok => {
    if (typeof tok === 'string') {
      let s = tok;
      if (stripNextComma) { s = s.replace(/^\s*,\s?/, ''); stripNextComma = false; }
      out += s;
      return;
    }
    const v = valueOf(tok.name);
    if (v) { out += v; stripNextComma = false; return; }
    const nextIdx = tokens.indexOf(tok) + 1;
    const next = tokens[nextIdx];
    if (typeof next === 'string' && /^\s*,/.test(next)) stripNextComma = true;
    else out = out.replace(/,\s?$/, '');
  });
  return out;
}

function tokenize(line) {
  const tokens = [];
  let last = 0;
  for (const m of line.matchAll(PLACEHOLDER_RE)) {
    if (m.index > last) tokens.push(line.slice(last, m.index));
    tokens.push({ name: m[1] });
    last = m.index + m[0].length;
  }
  if (last < line.length) tokens.push(line.slice(last));
  return tokens;
}

function renderLine(line, lookup, unknown) {
  const tokens = tokenize(line);
  const phs = tokens.filter(t => typeof t !== 'string');
  if (!phs.length) return { text: line, hasPlaceholders: false, empty: false };

  const raw = {};
  phs.forEach(({ name }) => {
    const v = lookup(name);
    if (v === undefined) { if (!unknown.includes(name)) unknown.push(name); raw[name] = ''; }
    else raw[name] = v;
  });

  const allEmpty = phs.every(({ name }) => !cleanValue(raw[name]));
  if (allEmpty) return { text: '', hasPlaceholders: true, empty: true };

  // Pairing: on a line with 2+ placeholders, if the multi-line values all
  // have the same number of lines, render the placeholder span once per line
  // ("Saturday, 10.30am / Wednesday, 8.30pm"). Single-line values repeat.
  const lineCounts = phs.map(({ name }) => splitLines(raw[name]).length).filter(n => n > 1);
  const pairCount = lineCounts.length && lineCounts.every(n => n === lineCounts[0]) ? lineCounts[0] : 0;
  if (phs.length >= 2 && pairCount > 1) {
    const first = tokens.indexOf(phs[0]), lastIdx = tokens.indexOf(phs[phs.length - 1]);
    const prefix = tokens.slice(0, first).join(''), suffix = tokens.slice(lastIdx + 1).join('');
    const inner = tokens.slice(first, lastIdx + 1);
    const parts = [];
    for (let i = 0; i < pairCount; i++) {
      const part = renderTokens(inner, name => {
        const ls = splitLines(raw[name]);
        return cleanValue(ls.length > 1 ? ls[i] : raw[name]);
      }).trim();
      if (part) parts.push(part);
    }
    return { text: (prefix + parts.join(' / ') + suffix).replace(/\s+$/, ''), hasPlaceholders: true, empty: false };
  }

  return { text: renderTokens(tokens, name => cleanValue(raw[name])).replace(/\s+$/, ''), hasPlaceholders: true, empty: false };
}

export function renderTemplate(template, lookup) {
  const unknown = [];
  const out = [];
  String(template).split('\n').forEach(line => {
    const r = renderLine(line, lookup, unknown);
    if (r.empty) {
      // Drop a label line right above an emptied line ("More about this cell:")
      const prev = out[out.length - 1];
      if (prev && !prev.hasPlaceholders && /:\s*$/.test(prev.text)) out.pop();
      return;
    }
    out.push(r);
  });
  return { text: out.map(r => r.text).join('\n'), unknown };
}
