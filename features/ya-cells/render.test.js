// Run with: npm test   (uses Node's built-in test runner, no extra packages)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate, formatTime, placeholdersIn } from './render.js';
import { TEMPLATE } from './template.js';

const row = (o) => (name) => (name in o ? o[name] : undefined);
const base = {
  'Cell Name': 'The Dwelling',
  'Area (UPDATED)': 'Bukit Jalil',
  'Cell Leader Name 1': 'Alice Tan',
  'Cell Leader Name 2': 'Ben Lim',
  'Meeting Day': 'Wednesday',
  'Meeting Time': '8:30:00 PM',
  'Cell Description': 'A warm cell.',
};

test('full row renders the template exactly', () => {
  const { text, unknown } = renderTemplate(TEMPLATE, row(base));
  assert.equal(text, [
    '*The Dwelling*',
    'Location: *Bukit Jalil*',
    'Leader: *Alice Tan, Ben Lim*',
    'Day, Time: *Wednesday, 8.30pm*',
    'More about this cell:',
    '_A warm cell._',
  ].join('\n'));
  assert.deepEqual(unknown, []);
});

test('empty second leader drops it and its ", "', () => {
  const { text } = renderTemplate(TEMPLATE, row({ ...base, 'Cell Leader Name 2': '  ' }));
  assert.match(text, /^Leader: \*Alice Tan\*$/m);
});

test('empty first leader drops the ", " after it', () => {
  const { text } = renderTemplate(TEMPLATE, row({ ...base, 'Cell Leader Name 1': '' }));
  assert.match(text, /^Leader: \*Ben Lim\*$/m);
});

test('empty description drops the line and "More about this cell:"', () => {
  const { text } = renderTemplate(TEMPLATE, row({ ...base, 'Cell Description': '' }));
  assert.equal(text.split('\n').length, 4);
  assert.doesNotMatch(text, /More about this cell/);
  assert.doesNotMatch(text, /_/);
});

test('multi-line Meeting Day / Meeting Time are paired', () => {
  const { text } = renderTemplate(TEMPLATE, row({ ...base, 'Meeting Day': 'Saturday\nWednesday', 'Meeting Time': '10:30:00 AM\n8:30:00 PM' }));
  assert.match(text, /^Day, Time: \*Saturday, 10\.30am \/ Wednesday, 8\.30pm\*$/m);
});

test('multi-line days with one time repeat the time', () => {
  const { text } = renderTemplate(TEMPLATE, row({ ...base, 'Meeting Day': 'Tuesday\nThursday', 'Meeting Time': '8:00:00 PM' }));
  assert.match(text, /^Day, Time: \*Tuesday, 8\.00pm \/ Thursday, 8\.00pm\*$/m);
});

test('inner line breaks collapse to single spaces', () => {
  const { text } = renderTemplate(TEMPLATE, row({ ...base, 'Cell Description': 'Line one.\n\nLine two.\n  Line three.' }));
  assert.match(text, /^_Line one\. Line two\. Line three\._$/m);
});

test('unknown placeholder renders as nothing and is reported', () => {
  const tpl = '*[Cell Name]* [Nickname]\nExtra: [Nickname]';
  const { text, unknown } = renderTemplate(tpl, row(base));
  assert.equal(text, '*The Dwelling*');
  assert.deepEqual(unknown, ['Nickname']);
});

test('time formatting', () => {
  assert.equal(formatTime('8:30:00 PM'), '8.30pm');
  assert.equal(formatTime('10:00:00 AM'), '10.00am');
  assert.equal(formatTime('7:45 pm'), '7.45pm');
  assert.equal(formatTime(' 12:05:00 AM '), '12.05am');
  assert.equal(formatTime('After service'), 'After service');
});

test('placeholdersIn lists each header once', () => {
  assert.deepEqual(placeholdersIn(TEMPLATE), ['Cell Name', 'Area (UPDATED)', 'Cell Leader Name 1', 'Cell Leader Name 2', 'Meeting Day', 'Meeting Time', 'Cell Description']);
});
