import { Badge, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";

import type { EventType } from "../api/types";

/**
 * A single event type rendered as a card: title, duration, optional description,
 * and a link to its booking page (`/event-types/:id/book`). Routing is wired up
 * in a later task; the link target is stable regardless.
 */
export function EventTypeCard({ eventType }: { eventType: EventType }) {
  return (
    <Card withBorder padding="lg" radius="md">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Title order={4}>{eventType.title}</Title>
          <Badge variant="light">{eventType.durationMinutes} min</Badge>
        </Group>
        {eventType.description ? (
          <Text c="dimmed" size="sm">
            {eventType.description}
          </Text>
        ) : null}
        <Button
          component={Link}
          to={`/event-types/${eventType.id}/book`}
          variant="light"
          mt="sm"
        >
          Book this call
        </Button>
      </Stack>
    </Card>
  );
}
