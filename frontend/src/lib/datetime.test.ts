import { describe, expect, it } from "vitest";

import {
  formatBookingStart,
  formatSlotRange,
  formatSlotTime,
  toDateParam,
} from "./datetime";

describe("toDateParam", () => {
  it("serializes a local calendar day to YYYY-MM-DD", () => {
    // Construct via local Y/M/D so the result is timezone-independent: the
    // function formats in local time, and local midnight of this day formats
    // to the same calendar date everywhere.
    expect(toDateParam(new Date(2026, 5, 20))).toBe("2026-06-20");
    expect(toDateParam(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});

describe("formatSlotTime", () => {
  it("formats a UTC instant as HH:mm regardless of viewer timezone", () => {
    expect(formatSlotTime("2026-06-20T09:00:00Z")).toBe("09:00");
    expect(formatSlotTime("2026-06-20T16:30:00Z")).toBe("16:30");
  });
});

describe("formatSlotRange", () => {
  it("formats a start–end window in UTC", () => {
    expect(formatSlotRange("2026-06-20T09:00:00Z", "2026-06-20T09:30:00Z")).toBe(
      "09:00 – 09:30",
    );
  });
});

describe("formatBookingStart", () => {
  it("formats a booking instant with day, date, and UTC time", () => {
    expect(formatBookingStart("2026-06-20T09:00:00Z")).toBe(
      "Sat, Jun 20 2026 · 09:00 UTC",
    );
  });
});
