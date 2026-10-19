#!/usr/bin/env python3
"""Build a labeled contact sheet for visual pose-bank review.

Usage:
  python3 contact_sheet.py <output.png> <image1.png> [image2.png ...]
  python3 contact_sheet.py <output.png> --dir <directory-of-pngs>

Four columns, filename labels; view the output with the vision tool to judge the
bank as one coherent alternating gait cycle (skill Step 4).
"""
from __future__ import annotations

import glob
import os
import sys

from PIL import Image, ImageDraw

COLS, W, H, BAR = 4, 352, 192, 18


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    out = sys.argv[1]
    if sys.argv[2] == "--dir":
        paths = sorted(glob.glob(os.path.join(sys.argv[3], "*.png")))
    else:
        paths = sys.argv[2:]
    if not paths:
        print("no input images")
        return 2
    rows = (len(paths) + COLS - 1) // COLS
    sheet = Image.new("RGB", (COLS * W, rows * (H + BAR)), "black")
    draw = ImageDraw.Draw(sheet)
    for i, p in enumerate(paths):
        im = Image.open(p).convert("RGB").resize((W, H))
        x, y = (i % COLS) * W, (i // COLS) * (H + BAR)
        sheet.paste(im, (x, y + BAR))
        draw.text((x + 4, y + 3), os.path.basename(p)[:46], fill="white")
    sheet.save(out)
    print(f"{out}: {len(paths)} images, {sheet.size[0]}x{sheet.size[1]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
