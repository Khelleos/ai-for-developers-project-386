import {
  Alert,
  Center,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { EventTypeCard } from "../components/EventTypeCard";
import { EventTypeForm } from "../components/EventTypeForm";
import { useCreateEventType, useEventTypes } from "../api/queries";

/**
 * Event Types page: lists the owner's event types and offers a form to create a
 * new one. The list handles loading/empty/error states; the form surfaces the
 * API's 400 validation errors (see {@link EventTypeForm}).
 */
export function EventTypesPage() {
  const eventTypes = useEventTypes();
  const createEventType = useCreateEventType();

  return (
    <Stack gap="xl">
      <Stack gap="md">
        <Title order={2}>Event types</Title>
        {eventTypes.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : eventTypes.isError ? (
          <Alert color="red" title="Could not load event types" role="alert">
            {eventTypes.error.message}
          </Alert>
        ) : eventTypes.data && eventTypes.data.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            {eventTypes.data.map((eventType) => (
              <EventTypeCard key={eventType.id} eventType={eventType} />
            ))}
          </SimpleGrid>
        ) : (
          <Text c="dimmed">No event types yet. Create one below.</Text>
        )}
      </Stack>

      <Stack gap="md">
        <Title order={3}>New event type</Title>
        <EventTypeForm
          onSubmit={(values) => createEventType.mutate(values)}
          isSubmitting={createEventType.isPending}
          error={createEventType.error}
        />
      </Stack>
    </Stack>
  );
}
