# CLAUDE.md

Guidance for working in this repository.

## What this is

A **design-only** TypeSpec specification for a single-owner, Calendly-like
call-booking service. It defines domain models, errors, and the HTTP API, and
emits an OpenAPI 3 document. There is **no backend runtime and no auth** — all
business rules (slot math, overlap detection, window enforcement) are documented
in prose and enforced server-side by a future implementation, not by this spec.

## Commands

- `npm install` — install dependencies (Node.js 22+).
- `npm run build` — `tsp compile .`; emits `tsp-output/schema/openapi.yaml`.
- `npm run watch` — recompile on file changes.
- `npm test` — `tsp compile . --no-emit --warn-as-error`; validates the spec
  (warnings fail). There is no unit-test runner — "testing" is a clean compile
  plus inspecting the emitted OpenAPI.

`tsp-output/` is generated output and is gitignored.

## Structure & conventions

- `main.tsp` — service shell (`@service` + `namespace CallBooking`); imports every
  other `.tsp` file. **A new `.tsp` file must be added as an `import` here or it
  won't be picked up.**
- `models.tsp` — domain models + create payloads.
- `errors.tsp` — `@error` models.
- `routes/*.tsp` — operations, grouped in `@route(...)` sub-namespaces.
- All files declare `namespace CallBooking;`. Files that use HTTP decorators
  (`@route`, `@statusCode`, etc.) also `import "@typespec/http"; using Http;` —
  files that only use core decorators/types do not.

Conventions to follow:
- Read-only fields use `@visibility(Lifecycle.Read)` so they're excluded from
  `*Create` request bodies.
- Errors carry an explicit `@statusCode` so they emit as named responses
  (400/404/409) instead of collapsing into `default`.
- Validation lives in decorators: `@minLength(1)` on required strings/IDs,
  `@minValue(1)` on durations, `@format("email")` on emails.

## Domain constants (informational — enforced server-side)

Business hours 09:00–17:00 (owner-local), 30-minute slot grid, rolling 14-day
booking window, and a global one-call-at-a-time overlap rule (the owner can
attend only one call at a time, checked across all event types).
