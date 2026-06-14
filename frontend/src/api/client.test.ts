import { describe, expect, it } from "vitest";
import { ApiError, normalizeError } from "./client";

describe("normalizeError", () => {
  it("maps a 400 ValidationError body, preserving details", () => {
    const error = normalizeError(
      {
        code: "validation_error",
        message: "Title must not be blank.",
        details: ["title: required", "durationMinutes: must be >= 1"],
      },
      400,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("validation_error");
    expect(error.status).toBe(400);
    expect(error.message).toBe("Title must not be blank.");
    expect(error.details).toEqual([
      "title: required",
      "durationMinutes: must be >= 1",
    ]);
  });

  it("maps a 404 NotFoundError body", () => {
    const error = normalizeError(
      { code: "not_found", message: "Event type does not exist." },
      404,
    );

    expect(error.code).toBe("not_found");
    expect(error.status).toBe(404);
    expect(error.message).toBe("Event type does not exist.");
    expect(error.details).toBeUndefined();
  });

  it("maps a 409 SlotConflictError body", () => {
    const error = normalizeError(
      { code: "slot_conflict", message: "Slot already taken." },
      409,
    );

    expect(error.code).toBe("slot_conflict");
    expect(error.status).toBe(409);
    expect(error.message).toBe("Slot already taken.");
  });

  it("infers the code from the status when the body has no code", () => {
    const error = normalizeError({ message: "broken" }, 400);

    expect(error.code).toBe("validation_error");
    expect(error.status).toBe(400);
    expect(error.message).toBe("broken");
  });

  it("falls back to an unknown error for unrecognized bodies and statuses", () => {
    const error = normalizeError(null, 500);

    expect(error.code).toBe("unknown");
    expect(error.status).toBe(500);
    expect(error.message).toBe("An unexpected error occurred.");
  });

  it("supplies a default message when the body omits one", () => {
    const error = normalizeError({ code: "not_found" }, 404);

    expect(error.code).toBe("not_found");
    expect(error.message).toBe("The requested resource was not found.");
  });
});
