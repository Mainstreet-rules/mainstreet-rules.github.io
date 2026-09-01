# Mainstreet RP Rulebook

The MSRP rulebook as a single self-contained web page: searchable, with every
rule carrying its own permanent ID.

**Live:** https://kittyka917.github.io/

76 rules across ⭐ General Rules, 🏛️ Government and 😈 Illegal, plus the
Rulebook Updates changelog.

---

## How this is hosted

One self-contained file. No dependencies at runtime, no build step on the
server, nothing to install.

This repo is a **user site** (`kittyka917.github.io`), so Pages serves the
repository root and the page is `index.html` at the top level. `index.html` is
written by `npm run build` and committed, so Pages has only to serve it.
`.nojekyll` stops Pages running the files through Jekyll. For a custom domain,
add a `CNAME` file containing the domain and point your DNS at GitHub.

---

## Public site, staff artifact

There are two copies of this rulebook, and the split is deliberate.

| | **Public site** (here) | **Staff artifact** (Claude) |
|---|---|---|
| Who can open it | anyone | only people you share it with |
| Contains | the rules | the rules, roster, audit log, backups |
| Editing | none — read-only | approved people, enforced server-side |
| Admin panel | not present, no data to show | visible to the people you approved |

**A static site hides nothing.** Every visitor downloads the whole file, and
this repository is public as well. So a password box or a hidden admin screen
would be theatre — view-source defeats it.

Instead, the staff data simply is not here. The roster, the audit log and the
kept backups are never built into the public page and never committed to this
repo. `tools/check.js` **fails** if any of them appear in `src/book.json` or in
the page it produces.

**Only approved people ever see the Admin panel, because only they can open the
artifact at all.** Nothing depends on the interface hiding anything.

The **Edit rulebook** and **Admin** buttons also only appear when the page runs
as a Claude artifact — that runtime is what lets it publish new versions of
itself. There is no such runtime on GitHub Pages, so this site is read-only for
everyone, the owner included.

---

## Changing the rules

Staff edit in the artifact. To push those changes to the public site:

```bash
npm run extract   # pull rules + markers from the artifact, dropping staff data
npm run build     # regenerate index.html
npm run check     # 13 checks, including the staff-data guard
git add -A && git commit -m "rulebook update" && git push
```

Pages redeploys within a minute or so.

For bigger jobs — restructuring sections, bulk imports — edit `src/book.json`
directly, then `npm run build && npm run check` and push.

> **Run `npm run extract` before editing locally.** It pulls the live rules out
> of the artifact. Skip it and your next build silently overwrites whatever
> staff published since the last time you did.

---

## Layout

```
src/book.json       the rules and markers — the source of truth
src/template.html   the page itself: styles, markup, and the engine
index.html          the built page, where GitHub Pages serves it from
dist/rulebook.html  the same bytes, kept for convenience
.nojekyll           stops Pages putting the site through Jekyll
tools/build.js      book.json + template.html → index.html
tools/check.js      verification; exits non-zero on failure
tools/extract.js    pulls rules back out of a built page, strips staff data
tools/dupecheck.js  reports rules that say close to the same thing
```

`src/template.html` holds a `__BOOK_JSON__` placeholder that the build fills.
The page rebuilds this same document from itself when someone publishes from
the browser, so both paths produce the same shape.

---

## Rule IDs are permanent

Every rule has an ID — `CMB-02`, `KOS-04`, `ALC-09` — and staff cite them in
reports and bans. **The build never regenerates IDs**, and `check.js` fails if
a rule is missing one or two rules share one.

- **Adding** a rule: the editor assigns the next free number for that page's
  prefix (`max + 1`). Appending never renumbers anything above it.
- **Moving** a rule to another page: it keeps its ID. That is why a page can
  hold more than one prefix — Alliances holds both `ALL-` and `ALC-` — and each
  page heading lists the prefixes it actually contains.
- **Deleting** a rule retires its ID for good. Any link or report citing it
  stops resolving, which is why removal is owner-only.

---

## Who can edit (on the artifact)

Edit access is granted in the artifact's share menu. Publishing runs with each
viewer's own account authority and the refusal happens server-side, so someone
without access cannot publish no matter what the page shows them.

On top of that, the Admin tab keeps a roster:

- **Owner** — full rights, including removing rules, pages and markers.
- **Editor** — can edit and add, in the sections ticked for them. Every remove
  control is disabled, and each delete path re-checks ownership, so a button
  forced back into the DOM still refuses.

That roster governs the interface, not the server: anyone with artifact edit
access could bypass it with devtools. It prevents accidents and keeps people in
their lane — the audit log is what makes it accountable.

The first roster entry is **locked**. It cannot be renamed, demoted or removed
from inside the page by anyone, including someone editing as an owner.

---

## Backups

1. **The archive file** — Admin → *Download full archive* writes every rule,
   marker, roster entry, audit entry and kept backup to one JSON file. Nobody
   with edit access can reach it. This is the copy that is genuinely yours.
2. **The artifact's version history** — every publish is its own version,
   attributed to the account that made it. Editors cannot delete versions.
3. **In-page backups** — the last 5 published versions, one click to restore.
   Convenient, but anyone with edit access can publish over them. An undo
   button, not a vault.

Archive files are gitignored: they carry the roster and the full audit log.

---

## Verification

```bash
npm run check
```

Thirteen checks: `book.json` parses; every rule has a unique ID; **no staff
data has leaked into the repo or the page**; every marker reference resolves;
the committed `index.html` matches a fresh build; the data block cannot
terminate its own `<script>` tag; and the engine is valid JavaScript. CI runs
the same on every push and pull request.

```bash
npm run dupes            # all sections
npm run dupes illegal    # one section
```

Reports rules with heavily overlapping wording. It never fails the build —
whether two rules are genuinely redundant is a judgement call.
