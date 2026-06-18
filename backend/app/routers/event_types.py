"""Event-type endpoints (create + list).

Mirrors the ``EventTypes`` namespace from ``routes/event-types.tsp``:

- ``POST /event-types`` → 201 with the created ``EventType``; 400 when the
  payload fails validation (handled by the request-validation handler in
  ``app.main``).
- ``GET /event-types`` → 200 with every stored event type.

- ``GET /event-types/{eventTypeId}/slots`` → 200 with available slots
  (optionally narrowed to a single day via ``date``); 404 when the event type
  does not exist.
"""

from datetime import date as _date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Path

from app import booking_rules, storage
from app.errors import NotFoundError, NotFoundErrorResponse, ValidationErrorResponse
from app.models import EventType, EventTypeCreate, Slot

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


@router.get(
    "/{eventTypeId}/slots",
    response_model=list[Slot],
    responses={404: {"model": NotFoundErrorResponse}},
)
def list_slots(
    event_type_id: Annotated[str, Path(alias="eventTypeId")],
    date: _date | None = None,
) -> list[Slot]:
    """Return available slots for an event type, optionally for one day."""
    event_type = storage.get_event_type(event_type_id)
    if event_type is None:
        raise NotFoundError(f"Event type '{event_type_id}' not found.")
    return booking_rules.generate_slots(
        duration_minutes=event_type.duration_minutes,
        bookings=storage.list_bookings(),
        now=datetime.now(timezone.utc),
        on_date=date,
    )
