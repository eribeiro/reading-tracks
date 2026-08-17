# YAML schema guide

ReadingTracks loads four YAML documents directly in the browser. Together they
describe site configuration, papers and reading tracks, researchers, and
venues. This guide explains the document shapes and shows both the absolute
minimum needed to boot the app and a small useful catalog.

The current schema version is `5`. The field-by-field reference remains in
[`SCHEMA.md`](../SCHEMA.md); this document focuses on how the files fit together
and how to start a new data set.

## Files and minimum bootstrap data

All four files must exist at the paths below. The app can boot with empty lists;
it will display an empty Papers view rather than failing.

| File | Required top-level data | Smallest valid value | Purpose |
|---|---|---|---|
| `config.yaml` | `schema_version`, `areas`, `eras` | `schema_version: 5`, `areas: []`, `eras: {}` | Declares the supported schema and the values used to build area and era filters. `site` is optional at runtime because the HTML supplies fallback branding. |
| `data/papers.yaml` | `papers`, `lineages` | `papers: []`, `lineages: {}` | Supplies paper cards and named reading tracks. `metadata` is optional and informational. |
| `data/researchers.yaml` | `researchers` | `researchers: []` | Supplies the Researchers view and researcher-to-paper navigation. |
| `data/venues.yaml` | `venues` | `venues: []` | Supplies the Venues view. It does not need to contain every venue named by a paper. |

The complete empty bootstrap set is:

```yaml
# config.yaml
schema_version: 5
site: {}
areas: []
eras: {}
```

```yaml
# data/papers.yaml
metadata: {}
lineages: {}
papers: []
```

```yaml
# data/researchers.yaml
researchers: []
```

```yaml
# data/venues.yaml
venues: []
```

## Smallest useful catalog

An empty catalog proves that loading works, but one paper makes the interface
useful. The example below includes only fields required by the validator plus a
single area, era, researcher, venue, and reading track.

### `config.yaml`

```yaml
schema_version: 5

site:
  title: My Reading Tracks
  tagline: A small curated reading list.
  author_name: Example Maintainer
  author_url: https://example.com
  footer: Data loaded from YAML.

areas:
  - Distributed Systems

eras:
  modern:
    label: Modern
    start: 2000
```

### `data/papers.yaml`

```yaml
metadata:
  notes: Minimal starter catalog.

lineages:
  getting-started:
    - example-paper-2024

papers:
  - id: example-paper-2024
    title: An Example Paper
    year: 2024
    authors:
      - Ada Example
    venue: EXAMPLE
    areas:
      - Distributed Systems
    tags:
      - introduction
    type: essential
    lineages:
      - getting-started
    why_read: A concise explanation of why this paper belongs in the catalog.
    difficulty: introductory
    reading_time_minutes: 30
    links:
      paper: https://example.com/paper
    predecessors: []
    successors: []
```

### `data/researchers.yaml`

```yaml
researchers:
  - id: ada-example
    name: Ada Example
    areas:
      - Distributed Systems
    topics:
      - example systems
    paper_ids:
      - example-paper-2024
```

### `data/venues.yaml`

```yaml
venues:
  - id: example
    name: Example Conference
    organization: Example Society
    areas:
      - Distributed Systems
    tier: community
```

## Relationships between files

- Every paper area must appear in `config.yaml` under `areas`.
- A key used in a paper's `lineages` list must exist in the top-level
  `lineages` mapping, and every paper ID in that mapping must exist in `papers`.
- `predecessors`, `successors`, and researcher `paper_ids` must reference real
  paper IDs.
- A venue card is matched to papers using the venue `id`, case-insensitively,
  with hyphens treated as spaces. For example, `usenix-atc` matches
  `venue: USENIX ATC`.
- Researchers are connected to papers explicitly through `paper_ids`; author
  names are not used to infer the relationship.
- Decades and eras are derived from each paper's numeric `year`; they are not
  stored on paper records.

## Document schemas

### Site configuration

`config.yaml` contains:

- `schema_version`: must be `5` for the current validator.
- `site`: optional branding fields: `title`, `tagline`, `author_name`,
  `author_url`, and `footer`.
- `areas`: the allowed area labels and the source of the area filter buttons.
- `eras`: era IDs mapped to a display `label` and optional inclusive `start`
  and `end` years. Era ranges must not overlap.

### Papers and lineages

`data/papers.yaml` contains `metadata`, `lineages`, and `papers`. Every paper
requires:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique, stable paper identifier. |
| `title` | string | Display title; quote YAML values containing a colon. |
| `year` | integer | Publication year used by year, decade, and era filters. |
| `venue` | string | Short display name used by the venue filter. |
| `why_read` | string | Brief explanation shown on the paper card. |
| `links` | mapping | Must exist; use `links: {}` when no reliable URL is known. |

Optional paper fields are `authors`, `areas`, `tags`, `type`, `lineages`,
`difficulty`, `reading_time_minutes`, `predecessors`, and `successors`.
`links.paper`, when present, must be an HTTP or HTTPS URL. Prefer an HTTPS
publisher or conference page, followed by an author or institutional page.

### Researchers

Each entry in `data/researchers.yaml` has a unique `id` and display `name`.
Optional `areas`, `topics`, and `paper_ids` enrich the card and provide
click-through navigation. `paper_ids` is the authoritative relationship between
a researcher and the catalog.

### Venues

Each entry in `data/venues.yaml` has a unique `id` and display `name`. Optional
fields are `organization`, `areas`, and `tier`. This file is intentionally a
curated list, so a paper may name a venue that has no venue record; the
validator reports that as a warning rather than an error.

## Validate changes

Run the consistency checker after editing any YAML document:

```bash
python3 scripts/validate.py
```

It checks the schema version, required paper fields, duplicate IDs, area names,
URLs, era ranges, and cross-file references. Also check the patch for whitespace
errors:

```bash
git diff --check
```

## Bootstrap and BibTeX tools

Initialize the YAML files in a fresh checkout or empty template directory:

```bash
python3 scripts/bootstrap.py --root /path/to/project
```

The command asks for branding, areas, and the initial era. It refuses to
overwrite any existing YAML file unless `--force` is supplied. For automation,
use `--non-interactive` and override individual defaults with flags:

```bash
python3 scripts/bootstrap.py \
  --root /path/to/project \
  --non-interactive \
  --title "My Reading List" \
  --areas "Databases,Distributed Systems"
```

Import one or more BibTeX files into a bootstrapped catalog:

```bash
python3 scripts/import_bibtex.py references.bib \
  --root /path/to/project \
  --area "Distributed Systems" \
  --add-area
```

The importer:

- adds papers, authors as researcher records, and publication venues;
- uses DOI links before BibTeX `url` or arXiv `eprint` values;
- skips entries that lack a title or four-digit year;
- skips an existing paper with the same normalized title and year;
- appends new paper IDs to matching researchers without replacing their data;
- leaves `why_read` with an explicit review placeholder unless the BibTeX
  record supplies a `note`;
- supports `--dry-run` to report changes without writing files.

The built-in parser covers normal braced or quoted BibTeX fields, nested braces,
multiple authors separated by `and`, and common DOI/URL/eprint fields. It does
not expand custom `@string` macros; export expanded BibTeX when a bibliography
depends on them.
