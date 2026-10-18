# Branch Assessment — PR `#1` & PR `#8` (`#branch-assessment`)

- **Repository:** `wshyang/super-duper-funicular`
- **Assessing Branch:** `arena/62955c1e-super-duper-funicular`
- **Date:** `2026-10-18`
- **Method:** reference branches fetched as detached working directories **outside** the repository (`/home/user/workdirs/pr1`, `/home/user/workdirs/pr8`); source read, binaries viewed with the multimodal reader, GitHub metadata via `gh`. No sibling branch was ever checked out inside the repository and the active session branch was never switched (`CLAUDE.md` Rule 3).
- **Downstream:** findings feed [`docs/PIPELINE_REVISION_PROPOSAL.md`](./PIPELINE_REVISION_PROPOSAL.md) (`#revised-pipeline`)

---

## 1. Observed vs Reviewed SHA Registry

| Branch | PR | Title | Latest Observed Tip (`git ls-remote`, `2026-10-18`) | Reviewed SHA (fetched into workdir) | Working Directory |
|---|---|---|---|---|---|
| `arena/917ef347-super-duper-funicular` | `#1` | feat: Sprite Motion Lab — 17-Part Biomechanical & Photorealistic Running Engine, Rounded Joint Cutter, SVG Vectorizer & FDS Prompt Audit Log | `936f37ce07f18e38fc4f5b3880c80029ec9f55cf` | `936f37ce07f18e38fc4f5b3880c80029ec9f55cf` | `/home/user/workdirs/pr1` |
| `arena/e1300d3c-super-duper-funicular` | `#8` | Rebuild Athletic assets and add five-persona gait audit | `04d5caf432ff81be0307a3ec79e894da1b60045c` | `04d5caf432ff81be0307a3ec79e894da1b60045c` | `/home/user/workdirs/pr8` |

Observed = remote tip at fetch time; reviewed = the exact commit whose tree was read and viewed. Both coincide here. PR `#1` reports `+33,978 / −0` over 758 files; PR `#8` reports `+30,675 / −0` over 710 files; both are additive against `main` (`396ce25`, a single defective sprite sheet).

## 2. What Each Branch Is Attempting

### 2.1 PR `#1` — "Sprite Motion Lab"

Builds the complete engine: dedupe/catalogue of the defective reference sheet, magenta chroma-key extraction with quantitative flaw proof (`FLAW-01..05`: 94.7% half-cycle IoU duplication, unilateral lead-leg lock, zero crossover, 20–25 px baseline jitter), a 17-part articulated biomechanical rig (cervical neck, ponytail secondary motion, 14° forward fall, 2-segment plantar roll), pluggable personas (2 procedural + 3 photographic Singaporean-Chinese female builds), the rounded-end joint cutter with end-cap composites, a raster→SVG vectorizer + hierarchical SVG stitcher, a headless 16-phase audit dumper with an agent skill, and — distinctively — a **forensic documentation layer**: verbatim log of all 72 image-generation calls with regeneration justifications (`FDS §9`), a distilled mistake catalogue (`IMG-ERR-01..16`, `PIPE-ERR-01..08`), a 9-defect rectification plan, and a mechanical GREENFIELD discipline gate.

### 2.2 PR `#8` — "Rebuild Athletic assets + five-persona gait audit"

Same harmonised studio, different centre of gravity: it **re-ran the athletic persona's studio assets from scratch** (`c5df4e7`, `athletic-rebuilt-extractor.ts`, extracting neck/torso/pelvis/limbs from a rebuilt plate set), then iterated four consecutive user-reported visual regressions (low bust → unchanged bust → stale browser cache → collarbone flesh bulb, `TURN-L18..L21`/`ADD-035..038`), and generalised the audit to a **five-persona batch** (`all-personas`, `multi-persona-audit-summary.json`). It also introduced `photoreal-build-tier.ts` (petite/athletic/average tier resolution).

### 2.3 Convergence reality

The two branches are ~95% the same tree: `diff -rq` over 758/710 paths yields **279 differing paths**, of which ~235 are binary sprite/frame PNGs and ~20 are documentation ledgers. Code-level divergence is small: PR `#8` uniquely adds `athletic-rebuilt-extractor.ts` + `photoreal-build-tier.ts`; PR `#1` uniquely ships SVG parts/frames for the `average` and `petite` personas. Each branch mirrors the other's learnings (PR `#1` `ADD-039..041` ingest PR `#8`; PR `#8` `ADD-039` ingests PR `#1`). They are two experiments sharing one design, not two designs.

## 3. Strengths (Verified)

| # | Strength | Where | Provenance |
|---|---|---|---|
| 1 | Quantitative diagnosis before rebuild: the flaw analyser *proved* the reference sheet unusable (IoU/dHash/baseline tables) instead of asserting it | `src/pipeline/flaw-analyzer.ts`, `docs/SPRITE_ANIMATION_FLAW_ANALYSIS.md` | read code + read doc |
| 2 | Anatomically literate decomposition: medial-vs-lateral optical asymmetry and the hanging-arm thumb paradox are reasoned from first principles and the `90°` L-bend chirality lock is genuinely clever | PR `#1` `FDS §8.1–8.3` | read doc |
| 3 | Pivot-centred semicircular caps + internal shaft blend + additive end-cap composites: the only rotation-invariant 2D joint treatment in any branch | `rounded-joint-cutter.ts` | read code |
| 4 | Audit instrumentation: 16-phase 3-panel plates, 2× joint crops, connected-component/spill/coverage telemetry, all-personas batch | `cycle-frame-dumper.ts`, `.claude/skills/audit-gait-cycle/SKILL.md` | read code |
| 5 | Epistemic hygiene: 4-way provenance separation, observed-vs-reviewed SHAs, failed-experiments register, mechanical discipline gate (≤ 50 LOC functions, ≤ 800 LOC files, `data-testid`) | `CLAUDE-validation.md`, `greenfield-gate.test.ts` | read code + executed equivalent checks here |
| 6 | Honesty about the 2D limit: PR `#8` `VALIDATION.md §3.2` states plainly that planar warping of studio photos approximates 3D skin/fabric deformation at extreme flexion | PR `#8` `docs/VALIDATION.md` | read doc |

## 4. Defects & Risks (This Branch's Own Observations)

1. **The rendered result still reads as a photo puppet.** Personally viewed `public/sprites/algorithmic/photo-sg-chinese-female/red/frame-01/04/05.png` on PR `#1`: near/far shoes differ in apparent scale and read as oversized white blobs; the mid-stance frame (`frame-04`) shows both legs scissored nearly straight — a walking stride, not running; forearms are thin against thick thighs. Telemetry on these frames is clean (`0 islands / 0 spill`), which is exactly the F7 gap: the gates pass while the picture does not.
2. **PR `#8`'s athletic rebuild is visibly worse than PR `#1`'s cutouts.** Personally viewed PR `#8` `frame-01`: a spike/notch at the collar–shoulder junction, a diagonal neck seam, an oversized support shoe sitting low (matches its own reported `+6 px` ground penetration), and a torso with mismatched panel lighting. PR `#1`'s own audit (`FDS §9.9`, `PIPE-ERR-08`) reaches the same conclusion; PR `#8` nonetheless keeps the rebuilt extractor in-tree.
3. **The extraction layer is a lattice of magic numbers.** Crop boxes, `srcStart/srcEnd` pairs, `y = 18..66`, `x = 58..114`, `shadeScale = 1.08`, bust lift `y = 67 → 57`, chest reduction `22%`: each is a correct fix for one observed frame and a latent break for the next persona (PR `#8`'s four-turn regression chain is the proof).
4. **Garments are duplicated across rotating parts and then suppressed.** The white shorts stripe exists on both `pelvis` and `nearThigh` and is painted out by rects; the fix is tier-conditional and re-broke per tier (`DEFECT-08`).
5. **Lighting is baked per plate.** Rotating a limb rotates its frozen highlight; the branches patch this with per-part shade factors and rear-swing tucks that alter *motion* to hide *texture* defects (`DEFECT-04`).
6. **Evidence evaporates.** All audit plates live in `/tmp` by policy; only prose survives in Git, so no finding here can be re-verified without re-running a pipeline this branch does not have.
7. **Process overhead exceeds pipeline progress.** On PR `#1`, 6 of the last 8 commits are ledger/FDS refreshes; the FDS is 250 KB with a 72-entry prompt log in prose. The discipline that was meant to prevent drift has itself become the largest artifact.

## 5. Recommendation

1. **Freeze PR `#1` and PR `#8` as read-only references** (answer pending to `PIPELINE_REVISION_PROPOSAL.md §9.5`); their cutouts, cutter, rig and audit tooling are the asset base, their extraction magic numbers are not.
2. **Adopt from PR `#1`:** part decomposition, cutter, IK/foot-roll, SVG stitch math, prompt-log discipline, mistake catalogues. **Adopt from PR `#8`:** five-persona batch audit, build-tier keying, and the candid validation caveats.
3. **Build the revised pipeline here** per `docs/PIPELINE_REVISION_PROPOSAL.md`, starting with the ground-truth harness (Sprint 1) and the relight MVP on existing assets (Sprint 2).

## 6. Provenance Statement (4-Way Separation, `CLAUDE-validation.md §8.1`)

1. **Read source code:** full `src/`, `scripts/`, `docs/` trees of both workdirs; diffs computed with `diff -rq`.
2. **Personally viewed visual output:** `main` defective sheet; PR `#1` `frame-01/04/05` (photoreal athletic red), PR `#1` `01-master-lateral-profile-reference.png`, PR `#1` `parts/torso.png`; PR `#8` `frame-01`.
3. **Locally executed validation gates (this branch):** see `docs/VALIDATION.md`.
4. **Other branches' reported results (not claimed as executed here):** PR `#1` `47/47` Vitest, PR `#8` `47/47` Vitest + five-persona audit tables and ground-delta ranges; both are quoted as external reports only.
