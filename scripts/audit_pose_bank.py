#!/usr/bin/env python3
"""Automated pose-bank candidate audit (POSE_BANK_ACCEPTANCE.md gates).

Measures, for every candidate plate:
  G-KEY   background key purity / shadow + gradient contamination, key recoverability
  G-FRAME full-silhouette framing margins and subject scale proxy
  G-PHASE per-phase foot/ground landmark compliance (contact / down / pass / flight)
  G-DIV   pairwise silhouette IoU duplicate detection

Usage:
  python3 scripts/audit_pose_bank.py [--json out.json] [--normalize out_dir] [paths...]

Without paths it audits every PNG in src/images/photoreal-female-pose-bank/candidates.
`--normalize` additionally writes key-normalized plates (background repainted to the
flat modal key color wherever the pixel is background-family) for extraction use.
"""
from __future__ import annotations

import argparse
import colorsys
import hashlib
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

MASTER = "src/images/photoreal-female/01-master-lateral-profile-reference.png"
CANDIDATE_DIR = "src/images/photoreal-female-pose-bank/candidates"

# --- gate thresholds (see docs/POSE_BANK_ACCEPTANCE.md) ---
HUE_TOL_DEG = 24.0          # background-family hue window around modal key hue
SAT_MIN = 0.22              # background-family minimum saturation
SHADOW_VAL_DELTA = 0.10     # value deviation marking shadow/gradient pixels
MARGIN_MIN_PX = 8           # minimum silhouette-to-frame margin
BASELINE_TOL_PX = 14        # grounded-shoe tolerance around master baseline
AIRBORNE_MIN_PX = 22        # minimum clearance for an airborne shoe
DUP_IOU = 0.90              # silhouettes above this are duplicates
PHASE_IOU = 0.84            # within-half-cycle distinctness requirement

PHASE_RULES = {
    # key: (rule, description)
    "H01": ("contact", "front shoe grounded, rear shoe airborne"),
    "H02": ("down", "support shoe grounded under hips, other shoe airborne behind"),
    "H03": ("pass", "rear shoe grounded (toe-off), other shoe airborne, swing ahead"),
    "H04": ("flight", "both shoes airborne"),
    "H05": ("contact", "front shoe grounded, rear shoe airborne"),
    "H06": ("down", "support shoe grounded under hips, other shoe airborne behind"),
    "H07": ("pass", "rear shoe grounded (toe-off), other shoe airborne, swing ahead"),
    "H08": ("flight", "both shoes airborne"),
}

HALF_CYCLES = [["H01", "H02", "H03", "H04"], ["H05", "H06", "H07", "H08"]]


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_rgb(path: str) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 255.0


def rgb_to_hsv(img: np.ndarray) -> np.ndarray:
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    mx = img.max(-1)
    mn = img.min(-1)
    diff = mx - mn
    h = np.zeros_like(mx)
    mask = diff > 1e-6
    rm = mask & (mx == r)
    gm = mask & (mx == g) & ~rm
    bm = mask & ~rm & ~gm
    h[rm] = (60 * ((g - b)[rm] / diff[rm])) % 360
    h[gm] = 60 * ((b - r)[gm] / diff[gm]) + 120
    h[bm] = 60 * ((r - g)[bm] / diff[bm]) + 240
    s = np.where(mx > 1e-6, diff / np.maximum(mx, 1e-6), 0.0)
    return np.stack([h, s, mx], axis=-1)


def modal_key_color(img: np.ndarray) -> np.ndarray:
    """Modal border color = flat key reference."""
    border = np.concatenate(
        [
            img[:10].reshape(-1, 3),
            img[-10:].reshape(-1, 3),
            img[:, :10].reshape(-1, 3),
            img[:, -10:].reshape(-1, 3),
        ]
    )
    q = (border * 63).round().astype(np.int32)
    keys = q[:, 0] * 4096 + q[:, 1] * 64 + q[:, 2]
    vals, counts = np.unique(keys, return_counts=True)
    top = vals[counts.argmax()]
    sel = keys == top
    return border[sel].mean(0)


def hue_dist(h1, h2):
    d = np.abs(h1 - h2) % 360
    return np.minimum(d, 360 - d)


def analyze(path: str, baseline_y: float | None):
    img = load_rgb(path)
    H, W, _ = img.shape
    hsv = rgb_to_hsv(img)
    key = modal_key_color(img)
    kh, ks, kv = colorsys.rgb_to_hsv(*key)
    kh *= 360.0

    bg_candidate = (hue_dist(hsv[..., 0], kh) <= HUE_TOL_DEG) & (hsv[..., 1] >= SAT_MIN)
    # true background = key-family pixels flood-connected to the frame border;
    # key-family pixels enclosed by the subject (pink-lit fabric highlights,
    # skin sheen) are subject, never background.
    # erode 2 px so 1-2 px antialias channels cannot leak the flood fill into
    # enclosed fabric-sheen patches, flood from the border, then re-dilate 2 px
    # constrained to key-family pixels.
    core = ndimage.binary_erosion(bg_candidate, iterations=2, border_value=1)
    clab, cn = ndimage.label(core)
    border_ids = set(np.unique(np.concatenate([
        clab[0, :], clab[-1, :], clab[:, 0], clab[:, -1]]))) - {0}
    core_bg = np.isin(clab, sorted(border_ids)) if border_ids else np.zeros_like(core)
    bg_family = ndimage.binary_dilation(core_bg, iterations=2) & bg_candidate
    subject = ~bg_family

    lab, n = ndimage.label(subject)
    if n == 0:
        return None
    sizes = ndimage.sum(subject, lab, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    sil = lab == main
    island_px = int(subject.sum() - sil.sum())
    island_blobs = int((sizes > 20).sum() - 1)
    other = sorted((s for i, s in enumerate(sizes) if i + 1 != main), reverse=True)
    island_blob_max = int(other[0]) if other else 0

    ys, xs = np.nonzero(sil)
    top, bot = int(ys.min()), int(ys.max())
    left, right = int(xs.min()), int(xs.max())
    margins = dict(top=top, bottom=H - 1 - bot, left=left, right=W - 1 - right)
    centroid_x = float(xs.mean())

    # shadow / gradient inside background-family pixels
    shade = bg_family & (np.abs(hsv[..., 2] - kv) > SHADOW_VAL_DELTA)
    shade_px = int(shade.sum())
    slab, sn = ndimage.label(shade)
    shade_blob = int(ndimage.sum(shade, slab, range(1, sn + 1)).max()) if sn else 0

    # residual after key normalization = subject islands only
    residual_px = island_px

    # shoe clusters: bright low-saturation pixels in lower part of silhouette
    shoe = sil & (hsv[..., 2] > 0.62) & (hsv[..., 1] < 0.30)
    lower = np.zeros_like(shoe)
    cut = top + int((bot - top) * 0.55)
    lower[cut:, :] = True
    shoe &= lower
    shoe = ndimage.binary_closing(shoe, np.ones((5, 5)))
    shlab, shn = ndimage.label(shoe)
    feet = []
    if shn:
        ssz = ndimage.sum(shoe, shlab, range(1, shn + 1))
        order = np.argsort(ssz)[::-1]
        for idx in order[:2]:
            if ssz[idx] < 120:
                continue
            m = shlab == idx + 1
            fy, fx = np.nonzero(m)
            feet.append(
                dict(
                    bottom=int(fy.max()),
                    top=int(fy.min()),
                    height=int(fy.max() - fy.min()),
                    width=int(fx.max() - fx.min()),
                    contact_width=int(np.ptp(fx[fy >= fy.max() - 6]) + 1),
                    cx=float(fx.mean()),
                    cy=float(fy.mean()),
                    px=int(ssz[idx]),
                )
            )
    feet.sort(key=lambda f: f["cx"])  # left->right (rear->front for right-facing)

    return dict(
        path=path,
        sha256=sha256(path),
        size=[W, H],
        key_rgb=[round(float(c * 255), 1) for c in key],
        key_hue=round(float(kh), 1),
        silhouette_px=int(sil.sum()),
        silhouette_bbox=[left, top, right, bot],
        margins=margins,
        centroid_x=round(centroid_x, 1),
        island_px=island_px,
        island_blobs=island_blobs,
        island_blob_max=island_blob_max,
        shade_px=shade_px,
        shade_blob=shade_blob,
        residual_after_normalize_px=residual_px,
        feet=feet,
        sil_mask=sil,
        bg_family=bg_family,
        key_color=key,
    )


FLAT_CONTACT_MIN_W = 55     # flat grounded sole: bottom-row contact width at least this
TOE_CONTACT_MAX_W = 46      # toe-off grounded sole: bottom-row contact width at most this
SWING_FOOT_MAX_LIFT = 175   # swing foot must not lift higher than ~knee height
PASS_STRIDE_MAX_W = 190     # pass phase is compact: horizontal shoe separation cap


def phase_check(key: str, rec: dict, baseline_y: float) -> tuple[bool, list[str]]:
    rule = PHASE_RULES.get(key)
    if rule is None:
        return True, ["no phase rule (insert/other)"]
    kind = rule[0]
    feet = rec["feet"]
    notes = []
    ok = True
    if len(feet) < 2:
        return False, [f"only {len(feet)} shoe cluster(s) detected"]
    rear, front = feet[0], feet[1]
    sil_bottom = rec["silhouette_bbox"][3]

    # ground zone: lowest silhouette point must sit in a plausible band of the
    # master baseline; a shoe is grounded when it defines that lowest point.
    ground_plausible = (baseline_y - 45) <= sil_bottom <= (baseline_y + 10)
    grounded = [
        f for f in feet
        if ground_plausible and (sil_bottom - f["bottom"]) <= 8
    ]
    airborne = [f for f in feet if (sil_bottom - f["bottom"]) >= AIRBORNE_MIN_PX]
    cx = rec["centroid_x"]

    if kind in ("contact", "down", "pass") and not ground_plausible:
        return False, [
            f"silhouette bottom {sil_bottom} outside ground band "
            f"[{baseline_y - 45},{baseline_y + 10}] — no credible ground contact"
        ]

    if kind == "contact":
        if not (len(grounded) == 1 and grounded[0] is front):
            ok = False
            notes.append("need exactly the FRONT shoe grounded")
        else:
            if grounded[0]["contact_width"] < FLAT_CONTACT_MIN_W:
                ok = False
                notes.append(f"contact sole width {grounded[0]['contact_width']}px < {FLAT_CONTACT_MIN_W} — not a flat midfoot strike")
            if front["cx"] < cx:
                ok = False
                notes.append("grounded shoe not ahead of body centroid")
        if rear not in airborne:
            ok = False
            notes.append(f"rear shoe clearance {sil_bottom - rear['bottom']:.0f}px < {AIRBORNE_MIN_PX}")
    elif kind == "down":
        if len(grounded) != 1:
            ok = False
            notes.append("need exactly one grounded shoe")
        else:
            g = grounded[0]
            if g["cx"] - cx > 110:
                ok = False
                notes.append(f"grounded shoe {g['cx'] - cx:.0f}px ahead of hips (>110 reads as contact, not loaded mid-stance)")
            if g["contact_width"] < FLAT_CONTACT_MIN_W:
                ok = False
                notes.append(f"support sole width {g['contact_width']}px < {FLAT_CONTACT_MIN_W} — not a flat loaded sole-roll")
        if not any(f in airborne for f in feet if not grounded or f is not grounded[0]):
            ok = False
            notes.append("other shoe not clearly airborne")
    elif kind == "pass":
        if not (len(grounded) == 1 and grounded[0] is rear):
            ok = False
            notes.append("need exactly the REAR shoe grounded (toe-off)")
        else:
            if rear["contact_width"] > TOE_CONTACT_MAX_W:
                ok = False
                notes.append(f"grounded sole width {rear['contact_width']}px > {TOE_CONTACT_MAX_W} — reads flat, heel must be visibly raised to toe-only contact")
            if rear["cx"] > cx - 10:
                ok = False
                notes.append("toe-off shoe not behind body centroid")
        if abs(front["cx"] - rear["cx"]) > PASS_STRIDE_MAX_W:
            ok = False
            notes.append(f"shoe separation {abs(front['cx'] - rear['cx']):.0f}px > {PASS_STRIDE_MAX_W} — extended sprint drift, pass phase must be compact")
        if front not in airborne:
            ok = False
            notes.append("swing shoe not clearly airborne")
        elif (baseline_y - front["bottom"]) > SWING_FOOT_MAX_LIFT:
            ok = False
            notes.append(f"swing foot lifted {baseline_y - front['bottom']:.0f}px — high-knee sprint drift (> {SWING_FOOT_MAX_LIFT})")
    elif kind == "flight":
        if not all((baseline_y - f["bottom"]) >= AIRBORNE_MIN_PX for f in feet):
            ok = False
            notes.append("both shoes must clear the master baseline by >= %dpx" % AIRBORNE_MIN_PX)
    if ok and not notes:
        notes.append("phase landmarks satisfied")
    return ok, notes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*")
    ap.add_argument("--json")
    ap.add_argument("--normalize")
    args = ap.parse_args()

    paths = args.paths or sorted(
        os.path.join(CANDIDATE_DIR, f)
        for f in os.listdir(CANDIDATE_DIR)
        if f.endswith(".png")
    )

    mrec = analyze(MASTER, None)
    baseline_y = mrec["silhouette_bbox"][3]
    print(f"master baseline y = {baseline_y}, key hue = {mrec['key_hue']}")

    recs = []
    for p in paths:
        r = analyze(p, baseline_y)
        if r is None:
            print(f"!! no subject found in {p}")
            continue
        key = os.path.basename(p)[:3]
        ok, notes = phase_check(key, r, baseline_y)
        r["phase_ok"] = ok
        r["phase_notes"] = notes
        r["frame_ok"] = all(v >= MARGIN_MIN_PX for v in r["margins"].values())
        r["key_ok"] = r["island_blob_max"] <= 150
        recs.append(r)

    # pairwise IoU
    ious = {}
    for i in range(len(recs)):
        for j in range(i + 1, len(recs)):
            a, b = recs[i], recs[j]
            if a["sil_mask"].shape != b["sil_mask"].shape:
                continue
            inter = (a["sil_mask"] & b["sil_mask"]).sum()
            union = (a["sil_mask"] | b["sil_mask"]).sum()
            iou = float(inter) / float(union) if union else 0.0
            ious[(os.path.basename(a["path"]), os.path.basename(b["path"]))] = round(iou, 3)

    print(f"\n{'file':46} {'phase':5} {'key':4} {'frame':5} shade_px blob  feet(bottom-y, cx)")
    for r in recs:
        f = os.path.basename(r["path"])
        feet = " ".join(f"(y{ft['bottom']},x{ft['cx']:.0f},w{ft['contact_width']})" for ft in r["feet"])
        print(
            f"{f:46} {'PASS' if r['phase_ok'] else 'FAIL':5} "
            f"{'ok' if r['key_ok'] else 'NO':4} "
            f"{'ok' if r['frame_ok'] else 'NO':5} "
            f"{r['shade_px']:8d} {r['shade_blob']:5d}  {feet}"
        )
        for n in r["phase_notes"]:
            print(f"{'':46}   - {n}")

    print("\nhighest silhouette IoU pairs:")
    for (a, b), v in sorted(ious.items(), key=lambda kv: -kv[1])[:14]:
        flag = " DUP!" if v >= DUP_IOU else ""
        print(f"  {v:.3f}  {a} ~ {b}{flag}")

    if args.normalize:
        os.makedirs(args.normalize, exist_ok=True)
        for r in recs:
            img = load_rgb(r["path"])
            out = img.copy()
            out[r["bg_family"]] = r["key_color"]
            Image.fromarray((out * 255).astype(np.uint8)).save(
                os.path.join(args.normalize, os.path.basename(r["path"]))
            )
        print(f"\nnormalized plates -> {args.normalize}")

    if args.json:
        slim = []
        for r in recs:
            r2 = {k: v for k, v in r.items() if k not in ("sil_mask", "bg_family", "key_color")}
            slim.append(r2)
        with open(args.json, "w") as f:
            json.dump(
                dict(baseline_y=baseline_y, records=slim,
                     iou={f"{a}|{b}": v for (a, b), v in ious.items()}),
                f, indent=1)
        print(f"json -> {args.json}")


if __name__ == "__main__":
    main()
