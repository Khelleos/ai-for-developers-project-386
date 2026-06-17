"""FastAPI application entry point.

Wires up CORS for the frontend and mounts the API routers. The in-memory
storage is reset on process restart; tests reset it between cases via the
`client` fixture in `tests/conftest.py`.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config

app = FastAPI(
    title="Call Booking API",
    version="1.0.0",
    description=(
        "Single-owner, Calendly-like call-booking service. In-memory "
        "implementation of the TypeSpec/OpenAPI contract."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router stubs — concrete routers are mounted in later tasks
# (event types, bookings). Imported and included here once implemented:
#   from app.routers import event_types, bookings
#   app.include_router(event_types.router)
#   app.include_router(bookings.router)
