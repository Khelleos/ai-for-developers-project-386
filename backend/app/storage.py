"""In-memory storage for event types and bookings.

Plain module-level dicts back the repository; data is lost on process restart
and reset between tests via :func:`reset`. Server-assigned fields (``id``,
``createdAt``) are generated here. Slot math and overlap rules live in
``app.booking_rules`` (later tasks); this module only persists records.
"""

from datetime import datetime, timezone
from uuid import uuid4

from app.models import Booking, EventType, EventTypeCreate, Guest

_event_types: dict[str, EventType] = {}
_bookings: dict[str, Booking] = {}


def reset() -> None:
    """Clear all stored data (used between tests)."""
    _event_types.clear()
    _bookings.clear()


def _new_id() -> str:
    return uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


# --- Event types ---


def create_event_type(payload: EventTypeCreate) -> EventType:
    """Persist a new event type with a server-assigned id."""
    event_type = EventType(
        id=_new_id(),
        title=payload.title,
        duration_minutes=payload.duration_minutes,
        description=payload.description,
    )
    _event_types[event_type.id] = event_type
    return event_type


def get_event_type(event_type_id: str) -> EventType | None:
    """Return the event type with the given id, or ``None``."""
    return _event_types.get(event_type_id)


def list_event_types() -> list[EventType]:
    """Return all stored event types in insertion order."""
    return list(_event_types.values())


# --- Bookings ---


def create_booking(
    *,
    event_type_id: str,
    guest: Guest,
    start: datetime,
    end: datetime,
    notes: str | None = None,
) -> Booking:
    """Persist a new booking with a server-assigned id and ``createdAt``."""
    booking = Booking(
        id=_new_id(),
        event_type_id=event_type_id,
        guest=guest,
        start=start,
        end=end,
        notes=notes,
        created_at=_now(),
    )
    _bookings[booking.id] = booking
    return booking


def list_bookings() -> list[Booking]:
    """Return all stored bookings in insertion order."""
    return list(_bookings.values())
