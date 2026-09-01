#!/usr/bin/env node
/**
 * One command to push artifact edits to the live site.
 *
 *   In the artifact:  Admin -> Download full archive
 *   Then:             npm run publish
 *
 * With no argument it picks the newest mainstreet-rulebook-archive-*.json out
 * of your Downloads folder, so there is no path to type. It imports the rules
 * (dropping the roster, audit log and backups), rebuilds, runs every check,
 * and only then commits and pushes. If any check fails it stops and changes
 * nothing.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');

const ROOT = path.join(__dirname, '..');
const run = (cmd, args, opts) =>
  execFileSync(cmd, args, {cwd: ROOT, stdio: 'pipe', encoding: 'utf8', ...opts});

function newestArchive() {
  const dirs = [path.join(os.homedir(), 'Downloads'), os.homedir(), ROOT];
  const found = [];
  for (const d of dirs) {
    let names = [];
    try { names = fs.readdirSync(d); } catch (e) { continue; }
    for (const n of names) {
      if (/^mainstreet-rulebook-archive-.*\.json$/i.test(n)) {
        const p = path.join(d, n);
        try { found.push({p, t: fs.statSync(p).mtimeMs}); } catch (e) {}
      }
    }
  }
  found.sort((a, b) => b.t - a.t);
  return found.length ? found[0].p : null;
}

const archive = process.argv[2] || newestArchive();
if (!archive) {
  console.error('No archive found.\n');
  console.error('In the rulebook artifact: Admin -> "Download full archive",');
  console.error('then run this again. Or pass the file: npm run publish <file.json>');
  process.exit(1);
}

console.log('archive : ' + archive);
console.log(run(process.execPath, [path.join(ROOT, 'tools', 'import.js'), archive]).trim());

console.log('\n' + run(process.execPath, [path.join(ROOT, 'tools', 'build.js')]).trim());

console.log('\nverifying...');
try {
  const out = run(process.execPath, [path.join(ROOT, 'tools', 'check.js')]);
  console.log(out.trim().split('\n').slice(-1)[0]);
} catch (e) {
  console.error((e.stdout || '') + (e.stderr || ''));
  console.error('\nSTOPPED: verification failed. Nothing was committed or pushed.');
  process.exit(1);
}

const status = run('git', ['status', '--porcelain']).trim();
if (!status) {
  console.log('\nNothing changed — the live site already matches that archive.');
  process.exit(0);
}

console.log('\nchanged:\n' + status.split('\n').map(l => '  ' + l).join('\n'));

run('git', ['add', '-A']);
const stamp = new Date().toISOString().slice(0, 10);
run('git', ['commit', '-m', 'Rulebook update ' + stamp]);
run('git', ['push', 'origin', 'main']);

const head = run('git', ['rev-parse', '--short', 'HEAD']).trim();
console.log('\npushed ' + head);
console.log('Live in about a minute: https://mainstreet-rules.github.io/');
