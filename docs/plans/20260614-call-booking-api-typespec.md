# Call-Booking API — TypeSpec Specification

## Overview
Implement a compiling TypeSpec (`.tsp`) specification for a single-owner, Calendly-like call-booking service that emits an OpenAPI 3 document. Scope is domain + API design only (no backend runtime, no auth). The deliverable is a TypeSpec project at the repo root that compiles with zero errors and produces `tsp-output/schema/openapi.yaml` containing 5 operations with the documented models, errors, and status codes.

## Context
- Files involved (all new):
  - `package.json` — deps + build/watch scripts
  - `tspconfig.yaml` — openapi3 emitter config → `tsp-output/schema/openapi.yaml`
  - `main.tsp` — imports + `@service` + `namespace CallBooking`
  - `models.tsp` — EventType, EventTypeCreate, Slot, Guest, Booking, BookingCreate
  - `errors.tsp` — ValidationError(400), NotFoundError(404), SlotConflictError(409)
  - `routes/event-types.tsp` — admin create + public list + public slots
  - `routes/bookings.tsp` — public create + admin upcoming list
  - `README.md` — add build/usage notes
- Related patterns: none yet — repo is a blank slate (only `README.md` + Hexlet CI). Establishes conventions.
- Dependencies: `@typespec/compiler ^1.12.0`, `@typespec/http ^1.12.0`, `@typespec/openapi3 ^1.12.0`. Node 22 confirmed present; `@typespec/rest` is NOT used (route decorators live in `@typespec/http`).

## Development Approach
- **Testing approach**: Regular. For a spec-only project the "test" for each task is a successful `npx tsp compile .` (zero errors) plus inspecting the emitted `tsp-output/schema/openapi.yaml` to confirm the expected schemas/operations/status codes appear. There is no separate unit-test runner.
- Build incrementally: `main.tsp` gains an `import` for each new `.tsp` file as that file is created, so the project compiles cleanly after every task.
- Complete each task fully (compile must pass) before moving to the next.
- **CRITICAL**: every task verifies via compile + OpenAPI output inspection.
- **CRITICAL**: compile must succeed before starting the next task.

## Implementation Steps

### Task 1: Scaffold the TypeSpec project

**Files:**
- Create: `package.json`
- Create: `tspconfig.yaml`
- Create: `main.tsp` (service shell: import `@typespec/http` + `@typespec/openapi3`, `using Http`, `@service(#{ title: "Call Booking Service" })`, `namespace CallBooking;` — no model/route imports yet)

- [x] Write `package.json` with `type: module`, `build`/`watch` scripts, and the three `^1.12.0` deps
- [x] Write `tspconfig.yaml` with the openapi3 emitter, `emitter-output-dir: "{output-dir}/schema"`, `output-dir: "{cwd}/tsp-output"`
- [x] Write minimal `main.tsp` (service + empty namespace)
- [x] Run `npm install`
- [x] Run `npx tsp compile .` — must compile with no errors and generate `tsp-output/schema/openapi.yaml`

### Task 2: Domain models

**Files:**
- Create: `models.tsp` (EventType, EventTypeCreate, Slot, Guest, Booking, BookingCreate; document domain constants BUSINESS_HOURS_START/END, SLOT_STEP_MINUTES=30, BOOKING_WINDOW_DAYS=14 as doc comments)
- Modify: `main.tsp` (add `import "./models.tsp";`)

- [x] Define models exactly per spec: `id`/`createdAt` marked `@visibility(Lifecycle.Read)`, `@minLength(1)` on titles/names, `@format("email")` on email, `@minValue(1)` on `durationMinutes`, `utcDateTime` for timestamps, optional `notes`
- [x] Add doc comments capturing the domain constants and slot/window semantics
- [x] Add the import to `main.tsp`
- [x] Run `npx tsp compile .` — must pass; confirm the 6 schemas appear in `openapi.yaml` and read-only fields are excluded from `*Create` payloads

### Task 3: Error models

**Files:**
- Create: `errors.tsp` (`@error` ValidationError, NotFoundError, SlotConflictError with their `code` literals)
- Modify: `main.tsp` (add `import "./errors.tsp";`)

- [x] Define the three `@error` models with literal `code` fields and `message`; `ValidationError` includes optional `details?: string[]`
- [x] Add the import to `main.tsp`
- [x] Run `npx tsp compile .` — must pass; confirm error schemas appear in `openapi.yaml`

### Task 4: Event-type routes

**Files:**
- Create: `routes/event-types.tsp` (`POST /event-types` → 201|400; `GET /event-types` → 200 `EventType[]`; `GET /event-types/{eventTypeId}/slots` with optional `@query date?: plainDate` → 200 `Slot[]`|404)
- Modify: `main.tsp` (add `import "./routes/event-types.tsp";`)

- [x] Implement the three operations using union return types with `@statusCode` per the spec
- [x] Document server-side slot-generation rules (14-day window, 30-min grid, business hours, `start + duration <= 17:00`) in operation doc comments
- [x] Add the import to `main.tsp`
- [x] Run `npx tsp compile .` — must pass; confirm the 3 operations and their status codes appear in `openapi.yaml`

### Task 5: Booking routes

**Files:**
- Create: `routes/bookings.tsp` (`POST /bookings` → 201|400|404|409; `GET /bookings` admin upcoming list with optional `@query from?: utcDateTime` → 200 `Booking[]`)
- Modify: `main.tsp` (add `import "./routes/bookings.tsp";`)

- [x] Implement both operations with union return types + `@statusCode`
- [x] Document the 409 global-overlap rule and the 400 off-grid/past/out-of-window rules in operation doc comments
- [x] Add the import to `main.tsp`
- [x] Run `npx tsp compile .` — must pass; confirm both operations and all four POST status codes appear in `openapi.yaml`

### Task 6: Verify acceptance criteria

- [x] Run `npx tsp compile .` — zero errors, `tsp-output/schema/openapi.yaml` regenerated
- [x] Confirm the OpenAPI output contains exactly 5 operations (`POST /event-types`, `GET /event-types`, `GET /event-types/{eventTypeId}/slots`, `POST /bookings`, `GET /bookings`)
- [x] Confirm each operation's documented status codes are present (added `@statusCode` to error models so 400/404/409 emit as explicit responses instead of `default`)
- [x] Confirm `EventType.id`, `Booking.id`, `Booking.createdAt` are read-only (absent from create request bodies)

### Task 7: Update documentation

- [ ] Update `README.md` with project description, prerequisites (Node), and the `npm install` / `npm run build` (`tsp compile .`) usage, noting the OpenAPI output path
- [ ] Note `tsp-output/` as generated output (add a `.gitignore` entry for it if appropriate)

## Post-Completion (manual / optional)
- Optionally open `tsp-output/schema/openapi.yaml` in Swagger Editor / Redoc to eyeball the rendered docs.
