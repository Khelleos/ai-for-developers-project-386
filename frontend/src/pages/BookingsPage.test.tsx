import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";

import { renderWithProviders, screen } from "../test-utils";
import { server } from "../mocks/server";
import { API_BASE_URL } from "../config";
import { AppRoutes } from "../App";
import { BookingsPage } from "./BookingsPage";
import type { Booking, EventType } from "../api/types";

const url = (path: string) => `${API_BASE_URL}${path}`;

const sampleEventType: EventType = {
  id: "et-1",
  title: "30 minute intro call",
  durationMinutes: 30,
};

const earlier: Booking = {
  id: "bk-1",
  eventTypeId: "et-1",
  guest: { name: "Ada Lovelace", email: "ada@example.com" },
  start: "2026-06-20T09:00:00Z",
  end: "2026-06-20T09:30:00Z",
  notes: "Looking forward to it.",
  createdAt: "2026-06-14T12:00:00Z",
};

const later: Booking = {
  id: "bk-2",
  eventTypeId: "et-1",
  guest: { name: "Grace Hopper", email: "grace@example.com" },
  start: "2026-06-21T10:00:00Z",
  end: "2026-06-21T10:30:00Z",
  createdAt: "2026-06-14T13:00:00Z",
};

describe("BookingsPage", () => {
  it("renders upcoming bookings ordered by start, labelled by event type", async () => {
    server.use(
      http.get(url("/event-types"), () =>
        HttpResponse.json([sampleEventType]),
      ),
      // Return out of order to prove the page sorts by start time.
      http.get(url("/bookings"), () => HttpResponse.json([later, earlier])),
    );

    renderWithProviders(
      <MemoryRouter>
        <BookingsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(
      screen.getByText("Looking forward to it."),
    ).toBeInTheDocument();
    // Event type id is resolved to its title.
    expect(screen.getAllByText("30 minute intro call").length).toBe(2);

    // Earlier booking (Ada) renders before the later one (Grace).
    const ada = screen.getByText("Ada Lovelace");
    const grace = screen.getByText("Grace Hopper");
    expect(
      ada.compareDocumentPosition(grace) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows an empty state when there are no bookings", async () => {
    server.use(
      http.get(url("/event-types"), () => HttpResponse.json([])),
      http.get(url("/bookings"), () => HttpResponse.json([])),
    );

    renderWithProviders(
      <MemoryRouter>
        <BookingsPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/no upcoming bookings/i),
    ).toBeInTheDocument();
  });

  it("surfaces an error when the bookings request fails", async () => {
    server.use(
      http.get(url("/event-types"), () => HttpResponse.json([])),
      http.get(url("/bookings"), () =>
        HttpResponse.json(
          { code: "internal_error", message: "Boom." },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders(
      <MemoryRouter>
        <BookingsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/boom/i);
  });
});

describe("App routing", () => {
  it("renders the bookings page at /bookings and navigates back to event types", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(url("/event-types"), () =>
        HttpResponse.json([sampleEventType]),
      ),
      http.get(url("/bookings"), () => HttpResponse.json([earlier])),
    );

    renderWithProviders(
      <MemoryRouter initialEntries={["/bookings"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: /upcoming bookings/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /event types/i }));

    expect(
      await screen.findByRole("heading", { name: /^event types$/i }),
    ).toBeInTheDocument();
  });
});
