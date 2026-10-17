# Stride Lab — living specification

## 1. Artwork
Inventory all repository artwork, preserve original bytes under descriptive `src/images` names. Deduplicate by file SHA-256 and decoded RGBA content, not fuzzy visual similarity. Record provenance and classification. Similar animation phases are evidence, not safe deletion candidates.

## 2. Extraction
Offline reproducible chroma-key extraction: configurable sheet grid, region excludes title/numerals, JPEG-tolerant magenta removal, connected-component cleanup, fixed common frame canvas and origin. Write unique RGBA PNG files under `public/sprites`, a manifest mapping all logical frames to URLs, hashes, bounds and pivots. Support loose-piece sheets with connected components. Do not pretend a flattened sprite contains separately recoverable occluded limbs.

## 3. Motion
A deterministic normalized phase drives an articulated side-view runner. Left/right feet are half a cycle apart; stance occupies less than half a cycle, allowing flight. Feet track the ground during stance; swing lifts and recovers. Two-bone inverse kinematics preserves segment lengths. Opposed arms, hip bounce and forward lean complete the pose. This is a stylized kinematic model, not a physics/biomechanics simulation.

## 4. Workbench
Responsive TypeScript app: live procedural preview, pause/step/scrub, gait controls, palette selection, skeleton/onion-skin overlays, eight phase previews, PNG sheet export, original/extracted asset browser and motion diagnosis. Original playback must remain explicitly distinct from procedural output.

## 5. Quality
Unit-test loop continuity, limb lengths, opposite phase, stance locking and flight. Test the actual extraction and browser. Public sprite URLs work under the same origin, locally or on a deployed static host. No claim of permanent hosting from a development preview.

### 3.1 Articulation refinement
Represent the heel, toe, ankle, neck and head explicitly. Late stance rotates the sole about a planted toe; swing recovers toe angle smoothly and stays clear of the ground. Feed the resulting ankle target into leg IK. Forward lean must move the hips ahead relative to unchanged contact paths, not just bend the torso. Neck and head orientations are independent, with subtle counter-rotation that stabilizes the gaze. Skeleton mode and PNG exports must use the same articulated pose as live rendering. This is a midfoot-strike stylistic choice, not a claim that every runner lands midfoot.

### 4.1 Persona selection
Provide two selectable fictional adult Singaporean Chinese runners: Wei Ming (male) and Mei Lin (female). Distinct hair and running-kit silhouettes use the same articulated rig and user-adjustable palette. Hair may have loop-continuous secondary articulation. Selection must update canvas, overlays, phase previews and named sheet exports without resetting gait/playback. Selecting a persona while viewing the source sheet returns to procedural rendering; source artwork is never relabeled as a new persona.

### 4.2 Photographic character option
Preserve the two pixel personas and add an AI-photographic female persona. Generate the far limb's inner anatomy and inside shoe/hand surface independently of the near limb's exterior; never assume mirroring can reveal occluded surfaces. Provide cutouts for torso, pelvis, neck, head, and each upper arm, forearm, hand, thigh, shin and shoe. Reuse articulated gait with orientation-preserving transforms. Smooth high-resolution preview, skeleton, phase samples, onion skin and PNG export must all render the selected persona. Photo texture loading must have explicit pending/error/retry states and prevent premature export. Photographic clothing retains its generated colours. Asset library must expose 16 cutouts, 9 generation sources and the rig manifest. State the limits of 2D photographic animation and do not imply the fictional character is a real photographed person.

### 4.3 Hip cut calibration
The photographic pelvis must not retain a static shorts hem over the rotating near thigh. Trim its lower region with a feathered, hip-centred rounded mask and place the near leg in front of the pelvis while retaining the far leg behind it. Keep bone pivots fixed. Provide a live photo-only calibration inspector with before/after comparison, cut dimensions, offset, feather, guides, reset, and transparent PNG/settings downloads. Apply the selected cut throughout live rendering and sheet export; comparison/guides are inspector-only. Do not modify original photographic source files. Settings last for the current session unless downloaded; no automatic persistence is implied.

### 3.2 Motion families
Support Running, Walking and Brisk walking. Walking must retain ground support throughout the cycle and include double support, heel-first contact, toe-off, lower clearance, relaxed arm flexion and more upright posture. Brisk walking increases cadence/stride/arm swing and shortens double support without adding a running flight phase. Use the same articulated bone and photographic part contracts. Validate limb lengths, contact and sole clearance over each profile's control range.

### 4.4 Motion selection
Expose all three motion types above the stage. Remember independent gait settings per motion for the session; reset targets the active profile. Preserve persona, phase/playback and hip calibration when switching. Update phase labels, support indicators, cycle title, ground travel and PNG filename. The original artwork is still a run-only comparison, not a source walking animation. Switching motion returns to the generated view. Motion switching is instantaneous, not blended.

### 4.5 Articulated element end cutter
Round rotating elements as well as stationary sockets. A reusable endpoint mask must remove corners both beyond and immediately inside the joint plane, with a smooth transition to the original shaft and optional feathering. Preserve source dimensions, pivots and IK lengths. Expose independent proximal/distal controls for each near/far thigh, shin, upper arm, forearm and hand/wrist. Defaults must cap both ends of leg/arm segments; preserve fingers with distal hand caps disabled. Do not treat shoe heel/toe registrations as joint endpoints.

Provide isolated rotation and assembled joint inspection, base-vs-rounded comparison, guides, per-part reset and PNG/JSON downloads. Inspector rotation/comparison must not change main animation; calibration must propagate to all render/export paths. Clearly state subtractive-mask and session-only limitations. Keep per-frame mask generation out of the animation loop through bounded caching.

### 4.6 Full-cycle visual audit
Provide a separate 16-phase audit PNG export, covering `[0, 1)` at 1/16 increments, with light/dark renderings and a joint-overlay panel for each phase. Use the live pose/asset/mask pipeline and current settings; preserve playback and the existing eight-frame sprite export. Label generated-motion scope, motion, phase and kinematic support count. Disable photo export until all assets are ready. This is a visual inspection aid, not a promise of defect detection or anatomical correctness.

### 5.1 Continuous learning
Use `docs/FDS.md` as the FDS entry point and evidence/learning register, with this file remaining the canonical functional contract. Update learnings every turn and follow the full-cycle visual-review skill for gait/artwork/compositing changes. Pin comparison sources and distinguish read code, observed output and actually executed tests. Maintain exact prospective image-prompt provenance; do not fabricate historical prompts.
