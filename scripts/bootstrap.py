#!/usr/bin/env python3
"""Create the minimum YAML data set needed to run ReadingTracks."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from catalog_io import dump_yaml
except ImportError:  # Support importing as scripts.bootstrap in tests.
    from scripts.catalog_io import dump_yaml


DEFAULTS = {
    "title": "ReadingTracks",
    "tagline": "A curated reading list.",
    "author_name": "Reading group maintainers",
    "author_url": "https://example.com",
    "footer": "Data kept in YAML and statically loaded in the browser.",
    "areas": "Computer Science",
    "era_label": "All years",
}


def prompt(label: str, default: str) -> str:
    answer = input(f"{label} [{default}]: ").strip()
    return answer or default


def parse_areas(raw: str) -> list[str]:
    areas = []
    for value in raw.split(","):
        value = value.strip()
        if value and value not in areas:
            areas.append(value)
    return areas


def build_documents(values: dict[str, str]) -> dict[str, dict]:
    return {
        "config.yaml": {
            "schema_version": 5,
            "site": {
                "title": values["title"],
                "tagline": values["tagline"],
                "author_name": values["author_name"],
                "author_url": values["author_url"],
                "footer": values["footer"],
            },
            "areas": parse_areas(values["areas"]),
            "eras": {"all-years": {"label": values["era_label"]}},
        },
        "data/papers.yaml": {
            "metadata": {"notes": "Bootstrapped ReadingTracks catalog."},
            "lineages": {},
            "papers": [],
        },
        "data/researchers.yaml": {"researchers": []},
        "data/venues.yaml": {"venues": []},
    }


def collect_values(args: argparse.Namespace) -> dict[str, str]:
    values = {}
    for key, default in DEFAULTS.items():
        supplied = getattr(args, key)
        if supplied is not None:
            values[key] = supplied
        elif args.non_interactive:
            values[key] = default
        else:
            labels = {
                "title": "Site title",
                "tagline": "Tagline",
                "author_name": "Author or group name",
                "author_url": "Author or group URL",
                "footer": "Footer text",
                "areas": "Areas (comma-separated)",
                "era_label": "Label for the initial all-years era",
            }
            values[key] = prompt(labels[key], default)
    return values


def bootstrap(root: Path, documents: dict[str, dict], force: bool = False) -> list[Path]:
    targets = [root / relative for relative in documents]
    existing = [path for path in targets if path.exists()]
    if existing and not force:
        names = ", ".join(str(path.relative_to(root)) for path in existing)
        raise FileExistsError(
            f"Refusing to overwrite existing files: {names}. Use --force only if this is intentional."
        )
    for relative, document in documents.items():
        dump_yaml(root / relative, document)
    return targets


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Create config.yaml and the minimum data/*.yaml files for ReadingTracks."
    )
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Project directory (default: cwd)")
    parser.add_argument("--non-interactive", action="store_true", help="Accept defaults for omitted values")
    parser.add_argument("--force", action="store_true", help="Overwrite existing YAML files")
    parser.add_argument("--title")
    parser.add_argument("--tagline")
    parser.add_argument("--author-name")
    parser.add_argument("--author-url")
    parser.add_argument("--footer")
    parser.add_argument("--areas", help="Comma-separated area labels")
    parser.add_argument("--era-label")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = make_parser().parse_args(argv)
    try:
        values = collect_values(args)
        targets = bootstrap(args.root.resolve(), build_documents(values), args.force)
    except (EOFError, KeyboardInterrupt):
        print("\nBootstrap cancelled.", file=sys.stderr)
        return 130
    except (FileExistsError, OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print("Created ReadingTracks YAML files:")
    for path in targets:
        print(f"  {path}")
    print("Next: import a BibTeX file or add papers manually, then run scripts/validate.py.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
