"""Pydantic domain models mirroring the TypeSpec/OpenAPI contract.

Field names are snake_case in Python but serialize/parse as the camelCase
aliases used by the contract (``durationMinutes``, ``eventTypeId``,
``createdAt``). Read-only fields (``id``, ``createdAt``) live only on the
response models, not on the ``*Create`` payloads, matching the contract's
``@visibility(Lifecycle.Read)``.

All datetimes are timezone-aware UTC; owner-local time is treated as UTC in
this in-memory implementation (see ``app.config``).
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    """Base model: camelCase aliases, populated by either field or alias."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class Guest(_CamelModel):
    """The person booking a call."""

    name: str = Field(min_length=1)
    email: EmailStr


class EventTypeCreate(_CamelModel):
    """Payload for creating an ``EventType``. Read-only fields are omitted."""

    title: str = Field(min_length=1)
    duration_minutes: int = Field(ge=1)
    description: str | None = None


class EventType(_CamelModel):
    """A bookable type of call/meeting defined by the single owner."""

    id: str
    title: str = Field(min_length=1)
    duration_minutes: int = Field(ge=1)
    description: str | None = None


class Slot(_CamelModel):
    """A candidate booking window for an ``EventType`` (UTC)."""

    start: datetime
    end: datetime


class BookingCreate(_CamelModel):
    """Payload for creating a ``Booking``. Read-only fields are omitted."""

    event_type_id: str = Field(min_length=1)
    guest: Guest
    start: datetime
    notes: str | None = None


class Booking(_CamelModel):
    """A confirmed reservation of a ``Slot`` by a ``Guest``."""

    id: str
    event_type_id: str = Field(min_length=1)
    guest: Guest
    start: datetime
    end: datetime
    notes: str | None = None
    created_at: datetime
