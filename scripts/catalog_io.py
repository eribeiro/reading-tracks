"""Shared YAML and naming helpers for ReadingTracks maintenance scripts."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml


def slugify(value: str, fallback: str = "item") -> str:
    """Return a lowercase, hyphenated identifier."""
    value = value.casefold().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or fallback


def unique_slug(preferred: str, used: set[str]) -> str:
    """Return an unused slug and add a numeric suffix when necessary."""
    candidate = preferred
    suffix = 2
    while candidate in used:
        candidate = f"{preferred}-{suffix}"
        suffix += 1
    return candidate


def load_yaml(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        loaded = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise ValueError(f"Invalid YAML in {path}: {exc}") from exc
    return default if loaded is None else loaded


def dump_yaml(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rendered = yaml.safe_dump(
        value,
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=False,
        width=100,
    )
    path.write_text(rendered, encoding="utf-8")

