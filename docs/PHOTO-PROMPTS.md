# Photographic Image Prompt Log

Adopted from the sibling branch's `FDS.md` discipline (`arena/917ef347`, ADD-018): every
`generate_image` call in this repository is logged chronologically with its exact verbatim prompt,
its target file, its reference images, and — whenever an existing file is replaced — a regeneration
justification. The point is that a diffusion regression is never re-litigated from memory.

---

## Call `#1` — `src/images/photo/sg-chinese-female__torso-only__chroma-green__source.png`

- **Date:** 2026-10-18
- **Target file:** `src/images/photo/sg-chinese-female__torso-only__chroma-green__source.png`
- **Reference `images`:** `['src/images/photo/sg-chinese-female__neutral-profile__chroma-green__source.png']`
- **Exact prompt used:**

  > "Isolated studio photograph of ONLY the armless torso of the fit Singaporean Chinese female
  > sprinter from the reference image, viewed in a strict 90-degree right-facing lateral side profile
  > (chest on the right, back on the left), in the identical upright standing pose, body scale and
  > in-frame position as the reference photograph. She wears the same fitted crimson-red mesh athletic
  > running singlet and the same navy-blue athletic running shorts with curved side-slit hem as in the
  > reference. Absolutely NO arms, NO hands, NO fingers, NO arm stumps, NO head, NO neck, NO legs and
  > NO feet — the torso is cleanly armless, shoulders terminate in smooth rounded arm sockets at the
  > singlet armhole, and the shorts end in a clean straight hem with empty space below. Flat even
  > studio lighting, zero shadow, isolated on a solid flat chroma green (RGB 0, 177, 64) background
  > exactly like the reference photograph's green screen. No other people, no mannequin stands, no
  > props, no text."

- **Why this generation:** the original profile plate has the arms pulled back against the trunk, so
  the torso cut carried an arm ghost no colour matte could fully excise (ADD-027 mitigated it; this
  plate removes the cause). The user asked for the torso to be generated "of her torso without any
  arms".
- **Result (measured):** 768 x 1376, same canvas as the base plate. Garment-only: no limbs, no head,
  no neck — the neck hole and armholes show the green screen through the empty garment. Fabric
  anchors measured with garment-only classification: shoulder-strap apex `[328, 162]`, shorts hem
  `[261, 1015]`; base-plate pair `[346, 269]` and `[310, 779]`; fit scale 0.5975.
