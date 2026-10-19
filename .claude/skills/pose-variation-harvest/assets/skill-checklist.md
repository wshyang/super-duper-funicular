# Skill Checklist — pose-variation-harvest

Copy-paste per turn to ensure closing of each section before next opens.

## Section 1 — Objective
- [ ] Original flawed sheet flaws (FLAW-01..05) listed with evidence
- [ ] One-sentence objective written
- [ ] 4 decompositions (identity, diversity, cleanliness, traceability) stated
- [ ] PR #1 / PR #8 / V2 history summarized

## Section 2 — Items
- [ ] I-01..I-08 enumerated with what + contribution
- [ ] Each item linked to why it increases usable material

## Section 3 — Acceptance Criteria
- [ ] Per-item AC table with threshold + measurement instrument
- [ ] Instruments are executable (sha256sum, read_file, harvest-phases, dump-cycle, validator)
- [ ] HRG defined (≥8 + ≥3, coverage, 0 defects)

## Section 4 — Challenges
- [ ] Per-item challenges with severity + PR evidence (IMG-ERR, PIPE-ERR, # call)
- [ ] Sprint prior, open-torso bias, ground-shadow, wristband drift all covered

## Section 5 — Mitigations & Iteration
- [ ] Per-item mitigation is concrete (guide override value, prompt sentence, script path)
- [ ] Guides generated: `create-compact-guides.ts` + manifest
- [ ] Candidates generated via `generate_image` with [master, guide] + template
- [ ] Validation: `validate-candidates.ts` + `harvest-phases` + `dump-cycle` + `read_file` 2× crops
- [ ] Log appended to `POSE_HARVEST_LOG.md` + `FDS.md §9` + `pose-bank.json`
- [ ] If fail, guide geometry changed (not adjectives) before retry
- [ ] Gates: `npm test 55/55, typecheck, build, branches:compare` pass

## Sign-off
- [ ] `docs/CORE_OBJECTIVE_AND_ITEMS.md` exists with 5 closed sections
- [ ] `docs/ACCEPTANCE_CRITERIA.md` exists
- [ ] `docs/POSE_VARIATION_FLAW_ANALYSIS.md` exists
- [ ] `docs/ITERATION_V2_REPORT.md` exists with #91–#95 hashes
- [ ] Skill folder `.claude/skills/pose-variation-harvest/` complete with SKILL.md + scripts + references + assets

