#!/usr/bin/env python3
"""Create a tiny UI portrait from Jay's approved runtime atlas."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ATLAS_DIR = ROOT.parent / "semester-survival-runner" / "assets" / "processed" / "jay-runtime"
MANIFEST = ATLAS_DIR / "jay-atlas.json"
ATLAS = ATLAS_DIR / "jay-atlas.png"
OUTPUT = ROOT / "assets" / "3d" / "jay" / "jay-portrait.webp"

def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    frames = manifest.get("clips", {}).get("idle", {}).get("frames", [])
    if not frames:
        raise RuntimeError("Jay atlas has no idle frame for the UI portrait.")
    frame = frames[0]
    with Image.open(ATLAS) as sheet:
        portrait = sheet.crop((
            frame["x"], frame["y"],
            frame["x"] + frame["width"], frame["y"] + frame["height"]
        )).convert("RGBA")
    portrait.thumbnail((256, 384), Image.Resampling.LANCZOS)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    portrait.save(OUTPUT, "WEBP", quality=82, method=6)
    if OUTPUT.stat().st_size > 100_000:
        raise RuntimeError(f"Jay portrait unexpectedly large: {OUTPUT.stat().st_size} bytes")
    print(f"JAY PORTRAIT {OUTPUT} {OUTPUT.stat().st_size} bytes")

if __name__ == "__main__":
    main()
