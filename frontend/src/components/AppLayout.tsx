import { Anchor, AppShell, Container, Group, Title } from "@mantine/core";
import { NavLink, Outlet } from "react-router-dom";

/**
 * Application chrome shared by every page: a header with the service title and
 * navigation between the Event Types and Bookings views. Page content renders
 * through the nested-route {@link Outlet}.
 */
export function AppLayout() {
  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Container
          size="lg"
          h="100%"
          style={{ display: "flex", alignItems: "center" }}
        >
          <Group justify="space-between" w="100%">
            <Title order={3}>Call Booking</Title>
            <Group gap="lg" component="nav">
              <Anchor component={NavLink} to="/" end>
                Event Types
              </Anchor>
              <Anchor component={NavLink} to="/bookings">
                Bookings
              </Anchor>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="lg">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
