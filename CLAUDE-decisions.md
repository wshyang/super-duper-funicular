# CLAUDE-decisions.md — living spec, addenda and per-turn learning (GREENFIELD §1)

## 1. Where decisions live

| Artefact | Purpose | Rule |
| --- | --- | --- |
| `docs/FDS.md` | Living functional spec **and** continuous-learning register | Base contract + dated turn entries. Evidence, not a second copy of the addenda. |
| `docs/ADDENDA.md` | Sequentially numbered decisions (`ADD-001`…) | Append-only. Never renumber, never delete. Date a correction instead of rewriting it. |
| `PLAN.md` | Investigation queue and **failed-experiment register** | Live priorities and rejected ideas with the measurement that rejected them. |
| `docs/N_WAY_COMPARISON.md` | n-way parity ledger | Hashes, capability union, adoption queue, progress history. |
| `docs/VALIDATION.md` | What was executed vs claimed | Updated whenever a gate result changes. |
| `docs/PHOTO-PROMPTS.md` | Image-generation provenance | Verbatim prompts, append-only. |

## 2. Writing an addendum

Every entry answers four questions, in this order:

1. **Decided** — the decision, stated as a rule someone can follow.
2. **Why** — the evidence or constraint that forced it. Cite measurements,
   SHAs, paths or a peer's documented behaviour. "It seemed cleaner" is not
   evidence.
3. **Area** — the spec section or domain object it touches.
4. **Impact** — what a future reader must know; what now depends on it; what it
   makes harder.

An addendum written after the fact is a rationalisation. Write it in the change
that makes the decision.

## 3. Per-turn learning register (`docs/FDS.md`)

Every turn appends one entry, including turns that change no code:

- **Context/trigger** — the request in one line.
- **Evidence** — full SHAs, commands actually run, files actually read, images
  actually viewed. Distinguish `read` from `executed` from `viewed`.
- **Observation** — what the evidence showed, including numbers.
- **Decision** — adopted / deferred / rejected, each with its reason.
- **Validation** — the gates that ran this turn and their outcome. If a gate did
  not run, say so; do not carry a previous run forward as current.
- **Uncertainty and next action** — what remains unproven and who/what closes it.

If nothing was learned, say exactly that and why. An empty turn is honest; an
invented one poisons the register.

## 4. Cross-branch review rules

- Pin the **full SHA**, not a short hash, and inspect it in a detached checkout
  under `/tmp`. Never switch the session branch to look at a peer; never modify a
  peer branch.
- Review protocol: diff against the previously reviewed hash, read the changed
  code paths, read the peer's own validation record, and only then update the
  capability row. Hash refresh alone never advances a reviewed hash.
- When adopting a mechanism, port the **mechanism**, not the framework: adapt it
  to this repository's coordinate model and contracts, and land local tests in
  the same commit.
- Record adopted **and** rejected ideas, plus evidence-backed strengths of our
  own implementation. The ledger is a comparison, not a confession.
- Retire exclusivity claims the moment a peer ships an equivalent capability.
- "Feature parity" means equivalent user-visible behaviour plus acceptance
  evidence, not identical source and never identical test counts.

## 5. Superseding and superseded decisions

When a decision is replaced, do not edit the original. Add a new addendum that
names the superseded id, and update the FDS entry. The chain of decisions is the
history of the product's reasoning and is more valuable intact than tidy.
