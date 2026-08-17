#!/usr/bin/env python3
"""Import BibTeX records into a minimal or existing ReadingTracks catalog."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Iterable

try:
    from catalog_io import dump_yaml, load_yaml, slugify, unique_slug
except ImportError:  # Support importing as scripts.import_bibtex in tests.
    from scripts.catalog_io import dump_yaml, load_yaml, slugify, unique_slug


SKIPPED_ENTRY_TYPES = {"comment", "preamble", "string"}
LATEX_REPLACEMENTS = {
    r"\&": "&",
    r"\%": "%",
    r"\_": "_",
    r"\textendash": "–",
    r"\textemdash": "—",
    "~": " ",
}


def split_top_level(value: str, separator: str = ",") -> list[str]:
    parts = []
    start = 0
    brace_depth = 0
    in_quote = False
    escaped = False
    for index, char in enumerate(value):
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == '"' and brace_depth == 0:
            in_quote = not in_quote
        elif not in_quote:
            if char == "{":
                brace_depth += 1
            elif char == "}":
                brace_depth = max(0, brace_depth - 1)
            elif char == separator and brace_depth == 0:
                parts.append(value[start:index].strip())
                start = index + 1
    parts.append(value[start:].strip())
    return [part for part in parts if part]


def unwrap_value(value: str) -> str:
    pieces = split_top_level(value, "#")
    rendered = []
    for piece in pieces:
        piece = piece.strip()
        if len(piece) >= 2 and ((piece[0] == "{" and piece[-1] == "}") or (piece[0] == '"' and piece[-1] == '"')):
            piece = piece[1:-1]
        rendered.append(piece.strip())
    return "".join(rendered)


def latex_to_text(value: str) -> str:
    value = unwrap_value(value)
    for source, replacement in LATEX_REPLACEMENTS.items():
        value = value.replace(source, replacement)
    # Preserve the letter in common accent forms such as {\"o}, \'e, or \c{c}.
    value = re.sub(r"\\(?:['\"`^~=.Huv])\s*\{?([A-Za-z])\}?", r"\1", value)
    value = re.sub(r"\\c\s*\{?([A-Za-z])\}?", r"\1", value)
    value = value.replace("{", "").replace("}", "")
    value = re.sub(r"\\(?:textit|textbf|emph|mathrm|mathbf)\s*", "", value)
    return re.sub(r"\s+", " ", value).strip()


def parse_bibtex(text: str) -> list[dict[str, str]]:
    """Parse common BibTeX entries without requiring another dependency."""
    entries = []
    cursor = 0
    while True:
        marker = text.find("@", cursor)
        if marker < 0:
            break
        type_match = re.match(r"@\s*([A-Za-z]+)\s*([({])", text[marker:])
        if not type_match:
            cursor = marker + 1
            continue
        entry_type = type_match.group(1).casefold()
        opener = type_match.group(2)
        closer = "}" if opener == "{" else ")"
        body_start = marker + type_match.end()
        depth = 1
        in_quote = False
        escaped = False
        index = body_start
        while index < len(text) and depth:
            char = text[index]
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"' and opener == "{" and depth == 1:
                in_quote = not in_quote
            elif not in_quote:
                if char == opener:
                    depth += 1
                elif char == closer:
                    depth -= 1
            index += 1
        if depth:
            raise ValueError(f"Unterminated @{entry_type} entry near character {marker}")
        cursor = index
        if entry_type in SKIPPED_ENTRY_TYPES:
            continue
        body = text[body_start : index - 1]
        parts = split_top_level(body)
        if not parts:
            continue
        record = {"ENTRYTYPE": entry_type, "ID": parts[0].strip()}
        for field in parts[1:]:
            if "=" not in field:
                continue
            name, raw_value = field.split("=", 1)
            name = name.strip().casefold()
            if name:
                record[name] = latex_to_text(raw_value)
        entries.append(record)
    return entries


def split_authors(value: str) -> list[str]:
    authors = []
    for raw_name in re.split(r"\s+and\s+", value, flags=re.IGNORECASE):
        raw_name = latex_to_text(raw_name).strip()
        if not raw_name:
            continue
        parts = [part.strip() for part in raw_name.split(",")]
        if len(parts) == 2:
            name = f"{parts[1]} {parts[0]}"
        elif len(parts) >= 3:
            name = f"{parts[-1]} {' '.join(parts[1:-1])} {parts[0]}"
        else:
            name = raw_name
        authors.append(re.sub(r"\s+", " ", name).strip())
    return authors


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


def paper_id(title: str, year: int, used: set[str]) -> str:
    words = re.findall(r"[A-Za-z0-9]+", title)[:7]
    stem = slugify(" ".join(words), "paper")[:70].rstrip("-")
    return unique_slug(f"{stem}-{year}", used)


def paper_url(entry: dict[str, str]) -> str | None:
    doi = entry.get("doi", "").strip()
    if doi:
        doi = re.sub(r"^https?://(?:dx\.)?doi\.org/", "", doi, flags=re.IGNORECASE)
        return f"https://doi.org/{doi}"
    url = entry.get("url", "").strip()
    if re.match(r"^https?://\S+$", url):
        return url
    eprint = entry.get("eprint", "").strip()
    archive = entry.get("archiveprefix", "").casefold()
    if eprint and (archive == "arxiv" or re.match(r"^\d{4}\.\d{4,5}(v\d+)?$", eprint)):
        return f"https://arxiv.org/abs/{eprint}"
    return None


def venue_name(entry: dict[str, str]) -> str:
    return (
        entry.get("booktitle")
        or entry.get("journal")
        or entry.get("school")
        or entry.get("institution")
        or entry.get("publisher")
        or "Unknown"
    ).strip()


def infer_organization(venue: str) -> str:
    upper = venue.upper()
    for name in ("USENIX", "ACM", "IEEE", "VLDB", "MLSys", "NeurIPS"):
        if name.upper() in upper:
            return name
    return ""


def keyword_list(raw: str) -> list[str]:
    return [value.strip() for value in re.split(r"[,;]", raw) if value.strip()]


def load_catalog(root: Path) -> tuple[dict, dict, dict, dict]:
    config = load_yaml(root / "config.yaml", {})
    papers = load_yaml(root / "data/papers.yaml", {"metadata": {}, "lineages": {}, "papers": []})
    researchers = load_yaml(root / "data/researchers.yaml", {"researchers": []})
    venues = load_yaml(root / "data/venues.yaml", {"venues": []})
    for name, document, key, expected in (
        ("config.yaml", config, "areas", list),
        ("data/papers.yaml", papers, "papers", list),
        ("data/researchers.yaml", researchers, "researchers", list),
        ("data/venues.yaml", venues, "venues", list),
    ):
        if not isinstance(document, dict) or not isinstance(document.get(key, []), expected):
            raise ValueError(f"{name} does not have the expected {key!r} structure")
    papers.setdefault("metadata", {})
    papers.setdefault("lineages", {})
    papers.setdefault("papers", [])
    researchers.setdefault("researchers", [])
    venues.setdefault("venues", [])
    return config, papers, researchers, venues


def import_entries(
    entries: Iterable[dict[str, str]],
    config: dict,
    papers_doc: dict,
    researchers_doc: dict,
    venues_doc: dict,
    area: str | None = None,
    paper_type: str = "imported",
    add_area: bool = False,
) -> dict[str, int]:
    configured_areas = config.setdefault("areas", [])
    if area and area not in configured_areas:
        if add_area:
            configured_areas.append(area)
        else:
            raise ValueError(f"Area {area!r} is not in config.yaml; use --add-area to add it")

    papers = papers_doc["papers"]
    researchers = researchers_doc["researchers"]
    venues = venues_doc["venues"]
    used_paper_ids = {paper.get("id") for paper in papers if paper.get("id")}
    used_researcher_ids = {item.get("id") for item in researchers if item.get("id")}
    used_venue_ids = {item.get("id") for item in venues if item.get("id")}
    paper_keys = {(normalized(str(p.get("title", ""))), int(p.get("year", 0) or 0)) for p in papers}
    researcher_by_name = {normalized(item.get("name", "")): item for item in researchers}
    venue_by_name = {normalized(item.get("name", "")): item for item in venues}
    counts = {"papers": 0, "researchers": 0, "venues": 0, "skipped": 0}

    for entry in entries:
        title = entry.get("title", "").strip()
        year_match = re.search(r"\d{4}", entry.get("year", ""))
        if not title or not year_match:
            counts["skipped"] += 1
            continue
        year = int(year_match.group())
        key = (normalized(title), year)
        if key in paper_keys:
            counts["skipped"] += 1
            continue

        authors = split_authors(entry.get("author", ""))
        venue = venue_name(entry)
        pid = paper_id(title, year, used_paper_ids)
        used_paper_ids.add(pid)
        paper_keys.add(key)
        link = paper_url(entry)
        paper = {
            "id": pid,
            "title": title,
            "year": year,
            "authors": authors,
            "venue": venue,
            "areas": [area] if area else [],
            "tags": keyword_list(entry.get("keywords", "")),
            "type": paper_type,
            "lineages": [],
            "why_read": entry.get("note") or "Imported from BibTeX; add a short reason to read this paper.",
            "links": {"paper": link} if link else {},
            "predecessors": [],
            "successors": [],
        }
        papers.append(paper)
        counts["papers"] += 1

        for author in authors:
            author_key = normalized(author)
            researcher = researcher_by_name.get(author_key)
            if researcher is None:
                rid = unique_slug(slugify(author, "researcher"), used_researcher_ids)
                used_researcher_ids.add(rid)
                researcher = {
                    "id": rid,
                    "name": author,
                    "areas": [area] if area else [],
                    "topics": [],
                    "paper_ids": [],
                }
                researchers.append(researcher)
                researcher_by_name[author_key] = researcher
                counts["researchers"] += 1
            if pid not in researcher.setdefault("paper_ids", []):
                researcher["paper_ids"].append(pid)
            if area and area not in researcher.setdefault("areas", []):
                researcher["areas"].append(area)

        venue_key = normalized(venue)
        if venue_key not in venue_by_name:
            vid = unique_slug(slugify(venue, "unknown"), used_venue_ids)
            used_venue_ids.add(vid)
            venue_record = {
                "id": vid,
                "name": venue,
                "organization": infer_organization(venue),
                "areas": [area] if area else [],
                "tier": "",
            }
            venues.append(venue_record)
            venue_by_name[venue_key] = venue_record
            counts["venues"] += 1
    return counts


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Merge BibTeX papers, authors, and venues into ReadingTracks YAML files."
    )
    parser.add_argument("bibtex", nargs="+", type=Path, help="One or more .bib files")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="ReadingTracks directory")
    parser.add_argument("--area", help="Area assigned to every imported paper")
    parser.add_argument("--add-area", action="store_true", help="Add --area to config.yaml when absent")
    parser.add_argument("--type", default="imported", dest="paper_type", help="Paper type label")
    parser.add_argument("--dry-run", action="store_true", help="Parse and report without writing YAML")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = make_parser().parse_args(argv)
    root = args.root.resolve()
    try:
        entries = []
        for path in args.bibtex:
            entries.extend(parse_bibtex(path.read_text(encoding="utf-8")))
        config, papers, researchers, venues = load_catalog(root)
        counts = import_entries(
            entries,
            config,
            papers,
            researchers,
            venues,
            area=args.area,
            paper_type=args.paper_type,
            add_area=args.add_area,
        )
        if not args.dry_run:
            dump_yaml(root / "config.yaml", config)
            dump_yaml(root / "data/papers.yaml", papers)
            dump_yaml(root / "data/researchers.yaml", researchers)
            dump_yaml(root / "data/venues.yaml", venues)
    except (OSError, UnicodeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    action = "Would add" if args.dry_run else "Added"
    print(
        f"{action} {counts['papers']} paper(s), {counts['researchers']} researcher(s), "
        f"and {counts['venues']} venue(s); skipped {counts['skipped']} duplicate or incomplete record(s)."
    )
    if not args.dry_run:
        print("Review imported placeholders, then run: python3 scripts/validate.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
