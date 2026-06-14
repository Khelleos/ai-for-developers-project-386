import { useEffect } from "react";
import {
  Alert,
  Button,
  Group,
  NumberInput,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";

import { ApiError } from "../api/client";
import type { EventTypeCreate } from "../api/types";

/**
 * Create-event-type form. Client-side validation mirrors the contract
 * (non-empty title, `durationMinutes` >= 1); server-side `validation_error`
 * (400) responses are surfaced both as a summary alert and, where the API's
 * field-level `details` name a known field, against that field.
 */
export function EventTypeForm({
  onSubmit,
  isSubmitting,
  error,
}: {
  onSubmit: (values: EventTypeCreate) => void;
  isSubmitting?: boolean;
  error?: ApiError | null;
}) {
  const form = useForm<EventTypeCreate>({
    mode: "uncontrolled",
    initialValues: { title: "", durationMinutes: 30, description: "" },
    validate: {
      title: (value) =>
        value.trim().length === 0 ? "Title is required" : null,
      durationMinutes: (value) =>
        value >= 1 ? null : "Duration must be at least 1 minute",
    },
  });

  // Map API field-level validation details onto matching form fields so the
  // server's verdict shows next to the offending input, not just in the alert.
  useEffect(() => {
    if (error?.code !== "validation_error" || !error.details) return;
    const fieldErrors: Record<string, string> = {};
    for (const detail of error.details) {
      const [field] = detail.split(":");
      const key = field?.trim();
      if (key === "title" || key === "durationMinutes" || key === "description") {
        fieldErrors[key] = detail;
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      form.setErrors(fieldErrors);
    }
    // form is stable from @mantine/form; depend only on the error identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const handleSubmit = form.onSubmit((values) => {
    const payload: EventTypeCreate = {
      title: values.title.trim(),
      durationMinutes: values.durationMinutes,
    };
    const description = values.description?.trim();
    if (description) payload.description = description;
    onSubmit(payload);
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        {error ? (
          <Alert color="red" title="Could not create event type" role="alert">
            {error.message}
          </Alert>
        ) : null}
        <TextInput
          label="Title"
          placeholder="30 minute intro call"
          withAsterisk
          key={form.key("title")}
          {...form.getInputProps("title")}
        />
        <NumberInput
          label="Duration (minutes)"
          min={1}
          withAsterisk
          key={form.key("durationMinutes")}
          {...form.getInputProps("durationMinutes")}
        />
        <Textarea
          label="Description"
          placeholder="What is this call about?"
          autosize
          minRows={2}
          key={form.key("description")}
          {...form.getInputProps("description")}
        />
        <Group justify="flex-end">
          <Button type="submit" loading={isSubmitting}>
            Create event type
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
