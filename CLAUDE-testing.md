## 2. Write tests first, and keep them real (no mocks where it counts)

**Tests are the mechanism that actually catches bugs — decide the discipline
before any feature ships.** The pain avoided: shipping a wrong-field bug or an
authorization hole that a manual review missed, because "the happy path works."

- **Backend:** run automated integration tests against a **real database
  (a separate test DB, never the dev DB)** through the real app entrypoint
  (e.g. an app/router object that can be exercised without a listening
  socket) — **never mock the data-access layer**. A mocked-repository test
  hides exactly the class of bug you care about (bad SQL, wrong column names,
  FK violations, JSONB round-tripping).
- **Every route/endpoint needs BOTH a positive test AND a session-scoping
  negative test**: a real, valid, logged-in session that is the *wrong party*
  for THIS resource (IDOR-style id substitution) must be rejected. A generic
  "no token → 401" proves auth, not authorization scoping.
- **Add/update tests in the same change as the route** — never as a follow-up.
- Frontend unit tests may mock the API boundary; e2e tests drive the real UI
  against a real backend with **no mocks**.
- Adopt a security-test matrix (e.g. OWASP Top 10) for every endpoint, with an
  explicit applicability assessment per category — decide this on day one,
  not after an audit finds gaps.


## 3. Test infrastructure defaults (video, isolation, determinism)

- **Record Playwright video by default**, with a single documented env-var
  off-switch. Retroactively discovering a whole e2e suite was "blind on
  failure" because video was off is avoidable.
- **Isolate environments hard**: a separate test DB, unique-per-run test
  identifiers (e.g. `{label}.{runId}@example.test`), and self-contained
  provisioning so suites are repeatable and runnable in parallel.
- Use **realistic, deterministic fixture data** (named people, not `user-123`),
  with pools that reflect the domain (e.g. different name pools per actor
  role/affiliation) so test output reads naturally while remaining unique.
- Decide the **test layout by type** on day one (`backend/`, `frontend/unit`,
  `frontend/e2e`, `fixtures/`) and keep it consistent.

