import { AppShell, Container, Title, Text } from "@mantine/core";

/**
 * Minimal application shell. Routing and pages are wired up in later tasks.
 */
export default function App() {
  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Container size="lg" h="100%" style={{ display: "flex", alignItems: "center" }}>
          <Title order={3}>Call Booking</Title>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="lg">
          <Text>Book a call with the owner.</Text>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
