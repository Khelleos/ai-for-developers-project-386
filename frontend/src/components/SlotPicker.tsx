import {
  Alert,
  Button,
  Center,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";

import type { ApiError } from "../api/client";
import type { Slot } from "../api/types";
import { formatSlotRange } from "../lib/datetime";

/**
 * Slot discovery: a date picker constrained to the rolling 14-day booking window
 * plus the list of available slots for the chosen day. Loading, empty, and error
 * states (including a 404 for an unknown event type) are handled here; selecting
 * a slot is reported upward via {@link onSelectSlot}.
 */
export function SlotPicker({
  date,
  onDateChange,
  minDate,
  maxDate,
  slots,
  isLoading,
  isError,
  error,
  selectedStart,
  onSelectSlot,
}: {
  date: Date | null;
  onDateChange: (next: Date | null) => void;
  minDate: Date;
  maxDate: Date;
  slots: Slot[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  selectedStart: string | null;
  onSelectSlot: (start: string) => void;
}) {
  return (
    <Stack gap="md">
      <Title order={3}>Pick a time</Title>
      <DatePickerInput
        label="Date"
        placeholder="Choose a day"
        value={date}
        onChange={onDateChange}
        minDate={minDate}
        maxDate={maxDate}
        withAsterisk
      />

      {isLoading ? (
        <Center py="md">
          <Loader />
        </Center>
      ) : isError ? (
        <Alert color="red" title="Could not load slots" role="alert">
          {error?.code === "not_found"
            ? "This event type does not exist."
            : (error?.message ?? "Something went wrong loading slots.")}
        </Alert>
      ) : slots && slots.length > 0 ? (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }}>
          {slots.map((slot) => (
            <Button
              key={slot.start}
              variant={selectedStart === slot.start ? "filled" : "light"}
              onClick={() => onSelectSlot(slot.start)}
            >
              {formatSlotRange(slot.start, slot.end)}
            </Button>
          ))}
        </SimpleGrid>
      ) : (
        <Text c="dimmed">No available slots for this day. Try another date.</Text>
      )}
    </Stack>
  );
}
