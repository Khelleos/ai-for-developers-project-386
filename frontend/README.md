# Call Booking Frontend

A contract-driven frontend for the single-owner, Calendly-like call-booking
service. It is fully decoupled from the root TypeSpec project: it consumes the
HTTP API defined by the emitted OpenAPI document over the network and shares no
runtime with the spec.

Stack: Vite + React + TypeScript, Mantine UI (`@mantine/core`, `@mantine/form`,
`@mantine/dates`), TanStack Query, React Router, and a typed client generated
from the contract via `openapi-typescript` + `openapi-fetch`. Tests run on
Vitest + React Testing Library with API calls stubbed by MSW.

## Prerequisites

- Node.js 22+
- Dependencies installed: `npm install` (run inside this `frontend/` directory)

## Contract-driven workflow

The frontend never hand-writes API types — it derives them from the contract.
The full loop, starting from the repo root:

1. **Generate the contract.** From the repository root, compile the TypeSpec
   spec to OpenAPI:

   ```sh
   npm run build
   ```

   This emits `tsp-output/schema/openapi.yaml`.

2. **Generate types.** Inside `frontend/`, regenerate the typed schema from the
   emitted OpenAPI:

   ```sh
   npm run gen:api
   ```

   This writes `src/api/schema.ts` (read by the `openapi-fetch` client). Re-run
   it whenever the contract changes.

3. **Run the mock backend.** Inside `frontend/`, serve a Prism mock of the same
   OpenAPI document on port 4010:

   ```sh
   npm run mock
   ```

   Leave this running in its own terminal. It satisfies the
   "works with a separately running backend" requirement without a real server.

4. **Start the dev server.** In another terminal, inside `frontend/`:

   ```sh
   npm run dev
   ```

   The app reads `VITE_API_BASE_URL` (default `http://localhost:4010`, the Prism
   port). Copy `.env.example` to `.env` to point it at a different backend.

## Scripts

- `npm run dev` — start the Vite dev server.
- `npm run build` — typecheck (`tsc -b`) and produce a production build.
- `npm test` — run the Vitest suite once.
- `npm run test:watch` — run Vitest in watch mode.
- `npm run coverage` — run tests with coverage reporting.
- `npm run gen:api` — regenerate `src/api/schema.ts` from
  `../tsp-output/schema/openapi.yaml`.
- `npm run mock` — launch the Prism mock on port 4010.

## Project layout

- `src/api/` — generated schema, `openapi-fetch` client, error normalization,
  convenience types, and TanStack Query hooks.
- `src/pages/` — route-level pages (event types, booking flow, owner bookings).
- `src/components/` — reusable UI (layout, forms, cards, slot picker).
- `src/config.ts` — reads `VITE_API_BASE_URL`.
