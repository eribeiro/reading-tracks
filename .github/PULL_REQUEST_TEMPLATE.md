## What's in this PR

<!-- e.g. "Adds 3 papers on X" or "Fixes a typo in Y's bio" -->

## Checklist

- [ ] Ran `python3 scripts/validate.py` locally and it passed (warnings are OK, errors aren't)
- [ ] Every new paper has a real, working `links.paper` URL (or `links: {}` if none exists yet)
- [ ] `why_read` is one spoiler-free sentence — what the paper does and why it's worth reading, not a summary of its conclusion
- [ ] If the paper's venue isn't already in `data/venues.yaml` and it's a recurring conference/journal (not a one-off like a thesis or blog post), consider adding it
- [ ] If the paper fits an existing reading track, added its id to the matching entry in `papers.yaml`'s `lineages` map
- [ ] If it's easy to say what this paper builds on, filled in `predecessors` (and the target paper's `successors`, if this repo still lists it) — optional, skip if unsure
