# Live n-way branch comparison

Goal: feature parity across all n branches, preserving local strengths. This document is updated every comparative turn. Hash automation is not semantic review.

Session branch (do not switch): `arena/24e7b955-super-duper-funicular`.

## Latest observed remote heads

Captured 2026-10-17 via `git fetch` + `git rev-parse` of `origin/pr{1,2,3}`:

| Branch | Role | SHA | PR |
| --- | --- | --- | --- |
| arena/24e7b955-super-duper-funicular | This implementation | (local; update after push) | — |
| arena/917ef347-super-duper-funicular | Sprite Motion Lab | `e172b0f1f8d9b640b65a4ba420f71965693adb23` | 1 |
| arena/263385da-super-duper-funicular | Stride Lab | `b227e2fe562be341f15f58955f539d325170729e` | 2 |
| arena/77ffb088-super-duper-funicular | Procedural + quality plan | `43352cf3fe8cb6c486aa79a59954d5972a5e13ac` | 3 |

## Feature matrix (Phase 1)

| Capability | 24e7b955 | 917ef347 | 263385da | 77ffb088 |
| --- | --- | --- | --- | --- |
| Greenfield CLAUDE split | Y | Y | partial | Y |
| Per-turn FDS learning | Y | Y | Y | Y |
| Image prompt audit | Y | Y | Y | Y |
| 2-bone IK + duty<0.5 gait | Y | Y | Y | Y |
| Dual persona | Y | Y | Y | Y |
| 6 palettes | Y | Y | Y | Y |
| Studio UI | Y | Y | Y (richest) | vanilla DOM |
| Magenta/chroma extract | primitive | Y | Python | Y |
| Photoreal plates | N | Y | Y | Y |
| SVG stitch | N | Y | N | partial |
| End-cap rounding | deferred | cutter | tools | prototype off |
| `branches:compare` | Y | doc only | doc | Y |
| Playwright | N | N | Y | N |
| `npm run validate` | Y | split scripts | split | Y |

## Progress log

- 2026-10-17: Initial ledger. Adopted gait constants and validate/compare from 77ffb088, 17-part intent and prompt audit from 917ef347, studio hook pattern from 263385da.
