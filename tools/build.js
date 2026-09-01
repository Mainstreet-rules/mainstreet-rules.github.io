#!/usr/bin/env node
/**
 * Builds dist/rulebook.html from src/book.json + src/template.html.
 *
 * src/book.json is the source of truth. It already carries every rule ID, and
 * IDs are NEVER regenerated here: staff cite them in reports, and the in-page
 * editor assigns new ones as max+1 per prefix. A build that renumbered rules
 * would silently break every link and citation.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'src', 'book.json');
const TPL = path.join(ROOT, 'src', 'template.html');
const OUT = process.argv[2] || path.join(ROOT, 'dist', 'rulebook.html');

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const book = data.book;

/**
 * PUBLIC BUILD — rules and markers only.
 *
 * This page is served to the whole internet from a public repository, and a
 * static site can hide nothing: whatever ships in the file, any visitor can
 * read with view-source. So the roster, the audit log and the kept backups are
 * deliberately NOT built into it. They live only in the staff artifact, which
 * is shared with approved people and enforces access on the server.
 *
 * Do not "helpfully" add them back.
 */
const json = JSON.stringify({
  book: book,
  markers: data.markers || [],
  editors: [],
  audit: [],
  backups: []
}, null, 1).split('<').join(String.fromCharCode(92) + 'u003c');

const tpl = fs.readFileSync(TPL, 'utf8');
if (tpl.indexOf('__BOOK_JSON__') === -1) throw new Error('template is missing the __BOOK_JSON__ placeholder');

const out = tpl.split('__BOOK_JSON__').join(json);
fs.mkdirSync(path.dirname(OUT), {recursive: true});
fs.writeFileSync(OUT, out, 'utf8');

// GitHub Pages copy. This is a user site (kittyka917.github.io), which serves
// from the repository root, so the page has to be index.html at the top level.
// .nojekyll stops Pages running the files through Jekyll.
// Only written on a normal build, not when building to a scratch path.
if (!process.argv[2]) {
  fs.writeFileSync(path.join(ROOT, 'index.html'), out, 'utf8');
  fs.writeFileSync(path.join(ROOT, '.nojekyll'), '', 'utf8');
  console.log('wrote index.html for GitHub Pages');
}

const rules = book.reduce((n, s) => n + (s.groups || []).reduce((m, g) => m + g.rules.length, 0), 0);
const pages = book.reduce((n, s) => n + (s.groups || []).length, 0);
console.log('built ' + path.relative(ROOT, OUT) +
            ' — ' + book.length + ' sections, ' + pages + ' pages, ' + rules + ' rules, ' +
            out.length + ' bytes');
