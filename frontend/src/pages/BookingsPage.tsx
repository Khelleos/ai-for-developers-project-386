import { useMemo } from "react";
import {
  Alert,
  Card,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import dayjs from "dayjs";

import { useBookings, useEventTypes } from "../api/queries";
import { formatBookingStart } from "../lib/datetime";
import type { Booking } from "../api/types";

/**
 * Owner-facing list of upcoming bookings, ordered by start time. `from` is
 * pinned to "now" at mount so the query key stays stable across renders. Event
 * types are fetched alongside to label each booking by title (the bookings API
 * only carries `eventTypeId`), falling back to the id if the type is unknown.
 */
export function BookingsPage() {
  const from = useMemo(() => dayjs().toISOString(), []);
  const bookings = useBookings(from);
  const eventTypes = useEventTypes();

  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const eventType of eventTypes.data ?? []) {
      map.set(eventType.id, eventType.title);
    }
    return map;
  }, [eventTypes.data]);

  const ordered = useMemo(() => {
    const list = bookings.data ? [...bookings.data] : [];
    return list.sort((a, b) => a.start.localeCompare(b.start));
  }, [bookings.data]);

  return (
    <Stack gap="md">
      <Title order={2}>Upcoming bookings</Title>
      {bookings.isLoading ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : bookings.isError ? (
        <Alert color="red" title="Could not load bookings" role="alert">
          {bookings.error.message}
        </Alert>
      ) : ordered.length > 0 ? (
        <Stack gap="sm">
          {ordered.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              eventTypeTitle={
                titleById.get(booking.eventTypeId) ?? booking.eventTypeId
              }
            />
          ))}
        </Stack>
      ) : (
        <Text c="dimmed">No upcoming bookings.</Text>
      )}
    </Stack>
  );
}

function BookingRow({
  booking,
  eventTypeTitle,
}: {
  booking: Booking;
  eventTypeTitle: string;
}) {
  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Title order={4}>{eventTypeTitle}</Title>
          <Text fw={500}>{formatBookingStart(booking.start)}</Text>
        </Group>
        <Group gap="xs">
          <Text size="sm" fw={500}>
            {booking.guest.name}
          </Text>
          <Text size="sm" c="dimmed">
            {booking.guest.email}
          </Text>
        </Group>
        {booking.notes ? (
          <Text c="dimmed" size="sm">
            {booking.notes}
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}
