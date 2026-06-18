"""Application configuration and domain constants.

Domain constants mirror the TypeSpec contract (informational there, enforced
here server-side). owner-local time is treated as UTC in this in-memory
implementation so that slot math and tests are deterministic.
"""

import os

# --- Domain constants (owner-local, treated as UTC here) ---

# Business hours: 09:00–17:00.
BUSINESS_HOURS_START = 9
BUSINESS_HOURS_END = 17

# Slot grid step, in minutes.
SLOT_STEP_MINUTES = 30

# Rolling booking window, in days.
BOOKING_WINDOW_DAYS = 14


# --- Runtime configuration (overridable via environment) ---

# Port the server binds to (used by uvicorn invocation / docs).
PORT = int(os.environ.get("PORT", "8000"))

# CORS origin for the frontend dev server. Comma-separated list supported.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173"
    ).split(",")
    if origin.strip()
]

# Directory holding the built frontend static assets (Vite `dist/`). In the
# single-image Docker build this is set explicitly; the default points at the
# repo's `frontend/dist` so a local `npm run build` is served too. When the
# directory is absent (e.g. backend-only dev or tests) static serving is
# silently skipped.
_DEFAULT_FRONTEND_DIST = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "frontend",
    "dist",
)
FRONTEND_DIST = os.environ.get("FRONTEND_DIST", _DEFAULT_FRONTEND_DIST)
