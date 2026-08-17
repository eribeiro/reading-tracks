# AGENTS.md

## Project overview

ReadingTracks is a static, client-side reading-list site. There is no backend,
build system, or application framework. The browser loads YAML data through
`vendor/js-yaml.min.js`, and `app.js` filters and renders it into `index.html`.

## Repository layout

- `index.html` — page structure and script/style entry points.
- `app.js` — YAML loading, filtering, navigation, and rendering.
- `styles.css` — the complete visual theme and responsive layout.
- `config.yaml` — branding, areas, eras, and schema version.
- `data/papers.yaml` — papers, reading tracks, relationships, and paper links.
- `data/researchers.yaml` — researcher records and paper references.
- `data/venues.yaml` — venue records.
- `scripts/validate.py` — required consistency checks.
- `SCHEMA.md` — field-level data format documentation.
- `assets/` — project artwork and README images.

## Working guidelines

- Preserve the zero-build, static-site architecture unless the task explicitly
  calls for an architectural change.
- Keep changes focused. Do not reformat entire YAML files for a small data edit.
- Treat paper IDs as stable identifiers. Update all references if an ID must
  change.
- Keep lineage, predecessor, successor, researcher, and venue references
  internally consistent.
- Escape all data before inserting it into HTML. Prefer DOM APIs or the existing
  `esc()` helper; never interpolate untrusted YAML values as raw markup.
- Permit only `https:` links unless a source is genuinely unavailable over
  HTTPS. For paper links, prefer publisher and conference proceedings, then an
  author or institutional page, then a reputable archive such as arXiv.
- External links opened in a new tab must retain `rel="noopener"`.
- Do not replace or overwrite user changes that are unrelated to the task.

## Data editing

Follow `SCHEMA.md` and preserve the established YAML indentation and field
ordering. Each paper must have a `links` mapping; use:

```yaml
links:
  paper: https://example.org/authoritative-paper-page
```

Use `links: {}` only when no reliable paper location can be found. Do not use a
search-results page as a paper link.

## Validation

Run this after changing `config.yaml`, `data/**`, or the validator:

```bash
python3 scripts/validate.py
```

Also run:

```bash
git diff --check
```

The validator may report known venue-coverage warnings. New errors must be
fixed, and new warnings should be reviewed before completion.

For browser-facing changes, serve the repository over HTTP rather than opening
`index.html` through `file://`:

```bash
python3 -m http.server 8000
```

Then verify the affected views and filters at `http://localhost:8000/`.

## Generated and vendored files

- Do not hand-edit `vendor/js-yaml.min.js`. Replace it only with a verified
  upstream release and document the version.
- Keep generated image derivatives in `assets/` and retain meaningful,
  descriptive filenames.
- Do not commit temporary servers, caches, editor files, or validation output.

## Git and CI

- Keep commits scoped and use imperative commit messages.
- Do not amend, reset, force-push, or discard existing work unless explicitly
  requested.
- Workflows should use least-privilege permissions and immutable action pins
  where practical.
