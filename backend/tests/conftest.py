"""Shared pytest fixtures.

`client` yields a FastAPI TestClient with the in-memory storage reset before
each test, so cases are isolated. The storage module is imported lazily and
its reset is optional, so this fixture works before storage exists (Task 1)
and once it does (Task 2+).
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


def _reset_storage():
    """Reset the in-memory store between tests, if storage is available."""
    try:
        from app import storage
    except ImportError:
        return
    reset = getattr(storage, "reset", None)
    if callable(reset):
        reset()


@pytest.fixture
def client():
    _reset_storage()
    with TestClient(app) as test_client:
        yield test_client
