# Contributing

Contributions are welcome, most commonly "add a paper I think belongs here." This is the workflow for that; see [SCHEMA.md](SCHEMA.md) for the full field reference.

## Adding a paper

1. Fork the repo and open `data/papers.yaml`.
2. Add a new entry to the `papers` list. Minimal example:

   ```yaml
     - id: your-paper-slug-2024
       title: The Exact Paper Title
       year: 2024
       authors:
         - First Author
         - Second Author
       venue: SOSP
       areas:
         - Distributed Systems
       tags:
         - some-topic
       type: essential
       lineages: []
       why_read: One sentence on what the paper does and why it's worth reading.
       difficulty: intermediate
       reading_time_minutes: 75
       links:
         paper: https://example.org/the-real-paper-url
       predecessors: []
       successors: []
   ```

   - `id` must be unique and stable — pick `kebab-case-slug-year`.
   - `areas` must only use values already listed in `config.yaml`'s `areas`. If your paper genuinely needs a new area, add it to `config.yaml` in the same PR.
   - `why_read` is one sentence, spoiler-free: what the paper does, why it matters, not its conclusion.
   - `links.paper` should point at the actual paper (publisher page, arXiv, author's PDF) — use `links: {}` if you don't have one yet, don't leave the key out.
   - `decade` and `era` are **not** fields on a paper — they're computed automatically from `year` using the ranges in `config.yaml`.

3. Optional, but appreciated:
   - If the paper's venue isn't in `data/venues.yaml` yet and it's a recurring conference/journal (not a one-off like a thesis), add it there too.
   - If the paper fits one of the existing reading tracks in `papers.yaml`'s top-level `lineages` map, add its id to that track's list (and the track's key to the paper's own `lineages:` list).
   - If one of the authors is already in `data/researchers.yaml`, add the new paper's id to their `paper_ids`. If they're not listed and you think they're worth tracking as a researcher (not just an author string), add them.

4. Run the validator before opening the PR:

   ```bash
   python3 scripts/validate.py
   ```

   Errors block CI and need fixing. Warnings (e.g. "venue has no matching entry") don't block anything — they're just a nudge.

5. Open the PR. The `validate.py` check runs automatically; the PR template has a short checklist.

## Other kinds of changes

- **Fixing a mistake** (wrong year, broken link, typo): same process, just edit the existing entry.
- **Adding a researcher or venue on its own**: edit `data/researchers.yaml` / `data/venues.yaml` directly.
- **Changing site branding, areas, or eras**: edit `config.yaml`.
- **Code changes to `app.js`/`index.html`/`styles.css`**: normal PR, no special process — just keep it dependency-free and framework-free, that's the point of this project.

## Code of conduct

Be kind, assume good faith, keep disagreements about content (not people). Nothing more formal than that for a project this size.
