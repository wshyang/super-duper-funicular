# CLAUDE-decisions.md — Living Specification & Decision Register (§1)

Adopted from `GREENFIELD.md §1` and `FDS_BUILDER.md`, contextualised for this
repository.

## 1.1 Sources of truth

| Artefact | Role | Change rule |
|---|---|---|
| `docs/FDS.md` | Functional design specification: objects, attributes, validation, states, surfaces, features, NFRs | Amend in the same change as the code it describes |
| `docs/SPEC.md` | One-page contract; the summary a new contributor reads first | Amend when scope changes |
| `docs/ADDENDA.md` | Append-only decision register (`ADD-NNN`) | One entry per decision, written when the decision is made |
| `docs/PIPELINE.md` | Architecture rationale: options weighed, chosen pipeline, rejected alternatives | Amend when architecture changes |
| `docs/VALIDATION.md` | Provenance ledger: what was executed, where, with what result | Amend every turn that runs a gate |
| `docs/BRANCH_REVIEW.md` | Measured findings about prior branches | Frozen historical evidence; correct by appending |

## 1.2 The addendum format

Every entry states, in this order:

1. **What was decided** — the rule or structure, in one or two sentences.
2. **Why** — the evidence. Measurements, defect IDs, commit SHAs, or the
   specific failure the decision prevents. "It felt cleaner" is not evidence.
3. **Related spec anchor** — `#obj-*`, `#feat-*`, `#surf-*`, `#nfr-*`, or
   `#pipe-*`.
4. **Practical impact** — what a future reader must know: invariants to
   preserve, files touched, what is now forbidden.

## 1.3 Write the addendum in the same change

A decision recorded in a follow-up commit is a decision that has already begun
to drift. If the change is reverted, the addendum is superseded by a new
addendum — never edited in place, never deleted.

## 1.4 Supersede, never rewrite

`ADD-NNN` numbers are permanent. When a later decision reverses an earlier one,
the later entry names the earlier one and states what changed and why. The
history of a project's reasoning is an asset; a cleaned-up history destroys it.

## 1.5 Keep the register small enough to read

One decision per entry. If an entry needs subsections, it is two decisions.
Entries describe rules that survive refactors, not commit logs.

## 1.6 Reconcile user corrections

When a correction arrives, reconcile it against the whole conversation and the
existing register before writing. A correction that appears to conflict with an
earlier addendum usually refines it — say which, and where.
