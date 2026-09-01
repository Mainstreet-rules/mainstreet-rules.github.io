#!/usr/bin/env node
/**
 * Verifies the rulebook before it goes anywhere. Exits non-zero on any
 * failure so CI and a pre-publish check both fail loudly.
 *
 * Checks:
 *   1  src/book.json parses and has the expected shape
 *   2  every rule has an id, and no id is used twice
 *   3  every rule's marker refers to a marker that exists
 *   4  the build is reproducible and the committed dist matches it
 *   5  the built page's data block contains no raw '<' (it would end the tag)
 *   6  the page's engine is syntactically valid JavaScript
 *   7  the page carries exactly one data block and one engine script
 */
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

const ROOT = path.join(__dirname, '..');
const fail = [];
const ok = [];
const check = (cond, pass, msg) => { (cond ? ok : fail).push((cond ? pass : msg)); };

/* 1 — data shape */
const raw = fs.readFileSync(path.join(ROOT, 'src', 'book.json'), 'utf8');
let data;
try { data = JSON.parse(raw); } catch (e) { console.error('book.json does not parse: ' + e.message); process.exit(1); }
check(Array.isArray(data.book) && data.book.length > 0, 'book.json parses, ' + data.book.length + ' sections', 'book.json has no sections');

/* 2 — rule ids */
const ids = [];
let noId = 0;
data.book.forEach(s => (s.groups || []).forEach(g => g.rules.forEach(r => {
  if (!r.id) noId++; else ids.push(r.id);
})));
const dupes = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
check(noId === 0, ids.length + ' rules, all with ids', noId + ' rule(s) have no id');
check(dupes.length === 0, 'no duplicate rule ids', 'duplicate rule ids: ' + dupes.join(', '));

/* 3 — markers referenced actually exist */
const markerIds = (data.markers || []).map(m => m.id);
const badMarkers = [];
data.book.forEach(s => (s.groups || []).forEach(g => g.rules.forEach(r => {
  if (r.f && markerIds.indexOf(r.f) === -1) badMarkers.push(r.id + ' → ' + r.f);
})));
check(badMarkers.length === 0, 'every marker reference resolves', 'unknown markers: ' + badMarkers.join(', '));

/* 4 — build is reproducible, and dist matches */
const tmp = path.join(ROOT, 'dist', '.check-build.html');
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build.js'), tmp], {stdio: 'pipe'});
const fresh = fs.readFileSync(tmp, 'utf8');
fs.unlinkSync(tmp);

const distPath = path.join(ROOT, 'dist', 'rulebook.html');
const dist = fs.existsSync(distPath) ? fs.readFileSync(distPath, 'utf8') : '';
check(dist === fresh, 'dist/rulebook.html matches a fresh build', 'dist/rulebook.html is stale — run `npm run build`');

/* 4b — the GitHub Pages copy is the same page */
const pagePath = path.join(ROOT, 'docs', 'index.html');
const page = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, 'utf8') : '';
check(page === fresh, 'docs/index.html matches a fresh build', 'docs/index.html is missing or stale — run `npm run build`');
check(fs.existsSync(path.join(ROOT, 'docs', '.nojekyll')), 'docs/.nojekyll present', 'docs/.nojekyll is missing — Pages may mangle the site');

/* 5 — the data block cannot break out of its script tag */
const block = fresh.match(/id="book-data">([\s\S]*?)<\/script>/);
check(!!block, 'data block found', 'no data block in the built page');
if (block) check(block[1].indexOf('<') === -1, 'data block has no raw "<"', 'data block contains a raw "<" and can terminate its own script tag');

/* 6 — the engine parses */
const start = fresh.lastIndexOf('<script>');
const end = fresh.lastIndexOf('</' + 'script>');
try {
  new Function(fresh.slice(start + 8, end));
  ok.push('page engine parses as valid JavaScript');
} catch (e) {
  fail.push('page engine has a syntax error: ' + e.message);
}

/* 7 — exactly one real data block. Match the whole opening tag: the engine
   also contains the string `id="book-data"` inside the code that rebuilds the
   page, but it assembles `<script` from pieces, so the full tag appears once. */
const dataBlocks = (fresh.match(/<script type="application\/json" id="book-data">/g) || []).length;
check(dataBlocks === 1, 'exactly one data block', dataBlocks + ' data blocks found (expected 1)');

ok.forEach(m => console.log('  ok    ' + m));
fail.forEach(m => console.log('  FAIL  ' + m));
console.log(fail.length ? '\n' + fail.length + ' check(s) failed' : '\nall ' + ok.length + ' checks passed');
process.exit(fail.length ? 1 : 0);
