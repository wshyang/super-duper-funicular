# Addenda register

Decisions that are not dictated by the request or by GREENFIELD. Numbered sequentially, never renumbered.
Each entry states what was decided, why, the area it belongs to, and what a future reader must know.

Deliverable codes used below:

| Code | User request |
| --- | --- |
| D1 | Dedupe the art so every file is unique |
| D2 | File the art into `/src/images` with meaningful names |
| D3 | Extract the many small pieces into a public URL path |
| D4 | Assess the flaw in the running animation |
| D5 | Generate the body, torso, limbs and articulating parts algorithmically |
| D6 | TypeScript web app showing the generated running motion |

---

## ADD-001: Adopt GREENFIELD as the coding discipline

- **Decided:** `wshyang/greenfield` at commit `8ba74027be5fad41e48cadde82cc0120d628b109` is copied
  verbatim to `docs/greenfield/GREENFIELD.md` and adopted. It is split into `CLAUDE.md` (index) plus
  `CLAUDE-*.md` section files, with project-specific answers in the index.
- **Why:** the user asked for it; the upstream file is 479 lines, past GREENFIELD's own split threshold.
- **Area:** all.
- **Impact:** read `CLAUDE.md` first. Every later decision below cites an area code.

## ADD-002: The repository contained exactly one image

- **Decided:** `main` held one file, `incorrect running sprites.jpeg`. It is now
  `src/images/source/runner-sheet__8frame-alternating-gait__6-colorways__source.jpeg` (D2). The filename
  encodes content, layout and role, so it needs no README to be understood.
- **Why:** D1 asks for dedupe across "various bits of art"; there was nothing to dedupe at file level. The
  duplicate content is *inside* the file, so dedupe had to operate on decoded pixels and on poses.
- **Area:** D1, D2.
- **Impact:** `npm run images:dedupe` reports **0 byte-identical files** and the real finding
  (**48 frames, 24 of them repeats**). Any new art goes under `src/images/<domain>/` and must survive that
  command. Derived cut-outs go to `public/sprites/` because D3 needs a URL, not `src/images/`.

## ADD-003: Chroma keying uses nearest-solid-colour unmixing, not hue keying

- **Decided:** a pixel is background when it is "key blended": bright magenta, or the dark purple ringing
  JPEG leaves on a hard edge (`min(r,b) − g > 30` **and** `|r − b| < 14`). Edge pixels take the colour of
  the nearest solid art pixel, and their alpha is recovered by projecting the blended colour onto the
  art→key line.
- **Why:** a plain hue key left **40.7 % of semi-transparent edge pixels** magenta-hued (measured). The
  purple kit fails a naive magenta test (blue is 28 levels above red), so the two-part predicate is what
  separates art from key. Projection recovers coverage that a binary mask destroys.
- **Area:** D3.
- **Impact:** the final cut-outs have **0 opaque magenta pixels** and **< 0.2 %** magenta-hued edge pixels
  per row. `magentaLeak()` is the regression test.

## ADD-004: Registration pivots on the pelvis, not the silhouette centroid

- **Decided:** every cut-out is translated (never scaled) so its shorts centroid lands on one column on a
  shared 223×244 canvas. Vertical bounce is left in the legs.
- **Why:** the source frames drift 50 px horizontally between frames. A silhouette centroid moves with the
  pose (a kicking leg pulls it), so aligning on it would inject a fake sway. The shorts are the one colour
  no other part uses, which makes the pelvis unambiguous.
- **Area:** D3, D4.
- **Impact:** the registered set still shows the sheet's real flaw (frames 4 and 8 float clear of the
  ground); registration removes camera drift, not animation error.

## ADD-005: The gait is derived from duty factor and stride, not from key poses

- **Decided:** a run cycle is described by cadence, stride length, duty factor, lean, arm swing and bob
  gain. Foot trajectories are generated: stance is a straight ground track at exactly the ground speed,
  swing is a cubic Bézier with a heel kick and a knee-drive apex. The pelvis follows a periodic
  Catmull-Rom curve through contact, mid-stance, toe-off and mid-flight. Legs are solved with analytic
  two-bone IK with the knee constrained forward.
- **Why:** the reference sheet's failure is that it has four poses and no physical constraint tying them
  together. Deriving the poses from timing guarantees alternation, contact, and constant stride by
  construction, and makes the animation a continuous function of phase rather than a flipbook.
- **Area:** D5, D6.
- **Impact:** the same 8 samples give 8 distinct poses, 6 of them with a foot on the ground, head drift
  2 px (vs 50 px), and zero dependence on pre-drawn art. Changing one slider regenerates the whole cycle.

## ADD-006: Known limits of the procedural gait

- **Decided:** the model is a biomechanically motivated approximation, not motion capture. Recorded
  rather than hidden.
- **Why:** honest validation (GREENFIELD §8).
- **Impact:** the mid-stance knee is more flexed than a sprinter's and the arms swing from a vertical
  shoulder line instead of following scapular motion. Two limits recorded here have since been removed and
  are kept for the record: the rigid foot (superseded by **ADD-014**, the foot now hinges at the ball) and
  the torso/head rigid pair (superseded by **ADD-013**, the neck is its own segment).

## ADD-007: The app is dependency-free at runtime

- **Decided:** Vite builds a static bundle of vanilla TypeScript DOM components. React was not used.
- **Why:** the deliverable is one canvas, six sliders and three static panels. A framework would add a
  runtime, a rendering model, and a testing story for no behaviour. GREENFIELD's component/hook rule is
  preserved in spirit by the `components` / `state` / `model` split documented in
  `CLAUDE-function-design.md`.
- **Area:** D6.
- **Impact:** `npm run dev` and `npm run build` need only Vite; the production image serves static files
  with no server framework.

## ADD-008: SHIP-HATS files are deliberately not carried yet

- **Decided:** no `.shiphats` pipeline files and no `activate-shiphats.sh` in this change.
- **Why:** there is no GitLab destination, no project variables and no registry, so every
  `@@SHIPHATS_*@@` placeholder would be invented rather than validated. The local gate
  (`npm run validate`) already exists and is exercised.
- **Area:** deployment.
- **Impact:** supersede this entry when the repository has a GitLab home; `CLAUDE-deployment.md` lists the
  steps and the test that must land with it.

## ADD-009: Container files are contextualised, not copied blind

- **Decided:** `Dockerfile` builds `dist/` and serves it with a four-line dependency-free Node static
  server, non-root (`65532`), with a healthcheck on port 3000. `Dockerfile.dev` keeps the platform's
  dev-container contract (app 3000, agent 3001). The upstream template's project-type guessing is not
  used because this repository has exactly one project type.
- **Why:** GREENFIELD §10.1 says a `dist/` without `dist/index.js` is served as a static site by the
  generic template; here that behaviour is wanted and stated explicitly instead of inferred.
- **Area:** deployment.
- **Impact:** the app must keep listening on `0.0.0.0:3000`; `vite.config.ts` sets `allowedHosts: true` so
  the preview proxy host is accepted.

## ADD-010: The flaw report is generated, not asserted in prose

- **Decided:** `npm run sprites:analyse` measures both the reference sheet and the generated runner with
  the same instrument (`src/lib/analysis/cycle.ts`) and writes `src/generated/reference-analysis.json`.
  The app's flaw panel reads that file, so the numbers in the UI cannot drift from the numbers in the
  tests.
- **Why:** the user asked to *assess* the flaw. A prose claim goes stale; a measured one is a test.
- **Area:** D4, D6.
- **Impact:** any change to the gait model that degrades contact or drift will fail `tests/analysis.test.ts`
  and change the UI text at the same time.

## ADD-011: Pose distance uses a silhouette signature, and a separate continuous signature for the rig

- **Decided:** sheet frames are compared with a 16×16 occupancy signature normalised to each frame's own
  bounding box (translation- and scale-invariant). The procedural runner additionally gets a continuous
  normalised joint-angle signature, compared at a stricter threshold (0.02 vs 0.06).
- **Why:** a raw pixel diff would report every colourway as different and every re-draw as identical. The
  box-normalised occupancy is what makes "frame 5 repeats frame 1" a measurement rather than an opinion.
- **Area:** D4.
- **Impact:** `findDuplicates` recovers exactly `[1,5] [2,6] [3,7] [4,8]` in all six rows — asserted in
  `tests/analysis.test.ts`.

## ADD-012: Playback interpolates the phase, so the animation is not limited to 8 frames

- **Decided:** the app advances a continuous phase from the clock and samples the pose model at display
  rate. `cycleSeconds = 120 / cadence`, and a playback-rate control scales it.
- **Why:** the source sheet's fundamental limit is that motion is quantised to 8 drawings. Sampling a
  continuous model removes that limit and demonstrates the point of the whole exercise.
- **Area:** D6.
- **Impact:** the frame-stepping language of the sheet ("8-frame cycle") appears only in the reference
  strip; the generated runner is described in phase, never in frames.

## ADD-013: The neck is its own segment, and the head has its own stabiliser

- **Decided:** the rig grows from seven parts to nine: `torso`, `neck`, `head`, `thigh`, `shin`, `shoe`,
  `shoeToe`, `upperArm`, `forearm`. The torso ends at the neck base. The neck is a capsule of its own
  length, solved at `0.52 × torsoLean` plus a breathing term; the head is solved at `0.35 × neckAngle`.
- **Why:** the user rejected a torso and head that behave as one rigid piece. Counter-rotating the neck and
  then the head keeps the gaze near level while the trunk leans and bobs, which is exactly what a runner's
  cervical spine does.
- **Area:** D5, D6.
- **Impact:** `JOINT_LIMITS.neckMin/Max` bound the neck. `tests/gait.test.ts` asserts the neck absorbs more
  than half of the lean and that the head stays within 0.12 rad of vertical at every phase.

## ADD-014: The foot is split at the ball, and the sole is planted analytically

- **Decided:** `shoe` (heel + ankle) and `shoeToe` (forefoot) are separate parts with separate angles.
  `plantFoot()` computes the lowest of the three sole points (heel, ball, toe) and shifts the ankle so that
  point sits exactly on the ground line for any attitude.
- **Why:** requirement: the foot must roll, not press down and lift. A single rigid shoe cannot do this: the
  heel must peel while the toe stays planted, which requires a joint at the metatarsals.
- **Area:** D5.
- **Impact:** stance angles run near-flat at contact → flat through mid-stance → heel peel (`hind` to
  `-0.95 rad`) → toe push (`fore` to `-0.3 rad`). `tests/gait.test.ts > foot roll` measures the sole gaps:
  heel 0 → 0.08 body heights while the ball stays at 0, then the toe takes over.

## ADD-015: Forward lean is a physical parameter, not a cosmetic tilt

- **Decided:** `lean` is a control (0…0.34 rad, default 0.22). It tilts the torso about the hip; the neck
  and head counter-rotate; the stance track shifts back by `fall = 0.03 + 0.055 × lean` so the support foot
  trails the pelvis on average.
- **Why:** the user asked for a runner who is always falling forwards. Tilting the drawn sprite would not
  change where the foot lands; moving the stance track does.
- **Area:** D5, D6.
- **Impact:** `tests/gait.test.ts > forward lean` asserts the shoulders and head stay ahead of the hip at
  every phase and that the mean stance-ankle x is behind the pelvis.

## ADD-016: Personas are a metric set plus a skin, and a skin can override any part

- **Decided:** `Persona = BodyMetrics + Skin`. Two personas ship: `sg-chinese-male` (1.73 m, longer legs,
  broader chest, short hair, red kit) and `sg-chinese-female` (1.61 m, wider pelvis, narrower chest,
  ponytail, blue kit). `SpriteLook` carries the body, palette, hair style and a
  `Partial<Record<PartId, PartBuilder>>` override map.
- **Why:** requirement: skinnable sprites and a male/female Singaporean Chinese pair. Splitting anatomy
  (metrics) from presentation (skin) means the same gait model, joint limits and IK run both personas, so
  the two runners are directly comparable, and a new skin costs a palette plus optional part builders.
- **Area:** D5, D6.
- **Impact:** nothing in `rig/` or `gait/` may read a module-level body constant; every entry point takes
  `BodyMetrics`. `buildAllParts(body, hair)` and `partsFor(look)` are the only way to get geometry.
  Invariant: `hipStandHeight + torsoLength + neckLength + headCenterOffset + headRadiusY = 1`, asserted in
  `tests/rig.test.ts`.

## ADD-017: Each persona owns a default kit, and switching persona switches the kit

- **Decided:** `withPersona()` sets `colorwayId` to the persona's `skin.defaultColorwayId`.
- **Why:** the two personas have to be distinguishable at a glance in a small preview, and the skin tone
  difference alone is subtle. The colourway row still lets the user override the kit afterwards.
- **Area:** D6.
- **Impact:** `tests/app.test.ts` asserts the round trip male → female → male returns red → blue → red.

## ADD-018: Photographic personas are an additive layer, never a replacement

- **Decided:** the cut-out rig ships as a third `RunnerOption` with `kind: "photo"`. `Persona` stays the
  vector contract (body + skin); `PhotoPersona` carries only a manifest URL. `PERSONAS` is untouched, so
  every existing vector test and default still holds. `withPersona` keeps the current colourway when a
  photo runner is selected, because a photograph has no recolourable palette.
- **Why:** the requirement was photo-real articulated parts *in addition to* the existing vector sprites.
  Keeping the two option lists separate makes it impossible for the photo path to silently break the
  vector path — the stage branches on `kind` and the atlas only receives vector looks.
- **Area:** D5, D6.
- **Impact:** `RUNNER_OPTIONS = [...PERSONAS, ...PHOTO_PERSONAS]`; the photo rig loads asynchronously
  (`app/model/photo-runtime.ts`) and frames render without it until decoding finishes. The loader fetches
  every file in `photoAssetFiles(rig)`, which now includes the far-side shots.

## ADD-019: Far limbs are photographed from the inside, not mirrored from the near plate

- **Decided:** a single side profile only shows the *outside* of the near limbs. The far arm and leg are
  cut from dedicated chroma-key reference shots: a left arm with the palm to camera, a full leg for the
  thigh, and a lower leg whose medial ankle and shoe arch face the camera. Six far-only parts (`upperArm`,
  `forearm`, `thigh`, `shin`, `shoe`, `shoeToe`) are cut, resampled so each joint-to-joint distance equals
  the near rig's bone length, tone-matched to the near crop's mean colour, then shadow-tinted.
- **Why:** mirroring the near limb duplicates the wrong surface — the outer shoe and the back of the hand —
  which is exactly what the user flagged. A real medial reference keeps the arch, inner ankle and palm.
- **Area:** D4, D5.
- **Impact:** `PhotoPart.far` carries its own file, size, pivot and reference neutral; `composePhotoRunner`
  uses those for every far draw. `tools/photo-far-spec.ts` records the source boxes, joints and targets;
  `tools/extract-photo-far.ts` writes `sg-chinese-female-photo-far/*.png` and merges the blocks into
  `female-rig.json`. Joint caps (a disc of reference pixels around the pivot) keep elbows and knees filled
  at full bend. Tests: `tests/photo.test.ts` pins the far file/pivot/neutral wiring and the 24-asset list.

## ADD-020: Far-side textures are fitted to the near limb, and every hinge gets a cap

- **Decided:** after cutting a far piece, `tools/extract-photo-far.ts` runs a second, *silhouette* fit:
  the cut-out is stretched so its widest row matches the near part it abuts (`fit.width`), then all
  far pieces pass through `tintFar` once at 0.88 instead of being tone-matched and tinted again.
  Every articulated part gets a `cap` (a disc of joint pixels kept on the child) in the plate spec, and
  neighbouring regions are grown two pixels into each other so no dotted cut line can show.
- **Why:** measured against the near crops, far limbs were up to 1.6× too wide and 28 % too dark; the
  double darkening came from tone-matching *and* tinting. Joint caps close the wedges that open when two
  rigid textures rotate apart (793 enclosed transparent pixels at phase 0.5 before caps, ~10 per limb after).
- **Area:** D4, D5.
- **Impact:** `PhotoPart.far.width/height` are now measured, not inherited: all six far limbs match their
  near counterparts within 4 % (`tests/photo.test.ts > far-side texture fitting`). The same test pins the
  far foot above the declared sole. `clipBelow()` in `cut.ts` trims any foot texture that runs past the
  ground line the solver uses, which is what stopped the stance shoe sinking ~11 px under the floor.

## ADD-021: The foot is split into a hindfoot and a low toe box, hinged at the ball

- **Decided:** the hindfoot keeps the heel, sole, collar and lace panel; the toe piece is only the low
  box ahead of the ball and below the lace line, hinged at the ball with a 13 px cap. Both are trimmed at
  the declared sole (`soleY`), and the crops overlap across the hinge.
- **Why:** an earlier vertical split carried the lace panel into the toe, so toe-off swung a sail of shoe
  upward; a later low-only split left a slot when the toe rotated. Splitting low, overlapping the crops
  and capping the hinge satisfies both, and no texture reaches under the floor.
- **Area:** D5.
- **Impact:** `tests/photo.test.ts > splits the near foot at the ball`. The toe pivot is inside its own
  crop now (was (−17, 49), 17 px outside), so the two halves hinge instead of sliding apart.

## ADD-022: Far-side references are shot in the neutral carriage, and fitted isotropically

- **Decided:** the three far-side references were re-shot (arm hanging palm-to-camera, standing leg, lower
  leg framed knee-to-sole) with one light, one wardrobe and one camera distance. Far pieces are now fitted
  to the near silhouette **isotropically** (`fit.uniform`): a limb may not be squeezed along its own axis,
  because an anisotropic fit makes a calf thin when it hangs and fat when it swings.
- **Why:** the first reference set was three different framings. Measuring them against the near plate
  showed far limbs up to 1.6× too wide and 28 % too dark, and a vertical fit had stretched the far shoe
  into a pancake and the far shin into a sausage. The plate's own far arm is *raised*, so it cannot serve
  as a neutral either: rotating a raised arm down tears the shoulder.
- **Area:** D4.
- **Impact:** all six far limbs now sit within 4 % of their near counterpart's silhouette width
  (`tests/photo.test.ts`). The far shin is cut from the lower-leg reference, whose top edge is the knee and
  whose sock line is the ankle, so it spans the whole bone without longitudinal stretching. The far shoe
  is scaled by ankle-to-sole depth (118 px), not by its length, and clipped at the declared sole.

## ADD-023: The photographic rig is honest about what it is

- **Decided:** `docs/PHOTO-RENDER-FLAWS.md` records the measured defects and their status, and
  `docs/PHOTO-SHOOT-PLAN.md` records the reference contract (framing, light, wardrobe, scale, medial
  surface). The filmstrip and the app both keep the photographic runner as a *third* option.
- **Why:** the collage reads badly whenever its parts disagree, so the acceptance criteria have to be
  measurable rather than "looks right": far width within 15 %, far luminance 0.85–0.95 of near, no texture
  below the ground line, no hinge gap.
- **Area:** D7.
- **Impact:** `reports/photo-zoom.png`, `reports/photo-filmstrip.png` and `reports/qc-far-leg.png` are the
  review artefacts; `npx tsx .scratch/widths.ts` and `.scratch/tones.ts` are the numeric gates.

## ADD-024: Articulated ends are cut as arcs centred on the rotation axis

- **Decided:** every limb end that meets its neighbour on an *arbitrary* line is cut as a ball-and-socket
  pair. The parent keeps a socket — everything inside the disc is removed from it; the child is handed the
  whole disc, including the pixels the plate left transparent there. The ball is cut 1.5 px wider than the
  socket so its opaque rim covers the socket's feathered rim, and `sealBall()` restores that rim to full
  alpha after feathering. Radii are half the opaque width measured across the joint, less a pixel.
- **Why:** a disc centred on the pivot is the only boundary a rotation cannot change. Every other shape —
  the straight cut, the semicircular cap, the rectangle — slides against its neighbour and opens a wedge.
  A disc *inscribed* in the limb adds nothing visible at rest (1.6 % of the knee's disc is synthesised,
  19.9 % of the elbow's) and at a bend it reaches both limb edges, which is exactly where the wedge opened.
  A larger disc fixes the wedge too but reads as a plastic ball: at r 52 the knee bulged 12 px past the leg.
- **Not applied** at the shoulder, neck base, jaw, ankle and ball of the foot: their seams are the deltoid's
  inner edge, the singlet collar, the jawline, the shoe collar and the sole. A disc wide enough to reach
  them would drag the strap and collar with the arm/head, or push shoe through the floor (both foot pivots
  sit within 47 px of the sole). Those joints keep their natural contours; they are listed in
  `docs/PHOTO-RENDER-FLAWS.md` §B.
- **Area:** D2, D4.
- **Impact:** knee r 39 (80 px joint) and elbow r 26 (55 px joint). Transparent pixels inside either joint's
  disc: **0** at all eight phases (`.scratch/seam.ts`), against 793 enclosed pixels for the figure before
  the cuts. The far upper arm also loses the width it had inherited from the old shoulder cap (89 → 68 px),
  so `FAR_SOURCES` now fits it to 68 and the far arm passes the 15 % width gate.
  See `reports/qc-joints-knee-ankle.png` and `reports/qc-joints-arm.png`.

## ADD-025: Cut-out margins carry colour, and the despill is unconditional

- **Decided:** `cutPart()` copies RGB for **every** pixel in the crop and takes alpha only from the region
  mask; `greenKey()` clamps green to `max(red, blue)` on every pixel instead of only on soft edges; and the
  plate is bled again after the joints are cut.
- **Why:** canvas filtering samples a crop's transparent margin, and a zeroed margin blends black into
  every edge — the dark 1-px rim around each part. The old despill left the silhouette's fringe green
  wherever a dark patch of backdrop had keyed as fully opaque, and a fresh ball's rim has no bled colour of
  its own until the plate is bled again. Together these produced a green halo around the knee and a light
  hairline where the socket met the ball.
- **Area:** D2, D3.
- **Impact:** the knee rim's luminance step fell from ≈ 23 to ≤ 10 of ≈ 140 at r = 40 px
  (`.scratch/arc-profile.ts`), and the green cast at the ball's edge is gone
  (`reports/patch-shin.png`). 138/138 tests, `tsc` clean, `npm run validate` green.

## ADD-026: Cut-outs are traced to vector silhouettes

- **Decided:** every photographic part is traced (`src/lib/vector/trace.ts`: marching squares at the 0.5
  matte line -> loop stitching -> Ramer-Douglas-Peucker at 0.5 px -> corner-aware Catmull-Rom) and ships
  three things: the PNG as before, an SVG sprite (`public/sprites/photo/<rig>/svg/<part>.svg`, the texture
  clipped by the traced path), and the path data in the manifest as `part.shape`.
- **Why:** the user asked whether a raster-to-vector step would make the parts easier to work with. The
  matte is a pixel staircase with a feathered rim; both are camera artefacts rather than body edges. A
  traced path is the same edge at any scale, can be offset or boolean-cut analytically, and gives the app
  a `Path2D` it can clip with instead of relying on a 1-px alpha ramp.
- **Area:** D3, D5, D6.
- **Impact:** measured overlap of the traced shape against its own matte, on the shipped female rig:
  head 0.9947, neck 0.9802, torso 0.9985, upperArm 0.9958, forearm 0.9929, thigh 0.9969, shin 0.9957,
  shoe 0.9920, shoeToe 0.9956. Node counts 21-230 per part. `reports/photo-parts-female-rig.png` draws the
  traced edge in red over each texture; `reports/vector-zoom-shoe-0.5.png` renders one part at 4x
  from the matte and from the path. Interior holes keep their feathered alpha in the app: the trace is used
  for the outer silhouette, because a hard clip through a joint seam reintroduces the hairline ADD-025
  removed.
- **Also:** `greenKey` now drops detached specks (`dropSpecks`, 64 px minimum) before bleeding, so a fleck
  of backdrop or the blurred edge of a floor shadow cannot survive as a floating island in a crop.

## ADD-027: Mattes are colour classes, and the torso keeps only fabric

- **Decided:** a part may declare `matte: "skin" | "fabric"`. `matteBlocked()` fences its flood to
  pixels of that class (skin = warm hue, fabric = the singlet's red and the shorts' navy), and the
  region then grows and fills as usual. The female plate now gives the torso `"fabric"`, the arms and the
  neck `"skin"`.
- **Why:** the plate is a profile with the arms pulled back, so a colour-blind flood from the chest
  crossed the near arm and baked a ghost of it — grey upper arm, fingers — into the torso matte. Nothing
  but a colour class separates fabric from the arm that lies against it; a cut line cannot, because the
  two shapes touch along a curve that changes with the pose.
- **Area:** D2, D3.
- **Impact:** the torso's silhouette lost the arm and the hand (a 185 x 488 crop, no arm above the hip);
  the upper arm no longer carries the singlet's strap into its rotation. 151/151 tests, `tsc` clean.

## ADD-028: The neck is pulled under the head and the collar, and paints first

- **Decided:** the neck is painted **before** the torso, and its cut is extended 14 px past its own
  flood on every side, so a band of neck texture rides under the jaw above and under the singlet's collar
  below. The singlet's collar line is no longer a barrier.
- **Why:** the head turns about `headBase` and the trunk leans about the hip; a neck cut tight to those
  two seams opens a step at the base of the neck as soon as either moves. Both neighbours are painted
  over the neck, so whatever the neck owns beyond its visible band is invisible, and the visible band is
  bounded by the jaw and the collar — lines the neck itself never draws.
- **Area:** D2, D3, D5.
- **Impact:** at a 0.35 rad head turn the neck seam is a clean line under the jaw with no black step and
  no tear (`.scratch/rig-qc.ts 2 0.35`); at rest the join is invisible
  (`reports/rig-head-0.png`). 151/151 tests, `tsc` clean, `npm run validate` green.

## ADD-029: The far upper arm is fitted to the skin-only near arm

- **Decided:** `FAR_SOURCES.upperArm.fit.width` goes from 68 to 78 px.
- **Why:** the near upper arm's widest row is 83 px once its skin matte drops the strap it used to
  include; a 68 px far arm was 18 % thinner and failed the far-side width gate.
- **Area:** D3.
- **Impact:** far/near width deltas are now upperArm 6.0 %, forearm 0 %, thigh 0 %, shin 0 %;
  151/151 tests.

## ADD-030: The torso comes from a generated arm-free plate, composited by anchors

- **Decided:** a second plate — `sg-chinese-female__torso-only__chroma-green__source.png`, the same
  kit shot as an empty garment with no limbs (prompt logged in `docs/PHOTO-PROMPTS.md`) — replaces
  the base plate's trunk pixels before any cutting. `src/lib/photo/patch.ts` fits it with a
  similarity solved from two measured anchor pairs (garment strap apex `[328, 162]` → `[346, 269]`;
  shorts hem `[261, 1015]` → `[310, 779]`; scale 0.5975) and composites it inside a clip polygon,
  keeping the base plate's pixels wherever the patch is transparent (the neck and arm holes show
  the original neck and limbs through the garment). The patch contributes fabric only.
- **Why:** the user asked for the torso photo to be generated "of her torso without any arms". The
  original profile plate has the arms pulled back across the trunk; ADD-027 fenced the ghost out
  with a colour matte, but the requirement was the plate itself.
- **Area:** D2, D3.
- **Impact:** the torso cut is the arm-free garment end to end — no arm, no hand, no matte apology.
  Registration is deterministic and tested (`tests/patch.test.ts`, 4 cases); anchors are documented
  in `docs/PHOTO-PROMPTS.md`. 155/155 tests.

## ADD-031: Colour mattes are a hard invariant: purge, then re-home

- **Decided:** after growth and caps, `purgeMatte` strips every matted region of pixels its class
  rejects, and `refillMatted` re-homes the orphans to the nearest matte-compatible region
  (`src/lib/photo/matte.ts`). The patch plate is matted to fabric before compositing
  (`fabricOnly`).
- **Why:** `fillUnassigned` and `growRegions` are colour-blind by design (a grown band is what
  hides cut lines), so a strap could still ride in a skin part and the generated garment's baked-in
  shoulder-socket skin landed in the fabric torso — a measured 1,788 px hole at the shoulder once
  the socket skin was cut away. The purge alone then orphaned the armhole's skin islands into
  holes; the matte-aware refill hands them to the skin parts instead.
- **Area:** D3.
- **Impact:** measured after the change: the skin-matted upper arm carries 0 opaque bright-red
  pixels (was stray strap colour); the shoulder window's unowned pixels fall from 1,788 to 68 (a
  fabric-classified sliver at the armhole rim that no region can legally reach); the torso carries
  the arm-free garment with matte overlap 0.998. `tests/matte.test.ts`, 4 cases.

## ADD-032: Pivot arc caps — where they work in plate space, and where they do not

- **Decided:** `src/lib/photo/arc-cap.ts` trims a part's end to an elliptical arc about a rotation
  axis (the rounded-end principle from the sibling branch's `rounded-joint-cutter.ts`, ADD-016
  there). Applied at the neck's two ends: the under-jaw band becomes a 30 x 26 dome on `headBase`
  and the collar end a wide 85 x 65 arc on `neckBase`, both covered concentrically by their
  neighbours at every angle. Knee and elbow keep their ball-and-socket caps.
- **Why:** the user requires every articulated end rounded out about its rotation axis. A measured
  attempt to cap every end showed the constraint of plate-space cutting: a cap small enough to
  round the jaw cut also erased the ponytail (1,788 px unowned at the shoulder window), the deltoid
  mass sits ~70 px off the shoulder pivot, the forefoot 46 px off the ball, and the shin's cut end
  81 px off the ankle — for those ends a pivot-centred ellipse either eats anatomy or is a no-op.
  Those joins stay sealed by z-order overlap (draw order neck → torso → head → arms; shorts over
  thigh; shoe over shin) and by the ball joints. The sibling's canonical-canvas resampling — which
  rebuilds each limb as a capsule with semicircular ends — is the proven route to true rounding at
  every end; it is a re-architecture and is recorded as such in `docs/BRANCH-COMPARISON.md`.
- **Area:** D2, D5.
- **Impact:** at 0.35 rad head turn the jaw seam is clean — no step, no tear, no disc
  (`reports/rig-head-0.35.png`); at rest the join is invisible (`reports/rig-head-0.png`). The
  cap maths is rotation-invariant by construction (`tests/patch.test.ts`, including an invariance
  case across four angles).

## ADD-033: The sibling branch is reviewed and its practices adopted

- **Decided:** `arena/917ef347-super-duper-funicular` @ `f4c3197` (PR #1) is checked out at
  `/tmp/other-branch` and compared in `docs/BRANCH-COMPARISON.md`. Adopted this round: per-element
  plates, rounded-end caps, and the verbatim image-prompt log (`docs/PHOTO-PROMPTS.md`). Recorded
  as future work: canonical-capsule resampling for full rounded ends, hands as separate parts,
  ponytail secondary motion, and colour-band SVG vectors.
- **Why:** the user asked for the comparison and the transfer of good practice, with this branch's
  own strengths identified honestly.
- **Area:** D1, D8.
- **Impact:** documentation only, plus the two ported mechanisms above.
