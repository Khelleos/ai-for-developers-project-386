import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";

import { renderWithProviders, screen, waitFor } from "../test-utils";
import { server } from "../mocks/server";
import { API_BASE_URL } from "../config";
import { EventTypesPage } from "./EventTypesPage";
import type { EventType } from "../api/types";

const url = (path: string) => `${API_BASE_URL}${path}`;

const sampleEventType: EventType = {
  id: "et-1",
  title: "30 minute intro call",
  durationMinutes: 30,
  description: "A quick chat to get started.",
};

function renderPage() {
  return renderWithProviders(
    <MemoryRouter>
      <EventTypesPage />
    </MemoryRouter>,
  );
}

describe("EventTypesPage", () => {
  it("renders the event-type list from the API", async () => {
    server.use(
      http.get(url("/event-types"), () => HttpResponse.json([sampleEventType])),
    );

    renderPage();

    expect(
      await screen.findByText("30 minute intro call"),
    ).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
    expect(
      screen.getByText("A quick chat to get started."),
    ).toBeInTheDocument();
    // Links to the booking page for this event type.
    expect(
      screen.getByRole("link", { name: /book this call/i }),
    ).toHaveAttribute("href", "/event-types/et-1/book");
  });

  it("shows an empty state when there are no event types", async () => {
    server.use(http.get(url("/event-types"), () => HttpResponse.json([])));

    renderPage();

    expect(
      await screen.findByText(/no event types yet/i),
    ).toBeInTheDocument();
  });

  it("submits a valid form and refreshes the list", async () => {
    const user = userEvent.setup();
    let created = false;
    server.use(
      http.get(url("/event-types"), () =>
        HttpResponse.json(created ? [sampleEventType] : []),
      ),
      http.post(url("/event-types"), async () => {
        created = true;
        return HttpResponse.json(sampleEventType, { status: 201 });
      }),
    );

    renderPage();

    await screen.findByText(/no event types yet/i);

    await user.type(screen.getByLabelText(/title/i), "30 minute intro call");
    await user.click(
      screen.getByRole("button", { name: /create event type/i }),
    );

    expect(
      await screen.findByText("30 minute intro call"),
    ).toBeInTheDocument();
  });

  it("blocks submission and shows a client-side error for a blank title", async () => {
    const user = userEvent.setup();
    let posted = false;
    server.use(
      http.get(url("/event-types"), () => HttpResponse.json([])),
      http.post(url("/event-types"), () => {
        posted = true;
        return HttpResponse.json(sampleEventType, { status: 201 });
      }),
    );

    renderPage();
    await screen.findByText(/no event types yet/i);

    await user.click(
      screen.getByRole("button", { name: /create event type/i }),
    );

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it("surfaces a 400 validation error from the API", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(url("/event-types"), () => HttpResponse.json([])),
      http.post(url("/event-types"), () =>
        HttpResponse.json(
          {
            code: "validation_error",
            message: "Title must not be blank.",
            details: ["title: required"],
          },
          { status: 400 },
        ),
      ),
    );

    renderPage();
    await screen.findByText(/no event types yet/i);

    await user.type(screen.getByLabelText(/title/i), "Valid title");
    await user.click(
      screen.getByRole("button", { name: /create event type/i }),
    );

    expect(
      await screen.findByText("Title must not be blank."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("title: required")).toBeInTheDocument(),
    );
  });
});
