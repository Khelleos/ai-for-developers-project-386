import "@typespec/http";
import "@typespec/openapi3";
import "./models.tsp";
import "./errors.tsp";
import "./routes/event-types.tsp";

using Http;

/**
 * Single-owner, Calendly-like call-booking service.
 *
 * Scope is domain + API design only (no backend runtime, no auth).
 */
@service(#{ title: "Call Booking Service" })
namespace CallBooking;
