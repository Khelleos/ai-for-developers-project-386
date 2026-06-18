# Call Booking Backend

An in-memory implementation of the single-owner, Calendly-like call-booking
service. It implements the frozen contract (TypeSpec → `tsp-output/schema/openapi.yaml`)
exactly: the same operations, request/response shapes, and status codes. All
business rules (slot math, booking-window enforcement, the global
one-call-at-a-time overlap rule) are enforced here server-side.

Storage is purely in-memory — all data is lost on process restart.

Stack: Python 3.11+, FastAPI, Pydantic (with email validation), Uvicorn. Tests
run on pytest with FastAPI's `TestClient` (httpx) and `pytest-cov`.

## Contract conformance

| Operation                                       | Responses              |
| ----------------------------------------------- | ---------------------- |
| `POST /event-types`                             | 201 EventType \| 400   |
| `GET /event-types`                              | 200 EventType[]        |
| `GET /event-types/{eventTypeId}/slots?date=`    | 200 Slot[] \| 404      |
| `POST /bookings`                                | 201 Booking \| 400 \| 404 \| 409 |
| `GET /bookings?from=`                           | 200 Booking[]          |

Errors use a discriminating `code` field: `validation_error` (400),
`not_found` (404), `slot_conflict` (409).

Domain constants (mirrored from the contract, enforced here): business hours
09:00–17:00, a 30-minute slot grid, a rolling 14-day booking window, and a global
one-call-at-a-time overlap rule (checked across all event types). owner-local
time is treated as **UTC** in this in-memory implementation so slot math and
tests are deterministic.

## Prerequisites

- Python 3.11+
- A virtual environment with dependencies installed:

  ```sh
  cd backend
  python -m venv .venv
  # Windows (PowerShell): .venv\Scripts\Activate.ps1
  # macOS/Linux:          source .venv/bin/activate
  pip install -r requirements.txt
  ```

## Running the server

From inside `backend/`:

```sh
uvicorn app.main:app --reload --port 8000
```

- The server listens on port `8000` by default (override with the `PORT`
  environment variable).
- Interactive docs are available at `http://localhost:8000/docs` and the OpenAPI
  document at `http://localhost:8000/openapi.json`.

## Configuration

Settings are read from environment variables (see `app/config.py`):

- `PORT` — port the server binds to (default `8000`).
- `CORS_ORIGINS` — comma-separated list of allowed frontend origins
  (default `http://localhost:5173`, the Vite dev server). Only relevant when the
  frontend runs on a separate origin (Vite dev server or the Prism-mock
  workflow). In the single-image Docker build the UI and API share one origin,
  so CORS is not exercised.
- `FRONTEND_DIST` — directory of the built frontend static assets (Vite
  `dist/`). Defaults to the repo's `frontend/dist`. When the directory exists,
  `mount_frontend` serves it at `/` (after the API routers, so API paths keep
  priority); when absent, static serving is silently skipped so backend-only dev
  and tests run unchanged. Set explicitly in the Docker image to
  `/app/frontend_dist`.

## Serving the frontend / Docker

In the single-image Docker build (root `Dockerfile`) this backend also serves
the built frontend from the same process, so the API and the UI share one
origin and no CORS is needed in production. From the repo root:

```sh
docker build -t call-booking .
docker run -e PORT=8000 -p 8000:8000 call-booking
# frontend → http://localhost:8000/   API docs → http://localhost:8000/docs
```

The `CMD` runs `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`, so a
hosting platform can inject `PORT` and the container starts automatically.

## Pointing the frontend at this backend

The frontend reads its API base URL from `VITE_API_BASE_URL` (default
`http://localhost:4010`, the Prism mock). To run it against this real backend
instead, set the variable before starting the frontend dev server — e.g. in
`frontend/.env`:

```sh
VITE_API_BASE_URL=http://localhost:8000
```

Make sure this backend's `CORS_ORIGINS` includes the frontend's origin
(`http://localhost:5173` by default).

## Running tests

From inside `backend/`:

```sh
pytest               # run the suite
pytest --cov         # run with coverage (target: 80%+)
```

## Project layout

- `app/main.py` — FastAPI app: CORS, exception handlers, router mounting.
- `app/config.py` — domain constants and runtime configuration.
- `app/models.py` — Pydantic models (EventType, Slot, Guest, Booking, and their
  create payloads).
- `app/errors.py` — domain exceptions and contract error-response models.
- `app/storage.py` — in-memory repositories (id and `createdAt` generation).
- `app/booking_rules.py` — slot generation and overlap detection.
- `app/routers/` — `event_types.py` and `bookings.py` operations.
- `tests/` — pytest suite (`conftest.py` resets in-memory storage between cases).
