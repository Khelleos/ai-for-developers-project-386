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

## Frontend (`frontend/`)

A separate, contract-driven React app (Vite + TypeScript + Mantine) lives under
`frontend/` with its own `package.json` — fully decoupled from this TypeSpec
project, sharing no runtime. It consumes the API purely over HTTP and derives
its types from the emitted `tsp-output/schema/openapi.yaml` rather than
hand-writing them (`openapi-typescript` + `openapi-fetch`).

Workflow: `npm run build` at the repo root emits the OpenAPI; then inside
`frontend/`, `npm run gen:api` regenerates the typed client, `npm run mock`
serves a Prism mock of the same document on port 4010, and `npm run dev` starts
the dev server against it. This satisfies the "works with a separately running
backend" requirement without a real server. See `frontend/README.md` for
details.

## Backend (`backend/`)

A separate, contract-driven Python service lives under `backend/` with its own
environment (`requirements.txt` + `.venv`), fully decoupled from this TypeSpec
project. It is an **in-memory** implementation (data is lost on restart) of the
exact same contract emitted to `tsp-output/schema/openapi.yaml`: the same
operations, request/response shapes, and status codes. Unlike the spec — which
only documents business rules in prose — the backend **enforces** them
server-side (slot math, 14-day window, the global one-call-at-a-time overlap
rule checked across all event types). owner-local time is treated as **UTC**
here so slot math and tests are deterministic.

Stack: Python 3.11+, FastAPI, Pydantic (email validation), Uvicorn; tests on
pytest + FastAPI `TestClient` + `pytest-cov`.

Workflow: from inside `backend/`, `pip install -r requirements.txt`, run with
`uvicorn app.main:app --reload --port 8000`, and test with `pytest` (or
`pytest --cov`). To drive the frontend against it instead of the Prism mock,
set `VITE_API_BASE_URL=http://localhost:8000` and ensure the backend's
`CORS_ORIGINS` includes the frontend origin. See `backend/README.md` for
details.
