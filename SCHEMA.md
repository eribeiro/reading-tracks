# Schema reference

Current schema version: **5** (`config.yaml`'s `schema_version`). All four files are plain YAML, hand-edited, and meant to stay diffable — please don't run a YAML formatter that reorders keys or changes quoting style across a whole file in a content PR.

## `config.yaml`

| Field | Type | Required | Description |
|---|---|---|---|
| `schema_version` | int | yes | Must be `5` for this version of `app.js`/`scripts/validate.py`. |
| `site.title` | string | yes | Shown in the header `<h1>`, the `<title>`, and injected via JS on load. |
| `site.tagline` | string | yes | Shown under the title and as the meta description. |
| `site.author_name` | string | yes | Text of the "Created by ..." link. |
| `site.author_url` | string | yes | Href of that link. |
| `site.footer` | string | yes | Footer text. |
| `areas` | list of strings | yes | The fixed set of area chips shown in the filter bar. Every paper's `areas` list must only use values from here — `scripts/validate.py` enforces this. |
| `eras` | mapping | yes | Keys are era ids (kebab-case, used internally only). Each value has `label` (display string), and optional `start`/`end` (inclusive year bounds; omit one side to leave it open-ended). Ranges should be contiguous and non-overlapping — the validator warns/errors otherwise. `decade`/`era` are **derived from a paper's `year`** at render time (see `app.js`'s `eraOf`/`decadeOf`); they are not stored per paper. |

## `data/papers.yaml`

Top-level keys: `metadata` (currently just a free-text `notes` string, informational only), `lineages` (see below), `papers` (the list).

Each entry in `papers`:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Unique, stable, `kebab-case-year` by convention. |
| `title` | string | yes | Quote it in YAML if it contains a colon. |
| `year` | int | yes | Drives the Year/Decade/Era filters (decade/era are derived, not stored). |
| `authors` | list of strings | no | Full names, in paper order. |
| `venue` | string | yes | Short form (e.g. `SOSP`, `VLDB`, `arXiv`) — this is what the Venue filter dropdown is built from. Doesn't need to match `data/venues.yaml` exactly (see below). |
| `areas` | list of strings | no | Must be a subset of `config.yaml`'s `areas`. |
| `tags` | list of strings | no | Free-form keywords, drive the Tag filter. |
| `type` | string | no | What kind of reading this is — free-form (this dataset uses `foundational`/`classic`/`essential`/`current`); drives the Type filter dropdown, which is populated dynamically from whatever values are actually in use. |
| `lineages` | list of strings | no | Keys into the top-level `lineages` map — which reading tracks this paper belongs to. |
| `why_read` | string | yes | One sentence, spoiler-free. |
| `difficulty` | string | no | Free-form (this dataset uses `introductory`/`intermediate`/`advanced`); shown as a badge on the card, not currently filterable. |
| `reading_time_minutes` | int | no | Shown as a badge. |
| `links.paper` | string (URL) | no | The `links` key itself must be present (`links: {}` if empty) — `scripts/validate.py` checks this — but `links.paper` is optional and, if present, must be a syntactically valid `http(s)` URL. |
| `predecessors` / `successors` | list of paper ids | no | Conceptual reading-order hints, not a formal citation graph. Both must reference real paper ids. |

**`lineages`** (top-level, sibling of `papers`): a mapping of lineage-key → list of paper ids, many-to-many. A lineage key used in a paper's own `lineages:` list must exist here, and every id inside a lineage's list must be a real paper id — both directions are checked by the validator.

## `data/researchers.yaml`

Top-level key: `researchers` (a list).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Unique, stable. |
| `name` | string | yes | Display name; clicking it in the UI filters Papers to this researcher. |
| `areas` | list of strings | no | Subset of `config.yaml`'s `areas`. |
| `topics` | list of strings | no | Free-form, shown under the name. |
| `paper_ids` | list of paper ids | no | The papers this researcher is associated with — this is what actually drives the click-through filter, not name-matching against `authors`. Every id must be a real paper id. |

## `data/venues.yaml`

Top-level key: `venues` (a list).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Short, lowercase, hyphenated (e.g. `usenix-atc`). **This is what the Venues-tab click-through matches against papers' `venue` strings** (case-insensitively, hyphens treated as spaces) — not the `name` field, which is usually the full descriptive name and rarely matches a paper's short `venue` string verbatim. |
| `name` | string | yes | Full descriptive name, shown in the Venues tab. |
| `organization` | string | no | e.g. `ACM`, `USENIX`, `IEEE`. |
| `areas` | list of strings | no | Subset of `config.yaml`'s `areas`. |
| `tier` | string | no | Free-form (e.g. `flagship`, `major`). |

`data/venues.yaml` is a curated highlights list, not required to be exhaustive — plenty of real, valid paper venues (a specific journal, a PhD thesis, a one-off workshop) legitimately have no entry here. `scripts/validate.py` warns (doesn't error) when a paper's venue has no matching id.
