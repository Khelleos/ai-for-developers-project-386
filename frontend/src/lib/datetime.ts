/**
 * Date/time helpers shared by the booking UI.
 *
 * Slot and booking instants are UTC (`...Z`) in the contract, so they are
 * formatted in UTC to stay deterministic regardless of the viewer's timezone.
 * The date the guest picks, by contrast, is a local calendar day and is sent to
 * the slots query as a plain `YYYY-MM-DD` value.
 */
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

/** Serialize a picked calendar day to the `date` query value (`YYYY-MM-DD`). */
export function toDateParam(date: Date): string {
  return dayjs(date).format("YYYY-MM-DD");
}

/** Format a UTC instant as a wall-clock time, e.g. `09:00`. */
export function formatSlotTime(iso: string): string {
  return dayjs.utc(iso).format("HH:mm");
}

/** Format a slot's start–end window, e.g. `09:00 – 09:30`. */
export function formatSlotRange(start: string, end: string): string {
  return `${formatSlotTime(start)} – ${formatSlotTime(end)}`;
}

/** Format a booking instant for display, e.g. `Sat, Jun 20 2026 · 09:00 UTC`. */
export function formatBookingStart(iso: string): string {
  return `${dayjs.utc(iso).format("ddd, MMM D YYYY")} · ${formatSlotTime(iso)} UTC`;
}
