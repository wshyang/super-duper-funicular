# Revised Photographic Sprite Pipeline Branch — Canonical Functional Specification (`docs/SPEC.md`)

- **Branch:** `arena/62955c1e-super-duper-funicular` — **Companion FDS:** [`docs/FDS.md`](./FDS.md) — **Design of record:** [`docs/PIPELINE_REVISION_PROPOSAL.md`](./PIPELINE_REVISION_PROPOSAL.md) (`#revised-pipeline`)

## 1. Discipline, Filing & Mechanical Gates (`#feat-discipline-gate`, `#obj-image-asset`)

The repository adopts the harmonised GREENFIELD/CLAUDE discipline (`ADD-001`). Artwork is filed under `src/images/` with SHA-256 provenance in `src/images/manifest.json` (`ADD-002`); `src/discipline/greenfield-gate.test.ts` enforces on every `npm test`: corpus + living docs present, `#image-prompt-log`/`#continuous-learning-log` anchors, sequential `ADD-NNN`, manifest hash integrity over real bytes, ≤ 800 LOC per file, ≤ 50 LOC per named function, presentation-only JSX with `data-testid`, Dockerfile contract (`0.0.0.0:3000`, non-root `USER`, `HEALTHCHECK`), and clean inert SHIP-HATS activation.

## 2. Character Lock & Pose Atlas (`#obj-atlas-pose`, `P-R1`, `P-R2`, `P-R8`)

One whole-body `90°` sagittal standing master per persona on `#FF00FF` (arms abducted ~15° for alpha separability), then 3–5 whole-body atlas poses (`A1..A4`) of the same character under one camera/light rig, chosen from the occlusion-coverage table. Acceptance gates per pose: coverage row (each of the 17 parts ≥ 95% unoccluded in ≥ 1 pose), orientation check (right-facing), identity dHash on the head crop. Budget ≤ 8 calls per persona rebuild; every call verbatim-logged with accept/reject rationale.

## 3. Calibration, Decomposition & Material Ownership (`#obj-calibration-dataset`, `#obj-articulated-part`, `#feat-atlas-decomposition`, `#feat-material-ownership`)

Landmarks, source bone vectors/angles, occlusion scores and measured limb widths live in versioned `src/calibration/<personaId>/<poseId>.json` with provenance — no inline pixel rects in code (`P-R3`). Extraction: min-occlusion source pose → isotropic similarity rotation about the proximal landmark → magenta flood-fill matte → semicircular pivot caps with 6 px internal shaft–shoulder blend → measured width normalisation (parity clamps demoted to warnings). Garment/skin texels are owned by exactly one part via landmark-distance rules (shorts sleeve → thigh; sock collar split at the ankle pivot); a global invariant test asserts union-equals-figure and empty pairwise intersections.

## 4. Shading, Rig & Render (`#feat-relight`, `#obj-articulated-pose`)

Parts carry `{ albedo, alpha, proximalPivot, distalPivot, restAngle, shadeParams, materialMask }`. MVP: per-part luminance histogram normalisation against the master + cap gradient easing; full: directional shade model with joint AO so highlights track pose (`P-R5`). The retained 17-part rig, two-bone IK with contralateral phase, 14° forward fall and 2-segment plantar roll (raster chord warp + hinged SVG sub-groups) render unchanged downstream.

## 5. Audit, Evidence & Motion (`#feat-perceptual-gates`, `#obj-evidence-pack`, `#feat-motion-fit`)

The 16-phase dumper gains perceptual metrics — `seamContrast`, `jointGapArea`, `jointOverlapArea`, `stripeDuplication`, `proportionError`, `groundContactDelta`, `strideDtw` — alongside legacy `detachedIslands`/`magentaSpill`/`uncoveredJoints` (all must stay 0). Decision-driving audits commit downscaled evidence packs (`ADD-005`). Optional Stage 6 fits gait curves to tracked reference running data, validated by DTW.

## 6. Route B — Textured 3D Mesh with AI-Assisted Skins (`#route-3d`, `PROPOSAL §11`)

Fixed-topology template mesh + canonical 17-joint skeleton + deterministic UV atlas (`#obj-textured-mesh`). AI generates only: the sagittal master, four orthographic whole-body view plates under identity gates, and **masked inpaint of the code-computed visibility hole mask** in UV space; optional tileable swatches/detail normals. Code owns mesh, UV, bake (`#feat-uv-bake`), delighting, AO, skinning, and rendering via the pure-TS orthographic rasteriser (`#feat-software-renderer`, PoC-proven deterministic at 1.7–19.6 ms/frame). Garments are material slots, so stripe scissoring cannot be expressed; personas differ only by bone-scale vector + baked texture. Budget ≤ 8 calls/persona (1 master + 4 views + 2 inpaint + 1 reserve). Route A and Route B meet at the Sprint-3/4 A/B decision gate (`PROPOSAL §11.12`).

## 7. Migration (`PROPOSAL §6`)

Sprint 1 synthetic ground-truth decomposition harness (zero generations) → Sprint 2 relight MVP + metric baselines on PR `#1`/PR `#8` assets → Sprint 3 one persona end-to-end within budget → Sprint 4 motion fit, SVG parity, CI evidence gates. Acceptance criteria: `PROPOSAL §8`.
