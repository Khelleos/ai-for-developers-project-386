"""Tests for serving the built frontend static assets.

`mount_frontend` is exercised against throwaway FastAPI apps so we control the
dist directory without depending on a real `npm run build`. Behaviour is checked
through HTTP requests rather than route introspection, so the tests stay valid
regardless of whether the repo's `frontend/dist` happens to exist locally.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import storage
from app.main import mount_frontend
from app.routers import bookings, event_types


def test_serves_index_html_at_root(tmp_path):
    (tmp_path / "index.html").write_text("<html><body>booking</body></html>")

    target = FastAPI()
    mount_frontend(target, str(tmp_path))

    with TestClient(target) as test_client:
        response = test_client.get("/")

    assert response.status_code == 200
    assert "booking" in response.text


def test_no_mount_when_directory_missing(tmp_path):
    missing = tmp_path / "does-not-exist"

    target = FastAPI()
    mount_frontend(target, str(missing))

    # Nothing was mounted, so the root path has no handler and returns 404.
    with TestClient(target) as test_client:
        assert test_client.get("/").status_code == 404


def test_no_mount_when_index_html_absent(tmp_path):
    # Directory exists but has no index.html — static serving is skipped.
    (tmp_path / "asset.js").write_text("console.log('x')")

    target = FastAPI()
    mount_frontend(target, str(tmp_path))

    with TestClient(target) as test_client:
        assert test_client.get("/").status_code == 404


def test_api_routes_keep_priority_over_static_mount(tmp_path):
    """The static mount at `/` must not shadow the API routers or `/openapi.json`.

    Reproduces production wiring (routers included first, then `mount_frontend`)
    and asserts the API still answers while `/` serves the SPA shell.
    """
    storage.reset()
    (tmp_path / "index.html").write_text("<html><body>spa-shell</body></html>")

    target = FastAPI()
    target.include_router(event_types.router)
    target.include_router(bookings.router)
    mount_frontend(target, str(tmp_path))

    with TestClient(target) as test_client:
        # API routes win over the catch-all static mount.
        event_types_response = test_client.get("/event-types")
        assert event_types_response.status_code == 200
        assert event_types_response.json() == []

        bookings_response = test_client.get("/bookings")
        assert bookings_response.status_code == 200
        assert bookings_response.json() == []

        assert test_client.get("/openapi.json").status_code == 200

        # The root still serves the SPA shell.
        root_response = test_client.get("/")
        assert root_response.status_code == 200
        assert "spa-shell" in root_response.text


def test_api_works_without_static_mount(client):
    # Regardless of whether a dist directory is present, the API stays functional.
    response = client.get("/event-types")
    assert response.status_code == 200
