"""Error handling tests: domain exceptions and contract error bodies.

The exception handlers are exercised on a throwaway app with a few routes
that raise each error, so the body format is verified without depending on
routers that arrive in later tasks.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.errors import (
    NotFoundError,
    NotFoundErrorResponse,
    SlotConflictError,
    SlotConflictErrorResponse,
    ValidationError,
    ValidationErrorResponse,
)
from app.main import register_exception_handlers


class _Body(BaseModel):
    title: str


def _make_app() -> FastAPI:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/raise/validation")
    def _raise_validation():
        raise ValidationError("bad payload", details=["title: too short"])

    @app.get("/raise/not-found")
    def _raise_not_found():
        raise NotFoundError("event type not found")

    @app.get("/raise/conflict")
    def _raise_conflict():
        raise SlotConflictError("slot already booked")

    @app.post("/echo")
    def _echo(body: _Body):
        return body

    return app


@pytest.fixture
def error_client():
    with TestClient(_make_app()) as client:
        yield client


def test_validation_error_body(error_client):
    response = error_client.get("/raise/validation")
    assert response.status_code == 400
    assert response.json() == {
        "code": "validation_error",
        "message": "bad payload",
        "details": ["title: too short"],
    }


def test_not_found_error_body(error_client):
    response = error_client.get("/raise/not-found")
    assert response.status_code == 404
    assert response.json() == {
        "code": "not_found",
        "message": "event type not found",
    }


def test_slot_conflict_error_body(error_client):
    response = error_client.get("/raise/conflict")
    assert response.status_code == 409
    assert response.json() == {
        "code": "slot_conflict",
        "message": "slot already booked",
    }


def test_request_validation_maps_to_contract_400(error_client):
    response = error_client.post("/echo", json={})
    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "validation_error"
    assert isinstance(body["details"], list) and body["details"]


def test_error_response_models_have_fixed_codes():
    assert ValidationErrorResponse(message="x").code == "validation_error"
    assert NotFoundErrorResponse(message="x").code == "not_found"
    assert SlotConflictErrorResponse(message="x").code == "slot_conflict"
