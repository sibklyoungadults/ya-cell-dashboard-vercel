// ============================================================================
// Cell Intro — WhatsApp text template  ✏️  THIS IS THE FILE TO EDIT
//
// Placeholders are the EXACT header names from row 2 of the MASTER sheet,
// in square brackets, e.g. [Cell Name] or [Area (UPDATED)].
//
//   *bold*  _italic_  → WhatsApp formatting, passed through as-is.
//   An empty placeholder disappears together with a ", " next to it.
//   A line whose placeholders are ALL empty is dropped (and a label line
//   ending in ":" right above it, e.g. "More about this cell:", goes too).
//   Times like "8:30:00 PM" become "8.30pm".
//   Multi-line Meeting Day / Meeting Time are paired: "Sat, 10.30am / Wed, 8.30pm".
//
// After editing, commit the file in GitHub; Vercel redeploys in about a minute.
// ============================================================================

export const TEMPLATE = `*[Cell Name]*
Location: *[Area (UPDATED)]*
Leader: *[Cell Leader Name 1], [Cell Leader Name 2]*
Day, Time: *[Meeting Day], [Meeting Time]*
More about this cell:
_[Cell Description]_`;
