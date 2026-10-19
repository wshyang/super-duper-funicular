# Reference: Prompt Templates

Use these as base; replace bracketed tokens and keep the locked identity/outfit/background clauses verbatim.

## Common preamble (all prompts)

```
Generate one photorealistic full-body biomechanics studio reference of the exact same adult Singaporean Chinese woman runner in image 1. Image 1 alone controls identity, face, skin tone, body proportions, black high ponytail, crimson-red singlet with its crisp white vertical stripe, charcoal-black running shorts, both sky-blue wristbands, white socks, white-and-crimson shoes, studio lighting, camera and subject scale. Image 2 is a solved-joint diagram only: dark = head/torso, blue = camera-near limbs, orange = camera-far limbs, dashed line = ground. Reproduce its limb order and joint positions as realistic anatomy; do not copy its colors, pixels or plain background.
```

## Common suffix (all prompts)

```
Strict 90-degree orthographic right-facing lateral profile; same woman, fixed camera, full-body scale as image 1; entire hair-to-sole silhouette centered in 1408 by 768 landscape frame. One adult person only; natural coherent anatomy; no crop, motion blur, duplicated or missing limbs, fused joints, perspective, three-quarter turn, text, logos, props or collage. Flat matte magenta background matched to image 1, no visible floor, gradient, texture or cast shadow; pure magenta must fill every gap between legs and under both shoes; crisp even studio light.
```

## H03-v2 Compact Toe-Off (first attempt)

```
H03 v2 is a compact Right Pass forefoot toe-off study, not a sprint. The blue near leg has its forefoot ball and toes pressed flat on the invisible ground line, heel visibly lifted 12-15 mm above it, ankle extended, knee flexed about 135 degrees, shin angled backward and left at about 102 degrees from horizontal. The orange far leg has its hip flexed only about 28 degrees forward, knee lifted modestly forward and right of the hip, shin dropping almost vertically down to a shoe held just below knee height, not stretched long. Keep the total inter-foot span 220 to 280 pixels, do not extend into a 400 plus pixel sprint split. Keep both knees and shoes separated by magenta. Arms counter-swing as in guide, head faces right, torso lean only as guide.
```

## H03-v3 Grounded Toe-Off Retry (stronger contact)

```
This is a grounded forefoot contact study. The blue near leg support shoe has ONLY its forefoot ball and toe tips touching the invisible ground dashed line, heel raised visibly 12 to 15 millimeters, ankle plantar-flexed, shin angled backward left about 105 degrees. The orange far leg swing shin is nearly vertical dropping down, shoe held just below knee level with clear magenta gap to the ground and to the other shoe. The left foot is the only contact; the right foot must be clearly airborne with pure magenta beneath its sole. Do not float both feet, do not make a high-knee sprint leap with both feet airborne, and do not extend the rear leg straight. Keep the inter-foot distance compact 220 to 280 pixels, both shoes fully visible and separated by magenta. Copy the guide arm swing and torso lean.
```

## H06-v2 Left Down

```
H06 v2 is a left down sole-roll and cushion phase, not a sprint. The orange far leg is the loaded support leg, flex its knee deeply into a lower body position, keep its shin readable and its shoe sole pressed flat on the invisible ground line with clear magenta around it. The blue near leg trails behind toward image left in a bent swing-recovery shape, its shoe lifted 20 to 40 mm above the ground with clear magenta gap beneath it, not touching the support leg. Keep the total inter-foot span modest, not an elongated split. Copy the guide's arm counter-swing and torso inclination; hands remain attached, head faces right, ponytail follows motion.
```

## H07-v2 Compact Toe-Off (left-side success case)

```
H07 v2 is a compact Left Pass toe-off, not an extended sprint. The orange far leg is the support leg in toe-off: only its forefoot ball and toe tips touch the invisible ground line, its heel is clearly lifted 12 to 15 mm above the line, ankle extended, knee slightly flexed. The blue near leg is the swing leg, hip flexed modestly forward about 35 degrees, knee lifted forward and right of the hip with shin dropping vertically to a shoe held just below knee height. Do not make a high-knee leap or extend the rear leg straight back. Keep both knees and both shoes clearly separated by pure magenta gaps, total stride compact 240 to 300 pixels. Arms as in guide, head faces right.
```

## X07 Low-Forward Forearm

```
X07 is a targeted camera-far forearm visibility insert, not a canonical gait phase. Keep the exact H02 body, leg, and blue camera-near arm arrangement shown in the guide. Change the orange camera-far arm to the guide's low-forward range: shoulder stays attached, upper arm angles slightly forward and right to an elbow just outside the front edge of the shorts, and the forearm continues forward and slightly down at about 20 degrees so the full forearm, sky-blue wristband, and relaxed closed fist are individually visible against magenta beyond the torso silhouette. Do not hide the forearm behind the chest, overlap it with the blue near arm or face, or let it touch the torso. Preserve a natural bent running elbow and wrist; keep the camera-far limb anatomically on the far side and behind the torso where it crosses the body. Keep the opposite blue near arm in its guide pose and make its hand separately readable. Do not mirror the subject or swap near/far sides.
```

## Bare-limb ORTHO Matrices (PR #1)

For maximal thigh exposure, use declared bare-limb variants:

```
... minimalist matte-black athletic sports bra top + high-cut matte-black athletic bikini brief sitting at pelvis so 100% of upper, middle, lower thighs are bare skin to hip joint, completely barefoot and bare-wristed. ORTHO-A: 0° horizontal forward near arm, 90° vertical bare thigh, 180° horizontal rear hamstring-curl calf, 0° flat bare foot.
```

## Negative additions (always)

- No black/dark wristband
- No floor, gradient, texture, cast shadow, horizon
- No crop, blur, duplicated/missing limbs, fused joints, perspective, three-quarter turn

