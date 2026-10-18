# Validation and evidence

## Evidence vocabulary

Every progress report and FDS learning entry distinguishes these four evidence classes:

1. **Read:** source code or documentation inspected at an exact full SHA.
2. **Viewed:** an output/image personally opened and examined; name the path and view scope.
3. **Executed:** command run in this checkout, with result, date/environment, and important omissions.
4. **Reported:** a claim in a peer PR, README, or validation document. It remains externally reported until independently run here.

Do not promote one class into another. A green build does not prove visual correctness; a reference PR's validation list is not a local test run.

## Implementation gate

When the package exists, define a single `npm run validate` command that runs strict typecheck, lint/format checks, unit and real-asset pipeline tests, and production build. Browser E2E is a separately named gate if the sandbox cannot run it; report exactly why. Record `docs/VALIDATION.md` with exact commands, counts, environment, visual artifacts viewed, and gates not run. Do not hard-code stale test counts into standing instructions.

## Gait/image visual acceptance

For gait, photo, cutout, mask, or compositing changes:

1. Generate a cycle audit with at least 16 evenly spaced phases over `[0,1)`, including odd/intermediate phases rather than only the eight canonical sheet frames.
2. Render each phase on light and dark backgrounds and with a joint/rig overlay, through the actual app renderer and current settings.
3. Open the sheet; magnify the relevant joints and inspect multiple phases and control extremes. Check ground contact/clearance, gaps, overlap order, disconnected pixels, color spill, edge fringing, clipping, width changes, and frame registration.
4. Record the exact motion, phase, crop, and observed limitation. Fix only evidence-supported causes; rerender after changes.
5. State explicitly that the audit is a review aid, not an anatomical, biomechanical, or seamlessness certificate. Metrics (IoU, pixel ownership, spill, width parity) require documented thresholds and cannot replace the visual review.

See [`.claude/skills/audit-gait-cycle/SKILL.md`](.claude/skills/audit-gait-cycle/SKILL.md) for the reusable checklist.

## Constrained environments

If a browser, image library, container engine, or network is unavailable, run only checks that are meaningful in the available environment and state the limitation. Never say “tests pass” when only syntax, documentation, or static checks ran. Preserve the exact failing/unavailable command for the next reviewer.
