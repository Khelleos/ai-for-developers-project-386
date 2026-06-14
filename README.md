### Hexlet tests and linter status:
[![Actions Status](https://github.com/Khelleos/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Khelleos/ai-for-developers-project-386/actions)

# Call-Booking API — TypeSpec Specification

A [TypeSpec](https://typespec.io/) specification for a single-owner, Calendly-like
call-booking service. The project is design-only (no backend runtime, no auth): it
describes the domain models, errors, and HTTP API and emits an OpenAPI 3 document.

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
