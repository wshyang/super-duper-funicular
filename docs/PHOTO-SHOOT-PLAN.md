# Photographic shoot plan (female runner)

Goal: far-side limbs that match the near plate in body, wardrobe, lighting and scale, so the cut-out rig
composites into one continuous runner rather than a collage.

## What the plate already provides

`sg-chinese-female__neutral-profile__chroma-green__source.png` is the only "hero" plate. It contains both
arms and both legs, but in posed positions:
- near arm: hanging, hand at the hip → usable as the animation neutral;
- far arm: raised forward with an open palm → a genuine medial/palm view, but useless as a neutral,
  because rotating a raised arm down to a hanging carriage tears the shoulder;
- near leg: planted; far leg: bent behind → same problem for the swing phase.

So the hero plate supplies the **near side and the trunk**. The far side needs references shot in the
*neutral carriage* (hanging / standing) that the rig animates from.

## Shot list (3 images, one per far limb group)

| # | file | pose | must match |
|---|---|---|---|
| 1 | `…female__far-arm-medial__chroma-green__source.png` | left arm straight down, palm to camera | plate skin tone, red racerback strap at the shoulder |
| 2 | `…female__far-leg-medial__chroma-green__source.png` | left leg straight, shorts hem at the top | navy shorts, plate skin tone, no sock |
| 3 | `…female__far-lower-leg-medial__chroma-green__source.png` | mid-calf to sole, medial ankle and arch to camera | white ankle sock, same navy/orange shoe as the plate |

Shared contract for all three, stated in the prompt:

- plain chroma-key green background, no props, no text, no logos;
- **same light**: large frontal softbox, warm neutral white, no rim light, no coloured bounce;
- **same wardrobe and skin tone** as the hero plate;
- **same camera distance**: the limb fills the frame the way the plate's limb does, so cut-outs resample
  by a factor near 1.0 rather than being blown up;
- **medial surface to camera**: inner ankle and arch visible; palm and inner forearm visible.

## Why the frame matters

The extractor rescales each far piece so its joint-to-joint distance equals the near rig's bone length,
then fits its silhouette width to the near part. Both steps degrade the texture when the source is a
close-up (upsampling) or a wide shot (downsampling). Shooting at the plate's scale keeps both factors
near 1.0, which is what makes the pieces composite cleanly.

## Acceptance for the re-shoot

1. `npx tsx .scratch/widths.ts` → every far limb within 15 % of its near part (currently ≤ 4 % after the
   silhouette fit; the raw cut should already be within ~20 %).
2. `npx tsx .scratch/tones.ts` → far luminance within 0.85–0.95 of near (the shadow tint supplies the rest).
3. `reports/photo-zoom.png` → no rectangular slab edges at hip, knee, elbow or wrist; no shoe below the
   ground line; no lace panel swinging with the toe.
4. `npm run validate` green.

## Shot contract v2 (after the round-5 review)

The first male references broke three rules, all of which cost a re-shoot:

1. **One articulated element per frame.** The far-leg shot showed a sliver of the other thigh behind the
   near leg. Every far reference is now a single isolated limb: no second leg, no foot, no hand, no torso
   edge, no head. State the exclusions in the prompt, not just the subject.
2. **Medial surface and palm to camera.** The far arm is the runner's *left* arm, turned so the inner
   upper arm and inner forearm face the lens, with the open palm facing the lens too. A right arm twisted
   round, or a lateral view, cannot be mirrored without reversing the anatomy.
3. **No cast shadow.** Flat frontal light, no floor contact shadow. The key handles a green shadow, but a
   grey one keys as subject and then survives as a speck or a halo; `dropSpecks` is a safety net, not a
   licence.

Composition: portrait 9:16 for the neutral plate (the figure must fill the frame crown to sole), landscape
only for the single-limb references, which are cut to the limb's joint-to-joint span.
