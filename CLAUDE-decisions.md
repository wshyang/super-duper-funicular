## 1. Record every decision, up front, in a living spec (addendum discipline)

**When you start, decide what the "source of truth" is and where decisions
get written.** The single biggest avoidable cost in a long-lived project is a
spec that silently drifts from the implemented system, forcing future readers
to reverse-engineer intent from commits and chat.

- Maintain a **living functional/design specification** (the product contract)
  plus a **sequentially-numbered addenda register** for every decision that
  isn't dictated by that base spec: filling a gap, adding a new
  object/field/tool, or deviating from the spec.
- Write up each addendum **proactively, in the same change that makes the
  decision** — never as a follow-up. Each covers: (1) what was decided,
  (2) why, (3) which spec section it relates to, (4) practical impact and what
  a future reader must know.
- Keep the addenda **independent of the base spec's own section numbering**, so
  the base spec stays stable and addenda append forever.
- `CLAUDE.md` must tell future agents to do this without being asked. It is the
  difference between a codebase you can reason about and a puzzle box.

