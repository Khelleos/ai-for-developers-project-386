"""Booking endpoints (create + list).

Mirrors the ``Bookings`` namespace from ``routes/bookings.tsp``:

- ``POST /bookings`` → 201 with the created ``Booking``. The server derives
  ``end`` from the event type's duration and re-validates availability at write
  time: 400 when ``start`` is off the 30-minute grid, in the past, or outside
  the rolling 14-day window (payload-shape errors are handled by the
  request-validation handler in ``app.main``); 404 when the ``eventTypeId`` is
  unknown; 409 when the requested time overlaps any existing booking (global
  one-call-at-a-time rule, checked across all event types).
- ``GET /bookings`` → 200 with bookings ordered by start time, optionally
  restricted to those starting at or after ``from`` (defaults to "now").
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query

from app import booking_rules, storage
from app.errors import (
    NotFoundError,
    NotFoundErrorResponse,
    SlotConflictError,
    SlotConflictErrorResponse,
    ValidationError,
    ValidationErrorResponse,
)
from app.models import Booking, BookingCreate

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _to_utc(value: datetime) -> datetime:
    """Treat naive datetimes as UTC; normalize aware ones to UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@router.post(
    "",
    status_code=201,
    response_model=Booking,
    responses={
        400: {"model": ValidationErrorResponse},
        404: {"model": NotFoundErrorResponse},
        409: {"model": SlotConflictErrorResponse},
    },
)
def create_booking(payload: BookingCreate) -> Booking:
    """Create a booking, re-validating grid/window/availability server-side."""
    event_type = storage.get_event_type(payload.event_type_id)
    if event_type is None:
        raise NotFoundError(f"Event type '{payload.event_type_id}' not found.")

    now = datetime.now(timezone.utc)
    start = _to_utc(payload.start)
    end = start + timedelta(minutes=event_type.duration_minutes)

    if not booking_rules.is_on_grid(start, event_type.duration_minutes):
        raise ValidationError(
            "start must be on the 30-minute grid within business hours "
            "(09:00–17:00) and fit the event type's duration."
        )
    if start < now:
        raise ValidationError("start must be in the future.")
    if not booking_rules.is_within_window(start, now):
        raise ValidationError(
            "start must be within the rolling 14-day booking window."
        )

    conflict = booking_rules.find_conflict(start, end, storage.list_bookings())
    if conflict is not None:
        raise SlotConflictError(
            "The requested time overlaps an existing booking."
        )

    return storage.create_booking(
        event_type_id=payload.event_type_id,
        guest=payload.guest,
        start=start,
        end=end,
        notes=payload.notes,
    )


@router.get("", response_model=list[Booking])
def list_bookings(
    from_: datetime | None = Query(default=None, alias="from"),
) -> list[Booking]:
    """Return bookings starting at or after ``from`` (default now), by start."""
    threshold = _to_utc(from_) if from_ is not None else datetime.now(timezone.utc)
    bookings = [b for b in storage.list_bookings() if b.start >= threshold]
    return sorted(bookings, key=lambda b: b.start)
