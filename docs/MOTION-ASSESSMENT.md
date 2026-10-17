# Artwork and motion assessment

## Inventory and dedup
At commit `396ce256`, the only tracked artwork was `incorrect running sprites.jpeg` (2528×1696). Its bytes are preserved under `src/images/runner-six-palette-eight-frame-sheet.jpeg`. No backdrops or separate object-class sheets were available to classify. The image contains six colour rows (crimson, cobalt, leaf, sunshine, violet, tangerine), each with eight labelled running poses.

File SHA-256 and canonical RGBA SHA-256 inventory confirms one unique input. Extraction produces 48 unique RGBA hashes. JPEG noise and small drawing changes mean visually repeated poses are not exact duplicates; they must not be silently deleted. The manifest records a URL per logical frame and supports aliases for future exact duplicates.

## Visible problems (interpretation, not recovered authoring metadata)
1. **Repeated near-side lead:** columns 1/5, 2/6, 3/7 and 4/8 closely resemble one another. The same visible leg leads again in the second half. They appear to repeat a half-cycle rather than exchange limb identities across a full left/right stride.
2. **Weak contact continuity:** a few isolated poses do not define where the planted foot stays relative to a moving body/world. Playback can read as hopping or sliding. A specific intended playback rate was not supplied, so timing intent cannot be established from the still sheet alone.
3. **Shape and registration drift:** head placement, shoe silhouettes and outlines vary. Independent frame scaling/recentering would hide some drift and introduce new motion errors; extraction preserves cell-relative pose placement.
4. **Too few coherent transitions:** small raster differences do not provide genuinely new contact, compression, push-off and flight transitions. Recolouring six rows adds appearances, not gait information.
5. **Asset hygiene:** JPEG creates magenta boundary contamination and its cell spacing is not perfectly uniform. A naive uniform crop clips shoes; a broad purple/magenta threshold punches holes in violet clothing. Divider detection and boundary-connected keying address those specific defects. Minor subpixel/JPEG fringe remains possible; PNG source art would be preferable.

The original-sheet mode demonstrates the actual extracted order rather than a speculative rearrangement. The procedural mode is a new drawn character, not a claimed faithful deconstruction of inaccessible hidden limbs.

## Replacement algorithm
Let `p = fract(time × cadence / 120)` (cadence is steps/minute, two steps per complete cycle). Far leg phase is `fract(p + 0.5)`.

- **Contact duty:** each leg is in stance for 36% of a cycle. Because this is less than 50%, both feet are airborne during two intervals.
- **Stance/contact reference:** `reference.x = stride × (0.5 − p / 0.36)`, `reference.y = 0`. Ground travels backward at `stride / 0.36` per cycle. The sole is initially flat (midfoot-style landing); late stance lifts the heel through up to 52° around the toe, whose world position remains fixed. The ankle is derived from this rotating shoe before leg IK, so it is no longer itself the ground-contact reference.
- **Swing:** normalized time `u = (p − 0.36) / 0.64`. Horizontal cubic Hermite recovery matches the stance velocity at both endpoints; vertical lift is `−lift × sin²(πu)`. This gives continuous position and velocity at touchdown, toe-off and wraparound, including a natural backward heel recovery before forward swing.
- **Hip:** a two-beat sinusoidal vertical trajectory adds compression and flight elevation. Forward lean shifts the pelvis ahead relative to the unchanged contact trajectories; the torso inclines forward as well.
- **Shoe recovery:** toe-off rotation transitions into mild dorsiflexion for swing clearance, then returns smoothly to a flat landing. Sole geometry remains above the ground throughout the tested UI range. This is one midfoot-strike style, not a universal model of foot-strike patterns.
- **Leg IK:** two 32px bones meet at the forward-bending knee. Analytical circle intersection preserves both lengths throughout the UI parameter range. The generic solver is only intended for reachable targets; the UI range is tested, not arbitrary external values.
- **Torso/head:** fixed 31px torso rotated by lean plus a subtle periodic pitch. An 8px cervical segment articulates independently, while a phase-lagged head rotation keeps the gaze relatively level. The head is not rigidly attached to the torso.
- **Arms:** 22px upper arms, 19px forearms, opposed left/right swing and opposite same-side leg direction. Trigonometric endpoints preserve lengths.
- **Rendering:** draw far arm/leg, torso/head, near leg/arm, then optional skeleton. The low-resolution canvas is enlarged without smoothing. Eight sampled poses can be exported; live playback calculates poses continuously.

## Limits
This is a deterministic **stylized kinematic** run, not force-based biomechanics. It does not solve terrain, collision, muscle dynamics, 3D rotation or force-driven balance. The output uses new vector/canvas primitives with pixel-style rasterization; the extracted JPEG sprites remain an independent comparison dataset. Source copyright/provenance beyond this repository is unknown and is not inferred.
