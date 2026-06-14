# Call Booking Frontend (Mantine + Vite + TypeScript)

## Overview
Build a separate, contract-driven frontend for the single-owner call-booking
service. The UI consumes the API defined by the TypeSpec contract (the emitted
`tsp-output/schema/openapi.yaml`) exclusively over HTTP — no shared runtime with
the spec project. During development the frontend runs against a separately
launched Prism mock of the same OpenAPI document, satisfying the "works with a
separately running backend" requirement.

Stack: Vite + React + TypeScript, Mantine UI (incl. `@mantine/form`,
`@mantine/dates`), TanStack Query for data fetching/cache, React Router for
navigation, and a typed client generated from the contract via
`openapi-typescript` + `openapi-fetch`. Tests with Vitest + React Testing
Library + MSW.

The frontend lives in its own `frontend/` directory with its own `package.json`,
fully decoupled from the root TypeSpec project.

## Contract being consumed (5 operations)
- `POST /event-types` → 201 EventType | 400 ValidationError
- `GET /event-types` → 200 EventType[]
- `GET /event-types/{eventTypeId}/slots?date=` → 200 Slot[] | 404 NotFoundError
- `POST /bookings` → 201 Booking | 400 | 404 | 409 SlotConflictError
- `GET /bookings?from=` → 200 Booking[]

## Context
- Files involved (read-only inputs): `tsp-output/schema/openapi.yaml` (generated
  by `npm run build` at repo root), `models.tsp`, `routes/*.tsp`, `errors.tsp`.
- New tree: everything under `frontend/`.
- Related patterns: contract-first design already used in the repo; the frontend
  mirrors that by generating types from the OpenAPI rather than hand-writing them.
- Dependencies (frontend only): react, react-dom, react-router-dom,
  @mantine/core, @mantine/hooks, @mantine/form, @mantine/dates, dayjs,
  @tanstack/react-query, openapi-fetch; dev: vite, typescript,
  @vitejs/plugin-react, vitest, @testing-library/react,
  @testing-library/user-event, jsdom, msw, openapi-typescript,
  @stoplight/prism-cli.

## Development Approach
- **Testing approach**: Regular (code first, then tests).
- Each task is self-contained and leaves the frontend compiling.
- Tests use Vitest + React Testing Library; API calls are stubbed with MSW so
  tests never hit a live server.
- **CRITICAL: every task includes new/updated tests and all tests must pass
  before the next task.**
- Frontend test command: `npm test` run inside `frontend/`.

## Implementation Steps

### Task 1: Scaffold frontend project and tooling

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.ts`,
  `frontend/tsconfig.json`, `frontend/index.html`,
  `frontend/src/main.tsx`, `frontend/src/App.tsx`,
  `frontend/.env.example`, `frontend/src/config.ts`,
  `frontend/vitest.setup.ts`, `frontend/.gitignore`

- [x] Scaffold Vite + React + TS project under `frontend/` with the deps listed above
- [x] Wire MantineProvider (+ dates/dayjs) and a QueryClientProvider in `main.tsx`
- [x] Add `src/config.ts` reading `VITE_API_BASE_URL` (default `http://localhost:4010`, the Prism port); add `.env.example`
- [x] Configure Vitest (jsdom env, `vitest.setup.ts` with Testing Library + MSW server lifecycle)
- [x] Add npm scripts: `dev`, `build`, `test`, `gen:api`, `mock` (Prism)
- [x] Render a minimal App shell; write a smoke test asserting the shell renders
- [x] run `npm test` inside `frontend/` - must pass before task 2

### Task 2: Generate typed API client from the contract

**Files:**
- Create: `frontend/src/api/schema.ts` (generated), `frontend/src/api/client.ts`, `frontend/src/api/types.ts`
- Modify: `frontend/package.json` (gen:api script)

- [x] Add `gen:api` script running `openapi-typescript` against `../tsp-output/schema/openapi.yaml` into `src/api/schema.ts`
- [x] Build an `openapi-fetch` client in `client.ts` using the base URL from `config.ts`
- [x] Add an error-normalizing helper that maps non-2xx responses to typed errors (validation_error/not_found/slot_conflict) for the UI to consume
- [x] Export convenience types (EventType, Slot, Booking, *Create) in `types.ts`
- [x] Write tests for the error-normalizing helper (400/404/409 → typed error objects) using mocked responses
- [x] run `npm test` inside `frontend/` - must pass before task 3

### Task 3: Data layer — TanStack Query hooks

**Files:**
- Create: `frontend/src/api/queries.ts` (or `hooks/` per resource)
- Create test: `frontend/src/api/queries.test.tsx`

- [x] Add query hooks: `useEventTypes`, `useSlots(eventTypeId, date)`, `useBookings(from)`
- [x] Add mutation hooks: `useCreateEventType`, `useCreateBooking` with cache invalidation (refetch slots + bookings after a booking)
- [x] Write tests with MSW stubbing each endpoint, asserting hooks return mapped data and surface typed errors
- [x] run `npm test` inside `frontend/` - must pass before task 4

### Task 4: Event Types page (list + create)

**Files:**
- Create: `frontend/src/pages/EventTypesPage.tsx`, `frontend/src/components/EventTypeForm.tsx`, `frontend/src/components/EventTypeCard.tsx`
- Create test: `frontend/src/pages/EventTypesPage.test.tsx`

- [x] List event types (title, duration, description) with loading/empty/error states
- [x] Create-event-type form (`@mantine/form`) with client-side validation mirroring the contract (non-empty title, durationMinutes ≥ 1); show 400 field errors from the API
- [x] Link each event type to its booking page
- [x] Write tests: renders list from MSW, submits valid form (success), surfaces a 400 validation error
- [x] run `npm test` inside `frontend/` - must pass before task 5

### Task 5: Slot discovery + booking flow

**Files:**
- Create: `frontend/src/pages/BookEventTypePage.tsx`, `frontend/src/components/SlotPicker.tsx`, `frontend/src/components/BookingForm.tsx`
- Create test: `frontend/src/pages/BookEventTypePage.test.tsx`

- [x] Date picker (`@mantine/dates`) constrained to the rolling 14-day window; passes `date` to the slots query
- [x] Render available slots; handle empty (no slots) and 404 (unknown event type)
- [x] Booking form (guest name, email, optional notes) submitting the selected slot's `start` + `eventTypeId`
- [x] Handle responses: 201 success confirmation, 400 validation, 404 not found, 409 slot conflict (prompt to pick another slot + refetch slots)
- [x] Write tests: slot list renders, successful booking, and a 409 conflict path
- [x] run `npm test` inside `frontend/` - must pass before task 6

### Task 6: Owner bookings page + routing/layout

**Files:**
- Create: `frontend/src/pages/BookingsPage.tsx`, `frontend/src/components/AppLayout.tsx`
- Modify: `frontend/src/App.tsx` (routes)
- Create test: `frontend/src/pages/BookingsPage.test.tsx`

- [x] App layout with nav: Event Types, Bookings; wire React Router routes (`/`, `/event-types/:id/book`, `/bookings`)
- [x] Upcoming bookings list ordered by start (event type, guest, time, notes) with loading/empty/error states; uses `from` defaulting to now
- [x] Write tests: routing renders correct page; bookings list renders from MSW
- [x] run `npm test` inside `frontend/` - must pass before task 7

### Task 7: Verify acceptance criteria

- [x] run full test suite: `npm test` inside `frontend/`
- [x] run typecheck/build: `npm run build` inside `frontend/` (tsc + vite build must pass)
- [x] verify test coverage meets 80%+ (`vitest run --coverage`)

### Task 8: Update documentation

- [x] Add `frontend/README.md`: how to generate the contract (`npm run build` at repo root), run the Prism mock (`npm run mock`), generate types (`npm run gen:api`), and start the dev server
- [x] Update root `CLAUDE.md` to note the new `frontend/` app and its contract-driven, separately-running-backend workflow

## Post-Completion (manual verification)
- Run `npm run build` at repo root to emit the OpenAPI, then in `frontend/`:
  `npm run gen:api`, `npm run mock` (Prism), and `npm run dev`; click through
  create-event-type → pick date/slot → book → view in Bookings against the live
  Prism mock.
