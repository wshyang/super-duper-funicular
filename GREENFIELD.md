# GREENFIELD.md — harmonised standing discipline for this repository

This file is the **template we adopt**, not a description of any one sibling
branch. It merges the upstream `wshyang/greenfield` template (`GREENFIELD.md`
and `FDS_BUILDER.md` at commit `8ba74027be5fad41e48cadde82cc0120d628b109`) with
the practice that survived review across four sibling implementations of the
same app (`arena/917ef347`, `arena/263385da`, `arena/77ffb088`, `arena/ce6d2a6e`).

It is deliberately project-agnostic: substitute the concrete stack in
`CLAUDE.md`. Every rule marked **must** is a merge gate, not a preference.

Sources of each rule are marked in the change log at the end so the merge is
auditable rather than folklore.

---

## 0. Documentation architecture, decided on day one

- **One index, focused sections.** `CLAUDE.md` is the index and the
  project bindings. Each `##` section of this file becomes one
  `CLAUDE-<topic>.md` file so an agent can load only what it needs.
- **One living functional spec** (`docs/FDS.md`) plus a **sequentially numbered
  addenda register** (`docs/ADDENDA.md`) for every decision the base spec does
  not dictate.
- **One evidence register, never a second spec.** The FDS records evidence →
  observation → decision → validation → next action. It links to the addenda
  instead of duplicating the contract.
- **One live comparison ledger** (`docs/N_WAY_COMPARISON.md`) that tracks every
  parallel branch of the same product, its latest observed hash and its
  capability parity.
- **One validation record** (`docs/VALIDATION.md`) naming exactly which layer
  ran, and **one plan** (`PLAN.md`) holding the live investigation queue and the
  failed-experiment register.

Retrofitting this architecture later is churn nobody needs; decide it before
the first feature.

## 1. Record every decision, in the same change

The costliest avoidable defect in a long-lived project is a spec that silently
drifts from the implementation. It forces every future reader to
reverse-engineer intent from commits and chat.

- Write an addendum **in the same change that makes the decision**, never as a
  follow-up. Each entry states: (1) what was decided, (2) why, (3) which spec
  area it touches, (4) the practical impact on future readers.
- Number addenda sequentially (`ADD-001`, `ADD-002`, …). Append forever; never
  renumber and never silently rewrite history. Date a correction instead.
- Keep addenda independent of the base spec's own numbering so the base spec
  stays stable.
- `CLAUDE.md` must tell future agents to do this without being asked.

## 2. Write tests first, and keep them real where it counts

- **Add or update the test in the same change as the feature.** A feature
  without its test is unfinished, not "tested later".
- **Run against real inputs.** Decode the real artwork, rasterise with a real
  painter, exercise the real solver. Mock the API boundary at most; never mock
  the thing whose bugs you are trying to find (decoder, chroma key, IK, gait).
- **Every route or capability needs both a positive case and an adversarial
  negative case.** For a web API that is a session-scoping/IDOR-style negative
  test with a *valid* session belonging to the wrong party, not just "no token →
  401". For a renderer it is an out-of-range phase, an unreachable IK target, a
  corrupt asset or a missing file.
- **Observe the test fail before it passes.** When adding a test for new code,
  run it against the absent/broken implementation first and record that it
  failed for the expected reason. A test that never failed has not been shown to
  test anything.
- Adopt a security-test matrix (e.g. OWASP Top 10) for every endpoint the day a
  backend exists, with an explicit applicability assessment per category.

## 3. Test infrastructure defaults

- **Browser tests record video by default**, with one documented env-var
  off-switch (`E2E_VIDEO=off`). Discovering a suite was blind on failure is
  avoidable.
- **Isolate environments hard**: a separate test database, unique-per-run
  identifiers, self-contained provisioning, parallel-safe suites.
- **Realistic deterministic fixtures** — named people and domain-true values,
  not `user-123`.
- **Layout by type, decided on day one**: `tests/unit`, `tests/integration`,
  `tests/e2e`, `tests/fixtures`; co-located unit tests where the project prefers
  them. Pick one and keep it consistent.
- **Constrained-sandbox fallback is test tooling, not runtime.** If the browser
  CDN is unreachable, prepare a package-managed browser and say so; never make
  the product depend on the workaround.
- **Automate the discipline itself.** A gate test must enforce the rules that a
  reviewer would otherwise police by eye: file and function length, JSX purity,
  `data-testid` coverage, container contract, inert-pipeline placeholders,
  document presence, ledger/capability sync. A discipline that is not executed
  is a wish.

## 4. Data layer discipline (dormant until a database exists, then mandatory)

- **One casing, one mapper.** Pick camelCase in the domain and let the ORM map
  to snake_case columns. Never add a second hand-written mapper layer.
- **All CRUD through the ORM**; schema, data access and typed domain objects
  change together.
- **Soft deletion from day one**: nullable `deleted_at`/`expires_at`, partial
  unique index `WHERE deleted_at IS NULL`, `invalidate` instead of `delete`,
  active-row filtering on every read *and every authorization check*.
- **Timestamp-ordered IDs** (UUIDv7), minted in exactly one place.
- **System actors are real rows**, never sentinel strings.
- **A foreign key proves existence, not validity**: reject references to
  soft-deleted targets at write time.

If the project has no data layer, `CLAUDE-database.md` says so explicitly and
the rules stay recorded for the day one appears. Do not pretend they apply.

## 5. Schema evolution (when a schema exists)

- **Two halves, one commit**: (a) a wholesale, self-contained snapshot a new
  database applies from zero — every `CREATE TABLE` lists every current column;
  (b) a sequentially numbered, idempotent migration that an existing database
  applies, recording itself in `schema_migrations`.
- Apply pending migrations on boot; also provide a standalone command.

## 6. Conventions that prevent whole classes of bugs

- **`data-testid="{component-kebab}__{element-role}"` on every interactive
  element**, written at authoring time. Repeated rows share one testid and are
  scoped by anchor text. The gate test enforces presence.
- **Typed contracts at every boundary.** Define the wire/manifest shape once and
  type both sides of it; a rename becomes a compile error instead of a runtime
  `undefined` that silently blanks a panel.
- **Reproducible generated artefacts.** Re-running the generator must reproduce
  the committed output byte-for-byte, or the generator is not deterministic
  enough to trust.
- **User-facing copy stays user-facing.** Rationale, slugs and internal design
  names live in docs and comments, never in shipped labels. External contract
  keys stay exactly as the external system spells them.
- **No magic numbers.** Every tuned constant has a named constant, a unit and a
  comment; behaviour-changing numbers get a test.
- **Determinism at the source.** No `Math.random()` in domain code; if a build
  needs noise, seed it.

## 7. Function and module design

### Size and extraction
- **≤ 20 lines target** per function body, **50 lines hard limit**.
- If a block needs a comment to explain it, extract it as a named function.
- One level of abstraction per function: orchestration and detail do not mix.

### Control flow
- Guard clauses at the top; never `if/if` for the happy path.
- Maximum nesting depth **3**; beyond that, extract.

### Parameters
- **≤ 3 parameters**; beyond three, pass a typed parameter object.
- **No boolean flag parameters** — split the function or pass a mode union.
- Preserve the whole object rather than exploding it into scalars.

### Naming
- Names reveal intent; rename as understanding improves.
- Booleans read as `is/has/should/can`; functions as verb + noun.
- No abbreviations in domain code.
- **No hand-tuned magic number without a name.**

### Mutation
- Never mutate domain state in place; return a new object.
- Separate Query from Modifier: a function returns a value **or** performs a
  side effect, never both.
- Explicit, documented exceptions at the I/O boundary (pixel buffers, canvas
  contexts, animation refs) are allowed only when named and contained.

### Frontend: a component renders, a hook decides
- Split along the **server/domain boundary**, not along "looks like state".
  The component owns layout, view-only state, event wiring and DOM-only side
  effects; the hook owns data access, derivations, validation and fetching.
- **The hook returns a plain object; the component destructures it.** No JSX in
  the hook, no data-layer import in the component (`grep -c "lib/api"
  <Component>.tsx` must be `0`).
- Hooks live beside their tests and must not import components.
- **Move bodies, don't rewrite them.** A separation refactor is verifiable by
  diffing the extracted body against the original with whitespace normalised;
  anything not identical is a behaviour change in a refactor's clothes.

**Keep the JSX interior presentation-only.** Between `return (` and its closing
`)`: only markup, bindings computed above, and wiring.

- No `.filter()`, `.reduce()`, `.sort()`, `.find()`, `.some()`, `.every()`,
  `new Date()`, `.toFixed()` or `JSON.parse()` inside JSX. A bare `.map()` that
  renders a list is fine.
- Compute a derivation once; if an expression repeats a predicate it is two
  rules that merely happen to agree today.
- Inline handlers are wiring only. A branch or a computation moves above the
  return, or into the hook.

### Module and directory structure
- Group by **domain feature**, not by type.
- Files ≤ 400 lines typical, **800 hard limit**. Split before merge.
- Split with the **barrel pattern** (`export * from './sub/index.ts'`) to avoid
  call-site churn.
- No circular dependencies between peer domains; one concern per file; file
  names are contract.

### Smell → remedy

| Smell | Remedy |
|---|---|
| Long function (> 50 lines) | Extract Function |
| Deep nesting (> 3) | Guard Clauses |
| Long parameter list (> 3) | Parameter Object |
| Boolean parameter | Remove Flag Argument |
| Feature envy | Move Function |
| Message chain | Hide Delegate |
| God module (> 800 lines) | Domain split + barrel |
| Mutable data | Encapsulate Variable, Query/Modifier split |
| Duplicated code | Extract Function |
| Logic inside JSX | Named binding above the return, or the hook |
| Same derivation twice | Explaining Variable |
| Fat handler carrying a branch | Extract Function |
| Speculative generality | Remove (YAGNI) |

## 8. Validate early and honestly

- **Name the layer that ran.** The full gate is typecheck + lint + format +
  unit/integration + end-to-end + build; a subset is a subset.
- **Separate provenance categories, always** (adopted from Sprite Motion Lab and
  extended to five):
  1. **Read** — source inspected in a detached checkout.
  2. **Viewed** — output personally opened and looked at.
  3. **Executed** — a command actually run in this repository this turn.
  4. **Peer-reported** — another branch's claim, never counted as ours.
  5. **Unverified** — accepted as unknown.
- **Never upgrade a lower claim into a higher one.** "Units pass" is not "the
  app works"; "the build is clean" is not "the pixels are right".
- **Passing tests do not certify visual quality.** A seam, a detached shoe or a
  chroma halo is invisible to an assertion unless the assertion measures it.
- Append a caveat to the commit when a gate could not run.

## 9. Reproducible local development

- **One command** stands up the environment: install, generate assets, run
  tests, start the dev server on `0.0.0.0:3000`.
- Separate config from secrets: committed `.env.example`, uncommitted `.env`,
  distinct `.env.test`.
- Decide the toolchain up front (runtime, package manager, test runner, CI) and
  keep it identical across app, tools and CI.
- Generated assets are either committed and reproducible, or ignored and
  regenerated; never half-committed.

## 10. Deployment and CI from day one

### 10.1 Container contract (active immediately)
- Listen on **port 3000 on `0.0.0.0`**, expressed in `HOST`/`PORT` env, with
  `EXPOSE 3000`.
- Multi-stage production image from the lockfile; pinned base image version and
  distro; unprivileged **numeric** user; `HEALTHCHECK`; `.dockerignore` that
  keeps `.env*`, `.git`, `node_modules`, build output and reports out while
  preserving platform-supplied directories.
- A development container preserving the platform agent contract, and a
  `cloudflared` container pinned with `--no-autoupdate` and a runtime-only
  tunnel token.
- **Trust proxies by address, not hop count.** Believe forwarded headers only
  from loopback/link-local/private ranges. "Trust everything" lets a client
  choose its own address; "trust nothing" makes per-client limits global and
  hides HTTPS.
- **Test the contract**: feed the image's `ENV` through the real config loader
  in a unit test; in CI, run the image as a service and reach it by network
  alias; lint Dockerfiles.

### 10.2 SHIP-HATS (researched October 2026)
- GitLab Dedicated, SonarQube, Nexus IQ, Fortify, Jira/Confluence; classified up
  to CONFIDENTIAL (CLOUD-ELIGIBLE).
- `include:` the pinned SHIP-HATS templates (`v1.1.12` as of September 2026);
  `include:` cannot take variables.
- Compliance is a Pipeline Execution Policy from the WOG Security Policy
  Project; policy jobs never see project YAML variables, so configure through
  project/group CI/CD variables (`CF_LEVEL`, `SONAR_*`, `NEXUS_IQ_*`,
  `COSIGN_PASSWORD`, `FOD_PAT`). `CF_LEVEL` 1–4 adds static scans → DAST →
  signing → SLSA/SBOM.
- Runners: default CStack (non-root, cannot build images), `ship_docker*` (root,
  not privileged — Kaniko only), GitLab-hosted pilot. Jobs cap at two hours.
- Supply chain: pull through Nexus proxies; components younger than seven days
  fail Nexus IQ (pin and let releases age); EOL images blocked from 1 November
  2026; artefacts expire after 180 days.
- Git over HTTPS requires a PAT or SSH key from 16 October 2026; tokens expire
  within 180 days.

### 10.3 Keep the pipeline inert until the move
- Every SHIP-HATS file carries a `.shiphats` suffix so GitHub, GitLab and local
  tooling ignore it.
- Only `@@SHIPHATS_<NAME>@@` placeholders; no secrets in files, ever.
- `activate-shiphats.sh` renders, validates, refuses unknown placeholders and
  existing files unless `--force`, removes inert copies unless `--keep-inert`,
  and prints the settings that cannot live in files.
- Keep inert files in step with the gates they call, in the same change, and
  test the activation into a scratch directory.

### 10.4 Root scripts run everywhere
- Bash 3.2 compatible: no associative arrays, no `mapfile`, no `${var,,}`;
  expand possibly-empty arrays as `${a[@]+"${a[@]}"}`.
- Lint with ShellCheck; run tests under a real Bash 3.2; add a static guard so
  Linux CI catches regressions.

## 11. Up-front checklist (answer before the first feature)

1. Source-of-truth spec location + addenda numbering.
2. Real-input tests, positive + adversarial negatives, observed failing first.
3. ORM / one-casing policy (or an explicit "no data layer" decision).
4. Soft delete, UUIDv7, real actor rows.
5. Snapshot + migration twin files.
6. `data-testid` convention and typed boundary contracts.
7. Test layout by type; browser video on by default.
8. Realistic deterministic fixtures; unique-per-run identifiers.
9. Honest validation vocabulary and provenance separation.
10. One-command local environment; `.env`/`.env.test` separation.
11. Function/module limits enforced by an automated gate.
12. Container contract, three Dockerfiles, `.dockerignore`, tested.
13. Inert SHIP-HATS pipeline + Bash 3.2 activation script, tested.
14. Living FDS + addenda + **per-turn learning register** (§12.1).
15. **Live n-way comparison ledger** with hashes and progress history (§12.2).
16. **Image-prompt provenance log**, verbatim and append-only (§12.3).
17. **Full-cycle visual audit** wired to a reusable skill (§12.4).

## 12. Multi-branch convergence: the practice this repository adds

This repository is not alone: four sibling branches implement the same product.
The following rules are what kept that situation from becoming four disconnected
products.

### 12.1 Continuous per-turn learning register
- **Every turn**, including investigation and no-code turns, appends or
  completes one dated entry in `docs/FDS.md`: request/context, evidence
  (commands, paths, SHAs), observation, adopted/deferred/rejected decision with
  reason, validation actually run, uncertainty, next action.
- **If nothing new was learned, say so and why.** Never invent retrospective
  experiments; never present a stale test run as freshly executed.
- Preserve earlier findings; date corrections rather than rewriting history.
- Record **strengths of the current implementation** as well as incoming ideas,
  with evidence and trade-offs. A comparison that only lists gaps is not a
  comparison.

### 12.2 Live n-way parity ledger
- `docs/N_WAY_COMPARISON.md` is the authoritative comparison. It holds: latest
  observed remote tip per branch (full SHA + commit time), reviewed-hash vs
  observed-hash separation, a capability union matrix, the adoption queue with
  exit criteria, and an append-only progress history.
- Refresh with an explicit-head fetch (`npm run branches:compare`); never switch
  the working branch, never poll in the background, never edit a peer branch.
- **Hash refresh is not review.** A new tip needs its diff inspected in a
  detached temporary checkout before a "reviewed" hash advances.
- A document cannot embed its own eventual commit hash; record the working delta
  separately and refresh after publishing.
- **Feature parity is the goal; feature count is not a score.** A capability
  counts only when its behavioural and visual acceptance hold. Retire
  exclusivity claims when a peer catches up.
- Keep the in-app matrix (`src/shared/parity.ts`) in the same change as the
  ledger; a gate test enforces that every capability is present in both.

### 12.3 Image-generation provenance
- Log **every** generation call verbatim: exact prompt, target path, reference
  images, and outcome.
- On regeneration, keep earlier prompts and append the new prompt **with a
  written justification** naming the observed defect (anatomy, chirality,
  camera yaw, illumination, segmentation) and how the new prompt addresses it.
- Never reconstruct a missing historical prompt as if it were verbatim; mark it
  unavailable.
- Respect per-turn generation limits; never invent an image path that does not
  exist.

### 12.4 Full-cycle visual audit
- After any gait, mask, cut-out or compositing change, render **sixteen phases**
  (not eight keyframes) on light and dark backgrounds with joint overlays, then
  actually look at them at magnification at the intermediate phases.
- Ship the procedure as a reusable skill (`.claude/skills/audit-gait-cycle/`)
  and a CLI/browser exporter so it is repeatable.
- The audit is a review aid, not a proof: state what the automation checks
  (panels non-empty, dimensions, deterministic naming) and what it does not
  (anatomical realism, seamlessness).
- Keep generated audit artefacts in ignored/temp directories; record findings in
  the FDS.

### 12.5 Measured art, rejected ideas, honest gaps
- Any claim about artwork quality needs a measurement (IoU, width parity,
  coverage, jitter, spill count) **and** a human look. Neither alone is enough.
- Keep a **failed-experiment register** (`PLAN.md §4`): what was tried, the
  measurement, why it was rejected, and whether it is dormant or deleted.
- Capability rows may legitimately say **Gap**. A ledger that only says "yes" is
  marketing, not engineering.
- When adapting a peer's mechanism, port the *mechanism* through the local
  coordinate/contract model with local tests; do not transplant a framework and
  hope the numbers match.

## 13. Change log of this harmonised template

| Change | Source | Rationale |
|---|---|---|
| Core template §§0–11 | upstream `GREENFIELD.md` | Baseline discipline. |
| FDS construction rules (dual audience, anchors, states, R1–R5 audits) | upstream `FDS_BUILDER.md` | Keeps the spec machine-precise and auditable. |
| Per-turn learning register | Sprite Motion Lab + Stride Lab + Funicular, harmonised | All three peers converged on it independently; the variants differed only in format. |
| Live n-way ledger, observed vs reviewed hashes | Funicular `tools/compare-branches.ts` + Sprite Motion Lab `THREE_WAY_BRANCH_COMPARISON.md` | Funicular's machine-readable tips/history plus Sprite Motion Lab's reviewed-hash discipline beats either alone. |
| Five provenance categories | Sprite Motion Lab's four-way vocabulary, extended | Adds "unverified" so absence is stateable. |
| In-app parity matrix + gate sync | This repository | A ledger nobody reads in the product rots; a gate keeps it honest. |
| Image-prompt provenance | Sprite Motion Lab + Funicular `PHOTO-PROMPTS.md` | Verbatim, append-only, justification on regeneration. |
| 16-phase multi-background audit | Stride Lab + Funicular `photo:audit` + Sprite Motion Lab CLI | Format adopted from all three; automation limits stated explicitly. |
| Failed-experiment register | Funicular `RIG-QUALITY-PLAN.md` + Sprite Motion Lab `PLAN.md` | Rejected ideas are evidence; without a register they get retried forever. |
| Test-observed-failing-first | Stride Lab validation records | Proves the test tests something. |
| Automated discipline gate | Sprite Motion Lab `greenfield-gate.test.ts` | An unexecuted rule is not a rule. |
| "Measured art, not test counts" | Funicular comparison ledger | Prevents scoreboard-driven convergence. |
