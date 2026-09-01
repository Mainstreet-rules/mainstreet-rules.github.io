#!/usr/bin/env node
/**
 * Imports an archive downloaded from the staff artifact into this repo.
 *
 *   In the artifact:  Admin -> "Download full archive"
 *   Then here:        node tools/import.js ~/Downloads/mainstreet-rulebook-archive-2026-09-01.json
 *
 * The archive contains the roster, the audit log and the kept backups. Those
 * are STRIPPED here: this repository is public, so only the rules and markers
 * cross over. tools/check.js fails the build if any of them slip through.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const from = process.argv[2];

if (!from) {
  console.error('Usage: node tools/import.js <archive.json>');
  console.error('Get the file from the artifact: Admin -> Download full archive');
  process.exit(1);
}
if (!fs.existsSync(from)) {
  console.error('No such file: ' + from);
  process.exit(1);
}

let archive;
try {
  archive = JSON.parse(fs.readFileSync(from, 'utf8'));
} catch (e) {
  console.error('That file is not valid JSON: ' + e.message);
  process.exit(1);
}

const book = Array.isArray(archive) ? archive : archive.book;
const valid = Array.isArray(book) && book.length > 0 && book.every(s =>
  s && typeof s.id === 'string' && typeof s.name === 'string' &&
  (Array.isArray(s.groups) || Array.isArray(s.changelog)));

if (!valid) {
  console.error('That file is not a rulebook archive (no usable "book" array).');
  process.exit(1);
}

const ids = [];
book.forEach(s => (s.groups || []).forEach(g => g.rules.forEach(r => ids.push(r.id))));
const missing = ids.filter(id => !id).length;
const dupes = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
if (missing || dupes.length) {
  console.error('Refusing to import: ' + (missing ? missing + ' rules without an id. ' : '') +
                (dupes.length ? 'duplicate ids: ' + dupes.join(', ') : ''));
  process.exit(1);
}

const before = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'book.json'), 'utf8'));
const countOf = b => b.reduce((n, s) => n + (s.groups || []).reduce((m, g) => m + g.rules.length, 0), 0);

fs.writeFileSync(path.join(ROOT, 'src', 'book.json'), JSON.stringify({
  book: book,
  markers: archive.markers || before.markers || [],
  editors: [],
  audit: [],
  backups: []
}, null, 1), 'utf8');

console.log('imported ' + path.basename(from));
console.log('  rules   : ' + countOf(before.book) + ' -> ' + ids.length);
console.log('  markers : ' + (archive.markers || []).length);
console.log('  dropped : ' + (archive.editors || []).length + ' roster, ' +
            (archive.audit || []).length + ' audit, ' + (archive.backups || []).length +
            ' backups  (staff-only, stays out of the public repo)');
console.log('\nnext: npm run build && npm run check, then commit and push');
