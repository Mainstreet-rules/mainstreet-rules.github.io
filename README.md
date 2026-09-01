# Mainstreet RP Rulebook

The MSRP rulebook as a single self-contained web page: searchable, every rule
carrying its own ID, editable in place by approved staff, with backups and an
audit log.

76 rules across ⭐ General Rules, 🏛️ Government and 😈 Illegal, plus the
Rulebook Updates changelog.

---

## Hosting it on GitHub Pages

The whole site is one self-contained file. Nothing to install, no build step on
the server, no dependencies at runtime.

1. Push this repo to GitHub.
2. **Settings → Pages → Source: Deploy from a branch**, branch `main`,
   folder **`/docs`**. Save.
3. It goes live at `https://<user>.github.io/<repo>/` a minute later.

`docs/index.html` is written by `npm run build` and committed, so Pages has
nothing to do but serve it. `docs/.nojekyll` stops Pages running the files
through Jekyll. For a custom domain, add a `docs/CNAME` file containing the
domain and point your DNS at GitHub.

### The editor does not exist on the hosted site

The in-page **Edit rulebook** and **Admin** buttons only appear when the page
is running as a Claude artifact, which is what gives it permission to publish
new versions of itself. On GitHub Pages there is no such runtime, so the
buttons never appear and the site is **read-only for everyone**, including you.
Verified: with no runtime present, both buttons stay hidden and search,
navigation and all 76 rules work normally.

That leaves two workable setups — pick one and stick to it, because editing in
both places at once will lose work:

| | **Pages only** | **Pages + artifact** |
|---|---|---|
| Public site | GitHub Pages | GitHub Pages |
| Editing | this repo: edit `src/book.json`, `npm run build`, commit | in the page, then `npm run extract` → commit |
| Who can edit | anyone with repo write access | anyone with artifact edit access |
| History | git | git **and** the audit log |

**Pages only** is the simpler one, and the natural fit if you are comfortable
with git: every change is a commit, review happens in pull requests, and the
audit log and roster simply go unused.

---

## Two ways to change a rule

**In the page (normal).** Anyone with edit access opens the live page, hits
**Edit rulebook**, changes what they need and clicks **Publish to everyone**.
Every open view reloads to the new version. Nothing in this repo is involved.

**In this repo (for bigger jobs).** Restructuring sections, bulk imports, or
anything easier to do in a text editor than a browser.

> **Before you edit locally, run `npm run extract`.** It pulls the live data
> back into `src/book.json`. Skip it and your next build silently overwrites
> whatever people published from the page since the last time you did.

```bash
npm run extract   # pull the live page's data into src/book.json
# ...edit src/book.json...
npm run build     # regenerate dist/rulebook.html
npm run check     # verify before publishing
```

Then publish `dist/rulebook.html` as a new version of the artifact.

---

## Layout

```
src/book.json       every rule, marker, roster entry and audit entry — the source of truth
src/template.html   the page itself: styles, markup, and the engine
dist/rulebook.html  the built page — publish this as the artifact
docs/index.html     the same page, where GitHub Pages serves it from
docs/.nojekyll      stops Pages putting the site through Jekyll
tools/build.js      book.json + template.html → dist/ and docs/
tools/check.js      verification; exits non-zero on failure
tools/extract.js    pulls data back out of a built page into src/book.json
tools/dupecheck.js  reports rules that say close to the same thing
```

`dist/rulebook.html` and `docs/index.html` are the same bytes — one build
writes both, and `npm run check` fails if either drifts.

`src/template.html` contains a `__BOOK_JSON__` placeholder; the build splices
the data in. The page rebuilds this same document from itself when someone
publishes from the browser, so both paths produce the same shape.

---

## Rule IDs are permanent

Every rule has an ID — `CMB-02`, `KOS-04`, `ALC-09` — and staff cite them in
reports and bans. **The build never regenerates IDs**, and `check.js` fails if
any rule is missing one or if two share one.

- **Adding** a rule: the in-page editor assigns the next free number for that
  page's prefix (`max + 1`). Appending never renumbers anything above it.
- **Moving** a rule to another page: it keeps its ID. That is why a page can
  hold more than one prefix — Alliances holds both `ALL-` and `ALC-` — and the
  page heading lists the prefixes it actually contains.
- **Deleting** a rule retires its ID for good. Any link or report citing it
  stops resolving, which is why removal is owner-only.

---

## Who can change what

Edit access is granted **on the artifact**, in its share menu — not in the
page, and not here. Publishing runs with each viewer's own account authority
and the refusal happens server-side, so someone without access cannot publish
no matter what the page shows them.

Inside the page, the Admin tab adds a roster on top of that:

- **Owner** — full rights, including removing rules, pages and markers.
- **Editor** — can edit and add, in the sections ticked for them. Every remove
  control is disabled, and each delete path re-checks ownership so a button
  forced back into the DOM still refuses.

That roster governs the interface, not the server: anyone with artifact edit
access could bypass it with devtools. It prevents accidents and keeps people in
their lane — the audit log is what makes it accountable.

The first roster entry is **locked** (`"locked": true`). It cannot be renamed,
demoted or removed from inside the page by anyone, including someone editing as
an owner. Changing it means editing `src/book.json` here.

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

Checks that `book.json` parses, every rule has a unique ID, every marker
reference resolves, the committed `dist/` matches a fresh build, the data block
cannot terminate its own `<script>` tag, and the page's engine is valid
JavaScript. CI runs the same thing on every push and pull request.

```bash
npm run dupes            # all sections
npm run dupes illegal    # one section
```

Reports rules with heavily overlapping wording. It never fails the build —
whether two rules are genuinely redundant is a judgement call.
