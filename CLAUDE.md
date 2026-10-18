# CLAUDE.md — Harmonised Greenfield Discipline (binding synthesis)

This repository adopts [`wshyang/greenfield`](https://github.com/wshyang/greenfield)
**verbatim** — `GREENFIELD.md` and `FDS_BUILDER.md` at upstream commit
`8ba74027be5fad41e48cadde82cc0120d628b109` (copied 2026-10-17) — as its coding
discipline, per `GREENFIELD.md §0` split into focused section files. The upstream
files are the authority for *what* the rules are; **this file is the binding
project synthesis** for *how they apply here*, merging the best elements of every
sibling implementation branch. Per-rule provenance lives in
[`docs/N_WAY_COMPARISON.md`](docs/N_WAY_COMPARISON.md) §4 and
[`docs/ADDENDA.md`](docs/ADDENDA.md) (`ADD-*` local decisions, `CROSS-*`
cross-branch adoptions).

> Agents: read this file first, then only the section file you need. Never load
> the whole corpus. Every "must" below is a merge gate, not a preference.

## 1. Provenance (pinned, never paraphrased)

| Source | Pinned SHA | What we took |
|---|---|---|
| `wshyang/greenfield` `main` | `8ba74027be5fad41e48cadde82cc0120d628b109` | `GREENFIELD.md`, `FDS_BUILDER.md`, `initial-templates/` |
| `arena/917ef347-…` (PR #1, Sprite Motion Lab) | see ledger §1 | verbatim image-prompt log + regeneration justification; `TURN-Lnn` learning log; 4 provenance categories; full-cycle visual audit skill; greenfield-gate test |
| `arena/263385da-…` (PR #2, Stride Lab) | see ledger §1 | motion families (run/walk/brisk); SPEC-vs-FDS split (contract vs evidence register); reusable audit skill; "components render, domain computes" + declared mutation exceptions |
| `arena/77ffb088-…` (PR #3, Procedural Runner) | see ledger §1 | self-refreshing ledger (`BRANCH-TIPS.json` + append-only `BRANCH-HISTORY.json` + marked md region); domain-grouped `src/lib/**`; named-constants rule; adoption queue + retire-exclusivity-claims; opt-in ports proven by fail-then-pass tests |
| `arena/ce6d2a6e-…` (no PR) | see ledger §1 | smallest clean split; co-located test intent; manifest with pivots/bounds; "never fabricate historical prompts" |
| `arena/64422739-…` (PR #4, earlier harmonisation) | see ledger §1 | n-way ledger incl. `main`; parity = behaviour + visual review (hash ≠ parity); `CROSS-*` numbering; dormant-until-needed DB/SHIP-HATS |

## 2. Stack bindings (GREENFIELD §0 placeholders resolved)

| Placeholder | Binding |
|---|---|
| Language/runtime | TypeScript `strict` + `noUncheckedIndexedAccess`, Node ≥20, ESM |
| App | Vite + **vanilla TS** DOM views (no UI framework): a *view renders, a model decides* — the greenfield component/hook rule, mapped to `src/app/views/**` (DOM wiring only) vs `src/app/model/**` (all decisions, pure, unit-tested) |
| Rendering | Dual painter over one pose: browser Canvas2D (live) and a pure-TS RGBA raster (`src/lib/render/raster.ts`) for exports/tests — same solver, same paint order, so tests assert the pixels users get |
| Tests | Vitest, real inputs, **no mocks where it counts** (real JPEG decode, real raster, real manifest); browser e2e deferred (no browser binary downloadable in sandbox — see `docs/ADDENDA.md` ADD-006) |
| Image I/O | `pngjs` + `jpeg-js` (pure JS), exact-pinned |
| Spec | `docs/FDS.md` living spec (`#obj-*`, `#feat-*`, `#surf-*`, `#nfr-*`) + `docs/ADDENDA.md` (`ADD-NNN`, `CROSS-NNN`) |
| Live comparison | `docs/N_WAY_COMPARISON.md` — **the** n-way ledger; refreshed by `npm run branches:compare` |
| Dev/preview | `0.0.0.0:3000`, `allowedHosts: true`, `./dev.sh`; root Dockerfiles contextualised from `initial-templates/` |

## 3. Non-negotiables (merged best of all branches + greenfield)

1. **Decisions in the same change.** Any decision not dictated by the request or
   GREENFIELD goes to `docs/ADDENDA.md` (`ADD-`/`CROSS-`) *with* the code: what,
   why+evidence, related FDS anchor, practical impact. Append-only numbering.
2. **Continuous per-turn learning (binding).** During **every** turn — including
   investigation, review and no-code turns — append/update the next `TURN-Lnn`
   entry in `docs/FDS.md#continuous-learning-log` with: (a) trigger, (b) evidence
   actually inspected (full SHAs, paths, commands, outputs seen), (c) learnings
   including adopted **and rejected/deferred** cross-branch ideas, (d) this
   branch's evidence-backed strengths, (e) validation actually run + next action.
   If nothing was learned, say so and why. Never fabricate prompts, experiments or
   results. Reconcile the entry **before** handoff, not after.
3. **Live n-way parity discipline.** Final goal: **feature parity across all n
   branches** (ledger §1 rows). On every comparative/implementation turn run
   `npm run branches:compare` (fetches exact refs via `git fetch origin
   refs/heads/…`, writes `docs/BRANCH-TIPS.json`, appends
   `docs/BRANCH-HISTORY.json`, patches the marked table region in the ledger);
   then inspect changed tips in **detached temp checkouts** (`git worktree`/`/tmp`
   clones — never switch the session branch, never edit another branch), update
   the feature matrix (§3) and the adoption queue (§4), and append to the
   progress log (§5). **A capability counts as parity only when its behavioural
   acceptance and its relevant visual review pass** — hash or file presence is
   not parity. Retire exclusivity claims the moment a peer matches. Offline →
   record the failure and keep last-known hashes labelled stale. "Live" implies no
   background polling and no auto-merge. After pushing, re-run the refresher: a
   committed document cannot embed its own future hash, so record the first-pushed
   SHA and refresh next turn.
4. **Image-prompt audit log.** Every `generate_image` call logs its **exact
   verbatim prompt**, target `file_path` and reference `images` in
   `docs/FDS.md#image-prompt-log`. Regenerating the same path **appends** (never
   overwrites) the new prompt plus a Regeneration Justification naming the observed
   defect. Never reconstruct missing historical prompts as verbatim.
5. **Real tests, same change.** No feature lands without its test in the same
   commit. Sheet tests decode the real JPEG; render tests rasterise with the real
   pure-TS raster; manifest tests read the real files. A mocked pipeline would hide
   exactly the drift/fringing this repo studies.
6. **Function/module design (GREENFIELD §7).** ≤20-line target / 50-line hard
   limit; guard clauses; nesting ≤3; ≤3 params then Parameter Object; no boolean
   flag params; never mutate domain state in place; Separate Query from Modifier;
   files ≤400 LOC typical / 800 hard (barrel-split beyond); group by domain
   (`src/lib/{geometry,rig,gait,render,pipeline,analysis,vector}`, `src/app/{model,views}`).
   Declared mutation exceptions: browser canvas contexts, raster pixel buffers and
   animation refs at the I/O boundary only.
7. **`data-testid` on every interactive element**, `{component-kebab}__{element-role}`;
   repeated rows share one testid scoped by anchor text. Typed wire/manifest
   contracts: response/asset shapes defined once in `src/shared/types.ts`, typed on
   both sides.
8. **Named constants, no magic numbers.** Gait constants in `src/lib/gait/`,
   body metrics in `src/lib/rig/body.ts`, sheet geometry in
   `src/lib/pipeline/sheet-spec.ts`; each constant has a test or a measured source.
9. **Visual evidence before visual claims.** After any gait/cutout/compositing
   change: render the 16-phase audit sheet (light/dark/joint panels) **and look at
   it** (`read_file`), then record findings + limitations in
   `docs/FDS.md#gait-cycle-visual-audit`. Label diagnostic probes as probes.
   Passing tests ≠ certified seams; more features/tests ≠ better visual quality.
10. **Reproducible artefacts.** `npm run pipeline` must reproduce
    `public/sprites/`, `public/analysis/`, `public/renders/` byte-for-byte; change
    one, regenerate the rest in the same change.
11. **Honest validation (GREENFIELD §8).** Name exactly the layer that ran
    (typecheck / unit / pipeline / build / HTTP / visual). Never claim an unrun
    layer, never present another branch's numbers as locally executed. Full gate:
    `npm run validate`. Append the sandbox caveat to commits made under
    constrained tooling.
12. **Four provenance categories, always separated:** read source code ·
    personally viewed output · locally executed gates · other branches' reported
    results.
13. **Dormant-until-needed:** DB/ORM rules (GREENFIELD §4–§5) recorded in
    `CLAUDE-database.md`, inactive (no data layer); SHIP-HATS kept **inert**
    (`*.shiphats` + `activate-shiphats.sh`) and in step with the local gates.
14. **Session-branch hygiene.** Commit/push only `arena/8dcf54e8-super-duper-funicular`;
    never rename it; reference snapshots live outside the repo (`/tmp`), never as
    branch switches.

## 4. Section index

| File | GREENFIELD § | Project binding |
|---|---|---|
| [CLAUDE-decisions.md](CLAUDE-decisions.md) | §1 | living spec + addenda + learning log + image-prompt log |
| [CLAUDE-testing.md](CLAUDE-testing.md) | §2–§3 | Vitest real-input matrix, deterministic fixtures, deferred e2e |
| [CLAUDE-database.md](CLAUDE-database.md) | §4–§5 | dormant: no data layer in this repo |
| [CLAUDE-conventions.md](CLAUDE-conventions.md) | §6 | testids, typed manifests, user-facing copy rules |
| [CLAUDE-function-design.md](CLAUDE-function-design.md) | §7 | sizes, guards, params, view/model split, raster mutation exceptions |
| [CLAUDE-validation.md](CLAUDE-validation.md) | §8–§9 | validation vocabulary, audit skill, one-command env |
| [CLAUDE-deployment.md](CLAUDE-deployment.md) | §10 | container contract, proxy trust, inert SHIP-HATS |
| [CLAUDE-checklist.md](CLAUDE-checklist.md) | §11 | the thirteen up-front decisions, answered for this repo |

## 5. Quick reference

```bash
npm install                 # pinned deps
./dev.sh                    # install + pipeline + validate + dev server (0.0.0.0:3000)
npm run validate            # typecheck + all tests + production build  (the real gate)
npm run pipeline            # extract → analyse → filmstrip → audit → svg (byte-reproducible)
npm run branches:compare    # refresh docs/N_WAY_COMPARISON.md §1 + BRANCH-TIPS/HISTORY json
npm test                    # vitest, real assets
```
