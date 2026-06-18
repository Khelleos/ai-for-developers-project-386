"""FastAPI application entry point.

Wires up CORS for the frontend and mounts the API routers. The in-memory
storage is reset on process restart; tests reset it between cases via the
`client` fixture in `tests/conftest.py`.
"""

import os

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app import config
from app.errors import DomainError


def register_exception_handlers(target: FastAPI) -> None:
    """Map domain and request-validation errors to contract error bodies."""

    @target.exception_handler(DomainError)
    async def _domain_error_handler(_request: Request, exc: DomainError):
        body: dict = {"code": exc.code, "message": exc.message}
        if exc.details:
            body["details"] = exc.details
        return JSONResponse(status_code=exc.status_code, content=body)

    @target.exception_handler(RequestValidationError)
    async def _request_validation_handler(
        _request: Request, exc: RequestValidationError
    ):
        details = [
            f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}"
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=400,
            content={
                "code": "validation_error",
                "message": "Request validation failed.",
                "details": details,
            },
        )


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

register_exception_handlers(app)

# Concrete routers.
from app.routers import bookings, event_types  # noqa: E402

app.include_router(event_types.router)
app.include_router(bookings.router)


def mount_frontend(target: FastAPI, dist_path: str) -> None:
    """Serve the built frontend SPA from `dist_path` at the root path.

    Mounts `StaticFiles(..., html=True)` at `/` only when `dist_path` exists and
    contains an `index.html`. Must be called AFTER the API routers are included
    so that `/event-types`, `/bookings`, `/docs`, and `/openapi.json` keep
    priority over the catch-all static mount. When the directory is absent
    (backend-only dev or tests) static serving is silently skipped, leaving the
    API fully functional.
    """
    if not os.path.isfile(os.path.join(dist_path, "index.html")):
        return
    target.mount("/", StaticFiles(directory=dist_path, html=True), name="frontend")


mount_frontend(app, config.FRONTEND_DIST)
