import { HashRouter, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout";
import { EventTypesPage } from "./pages/EventTypesPage";
import { BookEventTypePage } from "./pages/BookEventTypePage";
import { BookingsPage } from "./pages/BookingsPage";

/**
 * Route tree for the app, mounted under the shared {@link AppLayout}. Exported
 * separately from {@link App} so tests can drive it with a `MemoryRouter`.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<EventTypesPage />} />
        <Route path="event-types/:id/book" element={<BookEventTypePage />} />
        <Route path="bookings" element={<BookingsPage />} />
      </Route>
    </Routes>
  );
}

/**
 * App root: wires the route tree into a hash-based router.
 *
 * `HashRouter` keeps all client routes in the URL fragment (e.g. `#/bookings`),
 * so the server only ever sees `GET /` for deep links and refreshes. This is
 * required by the single-image deployment, where the backend serves the static
 * `index.html` at `/` and also owns API paths like `/bookings` and
 * `/event-types/*` — history-based routing would either 404 on refresh or
 * collide with those API routes.
 */
export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
