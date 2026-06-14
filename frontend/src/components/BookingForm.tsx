import { useEffect } from "react";
import {
  Alert,
  Button,
  Group,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";

import { ApiError } from "../api/client";

/** Values collected by the booking form. */
export type BookingFormValues = {
  guest: { name: string; email: string };
  notes: string;
};

/**
 * Guest details form for a selected slot. Client-side validation mirrors the
 * contract (non-empty name, well-formed email); server-side `validation_error`
 * (400) and `not_found` (404) responses are surfaced as an alert, with field
 * details mapped onto the matching guest inputs where the API names them.
 */
export function BookingForm({
  onSubmit,
  isSubmitting,
  error,
}: {
  onSubmit: (values: BookingFormValues) => void;
  isSubmitting?: boolean;
  error?: ApiError | null;
}) {
  const form = useForm<BookingFormValues>({
    mode: "uncontrolled",
    initialValues: { guest: { name: "", email: "" }, notes: "" },
    validate: {
      guest: {
        name: (value) =>
          value.trim().length === 0 ? "Name is required" : null,
        email: (value) =>
          /^\S+@\S+\.\S+$/.test(value) ? null : "Enter a valid email address",
      },
    },
  });

  // Map API field-level validation details onto matching guest inputs so the
  // server's verdict shows next to the offending input, not only in the alert.
  useEffect(() => {
    if (error?.code !== "validation_error" || !error.details) return;
    const fieldErrors: Record<string, string> = {};
    for (const detail of error.details) {
      const [field] = detail.split(":");
      const key = field?.trim();
      if (key === "name" || key === "guest.name") {
        fieldErrors["guest.name"] = detail;
      } else if (key === "email" || key === "guest.email") {
        fieldErrors["guest.email"] = detail;
      } else if (key === "notes") {
        fieldErrors.notes = detail;
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      form.setErrors(fieldErrors);
    }
    // form is stable from @mantine/form; depend only on the error identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const handleSubmit = form.onSubmit((values) => {
    const payload: BookingFormValues = {
      guest: {
        name: values.guest.name.trim(),
        email: values.guest.email.trim(),
      },
      notes: values.notes.trim(),
    };
    onSubmit(payload);
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        {error &&
        (error.code === "validation_error" || error.code === "not_found") ? (
          <Alert color="red" title="Could not book this slot" role="alert">
            {error.message}
          </Alert>
        ) : null}
        <TextInput
          label="Your name"
          placeholder="Ada Lovelace"
          withAsterisk
          key={form.key("guest.name")}
          {...form.getInputProps("guest.name")}
        />
        <TextInput
          label="Email"
          placeholder="ada@example.com"
          withAsterisk
          key={form.key("guest.email")}
          {...form.getInputProps("guest.email")}
        />
        <Textarea
          label="Notes"
          placeholder="Anything you'd like the owner to know?"
          autosize
          minRows={2}
          key={form.key("notes")}
          {...form.getInputProps("notes")}
        />
        <Group justify="flex-end">
          <Button type="submit" loading={isSubmitting}>
            Confirm booking
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
