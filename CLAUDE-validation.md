# CLAUDE-validation.md — Honest Validation, 4-Way Provenance & Reproducible Local Dev (§8–§10)

Adopted from `wshyang/greenfield` `GREENFIELD.md §8–§9` and harmonised across all $N$ branches of `wshyang/super-duper-funicular`.

## 8. Validate Early and Honestly

- Always run and report the exact validation layers executed (`npm run validate`):
  1. `npm run branches:compare` (`tsx scripts/compare-branches.ts` — refreshes `docs/BRANCH-TIPS.json`, `docs/BRANCH-HISTORY.json`, and `<!-- branch-tips:start -->` tables)
  2. `npm run typecheck` (`tsc --noEmit`)
  3. `npm run pipeline` (`dedupe`, `extract`, `analyze`, `generate-sheets`)
  4. `npm test` (`vitest run` — real image assets, real solver, real discipline gates)
  5. `npm run build` (`tsc -b && vite build`)
  6. `npm run dump-cycle` (Full-Cycle 16-Frame Temporary Screenshot Dumper & Multimodal Visual Defect Audit Skill — `.claude/skills/audit-gait-cycle/SKILL.md`)
  7. Live server verification on `0.0.0.0:3000`.
- Document any sandbox environment caveats (such as external network restrictions or container/CI runtime unavailability) explicitly in commit messages, `docs/VALIDATION.md`, and `docs/ADDENDA.md`.

### 8.1 Naming the Validation Layer & 4-Way Provenance Separation (Harmonised Across All $N$ Branches)

Say **exactly** what ran, and strictly separate **four provenance categories**:
1. **Read source code** (e.g., detached `/tmp/branch-*` reference checkouts).
2. **Personally viewed visual output** (e.g., `/tmp/gait-cycle-audit/contact-sheet-16frame.png` and `joint-crops-sheet.png` opened via `read_file`).
3. **Locally executed validation gates** (commands actually run in `/home/user/super-duper-funicular` during the turn).
4. **Other branches' reported results** (never claim another branch's test or E2E count as locally executed unless run here).

| Validation Claim | Exact Meaning in This Repository |
|---|---|
| `"branch hashes refreshed"` | `npm run branches:compare` fetched all 5 branch heads from `origin` and updated `docs/BRANCH-TIPS.json`, `docs/BRANCH-HISTORY.json`, and `docs/N_WAY_COMPARISON.md` |
| `"typecheck clean"` | `npm run typecheck` (`tsc --noEmit`) exited `0` |
| `"N/N Vitest tests pass"` | `npm test` (`vitest run`) exited `0` across all suites (`pipeline`, `runner`, `greenfield-gate`, `studio-view-model`) |
| `"pipeline & dedupe clean"` | `npm run dedupe && npm run generate-sheets` decoded real JPEG/PNGs and regenerated `/public/sprites/**` and `docs/artwork-inventory.json` |
| `"16-phase cycle dump & visual audit inspected"` | `npm run dump-cycle` wrote 16 frames + 3-panel plates + `contact-sheet-16frame.png` + `joint-crops-sheet.png` + `audit-report.json`, and sheets were visually inspected via `read_file` |
| `"production build clean"` | `npm run build` (`tsc -b && vite build`) produced `dist/` |
| `"live dev server listening"` | `start_process` (`npm run dev`) bound `0.0.0.0:3000` |
| `"container / CI starter verified"` | Static contract verified in `greenfield-gate.test.ts` and `activate-shiphats.sh` scratch test; Docker daemon build, `cloudflared` tunnel, and remote SHIP-HATS GitLab runners are **not** executed in the sandbox |

## 9. Full-Cycle Temporary Frame Dump & Agent Visual Audit Skill (`audit-gait-cycle`)

- Whenever articulated cutouts, rounded-joint cutters, or bone/foot warpers are changed, execute the **`audit-gait-cycle` Agent Skill** (`.claude/skills/audit-gait-cycle/SKILL.md`):
  1. Run `npm run dump-cycle -- /tmp/gait-cycle-audit 16 photo-sg-chinese-female red` (and for each active persona such as `photo-sg-chinese-female-average`) to dump 16 full-cycle raw frames, 16 three-panel diagnostic plates (`frames/audit-frame-XX-deg-YYY.png`), `contact-sheet-16frame.png`, `joint-crops-sheet.png`, and `audit-report.json` into `/tmp/gait-cycle-audit`.
  2. Visually inspect the generated sheets and extreme-pose frames with `read_file` to identify joint-step notches, garment-boundary gaps, ankle/shoe shear, or chroma spill, and record findings + rectification proposals in `docs/FDS.md` (`#gait-cycle-visual-audit`).

### 9.2 Mandatory Post-Generation Asset Examination & Refinement Gate

- **Every generated image asset (`src/images/...`) and extracted part cutout (`public/sprites/photoreal/.../parts/*.png`) MUST be visually examined via `read_file` immediately after generation/extraction and refined if not up to standard:**
  1. **Raw Studio Plate Inspection (`read_file` on `src/images/photoreal-*/01..10.png`):**
     - Verify single-subject framing on solid `#FF00FF` magenta background (reject multi-figure turnaround sheets).
     - Verify gender and anatomical fidelity (reject hypertrophied/vascular male bodybuilder arms or bulky male fists on female personas; require smooth feminine arms, slender/soft wrists, and natural hands).
     - Verify persona-specific body-type differentiation (for `photo-sg-chinese-female-average`, verify fuller cervical neck `04`, fuller bust/ribcage/waist `05`, fuller hips/shorts `06`, softer fuller arms `07`/`08`, and fuller thighs/calves `09`/`10` — never accept a slim mannequin torso or slim neck copied from `photo-sg-chinese-female`).
     - Verify clean anatomical surfaces (no recessed plastic mannequin arm-socket holes on `05`, no cropped chin/lips on `04`, no brown skin patches on white socks on `09`/`10`).
  2. **Extracted `160×160` Part Cutout & Skeletal Proportion Inspection (`read_file` on `public/sprites/photoreal/.../parts/*.png` & `contact-sheet-16frame.png`):**
     - Verify that `photoreal-extractor.ts` crop boxes and destination radii (`cutArticulatedLimbWithRoundedEnds`, `applyPivotArcRoundedCut`) preserve each persona's fuller or leaner silhouette without clipping shoulder tops, shorts cuffs, or fingertips.
     - Verify no unnatural stubby "T-rex arms"; compare each photoreal persona's neutral upright stitched silhouette against its own source master using segment length and width as percentages of total standing height. Preserve the generic rig's ratio unless intentionally changed; photo defaults must be justified by that persona's measured source profile, with visual inspection and tunable length/width values.
  3. **Immediate Refinement / Regeneration Loop:** Any asset or cutout that fails visual inspection must be regenerated (`generate_image` with an updated prompt + logged **Regeneration Justification** in `docs/FDS.md#image-prompt-log`) or refined in `src/pipeline/photoreal-extractor.ts` / `src/pipeline/side-profile-arm-extractor.ts` and re-verified with `read_file` before completion.

## 10. Reproducible Local Dev & Environment Story

- `./dev.sh` provides a single Bash 3.2-compatible command to verify dependencies, run the sprite extraction & algorithmic generation pipeline, execute the test suite, and start the development server on `0.0.0.0:3000`.
- `.env.example` and `.env.test` document configuration defaults cleanly separated from uncommitted `.env` files.
