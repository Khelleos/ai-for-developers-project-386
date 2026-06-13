import "@typespec/http";
import "../models.tsp";
import "../errors.tsp";

using Http;

namespace CallBooking;

/**
 * Booking creation and the owner's upcoming-call list.
 *
 * Validation (server-side, informational):
 * - `400` when the requested `start` is off the 30-minute grid, in the past,
 *   or outside the rolling 14-day booking window, or when the payload is
 *   otherwise invalid (e.g. blank guest name, malformed email).
 * - `404` when the referenced `eventTypeId` does not exist.
 * - `409` when the requested time overlaps any existing booking — the single
 *   owner can attend only one call at a time, so overlap is checked globally
 *   across all event types, not just the requested one.
 */
@route("/bookings")
namespace Bookings {
  /**
   * Create a booking for a slot (public).
   *
   * The server derives `end` from the event type's duration and re-validates
   * availability at write time. Returns `201` with the created `Booking`;
   * `400` when `start` is off-grid, in the past, or out of the 14-day window
   * (or the payload is otherwise invalid); `404` when the `eventTypeId` is
   * unknown; `409` when the requested time overlaps an existing booking
   * (global one-call-at-a-time rule).
   */
  @post
  op create(@body body: BookingCreate):
    | {
        @statusCode statusCode: 201;
        @body body: Booking;
      }
    | ValidationError
    | NotFoundError
    | SlotConflictError;

  /**
   * List upcoming bookings (owner/admin).
   *
   * Returns `200` with the owner's bookings ordered by start time. The
   * optional `from` query restricts results to bookings starting at or after
   * the given instant (defaults to "now").
   */
  @get
  op list(
    /** Only include bookings starting at or after this instant (UTC). */
    @query from?: utcDateTime,
  ): {
    @statusCode statusCode: 200;
    @body body: Booking[];
  };
}
