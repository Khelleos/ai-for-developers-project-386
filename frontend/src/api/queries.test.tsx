import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

import { server } from "../mocks/server";
import { API_BASE_URL } from "../config";
import {
  useBookings,
  useCreateBooking,
  useCreateEventType,
  useEventTypes,
  useSlots,
} from "./queries";
import type { Booking, EventType, Slot } from "./types";

/** Build the absolute URL MSW should intercept for a given API path. */
const url = (path: string) => `${API_BASE_URL}${path}`;

/**
 * Wrap hooks in a fresh QueryClient (retries off) per render so query errors
 * surface immediately and caches don't leak between tests.
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return { Wrapper, queryClient };
}

const sampleEventType: EventType = {
  id: "et-1",
  title: "30 minute intro call",
  durationMinutes: 30,
};

const sampleSlot: Slot = {
  start: "2026-06-20T09:00:00Z",
  end: "2026-06-20T09:30:00Z",
};

const sampleBooking: Booking = {
  id: "bk-1",
  eventTypeId: "et-1",
  guest: { name: "Ada Lovelace", email: "ada@example.com" },
  start: "2026-06-20T09:00:00Z",
  end: "2026-06-20T09:30:00Z",
  createdAt: "2026-06-14T12:00:00Z",
};

describe("useEventTypes", () => {
  it("returns the mapped event-type list", async () => {
    server.use(
      http.get(url("/event-types"), () => HttpResponse.json([sampleEventType])),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useEventTypes(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([sampleEventType]);
  });
});

describe("useSlots", () => {
  it("stays disabled until an event type id is provided", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSlots(undefined), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe("idle");
  });

  it("returns slots for the event type and forwards the date query", async () => {
    let receivedDate: string | null = null;
    server.use(
      http.get(url("/event-types/:id/slots"), ({ request }) => {
        receivedDate = new URL(request.url).searchParams.get("date");
        return HttpResponse.json([sampleSlot]);
      }),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSlots("et-1", "2026-06-20"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([sampleSlot]);
    expect(receivedDate).toBe("2026-06-20");
  });

  it("surfaces a typed not_found error for an unknown event type", async () => {
    server.use(
      http.get(url("/event-types/:id/slots"), () =>
        HttpResponse.json(
          { code: "not_found", message: "Event type does not exist." },
          { status: 404 },
        ),
      ),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSlots("missing"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe("not_found");
    expect(result.current.error?.status).toBe(404);
  });
});

describe("useBookings", () => {
  it("returns bookings and forwards the from query", async () => {
    let receivedFrom: string | null = null;
    server.use(
      http.get(url("/bookings"), ({ request }) => {
        receivedFrom = new URL(request.url).searchParams.get("from");
        return HttpResponse.json([sampleBooking]);
      }),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBookings("2026-06-14T00:00:00Z"), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([sampleBooking]);
    expect(receivedFrom).toBe("2026-06-14T00:00:00Z");
  });
});

describe("useCreateEventType", () => {
  it("creates an event type and invalidates the event-type list", async () => {
    server.use(
      http.post(url("/event-types"), () =>
        HttpResponse.json(sampleEventType, { status: 201 }),
      ),
    );

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(["event-types"], []);
    const { result } = renderHook(() => useCreateEventType(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ title: "Intro", durationMinutes: 30 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sampleEventType);
    expect(
      queryClient.getQueryState(["event-types"])?.isInvalidated,
    ).toBe(true);
  });

  it("surfaces a typed validation_error with field details on 400", async () => {
    server.use(
      http.post(url("/event-types"), () =>
        HttpResponse.json(
          {
            code: "validation_error",
            message: "Title must not be blank.",
            details: ["title: required"],
          },
          { status: 400 },
        ),
      ),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateEventType(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ title: "", durationMinutes: 30 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe("validation_error");
    expect(result.current.error?.details).toEqual(["title: required"]);
  });
});

describe("useCreateBooking", () => {
  it("creates a booking and invalidates slots and bookings", async () => {
    server.use(
      http.post(url("/bookings"), () =>
        HttpResponse.json(sampleBooking, { status: 201 }),
      ),
    );

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(["event-types", "et-1", "slots", null], []);
    queryClient.setQueryData(["bookings", null], []);
    const { result } = renderHook(() => useCreateBooking(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      eventTypeId: "et-1",
      guest: { name: "Ada Lovelace", email: "ada@example.com" },
      start: "2026-06-20T09:00:00Z",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      queryClient.getQueryState(["event-types", "et-1", "slots", null])
        ?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(["bookings", null])?.isInvalidated).toBe(
      true,
    );
  });

  it("surfaces a typed slot_conflict error on 409", async () => {
    server.use(
      http.post(url("/bookings"), () =>
        HttpResponse.json(
          { code: "slot_conflict", message: "That slot is taken." },
          { status: 409 },
        ),
      ),
    );

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateBooking(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      eventTypeId: "et-1",
      guest: { name: "Ada Lovelace", email: "ada@example.com" },
      start: "2026-06-20T09:00:00Z",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe("slot_conflict");
    expect(result.current.error?.status).toBe(409);
  });
});
