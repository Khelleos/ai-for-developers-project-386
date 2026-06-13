namespace CallBooking;

/*
 * Domain constants & slot semantics (informational — enforced server-side):
 *
 * - BUSINESS_HOURS_START = 09:00 (local owner time): earliest a slot may start.
 * - BUSINESS_HOURS_END = 17:00 (local owner time): a slot must finish at or
 *   before this time, i.e. `start + durationMinutes <= 17:00`.
 * - SLOT_STEP_MINUTES = 30: candidate slots are generated on a 30-minute grid
 *   (09:00, 09:30, 10:00, …). Booking start times must align to this grid.
 * - BOOKING_WINDOW_DAYS = 14: slots/bookings are only offered within a rolling
 *   14-day window starting from "today"; past times are never bookable.
 *
 * A non-doc comment so it documents the source without polluting the
 * EventType schema description in the emitted OpenAPI.
 */

/**
 * A bookable type of call/meeting defined by the single owner
 * (e.g. "30 minute intro call").
 */
model EventType {
  /** Server-assigned unique identifier. */
  @visibility(Lifecycle.Read)
  id: string;

  /** Human-readable title shown to guests. */
  @minLength(1)
  title: string;

  /** Length of the call in minutes; drives slot generation. */
  @minValue(1)
  durationMinutes: int32;

  /** Optional description shown to guests. */
  description?: string;
}

/** Payload for creating an `EventType`. Read-only fields are omitted. */
model EventTypeCreate {
  /** Human-readable title shown to guests. */
  @minLength(1)
  title: string;

  /** Length of the call in minutes; drives slot generation. */
  @minValue(1)
  durationMinutes: int32;

  /** Optional description shown to guests. */
  description?: string;
}

/**
 * A candidate booking window for an `EventType`, generated server-side
 * on the 30-minute grid within business hours and the 14-day window.
 */
model Slot {
  /** Inclusive start of the slot (UTC). */
  start: utcDateTime;

  /** Exclusive end of the slot (UTC); `start + durationMinutes`. */
  end: utcDateTime;
}

/** The person booking a call. */
model Guest {
  /** Guest's full name. */
  @minLength(1)
  name: string;

  /** Guest's email address; used to confirm the booking. */
  @format("email")
  email: string;
}

/** A confirmed reservation of a `Slot` by a `Guest`. */
model Booking {
  /** Server-assigned unique identifier. */
  @visibility(Lifecycle.Read)
  id: string;

  /** The `EventType` this booking is for. */
  @minLength(1)
  eventTypeId: string;

  /** The person who booked the call. */
  guest: Guest;

  /** Inclusive start of the booked call (UTC). */
  start: utcDateTime;

  /** Exclusive end of the booked call (UTC). */
  end: utcDateTime;

  /** Optional note from the guest. */
  notes?: string;

  /** Server-assigned creation timestamp. */
  @visibility(Lifecycle.Read)
  createdAt: utcDateTime;
}

/** Payload for creating a `Booking`. Read-only fields are omitted. */
model BookingCreate {
  /** The `EventType` this booking is for. */
  @minLength(1)
  eventTypeId: string;

  /** The person who booked the call. */
  guest: Guest;

  /** Inclusive start of the requested call (UTC); must align to the slot grid. */
  start: utcDateTime;

  /** Optional note from the guest. */
  notes?: string;
}
