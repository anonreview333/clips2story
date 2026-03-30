#!/usr/bin/env python3
"""Parse CSV and local {genre}/{id}/ dirs -> data.json (anonymous demo)."""
from __future__ import annotations

import csv
import json
import os
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "demo_video_links.csv"
OUT_PATH = ROOT / "data.json"

GENRES = ["documentary", "film", "lecture", "news", "vlog"]


def youtube_watch_to_embed(watch_url: str) -> str | None:
    try:
        u = urlparse(watch_url)
        q = parse_qs(u.query)
        vid = (q.get("v") or [None])[0]
        if not vid and u.netloc.replace("www.", "") in ("youtu.be",):
            vid = u.path.strip("/").split("/")[0]
        if not vid:
            return None
        return f"https://www.youtube.com/embed/{vid}"
    except Exception:
        return None


def list_mp4(d: Path) -> list[str]:
    if not d.is_dir():
        return []
    return [f.name for f in d.iterdir() if f.suffix.lower() == ".mp4"]


def resolve_regen(files: list[str], keyword: str) -> str | None:
    exact = f"{keyword}_regen.mp4"
    if exact in files:
        return exact
    regens = [f for f in files if re.search(r"_regen\.mp4$", f, re.I)]
    if len(regens) == 1:
        return regens[0]
    if not regens:
        return None
    m = re.match(r"^(\d+)_", keyword)
    if m:
        p = m.group(1)
        for f in regens:
            if f.startswith(f"{p}_") or f.startswith(p):
                return f
    return regens[0]


def build_sets(genre: str, id_str: str, youtube_embed: str) -> list[dict]:
    dir_path = ROOT / genre / id_str
    files = list_mp4(dir_path)
    nf_files = [f for f in files if f.endswith("_no_narration.mp4")]
    out = []
    for nf in nf_files:
        keyword = nf.replace("_no_narration.mp4", "").replace("_no_narration.MP4", "")
        ours_name = f"{keyword}_ours.mp4"
        if ours_name not in files:
            print(f"[skip] {dir_path}: missing {ours_name} for keyword {keyword!r}")
            continue
        regen_name = resolve_regen(files, keyword)
        if not regen_name:
            print(f"[skip] {dir_path}: no REGen for keyword {keyword!r}")
            continue
        base = f"{genre}/{id_str}"
        out.append(
            {
                "id": id_str,
                "keyword": keyword,
                "youtubeEmbed": youtube_embed,
                "local": {
                    "nf": f"{base}/{nf}",
                    "ours": f"{base}/{ours_name}",
                    "regen": f"{base}/{regen_name}",
                },
            }
        )
    return out


def main() -> None:
    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    by_genre: dict[str, list] = {g: [] for g in GENRES}

    for row in rows:
        genre = (row.get("genre") or "").strip()
        id_str = str((row.get("id") or "").strip())
        link = (row.get("youtube_link") or "").strip()
        if genre not in GENRES:
            print(f"Unknown genre in CSV: {genre}")
            continue
        embed = youtube_watch_to_embed(link)
        if not embed:
            print(f"Could not parse YouTube URL for {genre}/{id_str}")
            continue
        by_genre[genre].extend(build_sets(genre, id_str, embed))

    payload = {
        "projectTitle": "Clips2Story: Training-free Video Storyboarding and Editing using Multimodal Retrieval-Embedded Generation",
        "abstractPlaceholder": (
            "[Abstract text will appear here in the camera-ready version. "
            "This anonymous demo page is for double-blind review.]"
        ),
        "pipeline": [
            "Multimodal retrieval aligns candidate clips with story intent without task-specific training.",
            "Embedded generation composes a coherent narrative structure from retrieved visual segments.",
            "The pipeline outputs editable storyboard timelines for comparison across baselines.",
        ],
        "genres": [
            {
                "id": g,
                "label": g[0].upper() + g[1:] if g else g,
                "sets": by_genre[g],
            }
            for g in GENRES
        ],
    }

    OUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
