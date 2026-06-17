"""FastAPI application entry point.

Wires up CORS for the frontend and mounts the API routers. The in-memory
storage is reset on process restart; tests reset it between cases via the
`client` fixture in `tests/conftest.py`.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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

# Concrete routers. Bookings (and slot discovery) are mounted in later tasks.
from app.routers import event_types  # noqa: E402

app.include_router(event_types.router)
