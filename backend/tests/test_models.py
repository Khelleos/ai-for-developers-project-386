"""Model serialization and validation tests."""

from datetime import datetime, timezone

import pytest
from pydantic import ValidationError as PydanticValidationError

from app.models import (
    Booking,
    BookingCreate,
    EventType,
    EventTypeCreate,
    Guest,
    Slot,
)


def test_event_type_serializes_camel_case():
    event_type = EventType(id="abc", title="Intro call", duration_minutes=30)
    dumped = event_type.model_dump(by_alias=True)
    assert dumped == {
        "id": "abc",
        "title": "Intro call",
        "durationMinutes": 30,
        "description": None,
    }


def test_event_type_create_parses_camel_case_alias():
    payload = EventTypeCreate.model_validate(
        {"title": "Intro call", "durationMinutes": 45}
    )
    assert payload.duration_minutes == 45
    assert payload.description is None


def test_booking_serializes_camel_case():
    start = datetime(2026, 6, 20, 9, 0, tzinfo=timezone.utc)
    end = datetime(2026, 6, 20, 9, 30, tzinfo=timezone.utc)
    created = datetime(2026, 6, 18, 12, 0, tzinfo=timezone.utc)
    booking = Booking(
        id="b1",
        event_type_id="e1",
        guest=Guest(name="Ada", email="ada@example.com"),
        start=start,
        end=end,
        created_at=created,
    )
    dumped = booking.model_dump(by_alias=True)
    assert dumped["eventTypeId"] == "e1"
    assert dumped["createdAt"] == created
    assert dumped["guest"]["email"] == "ada@example.com"


def test_slot_round_trips():
    start = datetime(2026, 6, 20, 9, 0, tzinfo=timezone.utc)
    end = datetime(2026, 6, 20, 9, 30, tzinfo=timezone.utc)
    slot = Slot(start=start, end=end)
    assert slot.start == start
    assert slot.end == end


def test_empty_title_rejected():
    with pytest.raises(PydanticValidationError):
        EventTypeCreate(title="", duration_minutes=30)


def test_non_positive_duration_rejected():
    with pytest.raises(PydanticValidationError):
        EventTypeCreate(title="Intro", duration_minutes=0)


def test_invalid_email_rejected():
    with pytest.raises(PydanticValidationError):
        Guest(name="Ada", email="not-an-email")


def test_blank_event_type_id_rejected():
    with pytest.raises(PydanticValidationError):
        BookingCreate(
            event_type_id="",
            guest=Guest(name="Ada", email="ada@example.com"),
            start=datetime(2026, 6, 20, 9, 0, tzinfo=timezone.utc),
        )
