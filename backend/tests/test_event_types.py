"""Event-type endpoint tests: create (happy path + 400) and list."""


def test_create_event_type_happy_path(client):
    response = client.post(
        "/event-types",
        json={"title": "Intro call", "durationMinutes": 30},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Intro call"
    assert body["durationMinutes"] == 30
    assert body["description"] is None
    assert body["id"]


def test_create_event_type_with_description(client):
    response = client.post(
        "/event-types",
        json={
            "title": "Deep dive",
            "durationMinutes": 60,
            "description": "A longer session",
        },
    )
    assert response.status_code == 201
    assert response.json()["description"] == "A longer session"


def test_create_event_type_blank_title_returns_400(client):
    response = client.post(
        "/event-types",
        json={"title": "", "durationMinutes": 30},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"


def test_create_event_type_non_positive_duration_returns_400(client):
    response = client.post(
        "/event-types",
        json={"title": "Intro", "durationMinutes": 0},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"


def test_create_event_type_missing_field_returns_400(client):
    response = client.post("/event-types", json={"title": "Intro"})
    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"


def test_list_event_types_empty(client):
    response = client.get("/event-types")
    assert response.status_code == 200
    assert response.json() == []


def test_list_event_types_returns_created(client):
    first = client.post(
        "/event-types", json={"title": "Intro", "durationMinutes": 30}
    ).json()
    second = client.post(
        "/event-types", json={"title": "Deep dive", "durationMinutes": 60}
    ).json()

    response = client.get("/event-types")
    assert response.status_code == 200
    body = response.json()
    assert [et["id"] for et in body] == [first["id"], second["id"]]
