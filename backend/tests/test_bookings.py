"""Booking endpoint tests: create (happy + 400/404/409) and list."""

from datetime import datetime, timedelta, timezone

UTC = timezone.utc


def _future_start(days_ahead: int = 5, hour: int = 9, minute: int = 0) -> datetime:
    """An on-grid, in-window start at the given owner-local (UTC) time."""
    day = datetime.now(UTC).date() + timedelta(days=days_ahead)
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=UTC)


def _create_event_type(client, duration_minutes: int = 30) -> dict:
    return client.post(
        "/event-types",
        json={"title": "Intro", "durationMinutes": duration_minutes},
    ).json()


def _guest() -> dict:
    return {"name": "Ada", "email": "ada@example.com"}


def test_create_booking_happy_path(client):
    event_type = _create_event_type(client, duration_minutes=30)
    start = _future_start()
    response = client.post(
        "/bookings",
        json={
            "eventTypeId": event_type["id"],
            "guest": _guest(),
            "start": start.isoformat(),
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["eventTypeId"] == event_type["id"]
    assert body["guest"]["email"] == "ada@example.com"
    assert body["id"]
    assert body["createdAt"]
    # end is derived from the event type's duration (30 min).
    assert datetime.fromisoformat(body["end"]) - datetime.fromisoformat(
        body["start"]
    ) == timedelta(minutes=30)


def test_create_booking_unknown_event_type_returns_404(client):
    response = client.post(
        "/bookings",
        json={
            "eventTypeId": "missing",
            "guest": _guest(),
            "start": _future_start().isoformat(),
        },
    )
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_create_booking_off_grid_returns_400(client):
    event_type = _create_event_type(client)
    response = client.post(
        "/bookings",
        json={
            "eventTypeId": event_type["id"],
            "guest": _guest(),
            "start": _future_start(minute=15).isoformat(),
        },
    )
    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"


def test_create_booking_outside_business_hours_returns_400(client):
    event_type = _create_event_type(client, duration_minutes=30)
    # 16:45 + 30 min runs past 17:00.
    response = client.post(
        "/bookings",
        json={
            "eventTypeId": event_type["id"],
            "guest": _guest(),
            "start": _future_start(hour=16, minute=45).isoformat(),
        },
    )
    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"


def test_create_booking_in_the_past_returns_400(client):
    event_type = _create_event_type(client)
    response = client.post(
        "/bookings",
        json={
            "eventTypeId": event_type["id"],
            "guest": _guest(),
            "start": _future_start(days_ahead=-3).isoformat(),
        },
    )
    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"


def test_create_booking_out_of_window_returns_400(client):
    event_type = _create_event_type(client)
    response = client.post(
        "/bookings",
        json={
            "eventTypeId": event_type["id"],
            "guest": _guest(),
            "start": _future_start(days_ahead=20).isoformat(),
        },
    )
    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"


def test_create_booking_invalid_payload_returns_400(client):
    event_type = _create_event_type(client)
    response = client.post(
        "/bookings",
        json={
            "eventTypeId": event_type["id"],
            "guest": {"name": "", "email": "not-an-email"},
            "start": _future_start().isoformat(),
        },
    )
    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"


def test_create_booking_exact_overlap_returns_409(client):
    event_type = _create_event_type(client, duration_minutes=30)
    start = _future_start()
    payload = {
        "eventTypeId": event_type["id"],
        "guest": _guest(),
        "start": start.isoformat(),
    }
    assert client.post("/bookings", json=payload).status_code == 201
    response = client.post("/bookings", json=payload)
    assert response.status_code == 409
    assert response.json()["code"] == "slot_conflict"


def test_create_booking_partial_overlap_across_event_types_returns_409(client):
    first = _create_event_type(client, duration_minutes=60)
    second = _create_event_type(client, duration_minutes=30)
    # 60-min booking at 09:00 occupies 09:00–10:00.
    assert client.post(
        "/bookings",
        json={
            "eventTypeId": first["id"],
            "guest": _guest(),
            "start": _future_start(hour=9, minute=0).isoformat(),
        },
    ).status_code == 201
    # A 30-min booking on a different event type at 09:30 overlaps 09:30–10:00.
    response = client.post(
        "/bookings",
        json={
            "eventTypeId": second["id"],
            "guest": _guest(),
            "start": _future_start(hour=9, minute=30).isoformat(),
        },
    )
    assert response.status_code == 409
    assert response.json()["code"] == "slot_conflict"


def test_adjacent_bookings_do_not_conflict(client):
    event_type = _create_event_type(client, duration_minutes=30)
    assert client.post(
        "/bookings",
        json={
            "eventTypeId": event_type["id"],
            "guest": _guest(),
            "start": _future_start(hour=9, minute=0).isoformat(),
        },
    ).status_code == 201
    # 09:30 starts exactly when the first ends — no overlap.
    response = client.post(
        "/bookings",
        json={
            "eventTypeId": event_type["id"],
            "guest": _guest(),
            "start": _future_start(hour=9, minute=30).isoformat(),
        },
    )
    assert response.status_code == 201


def test_list_bookings_empty(client):
    response = client.get("/bookings")
    assert response.status_code == 200
    assert response.json() == []


def test_list_bookings_sorted_by_start(client):
    event_type = _create_event_type(client, duration_minutes=30)
    later = _future_start(days_ahead=6, hour=10)
    earlier = _future_start(days_ahead=5, hour=9)
    for start in (later, earlier):
        client.post(
            "/bookings",
            json={
                "eventTypeId": event_type["id"],
                "guest": _guest(),
                "start": start.isoformat(),
            },
        )
    body = client.get("/bookings").json()
    starts = [datetime.fromisoformat(b["start"]) for b in body]
    assert starts == sorted(starts)
    assert starts[0] == earlier


def test_list_bookings_from_filter(client):
    event_type = _create_event_type(client, duration_minutes=30)
    early = _future_start(days_ahead=5, hour=9)
    late = _future_start(days_ahead=8, hour=9)
    for start in (early, late):
        client.post(
            "/bookings",
            json={
                "eventTypeId": event_type["id"],
                "guest": _guest(),
                "start": start.isoformat(),
            },
        )
    cutoff = _future_start(days_ahead=7, hour=0)
    body = client.get("/bookings", params={"from": cutoff.isoformat()}).json()
    assert len(body) == 1
    assert datetime.fromisoformat(body[0]["start"]) == late
