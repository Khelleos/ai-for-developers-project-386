/**
 * Convenience aliases for the domain types generated from the OpenAPI contract
 * (`schema.ts`). Importing these keeps UI code readable and decoupled from the
 * verbose `components["schemas"][...]` indexing.
 */
import type { components } from "./schema";

type Schemas = components["schemas"];

export type EventType = Schemas["EventType"];
export type EventTypeCreate = Schemas["EventTypeCreate"];
export type Slot = Schemas["Slot"];
export type Booking = Schemas["Booking"];
export type BookingCreate = Schemas["BookingCreate"];
export type Guest = Schemas["Guest"];

export type ValidationError = Schemas["ValidationError"];
export type NotFoundError = Schemas["NotFoundError"];
export type SlotConflictError = Schemas["SlotConflictError"];
