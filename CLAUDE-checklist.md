## 11. What to decide before writing the first feature (checklist)

1. Source-of-truth spec location + addenda numbering.
2. Test DB isolation + "tests-first, real DB, no repo mocks" rule.
3. ORM + one-casing policy (no hand-written mappers).
4. Soft-delete + UUIDv7 + real-actor-rows object model.
5. Schema snapshot + migration twin-file workflow.
6. `data-testid` convention + typed wire contracts.
7. Test layout by type + Playwright video-on default.
8. Realistic fixture-name pools + unique-per-run identifiers.
9. Static-check fallback discipline + validation caveat.
10. One-command local env setup + `.env`/.env.test separation.
11. Function design rules: ≤ 50-line functions, guard clauses, ≤ 3 params, no flag args,
    no mutation, Separate Query from Modifier, domain-based module grouping, 800-LOC
    file hard limit, barrel-split pattern for god modules.
12. Container contract (port 3000 on `0.0.0.0`, proxies trusted by address) and
    the contextualised `Dockerfile`, `Dockerfile.dev`, `Dockerfile.cloudflared`,
    `.dockerignore` at the repository root, tested.
13. SHIP-HATS pipeline files kept inert (`*.shiphats`) with `activate-shiphats.sh`,
    in step with the local gates, tested; root scripts Bash 3.2 compatible.

Answer these thirteen up front and a greenfield project avoids most of the rework,
silent drift, and "we should have written that down" moments this template
exists to prevent.
