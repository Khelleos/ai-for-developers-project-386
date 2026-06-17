"""Event-type endpoints (create + list).

Mirrors the ``EventTypes`` namespace from ``routes/event-types.tsp``:

- ``POST /event-types`` → 201 with the created ``EventType``; 400 when the
  payload fails validation (handled by the request-validation handler in
  ``app.main``).
- ``GET /event-types`` → 200 with every stored event type.

Slot discovery (``GET /event-types/{id}/slots``) is added in a later task.
"""

from fastapi import APIRouter

from app import storage
from app.errors import ValidationErrorResponse
from app.models import EventType, EventTypeCreate

router = APIRouter(prefix="/event-types", tags=["event-types"])


@router.post(
    "",
    status_code=201,
    response_model=EventType,
    responses={400: {"model": ValidationErrorResponse}},
)
def create_event_type(payload: EventTypeCreate) -> EventType:
    """Create a new event type and return it with a server-assigned id."""
    return storage.create_event_type(payload)


@router.get("", response_model=list[EventType])
def list_event_types() -> list[EventType]:
    """Return every event type the owner has defined."""
    return storage.list_event_types()
