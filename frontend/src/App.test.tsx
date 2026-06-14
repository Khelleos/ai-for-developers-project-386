import { describe, expect, it } from "vitest";
import { screen, renderWithProviders } from "./test-utils";
import App from "./App";

describe("App shell", () => {
  it("renders the application title", () => {
    renderWithProviders(<App />);
    expect(
      screen.getByRole("heading", { name: /call booking/i }),
    ).toBeInTheDocument();
  });
});
