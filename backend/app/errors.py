"""Domain exceptions and error response models.

Each domain exception carries the HTTP status code and the discriminating
``code`` from the contract's error models (``validation_error`` → 400,
``not_found`` → 404, ``slot_conflict`` → 409). The exception handlers in
``app.main`` turn these into JSON bodies that match the contract exactly.
"""

from typing import Literal

from pydantic import BaseModel


class DomainError(Exception):
    """Base class for domain errors mapped to contract error responses."""

    status_code: int = 400
    code: str = "validation_error"

    def __init__(self, message: str, details: list[str] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class ValidationError(DomainError):
    """The request payload failed business validation (400)."""

    status_code = 400
    code = "validation_error"


class NotFoundError(DomainError):
    """A referenced resource does not exist (404)."""

    status_code = 404
    code = "not_found"


class SlotConflictError(DomainError):
    """The requested time overlaps an existing booking (409)."""

    status_code = 409
    code = "slot_conflict"


# --- Response models (mirror errors.tsp; used for OpenAPI documentation) ---


class ValidationErrorResponse(BaseModel):
    """Body returned for a 400 validation failure."""

    code: Literal["validation_error"] = "validation_error"
    message: str
    details: list[str] | None = None


class NotFoundErrorResponse(BaseModel):
    """Body returned for a 404 missing resource."""

    code: Literal["not_found"] = "not_found"
    message: str


class SlotConflictErrorResponse(BaseModel):
    """Body returned for a 409 slot conflict."""

    code: Literal["slot_conflict"] = "slot_conflict"
    message: str
