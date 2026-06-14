import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";

import { renderWithProviders, screen, waitFor } from "../test-utils";
import { server } from "../mocks/server";
import { API_BASE_URL } from "../config";
import { BookEventTypePage } from "./BookEventTypePage";
import type { Booking, Slot } from "../api/types";

const url = (path: string) => `${API_BASE_URL}${path}`;

const sampleSlot: Slot = {
  start: "2026-06-20T09:00:00Z",
  end: "2026-06-20T09:30:00Z",
};

const otherSlot: Slot = {
  start: "2026-06-20T09:30:00Z",
  end: "2026-06-20T10:00:00Z",
};

const sampleBooking: Booking = {
  id: "bk-1",
  eventTypeId: "et-1",
  guest: { name: "Ada Lovelace", email: "ada@example.com" },
  start: "2026-06-20T09:00:00Z",
  end: "2026-06-20T09:30:00Z",
  createdAt: "2026-06-14T12:00:00Z",
};

function renderPage(id = "et-1") {
  return renderWithProviders(
    <MemoryRouter initialEntries={[`/event-types/${id}/book`]}>
      <Routes>
        <Route
          path="/event-types/:id/book"
          element={<BookEventTypePage />}
        />
        <Route path="/bookings" element={<div>Bookings page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillGuestDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/your name/i), "Ada Lovelace");
  await user.type(screen.getByLabelText(/email/i), "ada@example.com");
}

describe("BookEventTypePage", () => {
  it("renders the available slots for the event type", async () => {
    server.use(
      http.get(url("/event-types/:id/slots"), () =>
        HttpResponse.json([sampleSlot, otherSlot]),
      ),
    );

    renderPage();

    expect(
      await screen.findByRole("button", { name: /09:00 – 09:30/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /09:30 – 10:00/ }),
    ).toBeInTheDocument();
  });

  it("shows an empty-state message when the day has no slots", async () => {
    server.use(
      http.get(url("/event-types/:id/slots"), () => HttpResponse.json([])),
    );

    renderPage();

    expect(
      await screen.findByText(/no available slots for this day/i),
    ).toBeInTheDocument();
  });

  it("blocks submission and shows validation errors for invalid guest details", async () => {
    const user = userEvent.setup();
    let posted = false;
    server.use(
      http.get(url("/event-types/:id/slots"), () =>
        HttpResponse.json([sampleSlot]),
      ),
      http.post(url("/bookings"), () => {
        posted = true;
        return HttpResponse.json(sampleBooking, { status: 201 });
      }),
    );

    renderPage();

    await user.click(
      await screen.findByRole("button", { name: /09:00 – 09:30/ }),
    );
    // Leave name blank and enter a malformed email, then submit.
    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(
      screen.getByText(/enter a valid email address/i),
    ).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it("shows a not-found message for an unknown event type", async () => {
    server.use(
      http.get(url("/event-types/:id/slots"), () =>
        HttpResponse.json(
          { code: "not_found", message: "Event type does not exist." },
          { status: 404 },
        ),
      ),
    );

    renderPage("missing");

    expect(
      await screen.findByText(/this event type does not exist/i),
    ).toBeInTheDocument();
  });

  it("books a selected slot and shows a confirmation", async () => {
    const user = userEvent.setup();
    let bookedStart: string | null = null;
    server.use(
      http.get(url("/event-types/:id/slots"), () =>
        HttpResponse.json([sampleSlot]),
      ),
      http.post(url("/bookings"), async ({ request }) => {
        const body = (await request.json()) as { start: string };
        bookedStart = body.start;
        return HttpResponse.json(sampleBooking, { status: 201 });
      }),
    );

    renderPage();

    await user.click(
      await screen.findByRole("button", { name: /09:00 – 09:30/ }),
    );
    await fillGuestDetails(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    expect(await screen.findByText(/booking confirmed/i)).toBeInTheDocument();
    expect(bookedStart).toBe(sampleSlot.start);
  });

  it("surfaces a 409 conflict and prompts for another slot", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(url("/event-types/:id/slots"), () =>
        HttpResponse.json([sampleSlot]),
      ),
      http.post(url("/bookings"), () =>
        HttpResponse.json(
          { code: "slot_conflict", message: "That slot is taken." },
          { status: 409 },
        ),
      ),
    );

    renderPage();

    await user.click(
      await screen.findByRole("button", { name: /09:00 – 09:30/ }),
    );
    await fillGuestDetails(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    expect(
      await screen.findByText(/that time was just taken/i),
    ).toBeInTheDocument();
    // The conflict clears the selection, so the guest form is hidden again and
    // the slot list remains available to choose from.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /confirm booking/i }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /09:00 – 09:30/ }),
    ).toBeInTheDocument();
  });
});
