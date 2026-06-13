import "@typespec/http";

using Http;

namespace CallBooking;

/**
 * Returned when the request payload fails validation (e.g. blank title,
 * off-grid start time, past or out-of-window booking).
 */
@error
model ValidationError {
  /** Discriminating error code. */
  code: "validation_error";

  /** Human-readable explanation of the failure. */
  message: string;

  /** Optional list of field-level validation messages. */
  details?: string[];
}

/** Returned when a referenced resource (e.g. an `EventType`) does not exist. */
@error
model NotFoundError {
  /** Discriminating error code. */
  code: "not_found";

  /** Human-readable explanation of the failure. */
  message: string;
}

/**
 * Returned when the requested slot overlaps an existing booking
 * (the owner can only attend one call at a time).
 */
@error
model SlotConflictError {
  /** Discriminating error code. */
  code: "slot_conflict";

  /** Human-readable explanation of the failure. */
  message: string;
}
