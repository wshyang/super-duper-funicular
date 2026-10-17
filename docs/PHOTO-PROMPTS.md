# Image-generation provenance log

Append-only. Every image-generation call records, in this order:

1. **Call id** (`GEN-001`, `GEN-002`, …).
2. **Target path** — the file path that was written.
3. **Reference images** passed to the generator (paths), or "none".
4. **Exact prompt**, verbatim in a block quote.
5. **Outcome** — what was produced, and what was wrong with it.
6. **Regeneration justification** — only for a second or later call targeting the same path: the
   specific observed defect (anatomy, chirality, camera yaw, illumination, segmentation) and how the
   new prompt addresses it. Earlier prompts are never deleted.

## Status

**No images have been generated in this repository.** The procedural runner is drawn from code; the
only artwork is the committed source sheet, which was authored outside this session.

If a generation is added later, log it here **in the same turn**. Do not reconstruct a historical
prompt for any artwork that was produced outside this log; record it as "prompt unavailable" rather
than inventing a verbatim quote. Inventing provenance is worse than having none.

## Why this exists

Sprite Motion Lab keeps the most complete log of the siblings (`docs/FDS.md#image-prompt-log`, 21+
calls with regeneration justifications) and Funicular keeps a narrower one
(`docs/PHOTO-PROMPTS.md`). Both were written prospectively. The rule that made them useful is not the
format — it is that a regenerated image always names the defect the new prompt fixes, so a reviewer
can tell an improvement from a reroll.
