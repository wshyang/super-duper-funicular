# Live N-Way Comparison & Feature-Parity Ledger

> **Status:** LIVE. Updated every comparative/implementation turn per
> `CLAUDE.md` §3 rules 2–3. **Final goal: feature parity across all n branches**,
> preserving local strengths. Hash/file presence ≠ parity: a capability is parity
> only when its behavioural acceptance **and** relevant visual review pass.
> "Live" implies no background polling and no auto-merge.
> **Refresh:** `npm run branches:compare` (fetches exact refs, rewrites §1's
> marked region, appends `docs/BRANCH-HISTORY.json`), then inspect changed tips
> in detached temp checkouts — never switch the session branch, never edit
> another branch. After pushing this branch, re-run: a committed doc cannot
> embed its own future hash.

## 1. Latest observed tips

<!-- branch-tips:start -->
Observed (UTC): 2026-10-18T00:04:17Z via `npm run branches:compare` (git fetch of exact refs).

| # | Branch | PR | Full SHA | Commit time | Subject |
|---|---|---|---|---|---|
| 0 | `main` | — | `396ce256debcb5bdc2419cc0f3f399730b61ab36` | 2026-10-17T13:53:48+08:00 | Add files via upload |
| 1 | `arena/917ef347-super-duper-funicular` | #1 OPEN | `e172b0f1f8d9b640b65a4ba420f71965693adb23` | 2026-10-17T23:09:40+00:00 | docs(three-way-comparison): compare and sync FDS & coding discipline across all 3 branches (CROSS-10..12, ADD-023) |
| 2 | `arena/263385da-super-duper-funicular` | #2 OPEN | `b227e2fe562be341f15f58955f539d325170729e` | 2026-10-17T21:55:19+00:00 | Build Stride Lab motion workbench with photographic rig and cycle audits |
| 3 | `arena/77ffb088-super-duper-funicular` | #3 OPEN | `43352cf3fe8cb6c486aa79a59954d5972a5e13ac` | 2026-10-17T23:05:53+00:00 | Track live three-way feature parity and adopt multi-background photo audits |
| 4 | `arena/ce6d2a6e-super-duper-funicular` | none | `bab689cdac3ba730138bfae09dda537978d61e09` | 2026-10-17T06:27:14+00:00 | Adopt GREENFIELD discipline; extract running sprites; procedural runner app |
| 5 | `arena/64422739-super-duper-funicular` | #4 OPEN | `1a815d502f87cc88c5ded7ccd41f454c72a31b38` | 2026-10-17T23:13:29+00:00 | docs(ledger): record first-pushed SHA 2dd05fa per post-push refresh rule |
| 6 | `arena/8dcf54e8-super-duper-funicular` | this PR | `3708af7c59a41f6dd1059dc921a794106fa0c34d` | 2026-10-18T00:04:07+00:00 | Stage 1+2: harmonised greenfield discipline, live n-way ledger, FDS/addenda, procedural runner engine + forensics + workbench |
<!-- branch-tips:end -->

Row roles (reviewed 2026-10-17, detached extracts at `/tmp/branches/*`):

| # | Branch | PR | Role / character |
|---|---|---|---|
| 0 | `main` | — | base: only the flawed source JPEG |
| 1 | `arena/917ef347-super-duper-funicular` | #1 OPEN | Sprite Motion Lab: 17-part rig, photoreal persona, rounded joint cutter, raster→SVG vectorizer, prompt audit log, greenfield-gate test |
| 2 | `arena/263385da-super-duper-funicular` | #2 OPEN | Stride Lab: motion families, workbench UX, photographic persona, hip/end cutters, Playwright e2e, audit skill |
| 3 | `arena/77ffb088-super-duper-funicular` | #3 OPEN | Procedural Runner: domain-grouped `lib/`, arc end-caps, photo rig + mattes, self-refreshing 3-way ledger, 177 tests |
| 4 | `arena/ce6d2a6e-super-duper-funicular` | none | smallest clean greenfield split, co-located tests, manifest pivots |
| 5 | `arena/64422739-super-duper-funicular` | #4 OPEN | earlier harmonisation attempt: n-way ledger incl. main, merged CLAUDE, dependency-free procedural core |
| 6 | `arena/8dcf54e8-super-duper-funicular` | this PR | **this branch** — harmonised synthesis: ledger owns 7 rows, pure-TS raster painter, extraction + flaw forensics + audit sheets + SVG stitcher + workbench |

## 2. How the branches progress relative to each other

All implementations branch independently from the same 1-image `main`; none is
merged. Observed dynamics (append corrections, never rewrite):

- **2026-10-17:** #1 and #3 built 3-way ledgers first and converged on the
  continuous-learning + parity discipline independently; #3's refresher is the
  best-engineered (snapshot + append-only history + marked region) and is the
  design this ledger extends to 7 rows. #2 kept the tightest scope with the
  strongest browser e2e and the only motion families. #4 founded the n-way
  (main-inclusive) ledger idea but shipped a thin core (10 code files) with
  extraction/photo/SVG deferred. ce6d2a6e stopped after a clean extraction +
  small React app (1 commit, no PR).
- **Risk tracked:** five incompatible coordinate/asset models. Parity is
  therefore defined behaviourally in §3, and adoptions re-derive constants from
  measured evidence (CROSS-014), never file-copy rigs.
- **Convergence signals:** 4 of 6 branches now mandate per-turn learning logs;
  3 of 6 carry a branch ledger; 3 of 6 carry inert SHIP-HATS. This branch adopts
  all three practices and records the laggard rows honestly.

## 3. Feature-parity matrix

● present+evidenced · ◐ partial · ○ absent — as inspected 2026-10-17 from
`/tmp/branches/*` (read code) plus each branch's own validation docs (reported).
"Our" column becomes ● only with executed evidence named in `docs/VALIDATION.md`.

| Capability | #1 | #2 | #3 | ce6 | #4 | ours | Parity exit criterion |
|---|---|---|---|---|---|---|---|
| Greenfield split CLAUDE-*.md + upstream verbatim + pinned SHA | ● | ◐ | ● | ● | ● | ● | discipline test asserts SHA + section files |
| Living FDS + sequential ADDENDA, same-change | ● | ● | ● | ● | ● | ● | entries cite anchors/SHAs |
| Continuous per-turn learning log | ● | ● | ● | ○ | ● | ● | entry every turn, incl. no-code turns |
| Live ledger + refresher (n-way, main-inclusive) | ◐(3) | ○ | ◐(3) | ○ | ●(6) | ●(7) | `branches:compare` exit 0, history append-only |
| 2-bone IK + gait + foot roll | ● | ● | ● | ● | ● | ◐ | unit tests over UI range + filmstrip visual pass |
| Articulated rig ≥17 parts | ●(17) | ◐ | ● | ◐ | ◐ | ◐(17) | joint-seam visual audit inspected |
| Procedural personas/skins | ● | ● | ● | ◐ | ● | ◐(2) | persona-switch test + renders |
| Motion families (run/walk/brisk) | ◐ | ● | ◐ | ○ | ◐(run/walk) | ◐ | support-state tests + per-motion audit |
| Sheet extraction on real JPEG (grid/chroma/dedupe/registration) | ● | ● | ● | ● | ○ | ● | byte-reproducible manifest, 48 frames |
| Flaw forensics FLAW-01..05 | ● | ◐ | ● | ● | ○ | ● | metrics on real sheet match published ranges |
| Pure-TS raster painter shared by tests/exports/app | ○ | ○ | ◐(napi) | ○ | ○ | ● | pixel assertions + canvas parity test |
| Photo rig (far limbs, end caps, hip cut) | ● | ● | ● | ○ | ○ | ○ | CROSS-011 exit criteria |
| SVG output | ● | ○ | ● | ○ | ○ | ◐ | CROSS-012 + stitched frames inspected |
| Full-cycle audit sheets (16-phase light/dark/joint) | ● | ● | ● | ◐ | ○ | ● | sheet opened via read_file, findings logged |
| Workbench UI (controls/filmstrip/library/export) | ● | ● | ● | ● | ◐ | ◐ | data-testid gate + HTTP smoke |
| Tests (unit files / browser e2e) | 4 / ○ | 13 / ●(Playwright) | 14 / ○ | ~10 / ○ | 1 / ○ | 11 / ○(ADD-006) | `npm run validate` green |
| Docker contract + inert SHIP-HATS + dev.sh | ● | ● | ● | ◐ | ◐ | ● | discipline tests; container build N/A in sandbox |

## 4. Adoption queue (owner: this branch; status per turn)

| # | Item | Source | Status | Exit criterion |
|---|---|---|---|---|
| Q1 | photo personas + rig | #1/#2/#3 | deferred (CROSS-011) | 4 criteria in ADDENDA |
| Q2 | browser e2e | #2 | deferred (CROSS-013/ADD-006) | installable Chromium |
| Q3 | raster→SVG photo vectorizer | #1 | deferred (CROSS-012) | synthetic-disc tracer test |
| Q4 | hip/end-cut calibration inspectors | #2/#3 | deferred | inspector UI + before/after crops |
| Q5 | walking duty remap review vs #1 late addition | #1 | adopted via ADD-008 | support-state tests |
| Q6 | `photo:audit`-style multi-persona audit CLI | #3 | adopted as `runner:audit` | ADD-010 |

## 5. Progress log (append-only)

- **2026-10-17 (TURN-L01):** ledger founded with 7 rows (main-inclusive, first
  among siblings). Stage-1 specs committed (GREENFIELD verbatim, merged CLAUDE,
  FDS anchors, ADD-001..010, CROSS-001..014). Next: Stage-2 implementation, then
  refresh §1 after first push.
- **2026-10-17 (TURN-L02):** Stage-2 landed on this branch: extraction +
  forensics + procedural engine (run/walk/brisk) + raster painter + workbench +
  audit sheets + SVG stitcher; 66 tests green; VA-01/VA-02 visual findings
  recorded and four renderer defects fixed. Our column advanced 5 rows
  (extraction, flaws, raster, audit, docker) — parity gaps now: photo rig (Q1),
  e2e (Q2), contour SVG (Q3), cut calibration (Q4), workbench browser sign-off.
  Sibling tips unchanged since TURN-L01 refresh (no peer pushed mid-turn).
