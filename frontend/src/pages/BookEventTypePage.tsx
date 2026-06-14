import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Anchor,
  Button,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import dayjs from "dayjs";

import { useCreateBooking, useSlots } from "../api/queries";
import { SlotPicker } from "../components/SlotPicker";
import { BookingForm, type BookingFormValues } from "../components/BookingForm";
import { formatBookingStart, toDateParam } from "../lib/datetime";
import type { BookingCreate } from "../api/types";

/**
 * Book a call for one event type: pick a day within the rolling 14-day window,
 * choose an available slot, then submit guest details. Response handling covers
 * 201 (confirmation), 400/404 (surfaced by {@link BookingForm}), and 409 slot
 * conflict — which clears the selection, refetches slots, and prompts the guest
 * to pick another time.
 */
export function BookEventTypePage() {
  const { id } = useParams();
  const today = dayjs().startOf("day");
  const [date, setDate] = useState<Date | null>(today.toDate());
  const [selectedStart, setSelectedStart] = useState<string | null>(null);

  const dateParam = date ? toDateParam(date) : undefined;
  const slots = useSlots(id, dateParam);
  const createBooking = useCreateBooking();

  const minDate = today.toDate();
  const maxDate = today.add(13, "day").toDate();

  function handleDateChange(next: Date | null) {
    setDate(next);
    setSelectedStart(null);
    createBooking.reset();
  }

  function handleSelectSlot(start: string) {
    setSelectedStart(start);
    createBooking.reset();
  }

  function handleBook(values: BookingFormValues) {
    if (!id || !selectedStart) return;
    const body: BookingCreate = {
      eventTypeId: id,
      start: selectedStart,
      guest: values.guest,
    };
    if (values.notes) body.notes = values.notes;
    createBooking.mutate(body, {
      onError: (err) => {
        // The slot was taken between listing and booking: drop the selection,
        // refetch the now-stale slot list, and let the conflict alert prompt
        // the guest to choose again.
        if (err.code === "slot_conflict") {
          setSelectedStart(null);
          slots.refetch();
        }
      },
    });
  }

  const conflict =
    createBooking.isError && createBooking.error.code === "slot_conflict"
      ? createBooking.error
      : null;

  if (createBooking.isSuccess && createBooking.data) {
    const booking = createBooking.data;
    return (
      <Stack gap="md">
        <Title order={2}>Booking confirmed</Title>
        <Alert color="green" title="You're booked" role="status">
          {booking.guest.name}, your call is set for{" "}
          {formatBookingStart(booking.start)}.
        </Alert>
        <Group>
          <Button
            variant="light"
            onClick={() => {
              createBooking.reset();
              setSelectedStart(null);
            }}
          >
            Book another time
          </Button>
          <Button component={Link} to="/bookings">
            View bookings
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      <Stack gap="xs">
        <Title order={2}>Book a call</Title>
        <Anchor component={Link} to="/" size="sm">
          ← Back to event types
        </Anchor>
      </Stack>

      {conflict ? (
        <Alert color="orange" title="That time was just taken" role="alert">
          {conflict.message} Please pick another slot below.
        </Alert>
      ) : null}

      <SlotPicker
        date={date}
        onDateChange={handleDateChange}
        minDate={minDate}
        maxDate={maxDate}
        slots={slots.data}
        isLoading={slots.isLoading}
        isError={slots.isError}
        error={slots.error ?? null}
        selectedStart={selectedStart}
        onSelectSlot={handleSelectSlot}
      />

      {selectedStart ? (
        <Stack gap="md">
          <Title order={3}>Your details</Title>
          <Text c="dimmed" size="sm">
            Booking the {formatBookingStart(selectedStart)} slot.
          </Text>
          <BookingForm
            onSubmit={handleBook}
            isSubmitting={createBooking.isPending}
            error={createBooking.error}
          />
        </Stack>
      ) : null}
    </Stack>
  );
}
