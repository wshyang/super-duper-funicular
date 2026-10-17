# Decisions, learning, prompts, parity

## Living spec

`docs/FDS.md` is the product contract and learning register. `docs/ADDENDA.md` is sequential (`ADD-001`…). Write addenda in the same change as the decision.

## Continuous learning (every turn)

Before ending a turn, append `TURN-Lxx` in FDS with: trigger, evidence (SHAs/paths), technical learning vs other branches, adopted/deferred, validation actually run, next action.

## Image generation audit

Every `generate_image` call: exact prompt, path, references, outcome. Same path regenerated: keep history + Regeneration Justification.

## N-way comparison

Peers: Sprite Motion Lab `arena/917ef347`, Stride Lab `arena/263385da`, Procedural/evidence `arena/77ffb088`, this branch `arena/24e7b955`. Run `npm run branches:compare` on comparative turns. Hash refresh is not semantic review. Distingish inspected code vs executed tests vs others' claims.
