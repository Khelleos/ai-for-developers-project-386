import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { screen, renderWithProviders } from "./test-utils";
import { server } from "./mocks/server";
import { API_BASE_URL } from "./config";
import App from "./App";

describe("App shell", () => {
  it("renders the application title and navigation", () => {
    server.use(
      http.get(`${API_BASE_URL}/event-types`, () => HttpResponse.json([])),
    );

    renderWithProviders(<App />);

    expect(
      screen.getByRole("heading", { name: /call booking/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /event types/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /bookings/i }),
    ).toBeInTheDocument();
  });
});
