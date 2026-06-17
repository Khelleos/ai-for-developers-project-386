### Hexlet tests and linter status:
[![Actions Status](https://github.com/Khelleos/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Khelleos/ai-for-developers-project-386/actions)

# Call-Booking API — TypeSpec Specification

A [TypeSpec](https://typespec.io/) specification for a single-owner, Calendly-like
call-booking service. The TypeSpec spec itself is design-only (no runtime, no auth):
it describes the domain models, errors, and HTTP API and emits an OpenAPI 3 document.
Two decoupled apps consume that contract — a React frontend (`frontend/`) and an
in-memory Python backend (`backend/`) that enforces the business rules server-side
(see below). There is still no auth.

The API exposes 5 operations:

- `POST /event-types` — create an event type (admin)
- `GET /event-types` — list event types (public)
- `GET /event-types/{eventTypeId}/slots` — list bookable slots (public)
- `POST /bookings` — create a booking (public)
- `GET /bookings` — list upcoming bookings (admin)

## Prerequisites

- [Node.js](https://nodejs.org/) 22 or newer

## Install

```bash
npm install
```

## Build

Compile the TypeSpec sources and emit the OpenAPI document:

```bash
npm run build
```

To recompile automatically on file changes:

```bash
npm run watch
```

Both scripts run `tsp compile .`. The emitted OpenAPI 3 document is written to:

```
tsp-output/schema/openapi.yaml
```

`tsp-output/` is generated output and is excluded from version control via `.gitignore`.

## Project structure

- `main.tsp` — service shell (`@service` + `namespace CallBooking`) and imports
- `models.tsp` — domain models (EventType, Slot, Guest, Booking, and create payloads)
- `errors.tsp` — error models (ValidationError, NotFoundError, SlotConflictError)
- `routes/event-types.tsp` — event-type operations
- `routes/bookings.tsp` — booking operations
- `tspconfig.yaml` — openapi3 emitter configuration

## Frontend

A separate, contract-driven React app lives under `frontend/` with its own
`package.json`, fully decoupled from this TypeSpec project. It consumes the API
over HTTP and derives its types from the emitted `tsp-output/schema/openapi.yaml`
(via `openapi-typescript` + `openapi-fetch`) rather than hand-writing them.

Stack: Vite + React + TypeScript, Mantine UI, TanStack Query, React Router;
tested with Vitest + React Testing Library + MSW.

Quick start (from the repo root):

1. `npm run build` — emit the OpenAPI contract.
2. `cd frontend && npm install`
3. `npm run gen:api` — regenerate the typed client from the contract.
4. `npm run mock` — serve a Prism mock of the contract on port 4010.
5. `npm run dev` — start the dev server (reads `VITE_API_BASE_URL`, default
   `http://localhost:4010`).

See `frontend/README.md` for full details.

## Backend

A separate, contract-driven Python service lives under `backend/` with its own
environment, fully decoupled from this TypeSpec project. Unlike the spec (which
only documents business rules in prose), it is an in-memory implementation that
enforces them server-side: slot math, the rolling 14-day window, and the global
one-call-at-a-time overlap rule (checked across all event types). Data is lost on
restart; owner-local time is treated as UTC for deterministic slot math.

Stack: Python 3.11+, FastAPI, Pydantic (email validation), Uvicorn; tested with
pytest + FastAPI TestClient + pytest-cov.

Quick start (from `backend/`):

1. `python -m venv .venv` and activate it.
2. `pip install -r requirements.txt`
3. `uvicorn app.main:app --reload --port 8000` — docs at `http://localhost:8000/docs`.
4. `pytest` (or `pytest --cov`) to run the suite.

To drive the frontend against it instead of the Prism mock, set
`VITE_API_BASE_URL=http://localhost:8000` and ensure the backend's `CORS_ORIGINS`
includes the frontend origin. See `backend/README.md` for full details.
