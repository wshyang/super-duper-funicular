# Quantitative Sprite Animation Flaw Analysis (Harmonised)

Reproduced from the most complete branch analysis (`arena/917ef347` `5c48767` + adoption in `arena/77ffb088`). Full report in `docs/FDS.md#feat-analyze` and `docs/N_WAY_BRANCH_COMPARISON.md` dimension 3.

Key metrics on `incorrect running sprites.jpeg` (`2528×1696`, `132 px` header + `6×8` grid):

| Flaw | Measurement |
|---|---|
| **FLAW-01 Half-cycle duplication** | Columns 5–8 are near-exact copies of 1–4: **94.7% mean centroid-aligned silhouette IoU**, `dHash` distance `0–4 bits`. Only **4 unique poses** per row (`24` of `48`). |
| **FLAW-02 Peg-leg / unilateral lead** | Far leg extended front `> +53 px`, near leg behind `< -92 px` in all 8 frames — no alternation; header claim "(Alternating Gait)" false. |
| **FLAW-03 Zero leg crossover** | `minFootSeparationPx = 147 px`; legs never pass beneath hip; no airborne `Pass` phase (`φ=0.25/0.75`). |
| **FLAW-04 Scale & baseline jitter** | Height `211→231 px` (`Δ 20 px`), baseline shift `25 px` across columns. |
| **FLAW-05 Two-tone magenta + JPEG spill** | Dividers `#FF00FF` + cell fills `#FD49FD` with JPEG 8×8 DCT chroma fringe requiring 2-stage flood + interior-island + despill. |

Impact: The reference 8-frame animation is not usable as-is. The harmonised pipeline deduplicates, extracts, and replaces it with a corrected 17-part IK + contralateral gait solver (`FLAW-01..04` eliminated, `FLAW-05` handled in pipeline).

