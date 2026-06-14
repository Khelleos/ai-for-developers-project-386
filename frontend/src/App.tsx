import { BrowserRouter, Route, Routes } from "react-router-dom";

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

/** App root: wires the route tree into a browser history router. */
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
