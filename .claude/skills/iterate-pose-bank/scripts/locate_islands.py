#!/usr/bin/env python3
"""Locate detached non-key islands in pose-bank candidates (failure signature S2).

Usage:
  python3 locate_islands.py <candidate.png> [more.png ...]

For each image, prints every subject component other than the main silhouette that
is larger than 40 px: size, bounding box and mean RGB. A washed pink/white island at
a shoe bounding box is the ghosted-airborne-shoe signature -> use the repaint-only
prompt template. Reuses the classifier from scripts/audit_pose_bank.py so verdicts
match the audit gate exactly.
"""
from __future__ import annotations

import os
import sys

import numpy as np

# repo root = four levels up from this file (.claude/skills/iterate-pose-bank/scripts)
_REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), *[".."] * 4))
sys.path.insert(0, os.path.join(_REPO, "scripts"))

from scipy import ndimage  # noqa: E402

from audit_pose_bank import analyze, load_rgb  # noqa: E402


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    worst = 0
    for path in sys.argv[1:]:
        r = analyze(path, None)
        if r is None:
            print(f"{path}: no subject found")
            continue
        img = load_rgb(r["path"])
        subject = ~r["bg_family"]
        lab, n = ndimage.label(subject)
        sizes = ndimage.sum(subject, lab, range(1, n + 1))
        main_id = int(np.argmax(sizes)) + 1
        print(f"{path}")
        print(f"  islands total {r['island_px']} px, largest {r['island_blob_max']} px "
              f"(key gate: largest must be <= 150 px)")
        found = False
        for i in np.argsort(sizes)[::-1]:
            if i + 1 == main_id or sizes[i] < 40:
                continue
            m = lab == i + 1
            ys, xs = np.nonzero(m)
            rgb = np.round(img[m].mean(0) * 255).astype(int)
            print(f"  island {int(sizes[i]):6d} px  bbox x[{xs.min()},{xs.max()}] "
                  f"y[{ys.min()},{ys.max()}]  mean RGB {tuple(rgb)}")
            found = True
        if not found:
            print("  no islands > 40 px")
        worst = max(worst, r["island_blob_max"])
    return 1 if worst > 150 else 0


if __name__ == "__main__":
    sys.exit(main())
