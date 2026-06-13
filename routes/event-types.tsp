import "@typespec/http";
import "../models.tsp";
import "../errors.tsp";

using Http;

namespace CallBooking;

/**
 * Event-type management and slot discovery.
 *
 * Slot generation (server-side, informational):
 * - Candidate slots are generated on a 30-minute grid (09:00, 09:30, …)
 *   within business hours (09:00–17:00, owner-local).
 * - A slot is only valid when `start + durationMinutes <= 17:00`.
 * - Slots are offered within a rolling 14-day window from "today"; past
 *   times are never offered.
 * - Slots already overlapping an existing booking are excluded.
 */
@route("/event-types")
namespace EventTypes {
  /**
   * Create a new event type (owner/admin).
   *
   * Returns `201` with the created `EventType`, or `400` when the payload
   * fails validation (e.g. blank title, non-positive duration).
   */
  @post
  op create(@body body: EventTypeCreate):
    | {
        @statusCode statusCode: 201;
        @body body: EventType;
      }
    | ValidationError;

  /**
   * List all event types (public).
   *
   * Returns `200` with every event type the owner has defined.
   */
  @get
  op list(): {
    @statusCode statusCode: 200;
    @body body: EventType[];
  };

  /**
   * List available slots for an event type (public).
   *
   * Slots are generated server-side on the 30-minute grid within business
   * hours (09:00–17:00) such that `start + durationMinutes <= 17:00`, over
   * the rolling 14-day window, excluding times that overlap existing
   * bookings. The optional `date` query narrows results to a single day.
   *
   * Returns `200` with the available slots, or `404` when the event type
   * does not exist.
   */
  @route("/{eventTypeId}/slots")
  @get
  op listSlots(
    @path eventTypeId: string,

    /** Restrict slots to this single calendar day (owner-local). */
    @query date?: plainDate,
  ):
    | {
        @statusCode statusCode: 200;
        @body body: Slot[];
      }
    | NotFoundError;
}
