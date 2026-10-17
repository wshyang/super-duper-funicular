# Assessment: why the photographic runner renders badly

> **Status:** A remains (it needs a coherent re-shoot, not a code fix). **B is fixed at the knee and the
> elbow** by a ball-and-socket cut: the parent keeps a socket, the child is given the whole disc, and the
> rendered joint measures **0 transparent pixels inside the disc at all eight phases** (`.scratch/seam.ts`).
> B is left in place deliberately at the shoulder, neck, jaw, ankle and toe, whose seams follow the body.
> C–G are fixed in `d59cd18`..HEAD: edges feathered, neighbours grown into a shared band, the foot split
> at the ball, far textures driven below the declared sole, far limbs fitted to the near silhouette with a
> single 0.88 tint. See ADD-020, ADD-024 and ADD-025.

Evidence: `reports/photo-defects.png` (six magnified panels), `reports/photo-zoom.png` (four phases),
`reports/qc-feet-zoom.png`, `reports/qc0-head.png`, `reports/qc0-hip.png`, `reports/qc0-knee.png`,
`reports/qc0-arm.png`, `reports/qc0-torso.png`.

Short version: the rig is geometrically assembled but **photographically incoherent**. Fifteen cut-outs
from five separate shoots are rotated into a pose; nothing reconciles their scale, their lighting, their
garment, or their edges. The eye reads that instantly as "pieces", not as a runner.

| # | defect | worst measured | verdict |
|---|---|---|---|
| A | cross-shoot scale/tone/garment mismatch | far arm 1.6× thicker, far limb 28 % darker | **fatal** |
| B | axis-aligned rectangular cuts | straight slab edges at knee/shoulder | **fatal** |
| C | hard-quantised edges | 89 % of the neck boundary is a hard step | severe |
| D | holes open at joints | 793 enclosed transparent px at phase 0.5 | severe |
| E | toe hinge outside its crop | pivot (−17, 49), 11 px overlap | severe |
| F | foot split past the ball | forefoot 11 px (≈6 cm) through the floor | severe |
| G | flaps, strap stubs, light direction | — | visible |

---

## A. Cross-shoot inconsistency — the dominant defect

Every far part comes from a different photograph than the part it must sit against, so each one disagrees
with its neighbour on **width, tone and clothing**.

| part | near cut-out | far cut-out | disagreement |
|---|---|---|---|
| upperArm | 115×283, widest **65 px** | 109×302, widest **106 px** | far arm is **1.6× thicker** |
| shin | 97×217 | 111×333 | far shin is **1.5× longer** at the same bone length |
| shoe | 149×146 (aspect 1.02) | 182×66 (aspect **2.76**) | far shoe is a **flat pancake** |
| thigh | 155×213 | 165×301 | far thigh is a long slab, not a thigh |

Tone, mean RGB of opaque pixels:

| part | near | far | Δ luminance |
|---|---|---|---|
| upperArm | 185,127,95 | 133,91,76 | **−28 %** |
| forearm | 173,124,95 | 125,90,77 | −28 % |
| thigh | 142,101,67 | 102,73,65 | −28 % |
| shin | 151,111,76 | 109,80,74 | −28 % |
| shoe | 85,84,90 | 62,61,74 | −27 % |

The far side is darkened **twice**: `matchTone()` pulls it towards the near crop, then `tintFar()` multiplies
by 0.72. Net factor ≈ 0.65 where the vector rig uses 0.84 for far limbs. That is why the far leg reads as a
grey-brown ghost pasted behind a saturated near leg.

And it is literally **a different shoe and a different hand**:

- near shoe: white midsole, orange outsole, mesh lace panel from the plate;
- far shoe: grey speckled midsole, orange heel counter, different lacing — and **22 % longer** (182 px) than
  the near shoe (149 px), a length forced by `stretchX: 1.4` rather than taken from the shoe;
- near hand: relaxed half-closed hand from the plate;
- far hand: open flat palm from the medial arm reference, fingers spread.

Two hands in different poses, two different shoes on one runner.

## B. The cut boundaries are axis-aligned rectangles, not joints

Far pieces were cut with `boxRegion()` — straight horizontal and vertical edges. A horizontal cut across a
thigh is only correct while the thigh is vertical. Rotate it 0.9 rad and you see a **straight slab edge**
crossing the limb, with a rectangular step at the knee where the thigh's bottom cut meets the shin's top.

**Fixed at the knee and the elbow** by `src/lib/photo/round-cut.ts`, driven by `links` in
`tools/photo-rig-spec.ts`. A disc centred on the pivot is the only boundary that rotation cannot change, so
each joint is now a ball-and-socket pair:

- the parent loses every pixel inside the socket disc;
- the child is handed the whole disc, including pixels the plate left transparent, which are closed by a
  membrane solve pinned to the surrounding skin;
- the ball is cut **1.5 px wider** than the socket, so its opaque rim covers the socket's feathered rim;
- the radius is **half the opaque width measured across the joint**, minus a pixel: knee 80 px → r 39,
  elbow 55 px → r 26.

A disc that wide is *inscribed* in the limb, so at rest almost none of the synthesised face is visible —
1.6 % of the knee's disc and 19.9 % of the elbow's — while at a bend it reaches both of the limb's edges,
which is exactly where the wedge used to open. Measured on the rendered frames, transparent pixels inside a
joint's disc:

| phase | 0 | .125 | .250 | .375 | .500 | .625 | .750 | .875 |
|---|---|---|---|---|---|---|---|---|
| knee (r 39) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| elbow (r 26) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

This is not applied everywhere, on purpose:

| joint | why it keeps its straight seam |
|---|---|
| shoulder | the arm/torso seam runs along the deltoid. A ball wide enough to reach it would drag the singlet's strap around with the arm; a smaller one would leave the straight edge outside the disc anyway. |
| neck base, jaw | the seam *is* the singlet collar and the jawline — real edges, not arbitrary cuts. |
| ankle | the pivot sits 47 px above the sole; a disc wide enough to bridge the shoe collar would push shoe through the floor. |
| ball of the foot | the pivot sits 4 px above the sole; same reason. A sole hinge has to keep its sole. |

Residual: a 1-px tonal seam remains at the ball's rim (luminance step ≤ 10 of ≈ 140, measured with
`.scratch/arc-profile.ts`), visible only at 2× magnification. The plastic-ball look of a large disc is what
set the radius rule: at r 52 the knee read as a doll's joint that bulged 12 px past the leg.

## C. Edges are hard-quantised, so seams show as dotted lines

Share of silhouette-boundary pixels with **no intermediate alpha within 2 px**:

| part | hard-cut |
|---|---|
| neck | **89.3 %** |
| upperArm | **79.3 %** |
| torso | **72.4 %** |
| shoeToe | **68.7 %** |
| thigh | **60.7 %** |
| shin | **51.5 %** |
| forearm | 47.9 % |
| head | 25.6 % |
| shoe | 21.9 % |

The keyed edge is anti-aliased in the source but `cutPart()` writes straight alpha with a 1 px margin, so the
ramp collapses to one hard step. Where two hard edges abut — collar/neck, torso/upper arm, thigh/shin — you
get the thin dashed line visible down the throat and across the knee. It reads as a cut-out sticker.

## D. Holes open inside the silhouette at every bend

Transparent pixels fully enclosed by figure pixels, per phase:

| phase | 0 | .125 | .250 | .375 | .500 | .625 | .750 | .875 |
|---|---|---|---|---|---|---|---|---|
| enclosed px | 62 | 344 | 668 | 640 | **793** | 298 | 680 | 696 |

At 620 px per body height that is up to ~0.2 % of the frame area — wedges at the knee, the hip and the
elbow where two rigid cut-outs rotate apart, plus the gap between sock and shoe collar. There were no joint
caps and no occlusion masks, so background showed *through* the leg.

The knee and the elbow no longer contribute: after ADD-024 the transparent area **inside either joint's
disc is 0 px at every phase**, because the disc is opaque in the child and the parent has no material
there. The figure-wide count above also includes legitimate gaps — between the legs and between the
swinging arm and the torso — which is why the per-joint measure is the gate.

## E. The toe hinge is anchored outside its own image

Near `shoeToe`: crop starts at x 437, the ball joint is at x 420 → **pivot (−17, 49), 17 px outside the
crop**. The shoe and toe crops overlap by only **11 px**. Consequence (panel 6): a hard vertical seam cuts
across the forefoot, and when the toe piece rotates the two halves slide apart instead of hinging.

## F. The stance foot is cut in the wrong place, so the forefoot dives through the floor

The geometric foot is grounded correctly: `stanceAnkle()` raises the ankle by `lowestSoleOffset()`, so the
declared sole sits exactly on y = 0. The **texture** does not match that model.

| | plate px from the ankle |
|---|---|
| ankle | (365, 1255) |
| declared sole (`scale.soleY`) | **47 below** the ankle |
| shoe crop bottom (y 1307) | **52 below** the ankle → 5 px overrun |
| ball joint (x 420) | 55 in front of the ankle |
| shoe crop front edge (x 448) | **83 in front** → 28 px of forefoot carried in the hindfoot |

With `hind = −0.30 rad` at phase 0.25, that overshooting front-bottom corner swings to **74 px below the
ankle** while the solver has only lifted the ankle **28 px**; the corner ends up **≈ 11 px (0.037 body
heights ≈ 6 cm) below the floor line**. Measured lowest opaque pixel: **+8 px**. Even at flat contact the
texture already sits 5 px low.

So the shoe piece contains forefoot that belongs to the toe piece, the split is at x 437–448 instead of the
ball at 420, and the two crops overlap by only **11 px**. Every heel peel therefore pushes a strip of shoe
through the ground and slides it against the toe piece — visible as the vertical seam in panel 6.

## G. Minor but visible

- thigh crops carry a square navy fabric flap ("apron") that pokes out sideways at the hip (panel 3, `qc0-hip`);
- the far upper arm's widest row is the raglan strap, so the arm reads as a shoulder pad when it swings;
- the near arm is drawn *after* the torso, so its straight top edge floats over the singlet instead of
  disappearing behind it;
- far limbs are lit from a different direction than the plate.

---

## Root causes, in order

1. **No single, consistent shoot.** Five sources with different cameras, distances, lenses, lighting and
   garment details. Rescaling cannot reconcile them.
2. **Cutting by rectangles instead of anatomy.** Joint cuts must be perpendicular to the bone, feathered,
   and overlapping, with the parent drawn over the child's cut.
3. **No joint caps / occlusion.** Rigid parts need a disc of shared pixels at each pivot and a mask so the
   parent covers the child's seam.
4. **No edge softening.** The key must keep its anti-aliased ramp; compositing needs a 1 px feather.
5. **The foot is split in the wrong place.** The hindfoot texture carries 28 px of forefoot past the ball
   and 5 px past the declared sole, so an articulating hindfoot drags shoe through the floor.
6. **Wrong hinge anchors** in the foot split.

## What would actually fix it

- **Best:** one shoot, one lens, one light, one wardrobe, shot as a **turntable of the same limb set**
  (near side and medial side of the same arm and same leg, same shoe). Then split the foot at the ball,
  cut along joint-perpendicular curves with overlaps, feather 1 px, add joint caps, and trim every texture
  to its geometric sole. That is a genuine photoreal-ish collage.
- **Middle:** keep the plate for everything visible, and build the far side **from the near side** by
  mirroring + relighting + re-shading (no new photography), accepting that the far shoe shows the wrong
  medial face but at least matching tone, scale, shoe model and hand pose.
- **Cheapest and most honest:** use the photographs as a **texture atlas on the existing vector rig** —
  the geometry, joints, caps and grounding already work there; sample skin/fabric/shoe pixels onto those
  polygons. It will not be a photograph, but it will read as one continuous body instead of a collage.
