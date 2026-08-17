#!/usr/bin/env python3
"""Consistency checks for config.yaml + data/*.yaml.

Run before opening a PR:
    python3 scripts/validate.py

No network calls, no schema-framework dependency (just PyYAML) — this is
meant to run in a few hundred milliseconds, in CI, on every PR that touches
data/** or config.yaml.
"""
import sys
import re
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML is required. Install with: pip install pyyaml")
    sys.exit(2)

ROOT = Path(__file__).resolve().parent.parent
REQUIRED_PAPER_FIELDS = ["id", "title", "year", "venue", "why_read"]
URL_RE = re.compile(r"^https?://\S+$")

errors = []
warnings = []


def load_yaml(relpath):
    path = ROOT / relpath
    if not path.exists():
        errors.append(f"{relpath}: file not found")
        return None
    try:
        with open(path, encoding="utf-8") as f:
            return yaml.safe_load(f)
    except yaml.YAMLError as e:
        errors.append(f"{relpath}: invalid YAML — {e}")
        return None


def main():
    config = load_yaml("config.yaml")
    papers_doc = load_yaml("data/papers.yaml")
    researchers_doc = load_yaml("data/researchers.yaml")
    venues_doc = load_yaml("data/venues.yaml")

    if errors:
        report()
        return

    schema_version = config.get("schema_version")
    if schema_version != 5:
        errors.append(
            f"config.yaml: unrecognized schema_version {schema_version!r} "
            "(this validator understands schema_version 5)"
        )

    areas = set(config.get("areas") or [])
    eras = config.get("eras") or {}
    check_era_ranges(eras)

    papers = papers_doc.get("papers") or []
    lineages = papers_doc.get("lineages") or {}
    researchers = researchers_doc.get("researchers") or []
    venues = venues_doc.get("venues") or []

    paper_ids = check_duplicate_ids(papers, "paper")
    researcher_ids = check_duplicate_ids(researchers, "researcher")
    venue_ids = check_duplicate_ids(venues, "venue")

    check_required_fields(papers, paper_ids)
    check_paper_areas(papers, areas)
    check_paper_venues(papers, venue_ids)
    check_links(papers)
    check_lineages(lineages, papers, paper_ids)
    check_predecessors_successors(papers, paper_ids)
    check_researcher_paper_ids(researchers, paper_ids)

    report()


def check_duplicate_ids(items, label):
    seen = {}
    ids = set()
    for item in items:
        item_id = item.get("id")
        if not item_id:
            errors.append(f"{label} entry missing 'id': {item!r}")
            continue
        if item_id in seen:
            errors.append(f"duplicate {label} id: {item_id!r}")
        seen[item_id] = True
        ids.add(item_id)
    return ids


def check_required_fields(papers, paper_ids):
    for p in papers:
        pid = p.get("id", "<missing id>")
        for field in REQUIRED_PAPER_FIELDS:
            if not p.get(field):
                errors.append(f"paper {pid!r}: missing or empty required field {field!r}")
        # `links` itself must exist as a dict (an empty {} is fine — it just
        # means no link has been captured yet); only its shape is required.
        if not isinstance(p.get("links"), dict):
            errors.append(f"paper {pid!r}: 'links' must be a mapping (use links: {{}} if none yet)")


def check_paper_areas(papers, areas):
    for p in papers:
        pid = p.get("id", "<missing id>")
        for a in p.get("areas") or []:
            if a not in areas:
                errors.append(
                    f"paper {pid!r}: area {a!r} is not in config.yaml's areas list "
                    "(typo, or config.yaml needs updating)"
                )


def _norm_venue(s):
    # app.js matches a clicked venue card to papers the same way: compare the
    # venue's short `id` (hyphens -> spaces) against a paper's `venue` string,
    # case-insensitively. venues.yaml's descriptive `name` (e.g. "ACM SIGCOMM")
    # essentially never matches papers' short venue strings (e.g. "SIGCOMM"),
    # so checking against `name` here would false-positive on nearly every paper.
    return s.upper().replace("-", " ")


def check_paper_venues(papers, venue_ids):
    normalized_ids = {_norm_venue(v) for v in venue_ids}
    for p in papers:
        pid = p.get("id", "<missing id>")
        v = p.get("venue")
        if v and _norm_venue(v) not in normalized_ids:
            warnings.append(
                f"paper {pid!r}: venue {v!r} has no matching id in data/venues.yaml "
                "(fine for a one-off venue like a journal or thesis, but consider adding it "
                "if it's a recurring conference)"
            )


def check_links(papers):
    for p in papers:
        pid = p.get("id", "<missing id>")
        url = (p.get("links") or {}).get("paper")
        if url and not URL_RE.match(url):
            errors.append(f"paper {pid!r}: links.paper is not a syntactically valid http(s) URL: {url!r}")


def check_lineages(lineages, papers, paper_ids):
    for name, ids in lineages.items():
        for pid in ids or []:
            if pid not in paper_ids:
                errors.append(f"lineage {name!r} references unknown paper id {pid!r}")
    lineage_keys = set(lineages.keys())
    for p in papers:
        pid = p.get("id", "<missing id>")
        for lname in p.get("lineages") or []:
            if lname not in lineage_keys:
                errors.append(f"paper {pid!r}: lineages references unknown lineage key {lname!r}")


def check_predecessors_successors(papers, paper_ids):
    for p in papers:
        pid = p.get("id", "<missing id>")
        for field in ("predecessors", "successors"):
            for ref in p.get(field) or []:
                if ref not in paper_ids:
                    errors.append(f"paper {pid!r}: {field} references unknown paper id {ref!r}")


def check_researcher_paper_ids(researchers, paper_ids):
    for r in researchers:
        rid = r.get("id", "<missing id>")
        for pid in r.get("paper_ids") or []:
            if pid not in paper_ids:
                errors.append(f"researcher {rid!r}: paper_ids references unknown paper id {pid!r}")


def check_era_ranges(eras):
    spans = []
    for key, e in eras.items():
        start = e.get("start")
        end = e.get("end")
        if start is not None and end is not None and start > end:
            errors.append(f"config.yaml era {key!r}: start ({start}) is after end ({end})")
        spans.append((start if start is not None else float("-inf"), end if end is not None else float("inf"), key))
    spans.sort()
    for (_, prev_end, prev_key), (next_start, _, next_key) in zip(spans, spans[1:]):
        if prev_end == float("inf"):
            continue
        if next_start == float("-inf"):
            continue
        if next_start <= prev_end:
            errors.append(f"config.yaml eras {prev_key!r} and {next_key!r} overlap")
        elif next_start > prev_end + 1:
            warnings.append(
                f"config.yaml eras {prev_key!r} (ends {prev_end}) and {next_key!r} "
                f"(starts {next_start}) leave a gap — years in between won't match any era"
            )


def report():
    if warnings:
        print(f"{len(warnings)} warning(s):")
        for w in warnings:
            print(f"  WARN  {w}")
    if errors:
        print(f"\n{len(errors)} error(s):")
        for e in errors:
            print(f"  FAIL  {e}")
        print(f"\nvalidate.py: FAILED ({len(errors)} error(s), {len(warnings)} warning(s))")
        sys.exit(1)
    print(f"validate.py: OK (0 errors, {len(warnings)} warning(s))")


if __name__ == "__main__":
    main()
