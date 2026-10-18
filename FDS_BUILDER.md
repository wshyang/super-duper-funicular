# FDS Builder — project adaptation

This guide adapts the requirements-clarity and traceability ideas in [`wshyang/greenfield/FDS_BUILDER.md`](https://github.com/wshyang/greenfield/blob/8ba74027be5fad41e48cadde82cc0120d628b109/FDS_BUILDER.md) for a software repository and the Sprite Motion Lab feature set. The upstream guide is a conversation protocol; this file keeps its useful specification practices without importing chatbot-only rules (fixed refusal text, mandatory multiple-choice turns, or prohibitions on diagrams).

`docs/FDS.md` is the single canonical product contract. `docs/ADDENDA.md` records decisions that supplement or change it. `docs/BRANCH-COMPARISON.md` is evidence about peer implementations, not a second product spec.

## 1. Intent alignment

Before writing or changing a requirement, separate:

1. **First-order intent:** what was literally requested.
2. **Second-order intent:** what workflow or defect the request addresses.
3. **Third-order intent:** the broader outcome, risk, or parity goal.

Proceed when those are coherent. If a missing decision changes scope, safety, data loss, or architecture materially, ask a focused question. Otherwise document a bounded `[DRAFT — source]` assumption with its evidence and continue; do not silently turn a guess into a confirmed requirement.

## 2. Status, source, and phase tags

Use these labels consistently:

- **Confirmed:** stated by the user or already binding in this FDS.
- **Observed:** directly verified in a checked-in file, command output, or viewed image.
- **Derived:** a conclusion from named evidence; not itself a user statement.
- **[DRAFT — source]:** a reasonable but unconfirmed proposal, with the source named.
- **Unknown:** evidence is insufficient; state what would resolve it.
- **Deferred / Rejected:** intentionally not in the current phase, with a reason and re-entry condition.

Give each requirement a stable ID and a phase. A capability must also identify its user surface (UI, exported asset, or CLI); an unexposed or unreachable capability is an orphan, not a complete feature. Do not use a phase tag to disguise uncertainty.

## 3. Requirement template

For each feature, document only applicable fields, and state `Not applicable` when a reader might otherwise infer omission:

1. ID, name, phase, status, source/evidence.
2. Actor and user-visible surface.
3. Preconditions and input contract (type, range, defaults, units, validation).
4. Main outcome and observable postconditions.
5. State transitions, guards, and forbidden transitions when stateful.
6. Empty, loading, error, retry, and recovery behavior where relevant.
7. Acceptance criteria in **Given / When / Then** form.
8. Verification strategy: unit, real-asset pipeline, browser, visual review, or deployment check.
9. Dependencies, limits, and known failure modes.

For every exposed numeric or text field, define its type, constraints, validation, and exact actionable error text before implementation. For sliders that cannot express invalid values, specify the permitted range and whether values clamp or reject. For derived image measurements, name the coordinate space, alpha/color threshold, and comparison method; never compare numbers produced by different definitions as if equivalent.

For stateful objects, list all legal states and transitions with triggers/guards. For lists, galleries, and selectors, specify loading, populated, empty, zero-permission (if applicable), and error states. For authorization, persistence, or migrations, include the relevant actor derivation and failure path; mark the whole domain dormant when the product has none.

## 4. Relationships, surfaces, and parity

List core objects and their relationships once. A data-carrying relationship becomes its own object. For each feature, map its permitted operations to a UI or output surface. Review the **union** of capabilities in the active comparison cohort, but distinguish:

- product behavior and downloadable outputs, which are parity targets;
- internal implementation choices (framework, file layout, coordinate math), which are not parity requirements unless they affect behavior or output;
- quality evidence, which must be comparable before ranking (for example, equal image thresholds and equal phase samples).

Parity means equivalent behavior and acceptance evidence, not copied source code, equal line counts, or equal test counts.

## 5. Quality and non-functional requirements

Make non-functional requirements measurable or explicitly draft. Cover applicable areas: deterministic output, rendering/contact correctness, performance, accessibility, responsive layout, asset failure recovery, privacy, security, deployment, and compatibility. If no backend exists, say so; do not manufacture database or authorization requirements. If one is added later, reopen those sections before implementation.

Every feature must state its positive path and material failure/edge paths. Image/gait work additionally requires numerical checks **and** visual inspection of the real renderer. A passing test suite is not a claim of anatomical realism, seamless joints, or a successful browser/deployment run.

## 6. Corrections and change control

When new evidence changes a requirement, update the FDS and append a numbered addendum in the same change. Preserve earlier decisions and learning entries; supersede them explicitly rather than rewriting history. When a correction affects dependent features, update each affected requirement and its acceptance tests together. Record failed experiments and their measured failure so they are not repeated unchanged.

## 7. Day-zero checklist

Before the first application feature is implemented, the FDS and addenda must settle or explicitly defer with a decision owner and re-entry condition:

- product contract, addenda numbering, and cross-branch comparison cohort;
- language/runtime, framework boundary, image pipeline, package manager, and lockfile;
- test layers, real-asset fixtures, browser/video policy, and visual-review process;
- persistence/authentication (or an explicit no-backend decision);
- module boundaries, function/file limits, test-ID and accessibility conventions;
- deterministic asset-generation and prompt-provenance policy;
- local development, preview host/port, container/deployment target, and which CI integrations are actually configured.
