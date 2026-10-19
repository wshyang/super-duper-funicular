# Examples — Before / After

## Example 1 — H03 Generic Collapse → H07 Grounded Toe-Off Success

**Before (PR #8 H03 #76 / #82):** Prompt said “Right Pass / heel-off-and-toe-roll … heel clearly lifted … forward leg swings forward”. Output became generic high-knee sprint: forward knee high, rear leg stretched far back, torso 3/4, ground shadow. Status `rejected` (AC-03.1 fail).

**Skill intervention (Section 5):**
1. Create custom compact guide: `stride 0.62, kneeDrive 0.68` (H03-v2) → inter-foot 220–280 px not 400+ px.
2. De-sprinted wording: “biomechanics forefoot pressure study … only forefoot ball+toes touch line, heel 12–15 mm lifted, shin 102°, knee 135°”.
3. Generate via `generate_image` with `[master, H03-v2 guide]` + `assets/prompt-template-H03.txt`.

**After (V2 #94 H07-v2):** Output showed left forefoot ball/toes on line, heel 12 mm lifted, right high-knee airborne with vertical shin, 260 px span, flat magenta, both sky-blue wristbands. Status `conditional acceptance` — first true toe-off in bank. Validated via `read_file` + `background-validator`.

**Lesson:** Changing guide geometry (compact span) succeeds where adding adjectives fails — see `references/guide-generator-usage.md`.

---

## Example 2 — Forearm Cluster → 3-Distinct Angles

**Before (PR #8 H01–H08):** All camera-far arms clustered near torso, little forearm visible (aggregate `arms` scoring hid problem).

**Skill intervention:**
- Split visibility to `nearForearm`/`farForearm`
- Create X05 −41.4° forward/up, X06 149.5° rear/down, X07 +20° low-forward via `create-compact-guides.ts`
- Prompts require “>8 px magenta gap outside torso”

**After:** X05 exposed forward forearm + cuff + hand beyond torso; X06 behind hip with gap; X07 low-forward. All 5/5 new frames kept both wristbands sky-blue (vs PR #8 1/5 drift). Validated via 2× crop.

---

## Example 3 — Ground-Shadow Prior Broken

**Before:** Every PR #8 contact frame had “conspicuous floor shadow” despite “no visible floor” negatives.

**Skill intervention:** Positive grounding: “shoes hover 3 mm above dashed line; pure magenta fills 100% inter-leg/under-sole”. Validator calibrated to master magenta 249,48,229 ±18.

**After:** V2 5/5 new frames visually flat magenta (PR #8 0/8). Measured via `scripts/validate-candidates.ts`.

