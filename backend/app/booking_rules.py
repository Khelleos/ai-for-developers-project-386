"""Slot generation and overlap rules (server-side business logic).

Candidate slots are generated on the 30-minute grid within business hours
(09:00–17:00, treated as UTC here) such that ``start + durationMinutes <=
17:00``, over the rolling 14-day window starting "today". Past times and any
slot overlapping an existing booking (globally, across all event types) are
excluded. The optional ``on_date`` argument narrows results to a single day.

The current time is passed in as ``now`` so callers (and tests) control it.
"""

from datetime import date, datetime, time, timedelta, timezone

from app import config
from app.models import Booking, Slot


def _day_slots(day: date, duration_minutes: int) -> list[Slot]:
    """Generate the full grid of candidate slots for a single day."""
    start_minute = config.BUSINESS_HOURS_START * 60
    end_minute = config.BUSINESS_HOURS_END * 60
    slots: list[Slot] = []
    minute = start_minute
    while minute + duration_minutes <= end_minute:
        hour, mins = divmod(minute, 60)
        start = datetime.combine(
            day, time(hour=hour, minute=mins), tzinfo=timezone.utc
        )
        end = start + timedelta(minutes=duration_minutes)
        slots.append(Slot(start=start, end=end))
        minute += config.SLOT_STEP_MINUTES
    return slots


def overlaps(start: datetime, end: datetime, booking: Booking) -> bool:
    """Return ``True`` when ``[start, end)`` overlaps the booking's window."""
    return start < booking.end and booking.start < end


def find_conflict(
    start: datetime, end: datetime, bookings: list[Booking]
) -> Booking | None:
    """Return the first booking that overlaps ``[start, end)``, or ``None``.

    Overlap is checked globally across all event types (the single owner can
    attend only one call at a time).
    """
    for booking in bookings:
        if overlaps(start, end, booking):
            return booking
    return None


def is_on_grid(start: datetime, duration_minutes: int) -> bool:
    """Return ``True`` when ``start`` is a valid slot start for the duration.

    A valid start sits on the 30-minute grid within business hours such that
    ``start + durationMinutes <= 17:00`` (no seconds/microseconds component).
    """
    if start.second or start.microsecond:
        return False
    minute_of_day = start.hour * 60 + start.minute
    start_minute = config.BUSINESS_HOURS_START * 60
    end_minute = config.BUSINESS_HOURS_END * 60
    if minute_of_day < start_minute:
        return False
    if (minute_of_day - start_minute) % config.SLOT_STEP_MINUTES != 0:
        return False
    return minute_of_day + duration_minutes <= end_minute


def is_within_window(start: datetime, now: datetime) -> bool:
    """Return ``True`` when ``start``'s day is inside the rolling 14-day window."""
    today = now.date()
    window_end = today + timedelta(days=config.BOOKING_WINDOW_DAYS)
    return today <= start.date() < window_end


def _window_days(now: datetime, on_date: date | None) -> list[date]:
    """Days to generate slots for, within the rolling booking window."""
    today = now.date()
    window_end = today + timedelta(days=config.BOOKING_WINDOW_DAYS)
    if on_date is not None:
        return [on_date] if today <= on_date < window_end else []
    return [today + timedelta(days=offset) for offset in range(config.BOOKING_WINDOW_DAYS)]


def generate_slots(
    *,
    duration_minutes: int,
    bookings: list[Booking],
    now: datetime,
    on_date: date | None = None,
) -> list[Slot]:
    """Return available slots for an event type of the given duration.

    Slots are ordered chronologically. Slots that have already started
    (``start < now``) or overlap an existing booking are excluded.
    """
    result: list[Slot] = []
    for day in _window_days(now, on_date):
        for slot in _day_slots(day, duration_minutes):
            if slot.start < now:
                continue
            if any(overlaps(slot.start, slot.end, booking) for booking in bookings):
                continue
            result.append(slot)
    return result
