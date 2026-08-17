# ReadingTracks

<p align="center">
  <a href="assets/reading-tracks-illustration.png">
    <img src="assets/reading-tracks-illustration.png" width="500" alt="ReadingTracks logo">
  </a>
</p>

A fork-and-edit template for a static, filterable reading-list site: papers, the researchers behind them, the venues they were published in, and curated "reading tracks" showing how ideas build on each other over time.

No backend, no build step, no framework — an `index.html`, one `app.js`, one `styles.css`, and your content as plain YAML files. Deploys to GitHub Pages (or any static host) as-is.

**This repo ships with a real, working example**: the maintainer's own ~150-paper reading list for a distributed-systems/databases/AI-infrastructure club. Browse it live to see what the finished product looks like, then replace the data with your own for any other subfield — programming languages, security, HCI, ML theory, whatever your reading group covers.

## Quickstart — make it yours

1. Click **Use this template** (or fork) to get your own copy.
2. Edit `config.yaml`: set your site title, tagline, author info, the `areas` your papers get tagged with, and the `eras` you want to group papers into (numeric year ranges — see [SCHEMA.md](SCHEMA.md)).
3. Replace the contents of `data/papers.yaml`, `data/researchers.yaml`, and `data/venues.yaml` with your own reading list (or start from the shipped example and edit it in place).
4. Run `python3 scripts/validate.py` to catch typos and dangling references before you publish.
5. Enable GitHub Pages on the repo (Settings → Pages → deploy from the default branch).

To start from empty YAML files, run `python3 scripts/bootstrap.py`. To seed a
new catalog from a bibliography, run `python3 scripts/import_bibtex.py file.bib`.
See the [YAML schema and import guide](docs/README.md) for options and examples.

## Local development

```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000/`. **Don't** open `index.html` directly via `file://` — the browser will block the `fetch()` calls that load `config.yaml` and the YAML data files.

## How it's organized

| File | Purpose |
|---|---|
| `config.yaml` | Site branding, the fixed list of `areas`, and `eras` as numeric year ranges. The only file most adopters need to touch beyond the data itself. |
| `data/papers.yaml` | The papers: title, authors, year, venue, tags, one-line `why_read`, and reading "lineages" (tracks). |
| `data/researchers.yaml` | Researchers, cross-referenced to their papers. |
| `data/venues.yaml` | Conferences/journals, used for the Venues tab and tier/organization metadata. |
| `app.js` | The whole app — fetches the YAML + config on load, filters/renders client-side. |
| `scripts/validate.py` | Consistency checks (duplicate ids, dangling references, required fields). Also runs in CI on every PR. |

Full field-by-field reference: [SCHEMA.md](SCHEMA.md). Contributing a paper via PR: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE). The included example reading list is just data; swap it out freely.
