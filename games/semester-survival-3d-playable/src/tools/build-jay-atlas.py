#!/usr/bin/env python3
"""Build a transparent Jay atlas from the preserved source sheets.

Requires Pillow: python -m pip install Pillow
Run from repository root:
  python games/semester-survival-runner/src/tools/build-jay-atlas.py

Original uploads are never modified. Outputs go to assets/processed/jay-staging/.
This tool deliberately does not publish a runtime manifest: every extracted frame
and matte must be visually approved before the atlas can be enabled in gameplay.
"""
from __future__ import annotations
import hashlib, json, math
from pathlib import Path
from PIL import Image

GAME_ROOT = Path(__file__).resolve().parents[2]
SOURCE = GAME_ROOT.parents[1] / "artwork/semester-survival-runner/jay-source"
OUT = GAME_ROOT / "assets/processed/jay-staging"
SHEETS = {
    "idle": ("1795074192816.jpg", 4, 1, 8, "loop"),
    "walk": ("1795074517333.jpg", 4, 2, 10, "loop"),
    "jog": ("1795074841200.jpg", 4, 2, 12, "loop"),
    "sprint": ("Meta_AI_sprint_20261119_110406.jpg", 4, 2, 14, "loop"),
    "jump-standing": ("Meta_AI_916951766_1841479800241068_9219361324369617113_n_20261119_110911.webp", 4, 2, 12, "once"),
    "jump-running": ("Meta_AI_916811181_1450185383862546_3331141356748851519_n_20261119_111431.webp", 4, 2, 12, "once"),
    "fall-accidental": ("Meta_AI_916952132_1143042368122950_6500628437492435153_n_20261119_112204.webp", 4, 2, 10, "once"),
    "get-up-recovery": ("Meta_AI_916882119_2702665886828845_97200770314772330_n_20261119_112422.webp", 4, 2, 10, "once"),
    "greeting-wave": ("Meta_AI_916882035_28451130907895002_8609570660650290104_n_20261119_115527.webp", 4, 2, 8, "pingpong"),
    "phone-use": ("Meta_AI_916882081_994725666517201_3357036583534970929_n_20261119_120922.webp", 4, 2, 8, "loop"),
    "sit-stand": ("Meta_AI_916953425_2325867808197235_9058160883401323934_n_20261119_121150.webp", 4, 2, 8, "once"),
    "slide": ("Meta_AI_916765409_29130277979965148_2472250501587081787_n_20261120_004516.webp", 4, 2, 16, "loop"),
}

def white_background_matte(image: Image.Image) -> Image.Image:
    """Remove only near-white pixels connected to the cell border.

    This is intentionally conservative: enclosed white shirt pixels remain.
    A one-pixel dark outline may still be required for clean separation; inspect
    every PNG at 100%. No global white-key or colour replacement is performed.
    """
    rgba = image.convert("RGBA")
    rgb = rgba.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    seen = bytearray(w * h)
    stack = []
    def candidate(x, y):
        r, g, b = px[x, y]
        return min(r, g, b) >= 222 and max(r, g, b) - min(r, g, b) <= 34
    for x in range(w):
        if candidate(x, 0): stack.append((x, 0))
        if candidate(x, h - 1): stack.append((x, h - 1))
    for y in range(h):
        if candidate(0, y): stack.append((0, y))
        if candidate(w - 1, y): stack.append((w - 1, y))
    while stack:
        x, y = stack.pop()
        idx = y * w + x
        if seen[idx] or not candidate(x, y): continue
        seen[idx] = 1
        if x: stack.append((x - 1, y))
        if x + 1 < w: stack.append((x + 1, y))
        if y: stack.append((x, y - 1))
        if y + 1 < h: stack.append((x, y + 1))
    alpha = rgba.getchannel("A")
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            if seen[y * w + x]:
                ap[x, y] = 0
    rgba.putalpha(alpha)
    return rgba

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    prepared = []
    source_records = {}
    for name, (filename, cols, rows, fps, playback) in SHEETS.items():
        path = SOURCE / filename
        if not path.is_file():
            raise SystemExit(f"Missing source sheet: {path}")
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        with Image.open(path) as opened:
            sheet = opened.convert("RGB")
        sw, sh = sheet.size
        if sw % cols or sh % rows:
            raise SystemExit(f"{filename}: {sw}x{sh} cannot divide into {cols}x{rows}")
        cw, ch = sw // cols, sh // rows
        frames = []
        for row in range(rows):
            for col in range(cols):
                cell = sheet.crop((col*cw, row*ch, (col+1)*cw, (row+1)*ch))
                frame = white_background_matte(cell)
                frames.append(frame)
        prepared.append((name, frames, fps, playback, filename))
        source_records[name] = {"file": filename, "sha256": digest, "sourceSize": [sw, sh],
                                "grid": [cols, rows], "cellSize": [cw, ch],
                                "formatDetectedByPillow": Image.open(path).format}
    cell_w = max(frame.width for _, frames, *_ in prepared for frame in frames)
    cell_h = max(frame.height for _, frames, *_ in prepared for frame in frames)
    gap = 4
    columns = 4
    total_frames = sum(len(frames) for _, frames, *_ in prepared)
    rows = math.ceil(total_frames / columns)
    atlas = Image.new("RGBA", (columns*cell_w + (columns+1)*gap,
                               rows*cell_h + (rows+1)*gap), (0, 0, 0, 0))
    clips = {}
    index = 0
    for name, frames, fps, playback, source in prepared:
        entries = []
        for frame in frames:
            col, row = index % columns, index // columns
            x, y = gap + col*cell_w, gap + row*cell_h
            # Preserve each original cell's scale; align to bottom-centre.
            ox = x + (cell_w-frame.width)//2
            oy = y + cell_h-frame.height
            atlas.alpha_composite(frame, (ox, oy))
            # Anchor the visible subject, not the square source cell. This removes
            # artificial vertical foot drift caused by different amounts of
            # transparent matte beneath each generated pose. Airborne poses still
            # move naturally because their opaque-foot bounds are higher.
            visible = frame.getchannel("A").getbbox()
            if visible is None:
                raise SystemExit(f"{name}: frame {len(entries)} has no visible pixels after matte")
            grounded_clip = name in {"idle", "walk", "jog", "sprint", "slide"}
            pivot_x = (visible[0] + visible[2]) / 2 if grounded_clip else frame.width / 2
            # Keep airborne source-sheet offsets for jumps; gameplay supplies
            # the jump arc. Grounded locomotion and slide use stable foot anchors.
            pivot_y = visible[3] if grounded_clip else frame.height
            entries.append({"x": ox, "y": oy, "width": frame.width, "height": frame.height,
                            "pivotX": pivot_x, "pivotY": pivot_y})
            index += 1
        if name == "slide":
            # Authored 8-frame sheet: 2-frame anticipation, 4-frame low slide,
            # 2-frame recovery. Each phase uses its own deterministic playback.
            clips["slide-start"] = {"fps": fps, "playback": "once", "frames": entries[:2],
                                    "reviewStatus": "staging-unapproved", "source": source}
            clips["slide-loop"] = {"fps": fps, "playback": "loop", "frames": entries[2:6],
                                   "reviewStatus": "staging-unapproved", "source": source}
            clips["slide-recover"] = {"fps": fps, "playback": "once", "frames": entries[6:8],
                                      "reviewStatus": "staging-unapproved", "source": source}
        else:
            clips[name] = {"fps": fps, "playback": playback, "frames": entries,
                           "reviewStatus": "staging-unapproved", "source": source}
    atlas_path = OUT / "jay-atlas-staging.png"
    # Runtime atlas is palette-quantized to keep the complete game package under the arcade 10 MB cap.
    # Transparent alpha is retained; canvas rendering accepts indexed PNGs unchanged. This is the production-size build.
    atlas = atlas.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    atlas.save(atlas_path, optimize=True)
    manifest = {"schemaVersion": 1, "character": "jay", "status": "staging-unapproved",
                "atlas": atlas_path.name, "atlasSize": list(atlas.size),
                "packing": {"columns": columns, "cellSize": [cell_w, cell_h], "gap": gap},
                "clips": clips, "sources": source_records,
                "warning": "Do not load in production. Inspect every matte, frame order, identity, pivots and gameplay-scale motion; approve clips individually."}
    (OUT / "jay-atlas-staging.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    report = {"status": "staging-built", "sourceSheets": len(prepared), "frames": total_frames,
              "atlas": atlas_path.name, "atlasSize": list(atlas.size),
              "manifest": "jay-atlas-staging.json", "output": str(OUT)}
    (OUT / "BUILD_REPORT.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
