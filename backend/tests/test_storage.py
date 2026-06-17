"""In-memory storage tests."""

from datetime import datetime, timezone

from app import storage
from app.models import EventTypeCreate, Guest


def setup_function():
    storage.reset()


def test_create_event_type_assigns_id():
    created = storage.create_event_type(
        EventTypeCreate(title="Intro", duration_minutes=30)
    )
    assert created.id
    assert storage.get_event_type(created.id) == created


def test_list_event_types_returns_created():
    a = storage.create_event_type(EventTypeCreate(title="A", duration_minutes=30))
    b = storage.create_event_type(EventTypeCreate(title="B", duration_minutes=60))
    assert storage.list_event_types() == [a, b]


def test_get_unknown_event_type_returns_none():
    assert storage.get_event_type("missing") is None


def test_create_booking_assigns_id_and_created_at():
    start = datetime(2026, 6, 20, 9, 0, tzinfo=timezone.utc)
    end = datetime(2026, 6, 20, 9, 30, tzinfo=timezone.utc)
    booking = storage.create_booking(
        event_type_id="e1",
        guest=Guest(name="Ada", email="ada@example.com"),
        start=start,
        end=end,
    )
    assert booking.id
    assert booking.created_at.tzinfo is not None
    assert storage.list_bookings() == [booking]


def test_reset_clears_storage():
    storage.create_event_type(EventTypeCreate(title="A", duration_minutes=30))
    storage.create_booking(
        event_type_id="e1",
        guest=Guest(name="Ada", email="ada@example.com"),
        start=datetime(2026, 6, 20, 9, 0, tzinfo=timezone.utc),
        end=datetime(2026, 6, 20, 9, 30, tzinfo=timezone.utc),
    )
    storage.reset()
    assert storage.list_event_types() == []
    assert storage.list_bookings() == []
