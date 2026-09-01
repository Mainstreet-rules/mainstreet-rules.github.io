#!/usr/bin/env node
/**
 * Flags rules that say close to the same thing, so duplicates do not creep
 * back in. Compares every pair within a section by shared vocabulary.
 *
 *   node tools/dupecheck.js            # all sections
 *   node tools/dupecheck.js illegal    # one section
 *   node tools/dupecheck.js illegal 40 # with a custom threshold (percent)
 *
 * This one REPORTS; it never fails the build. Judgement about whether two
 * rules are genuinely redundant belongs to a person.
 */
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'book.json'), 'utf8'));

const STOP = new Set(('a an the and or of to in on for is are be may not no do does with your you their'
  + ' this that it its as at by from must can cannot will would should other others any all if when').split(' '));

const words = s => new Set(String(s).replace(/<[^>]+>/g, ' ').toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));

const jaccard = (a, b) => {
  let hit = 0;
  a.forEach(w => { if (b.has(w)) hit++; });
  return hit / (a.size + b.size - hit);
};

const only = process.argv[2];
const threshold = (Number(process.argv[3]) || 30) / 100;
let total = 0;

data.book.filter(s => s.groups).filter(s => !only || s.id === only).forEach(sec => {
  const rules = [];
  sec.groups.forEach(g => g.rules.forEach(r => rules.push({g: g.name, r: r, w: words(r.t + ' ' + r.b)})));

  const hits = [];
  for (let i = 0; i < rules.length; i++)
    for (let j = i + 1; j < rules.length; j++) {
      const score = jaccard(rules[i].w, rules[j].w);
      if (score >= threshold) hits.push({score: score, a: rules[i], b: rules[j]});
    }
  hits.sort((x, y) => y.score - x.score);
  total += hits.length;

  console.log('\n' + sec.name + ' — ' + rules.length + ' rules, ' + hits.length +
              ' pair(s) over ' + Math.round(threshold * 100) + '% shared vocabulary');
  hits.forEach(h => {
    console.log('  ' + Math.round(h.score * 100) + '%  ' + h.a.r.id + ' "' + h.a.r.t + '"  [' + h.a.g + ']');
    console.log('        ' + h.b.r.id + ' "' + h.b.r.t + '"  [' + h.b.g + ']');
  });
});

console.log('\n' + total + ' pair(s) to look at. Review them; near-identical wording is not always a duplicate.');
