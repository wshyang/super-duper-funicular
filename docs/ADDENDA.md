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
