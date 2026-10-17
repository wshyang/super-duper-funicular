## 8. Validate early and honestly

- **Static checking layer is not a substitute for real tests.** When the real
  toolchain (compiler, test runner, DB) is unavailable in a sandbox, run
  per-file syntax checks, execute pure modules, and grep structural invariants —
  but **say exactly which layer you ran** and never claim "tests pass."
- The real gate, before merge, is always: full type-check, full lint, and the
  full test suites against a real DB/browser.
- Append the validation caveat to commits made under constrained tooling so a
  reviewer knows what still must run.


## 9. Reproducible local dev + environment story

- Provide a one-command way to stand up the entire local environment
  (database, backend, frontend, and any test doubles) so a new contributor or
  agent can go from clone to running tests without tribal knowledge.
- Separate secrets from config: committed `.env.example`-style templates,
  uncommitted real `.env` files, and a distinct `.env.test` pointing at the
  test DB — never a shared DB between dev and test.
- Decide and document the toolchain choices up front (package manager, runtime,
  ORM, test runners, CI) and make them **consistent across backend, frontend,
  and tooling** — mixed/retrofit choices are where the friction lives.

