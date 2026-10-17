# GREENFIELD §1 — living spec and the addendum discipline

**Source of truth.** The product contract is `README.md` (what the app is and how to run it) plus
`docs/sprite-flaw-analysis.md` (the measured claim about the reference art). Neither may drift from the
implementation.

- If behaviour changes, the spec changes in the same commit.
- Any decision **not** dictated by the request or by GREENFIELD itself is appended to
  `docs/ADDENDA.md` with the next number. Numbers are never reused or reordered.
- Each addendum answers four things: what was decided, why, which area it belongs to (D1–D6 in this
  repo), and what a future reader must know to keep working.
- The base documents keep stable section names; addenda are append-only and must not renumber them.

**Why this matters here.** The interesting decisions in this repo — a chroma key that also removes JPEG
ringing, a pelvis-pivot registration instead of a centroid pivot, a gait that derives stance from a duty
factor instead of hand-drawn key poses — are exactly the decisions a future reader would otherwise have
to reverse-engineer from the diff. They are recorded in `docs/ADDENDA.md`.

**Practical impact.** Before adding a feature, read `docs/ADDENDA.md` backwards until you find the area
you are touching. If your change contradicts an addendum, supersede it with a new numbered entry rather
than editing history.
