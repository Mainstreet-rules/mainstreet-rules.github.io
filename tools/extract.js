#!/usr/bin/env node
/**
 * Pulls the data back out of a built (or published) page into src/book.json.
 *
 * Run this BEFORE editing locally whenever anyone has published edits from
 * inside the page — otherwise the next build overwrites their changes with
 * whatever this repo last had.
 *
 *   node tools/extract.js                 # from dist/rulebook.html
 *   node tools/extract.js path/to/page.html
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const from = process.argv[2] || path.join(ROOT, 'dist', 'rulebook.html');
const html = fs.readFileSync(from, 'utf8');

const m = html.match(/<script type="application\/json" id="book-data">([\s\S]*?)<\/script>/);
if (!m) throw new Error('no data block found in ' + from);

const json = m[1].split(String.fromCharCode(92) + 'u003c').join('<');
const data = JSON.parse(json);

// Write keys in the same order build.js emits them, so extracting twice with
// no changes produces no diff at all.
const ordered = {
  book: data.book,
  markers: data.markers || [],
  editors: data.editors || [],
  audit: data.audit || [],
  backups: data.backups || []
};

const out = path.join(ROOT, 'src', 'book.json');
fs.writeFileSync(out, JSON.stringify(ordered, null, 1), 'utf8');

const rules = data.book.reduce((n, s) => n + (s.groups || []).reduce((m2, g) => m2 + g.rules.length, 0), 0);
console.log('extracted from ' + path.relative(ROOT, from) + ' → src/book.json');
console.log('  ' + data.book.length + ' sections, ' + rules + ' rules, ' +
            (data.markers || []).length + ' markers, ' +
            (data.editors || []).length + ' roster entries, ' +
            (data.audit || []).length + ' audit entries, ' +
            (data.backups || []).length + ' backups');
