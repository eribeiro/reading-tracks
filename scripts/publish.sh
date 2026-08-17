#!/usr/bin/env bash
set -euo pipefail

python3 scripts/validate.py
git diff --check

git add CHANGES.md data/papers.yaml data/researchers.yaml index.html
git commit -m "${1:-Update ReadingTracks}"
git push origin main

(
  cd ../eribeiro.github.io
  scripts/sync_reading_tracks.sh
  git diff --check

  if ! git diff --quiet || ! git diff --cached --quiet; then
    git add reading-tracks
    git commit -m "Sync ReadingTracks"
    git pull --rebase origin main
    git push origin main
  fi
)
