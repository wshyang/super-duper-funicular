# Plan — investigation queue and failed experiments

Live priorities. Completed items leave this file only when their outcome is recorded in
`docs/FDS.md` and the parity ledger.

## 1. Now

| Priority | Item | Evidence that opened it | Exit |
| --- | --- | --- | --- |
| P0 | Far arm crosses the torso silhouette at φ≈0.55–0.75 | viewed audit sheet | 16-phase sheet where the near chain reads in front at every phase |
| P0 | ~~Shoe overlaps the near shin at max dorsiflexion~~ **fixed this turn** | viewed audit sheet | sock capsule covers the junction; shoe radii reduced; verified at φ 0.15–0.40 |
| P1 | Ponytail reads as one blob at high cadence | viewed audit sheet | three distinguishable segments with measurable lag |
| P1 | Browser verification story | no browser runtime in sandbox | Playwright suite + config committed (video on); **unrun** — browser download blocked |
| P0 | ~~Black preview page~~ | viewed by the user in the live preview | **Fixed**: rgba-safe colour parser + jsdom canvas-mock mount test |

## 2. Next (parity queue)

- Photographic persona with a matte pipeline (`Gap` → `Partial`).
- ~~Raster→SVG colour-band vectoriser~~ — closed in T03 (`npm run vectors:build`, mean IoU 0.926).
- ~~Interactive joint calibration with registered PNG/JSON export~~ — closed in T04 (six clamped offsets, JSON + PNG).

## 3. Later

- Canonical capsule resampling for rounding at jaw, shoulder, hip, ankle and toe.
- Metric harmonisation with siblings so their numbers and ours are computed with the same width
  definition and alpha threshold before anyone compares them.

## 4. Failed experiments and rejected ideas (register)

Rejected ideas are evidence; without this register they get retried every few weeks.

| # | Attempt | Measurement | Verdict |
| --- | --- | --- | --- |
| F-01 | Global magenta threshold instead of a border-seeded flood fill | purple jersey lost hundreds of opaque pixels per frame | **rejected** — replaced by border seeding (`ADD-005`) |
| F-02 | Hard-coded 8×6 grid with a 132 px header | detected a 32×6 grid of 79×262 cells on the real sheet | **rejected** — replaced by pixel-derived detection (`ADD-003`) |
| F-03 | 240×300 canvas | figure clipped at full extension; drawn at 78 % height | **rejected** — canvas is now 260×340 (`ADD-008`) |
| F-04 | Hip height from maximum leg extension | both knees locked straight through stance; read as stilts | **rejected** — 0.97 standing factor (`ADD-009`) |
| F-05 | Ankle-first foot placement | toe punched 4–6 px through the ground at 30° toe-off | **rejected** — sole-first placement (`ADD-010`) |
| F-06 | `circlePolygon` outline via centroid expansion | outlines drifted on concave shapes and on capsules | **rejected** — geometric stroke expansion per primitive kind |
| F-07 | 24 px minimum row-band height for grid detection | the real header band (129 px tall, partial text) passed the filter and was counted as a row | **rejected** — tallest-band-relative filter (`ADD-003`) |
| F-08 | Copying a sibling's walking contact knots into our coordinate model | leg lengths no longer preserved during stance | **rejected** — duty-cycle derivation instead (`ADD-011`) |
| F-09 | Rendering the whole scene per part for the inspector | 17 full renders per frame; playback stuttered | **rejected** — filter the shared scene by part id |

## 5. Standing rules for this file

- Every entry names the measurement, not just the opinion.
- A "later" item that survives three turns without progress is either scheduled or deleted.
- Nothing is claimed as done here; done is recorded in `docs/FDS.md` with its validation.
