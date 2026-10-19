# Reference: Core Objective Distilled

Source: `docs/CORE_OBJECTIVE_AND_ITEMS.md` Section 1 — see full document for provenance.

## One-sentence objective

> **Replace the flawed reference sprite sheet with a deterministic, extractable, photoreal running-motion bank that provides more — and more diverse — limb material for 17-part articulated sprite capture, such that every limb can be harvested at multiple angles with clean chroma-key edges and without animation flicker.**

## Decomposed meaning

The flawed sheet `incorrect running sprites.jpeg` (2528×1696, 6×8) fails:

- **FLAW-01:** Only 4 unique poses doubled to 8 — 94.7% half-cycle IoU, 0–4 bit dHash
- **FLAW-02:** Unilateral lead-leg lock (+53 px offset, zero crossover)
- **FLAW-03:** 147 px minimum foot gap, no crossover
- **FLAW-04/05:** 20–25 px baseline/scale jitter

**Previous attempts:**

- **PR #1 (phase harvester):** Whole-body keyframes from one master + one guide → spatio-temporal harvest. 35 jigs @ 0.991/0.845, zero defects, but needed minimal outfit (sports bra + bikini brief) for full thigh exposure.
- **PR #8 (pose bank):** H01–H08 + X01–X06 in production outfit via 1408×768 skeleton guides. 0/8 accepted (H03/H06/H07 collapse), 5 conditional, proved forearm isolation needs custom guides.

**Success = bank (≥8 canonical + ≥3 inserts, ≥11 total) where:**
1. Identity locked to `src/images/photoreal-female/01-master-lateral-profile-reference.png` (SHA `143b4521…`)
2. Every limb has ≥2 isolatable angles (thigh horiz/vert/curl, forearm forward/up vs rear/down vs low-forward, foot strike→toe-off→dorsiflex)
3. Every frame has flat magenta with crisp shoe edges
4. Every generation is logged and audit-gated (`dump-cycle` 0 islands/spill/uncovered, `harvest-phases` ≥0.985)

