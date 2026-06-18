"""Tests for serving the built frontend static assets.

`mount_frontend` is exercised against a throwaway FastAPI app so we control the
dist directory without depending on a real `npm run build`. The shared `client`
fixture (no static mount) covers the absent-directory case: the API still works.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import mount_frontend


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

    # Nothing was mounted, so the root path has no handler.
    assert not any(getattr(route, "name", None) == "frontend" for route in target.routes)


def test_no_mount_when_index_html_absent(tmp_path):
    # Directory exists but has no index.html — static serving is skipped.
    (tmp_path / "asset.js").write_text("console.log('x')")

    target = FastAPI()
    mount_frontend(target, str(tmp_path))

    assert not any(getattr(route, "name", None) == "frontend" for route in target.routes)


def test_api_works_without_static_mount(client):
    # The shared app fixture has no dist directory; the API stays functional.
    response = client.get("/event-types")
    assert response.status_code == 200
