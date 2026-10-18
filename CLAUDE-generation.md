# CLAUDE-generation.md — Image-Generation Discipline (§G)

An image model is a component in this pipeline, not an oracle. It is treated
exactly like any other impure dependency: declared inputs, recorded outputs,
gate-checked results, and a refusal path.

## G.1 Every call is logged before it is trusted

Each `generate_image` call records, in `docs/FDS.md#generation-log`:

| Field | Value |
|---|---|
| Call id | `G-0001`, monotonic, never reused |
| Prompt | The exact string, verbatim. No paraphrase, no reconstruction later |
| References | Exact workspace paths and the role each plays (structure / identity) |
| Target | Output path under `out/generated/` |
| Verdict | `accepted` / `rejected` with a reason code |
| Gate report | Silhouette IoU vs. control plate, island count, spill count, ground delta |

A call with no verdict is an unfinished call. An image with no log entry is not
usable, however good it looks.

## G.2 Two references, two roles

The pipeline passes exactly two reference roles and states them in the prompt:

1. **Structure reference** — the deterministic control plate: pose, silhouette,
   limb count, ground line.
2. **Identity reference** — the persona master photograph: face, skin, garment,
   lighting.

An identity reference from a *different* body build is forbidden: it locks the
silhouette to that build (this is the measured cross-build lock that cost the
previous branches seven regeneration passes). Every persona has its own
verified master before it has any frames.

## G.3 The prompt is a constraint list, not a mood board

Phrases that name a landmark the camera cannot see in a sagittal view
(`collarbone`, `sternum`, `both eyes`, `quadriceps`) rotate the subject toward
the camera. Phrases that name anatomy categories (`athletic arm`,
`cross-section`) import that category's priors — including the wrong sex's.
The prompt therefore:

- states the view in clock terms (`90° lateral, subject faces 3 o'clock`);
- states single-subject framing (`one figure, centred, no turnaround sheet`);
- forbids extra limbs by name (`exactly two arms, two legs, one shoe per leg`);
- forbids the observed failure of the previous attempt, one clause at a time —
  and the clause is *added*, not substituted, so a fixed defect never regresses
  while another is chased;
- names the background exactly (`flat #FF00FF`).

## G.4 Inspect before adopting

No generated image enters the record unseen. `read_file` the output, then:

1. Compare it against the control plate: same limb count, same ground contact,
   same silhouette within tolerance.
2. Look for the known defect classes (extra shoe, missing hand, fused fingers,
   wrong-facing torso, skin through fabric, cropped chin/throat, medical
   cross-section).
3. Only then record a verdict.

Telemetry alone is not inspection. A frame can pass every numeric gate and still
show a second shoe behind the heel.

## G.5 Regeneration has a written reason

When a candidate is rejected, the log appends a **regeneration justification**:
the concrete defect, the clause added to the prompt, and what the new attempt
must change. "It looked bad" is not a justification; "second toe-box visible
behind the support shoe at x≈760..855" is.

Historic prompts are never reconstructed from memory. If a prompt was not
recorded, the asset is treated as provenance-unknown and re-derived.

## G.6 Budget and batching

Generation is capped per turn and is stochastic. The pipeline therefore:

- generates the **minimum** frames needed for a probe (three key phases, not
  sixteen), then scales only after the probe passes;
- never adopts a partial batch: a persona cycle is all-or-nothing;
- keeps a deterministic fallback for every generated artefact, so a failed or
  exhausted generation budget degrades to a working (if less photographic)
  sprite rather than a broken one.
