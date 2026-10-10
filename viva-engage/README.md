# Viva Engage templates

A single page techs keep open to copy the post format for their department.

| File | What it is | Who edits it |
|---|---|---|
| `templates.json` | Every department format: fields, photos, do/don't, source, confidence, revision date. The one place formats change. | Authored. Tyler approves format changes. |
| `index.html` | The page. Rules, photo standards, sources, and the renderer. Department blocks are drawn from the data copied into it. | Authored. Layout and rules only; formats live in `templates.json`. |
| `build.mjs` | Copies `templates.json` into `index.html`, so the page works opened as a file, from a link, or offline. | Rarely. No dependencies. |
| `test/smoke.mjs` | Opens the page in a real browser and checks it. | When the page gains a feature worth guarding. |
| `package.json` | Build and test commands; the test's one dependency. | Rarely. |

## Changing a format

1. Edit the department in `templates.json`. Update its `revised` date, bump `formatRevision`, and, if the basis changed, update its `source` and `confidence`.
2. From `viva-engage/`, run `npm test`. It rebuilds the page, then checks it.
3. Commit `templates.json` and `index.html` together.

Template bodies are plain text. `{COMPANY}`, `{WO}`, `{PO}`, `{LINES}`, `{LINE}`, `{PN}`, `{QTY}` and `{TECH}` are filled by the quick-fill bar. `when`, `source`, callouts and list items may contain simple HTML (`<b>`, `<a>`).

Top of `templates.json`:

- `formatRevision` is shown in the page header. Bump it whenever any format changes, so a printed copy can be checked against the page.
- `feedback` sets where each department's "This format is wrong?" link sends its pre-filled email. `label` is the role shown on the page; `email` is the address. Point it at a shared mailbox if one exists.

`confidence` is one of `controlled` (a QPC guideline document), `observed` (taken from real posts, no document), or `proposed` (confirm before use).

## Testing

First time in a clone: `cd viva-engage && npm install`, then from the repo root `git config core.hooksPath .githooks`.

`npm test` fails if:

- `index.html` is out of date with `templates.json` (the build was skipped)
- a department did not render, or the template or copy-button count is off
- a nav chip points nowhere, or a department has no chip
- quick-fill does not reach a copied template, or a `{KEY}` is left unfilled
- the revision stamp or a feedback link is missing
- anyone is tagged by name (`@First Last`); use `@[role]`
- search does not narrow and clear
- there is a script error, or the page scrolls sideways at phone width

With the hook enabled, a push that changes `viva-engage/` runs the test first and stops on failure. Pushes that touch only the aging dashboard skip it.

## Ground rules

- Formats come from QPC's posting guidelines, production directives, and real posts in the Viva Engage export. Each department names its source and how confident that source is.
- No people are named in formats, rules or sources. Use the role (`@[NCR owner]`, the cleanroom lead). This is etiquette, not a performance review.
- Change a format only when the guideline or a directive changes. Note the source in the same edit.
- The aging pipeline never writes to this folder.
