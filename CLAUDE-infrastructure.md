# Infrastructure, data, and deployment boundaries

## Current architecture boundary

The product is a local-first static browser workbench. There is no backend, database, auth/session service, user upload endpoint, or runtime call to an image-generation API in the current FDS. Motion settings are in-memory for the session; downloading JSON is the explicit persistence mechanism. Do not add a database driver or invent user accounts without a revised FDS/addendum.

## Preview and container contract

When the Vite app is introduced, bind it to **`0.0.0.0:3000`** and permit the Arena forwarded preview hostname/origin (for Vite, configure the host allowlist intentionally). Browser code uses same-origin/relative asset URLs, never `localhost` or `127.0.0.1` to reach another service. Test the app through the preview host, not only a local terminal.

Contextualize Greenfield's container templates to the actual static build; do not copy the generic server-selection logic blindly. Use a pinned base image, lockfile install, non-root runtime, health check, and `.dockerignore` when a deployable app exists. Keep `TUNNEL_TOKEN` and all other secrets runtime-only. Do not claim a container or tunnel works until built/smoke-tested.

SHIP-HATS/GitLab compliance templates are **deferred** until there is an actual GitLab destination, project configuration, and an executable validation path. A `.shiphats` suffix is not evidence of compliance. If enabled later, pin the template release and test activation in a scratch directory; secrets belong only in masked CI variables.

## Conditional database rules

Greenfield §4–§5 are dormant now. If persistence/backend work is proposed, first revise the FDS and decide the data model. Then use one ORM/mapping layer, keep typed domain casing coherent, use soft-delete semantics where entities can be invalidated, timestamp-ordered IDs where appropriate, and land a fresh-schema snapshot plus a numbered migration together. Validate soft-deleted foreign-key targets. Test against an isolated real test DB and cover a valid-but-wrong-owner session per scoped route; a generic unauthenticated 401 is not an IDOR test. Reassess privacy, authorization, rate limits, and the OWASP threat surface before adding endpoints.
