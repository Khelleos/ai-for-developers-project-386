"""Slot generation (booking_rules) and the listSlots endpoint."""

from datetime import datetime, timedelta, timezone

from app import booking_rules, storage
from app.models import Booking, Guest

UTC = timezone.utc
# A fixed "now" well clear of the real clock so generation is deterministic.
NOW = datetime(2030, 1, 1, 0, 0, tzinfo=UTC)
TODAY = NOW.date()


def _booking(start: datetime, end: datetime) -> Booking:
    return Booking(
        id="b1",
        event_type_id="e1",
        guest=Guest(name="Ada", email="ada@example.com"),
        start=start,
        end=end,
        created_at=NOW,
    )


def test_grid_and_hour_boundaries_30min():
    slots = booking_rules.generate_slots(
        duration_minutes=30, bookings=[], now=NOW, on_date=TODAY
    )
    # 09:00 .. 16:30 on a 30-min grid → 16 slots.
    assert len(slots) == 16
    assert slots[0].start == datetime(2030, 1, 1, 9, 0, tzinfo=UTC)
    assert slots[0].end == datetime(2030, 1, 1, 9, 30, tzinfo=UTC)
    assert slots[-1].start == datetime(2030, 1, 1, 16, 30, tzinfo=UTC)
    assert slots[-1].end == datetime(2030, 1, 1, 17, 0, tzinfo=UTC)


def test_grid_respects_duration_against_end_of_day():
    slots = booking_rules.generate_slots(
        duration_minutes=60, bookings=[], now=NOW, on_date=TODAY
    )
    # Last start that fits a 60-min call before 17:00 is 16:00 → 15 slots.
    assert len(slots) == 15
    assert slots[-1].start == datetime(2030, 1, 1, 16, 0, tzinfo=UTC)
    assert slots[-1].end == datetime(2030, 1, 1, 17, 0, tzinfo=UTC)


def test_past_slots_excluded():
    midday = datetime(2030, 1, 1, 12, 0, tzinfo=UTC)
    slots = booking_rules.generate_slots(
        duration_minutes=30, bookings=[], now=midday, on_date=TODAY
    )
    assert slots[0].start == midday
    assert all(slot.start >= midday for slot in slots)


def test_date_outside_window_returns_empty():
    past = booking_rules.generate_slots(
        duration_minutes=30, bookings=[], now=NOW, on_date=TODAY - timedelta(days=1)
    )
    beyond = booking_rules.generate_slots(
        duration_minutes=30, bookings=[], now=NOW, on_date=TODAY + timedelta(days=14)
    )
    assert past == []
    assert beyond == []


def test_last_day_in_window_has_slots():
    last_day = TODAY + timedelta(days=13)
    slots = booking_rules.generate_slots(
        duration_minutes=30, bookings=[], now=NOW, on_date=last_day
    )
    assert len(slots) == 16


def test_full_window_spans_14_days():
    slots = booking_rules.generate_slots(duration_minutes=30, bookings=[], now=NOW)
    days = {slot.start.date() for slot in slots}
    assert len(days) == 14
    assert min(days) == TODAY
    assert max(days) == TODAY + timedelta(days=13)


def test_exact_overlap_excludes_slot():
    booking = _booking(
        datetime(2030, 1, 1, 9, 0, tzinfo=UTC),
        datetime(2030, 1, 1, 9, 30, tzinfo=UTC),
    )
    slots = booking_rules.generate_slots(
        duration_minutes=30, bookings=[booking], now=NOW, on_date=TODAY
    )
    starts = [slot.start for slot in slots]
    assert datetime(2030, 1, 1, 9, 0, tzinfo=UTC) not in starts
    assert datetime(2030, 1, 1, 9, 30, tzinfo=UTC) in starts


def test_partial_overlap_excludes_both_touching_slots():
    booking = _booking(
        datetime(2030, 1, 1, 9, 15, tzinfo=UTC),
        datetime(2030, 1, 1, 9, 45, tzinfo=UTC),
    )
    slots = booking_rules.generate_slots(
        duration_minutes=30, bookings=[booking], now=NOW, on_date=TODAY
    )
    starts = [slot.start for slot in slots]
    assert datetime(2030, 1, 1, 9, 0, tzinfo=UTC) not in starts
    assert datetime(2030, 1, 1, 9, 30, tzinfo=UTC) not in starts
    assert datetime(2030, 1, 1, 10, 0, tzinfo=UTC) in starts


# --- Endpoint integration ---


def _future_day_iso(days_ahead: int = 5) -> str:
    day = datetime.now(timezone.utc).date() + timedelta(days=days_ahead)
    return day.isoformat()


def test_list_slots_unknown_event_type_returns_404(client):
    response = client.get("/event-types/missing/slots")
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_list_slots_happy_path(client):
    event_type = client.post(
        "/event-types", json={"title": "Intro", "durationMinutes": 30}
    ).json()
    response = client.get(
        f"/event-types/{event_type['id']}/slots", params={"date": _future_day_iso()}
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 16
    assert body[0]["start"].endswith("09:00:00Z") or "T09:00:00" in body[0]["start"]


def test_list_slots_excludes_booked_slot(client):
    event_type = client.post(
        "/event-types", json={"title": "Intro", "durationMinutes": 30}
    ).json()
    day = datetime.now(timezone.utc).date() + timedelta(days=5)
    storage.create_booking(
        event_type_id=event_type["id"],
        guest=Guest(name="Ada", email="ada@example.com"),
        start=datetime.combine(day, datetime.min.time(), tzinfo=UTC).replace(hour=9),
        end=datetime.combine(day, datetime.min.time(), tzinfo=UTC).replace(hour=9, minute=30),
    )
    response = client.get(
        f"/event-types/{event_type['id']}/slots", params={"date": day.isoformat()}
    )
    assert response.status_code == 200
    assert len(response.json()) == 15
