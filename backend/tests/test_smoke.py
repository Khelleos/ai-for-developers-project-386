"""Smoke tests: the application boots and exposes its OpenAPI document."""


def test_openapi_available(client):
    response = client.get("/openapi.json")
    assert response.status_code == 200
    body = response.json()
    assert body["info"]["title"] == "Call Booking API"


def test_docs_available(client):
    response = client.get("/docs")
    assert response.status_code == 200
