# Validation · 2026-10-17

Executed in this checkout:

- `npm run typecheck` — passed (strict TypeScript).
- `npm run lint` — passed (ESLint + TypeScript rules).
- `npm run format:check` — passed.
- `npm test` — 8 passed: loop closure, limb exchange, leg-length sweep over stride/lift extremes, stance speed/ground contact, flight/no penetration, torso/arm lengths, opposing arm direction, and C1 foot velocity boundaries.
- `.venv/bin/python scripts/test_extract.py` — 8 passed: chroma key, canonical hashes, source inventory, protected purple highlights, detected grid, real PNG alpha/bounds/hash integrity, exact duplicate aliasing, and deterministic regeneration.
- `npm run test:e2e:sandbox` — 3 real-browser tests passed **with video**: controls/playback/source/export; manifest plus all 48 PNG URLs; mobile width and non-overlapping controls. No mocked backend or assets.
- `npm run build` — production build passed; source JPEG bundled and public sprite assets copied.
- `npm audit` — zero reported vulnerabilities at validation time. `compression` is explicitly overridden to patched 1.8.2 because `serve` otherwise resolves a vulnerable release.
- Original JPEG hash matches `git show HEAD:'incorrect running sprites.jpeg'`: `f99114235d61781f76a6b32c637edac16f13af6592a2866fe0e0528504727030`.
- Desktop/mobile screenshots were visually inspected. The cutout was composited against a neutral background to inspect violet-shirt retention and shoe bounds. Scratch screenshots/videos are not committed deliverables.

## Environment and limits
The standard Playwright browser CDN is blocked by the sandbox network policy; its browser download failed. Tests ran successfully using npm-distributed Chromium 138 and ffmpeg via the documented Linux fallback, not Playwright's default Chromium version. Video files were confirmed non-empty.

Docker image builds, cloudflared operation, SHIP-HATS remote execution/schema compliance, Bash 3.2 compatibility execution and hadolint/ShellCheck were **not** run. The deployment/CI starters are not a compliance certification. No permanent public hosting was provisioned. The live preview and every `/sprites/…` URL are available while the preview is running; deploy `dist/` for durable hosting.

## Articulation follow-up · 2026-10-17

Added six tests **before** the new rig implementation (confirmed failing first). All 14 motion tests now pass, including planted-toe roll, sole clearance and limb lengths over lean/stride/lift extremes, ankle/head boundary velocity continuity, independent neck/head orientation, and hip/chest forward displacement. Strict typecheck, ESLint, formatting, production build and all three real-browser/video tests were rerun. A desktop frame at push-off was visually inspected. Extraction is unchanged in this follow-up.

## Persona follow-up · 2026-10-17

Strict typecheck, ESLint, formatting and production build passed. All **16 unit tests** and **4 real-browser tests with video** passed. The added tests cover distinct persona definitions and looping ponytail motion; the browser verifies changed live/thumbnail pixels, preserved cadence, female-persona export naming, return from source mode, and pixel-identical restoration of the male persona at the same phase. Desktop female-persona rendering was inspected visually. Original sprites and extraction logic are unchanged.

## Photographic female follow-up · 2026-10-17

- 18 TypeScript unit tests passed, including orientation-preserving endpoint transforms for every photographic part and independently sourced near/far counterparts.
- 8 original artwork/extraction tests and 3 new photographic preprocessing tests passed. The new tests check white-sock/teal preservation, all 16 RGBA/hash/landmark contracts, and deterministic output regeneration. The source inventory now includes the nine generated images alongside the original JPEG.
- 7 real-browser tests with video passed. New coverage verifies high-resolution photo rendering and phase changes, preserved pixel options, fixed-kit controls, 5120×640 RGBA PNG export, every public photo-part URL, photo gallery, mobile layout, failed-load feedback and successful retry.
- Strict typecheck, ESLint, formatting and production build passed. Desktop photographic poses and part cutouts were visually inspected; chroma-key correction was revised after detecting white-sock loss, and joint crops were rounded to reduce protruding corners.
- Nine images were generated; none of the far-side surfaces are mirrored near-side assets. Generation quality is assessed visually, not guaranteed by code tests. Joint seams and 2D-perspective limitations remain, explicitly documented in the app and photographic-rig notes.

## Hip socket follow-up · 2026-10-17

22 TypeScript unit tests and 8 real-browser/video tests passed, alongside strict typecheck, ESLint, formatting and production build. New unit coverage verifies waist retention, hem removal, symmetric rounded feathering, offset calibration and explicit near/far layer order. The new browser test verifies that original comparison is inspector-only, slider edits alter the main rig, reset restores identical pixels, downloaded JSON contains the chosen calibration, and the exported pelvis PNG has zero alpha in the former static hem region. Magnified original/rounded push-off screenshots were inspected visually. Source PNGs and preprocessing output were not modified in this follow-up; remaining photographic texture seams are not claimed to be eliminated.

## Walking follow-up · 2026-10-17

34 unit tests and 12 real-browser/video tests passed. The 12 added gait tests (six per walking profile) cover continuous support and double-support duty, heel strike/toe-off, stance locking, loop/ankle velocity continuity, arm and leg lengths across all profile control extremes, sole clearance and relaxed arms. Tests were observed failing against the running-only model before adding the walking mechanics.

Four new browser cases verify per-motion settings/reset, walking phase/support labels, return from the original run comparison, and walking/brisk-walking rendering/export on all three personas with mobile-width checks. Strict typecheck, ESLint, formatting and production build passed. Photographic walking cycle/contact poses were visually inspected and pelvis height adjusted to reduce crouching. Existing image sources and extraction artifacts are unchanged; no new images were generated for these motions.

## Element end cutter follow-up · 2026-10-17

37 unit tests and 13 real-browser/video tests passed, with strict typecheck, ESLint, formatting and production build. New pure tests cover corner removal on both sides of the joint plane, independent distal/proximal masks, shaft retention, symmetry, feathering and endpoint disabling. The browser test exercises isolated rotation and assembled comparison without changing the main pose, edits a thigh cap, verifies changed live pixels, downloads an unchanged-size registered PNG, checks alpha was only removed and the pivot alpha preserved, verifies independent start/end settings and separate far-side settings in JSON, resets to identical rendering, switches to an arm, and checks mobile width. Isolated and assembled thigh close-ups were inspected visually. This does not establish seam-free photorealism at every joint; pre-existing missing texture and shading mismatch remain.

## Cross-branch audit follow-up · 2026-10-18

39 unit tests and 14 real-browser/video tests passed; typecheck, ESLint and production build passed. Two new layout tests first failed on the missing audit-layout module. New browser test checks all three photographic motion exports, dimensions/names, content in all 48 panels per sheet, and unchanged main pose. Generated artifacts are in the ignored cycle-audit test output directory. Running/walking sheets were visually reviewed; a footer contrast defect was corrected. Other-branch source was inspected but not built/tested; unchanged Python extraction tests were not rerun. These tests do not certify seamless joints or implement anomaly metrics. See FDS L001 and the audit skill for limitations.
