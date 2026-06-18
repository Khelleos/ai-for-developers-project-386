"""Shared pytest fixtures.

`client` yields a FastAPI TestClient with the in-memory storage reset before
each test, so cases are isolated.
"""

import pytest
from fastapi.testclient import TestClient

from app import storage
from app.main import app


@pytest.fixture
def client():
    storage.reset()
    with TestClient(app) as test_client:
        yield test_client
