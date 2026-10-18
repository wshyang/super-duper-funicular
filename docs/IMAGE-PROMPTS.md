# Image-generation prompt log

Canonical prompt-provenance policy is in [`docs/FDS.md` §9](FDS.md#image-prompt-log) and [`CLAUDE.md`](../CLAUDE.md). This file is an optional detailed register for source-image generations once that set grows; until then the FDS anchor is authoritative.

No image-generation calls have been made on this session branch as of Stage 1. The original JPEG's generation prompt and external provenance are unknown. Prompts and assets from peer branches belong to those branches and are not copied into this history.

For each future generated asset, record the exact prompt verbatim, target path, exact reference-image paths, selected output path/hash, generation date, visual review outcome, and acceptance status. A regeneration appends a new record with an explicit defect-based reason; never overwrite prior prompts or reconstruct missing history as verbatim.
