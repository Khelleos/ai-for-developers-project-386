/**
 * TanStack Query hooks for the call-booking API.
 *
 * Each hook wraps an `apiClient` call (typed against the OpenAPI contract) and
 * unwraps the `openapi-fetch` result: a non-2xx response is turned into a
 * normalized {@link ApiError} (thrown so it surfaces as the query/mutation
 * `error`), and a successful response yields the typed body.
 *
 * Mutations invalidate the caches their writes affect so the UI refetches:
 * creating an event type refreshes the event-type list; creating a booking
 * refreshes both the slots (the booked time is now gone) and the bookings list.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient, ApiError, normalizeError } from "./client";
import type {
  Booking,
  BookingCreate,
  EventType,
  EventTypeCreate,
  Slot,
} from "./types";

/** Result shape returned by every `openapi-fetch` call. */
type FetchResult<T> = {
  data?: T;
  error?: unknown;
  response: Response;
};

/**
 * Collapse an `openapi-fetch` result into either its typed data or a thrown
 * {@link ApiError}. The error body and HTTP status are handed to
 * `normalizeError` so callers always see the contract's typed error codes.
 */
function unwrap<T>(result: FetchResult<T>): T {
  const { data, error, response } = result;
  if (error !== undefined && error !== null) {
    throw normalizeError(error, response.status);
  }
  if (data === undefined) {
    throw normalizeError(null, response.status);
  }
  return data;
}

/** Centralized query keys so hooks and cache invalidation stay in sync. */
export const queryKeys = {
  eventTypes: ["event-types"] as const,
  slots: (eventTypeId: string, date?: string) =>
    ["event-types", eventTypeId, "slots", date ?? null] as const,
  bookings: (from?: string) => ["bookings", from ?? null] as const,
};

/** List every event type the owner has defined. */
export function useEventTypes() {
  return useQuery<EventType[], ApiError>({
    queryKey: queryKeys.eventTypes,
    queryFn: async () => unwrap(await apiClient.GET("/event-types")),
  });
}

/**
 * List available slots for an event type, optionally narrowed to a single day.
 * Disabled until an `eventTypeId` is provided so the hook can be mounted before
 * a selection exists.
 */
export function useSlots(eventTypeId: string | undefined, date?: string) {
  return useQuery<Slot[], ApiError>({
    queryKey: queryKeys.slots(eventTypeId ?? "", date),
    enabled: Boolean(eventTypeId),
    queryFn: async () =>
      unwrap(
        await apiClient.GET("/event-types/{eventTypeId}/slots", {
          params: {
            path: { eventTypeId: eventTypeId as string },
            query: date ? { date } : undefined,
          },
        }),
      ),
  });
}

/** List upcoming bookings, optionally starting at or after `from`. */
export function useBookings(from?: string) {
  return useQuery<Booking[], ApiError>({
    queryKey: queryKeys.bookings(from),
    queryFn: async () =>
      unwrap(
        await apiClient.GET("/bookings", {
          params: { query: from ? { from } : undefined },
        }),
      ),
  });
}

/** Create an event type, refreshing the event-type list on success. */
export function useCreateEventType() {
  const queryClient = useQueryClient();
  return useMutation<EventType, ApiError, EventTypeCreate>({
    mutationFn: async (body) =>
      unwrap(await apiClient.POST("/event-types", { body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventTypes });
    },
  });
}

/**
 * Create a booking, refreshing both slots and bookings on success: the booked
 * time is no longer available, and the new booking should appear in the list.
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation<Booking, ApiError, BookingCreate>({
    mutationFn: async (body) =>
      unwrap(await apiClient.POST("/bookings", { body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-types"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
