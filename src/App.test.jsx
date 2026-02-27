import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("shows validation message when symptoms are empty", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /check my health/i }));

    expect(await screen.findByText(/please tell me how you're feeling first/i)).toBeInTheDocument();
  });

  it("submits symptoms and renders diagnosis result", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        result: "Mock diagnosis response",
        triage: { level: "routine", title: "Monitor", message: "No urgent flags", reasons: [] },
        handoff: {
          createdAt: "2026-02-27T00:00:00.000Z",
          childName: "Mia",
          childAge: "8 years old",
          symptoms: "I have a mild headache and sore throat.",
          language: "en",
          readingLevel: "simple",
        },
      }),
    });

    render(<App />);

    await user.type(
      screen.getByPlaceholderText(/tell dr\. buddy everything/i),
      "I have a mild headache and sore throat.",
    );
    await user.click(screen.getByRole("button", { name: /check my health/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/diagnose",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.language).toBe("en");
    expect(payload.readingLevel).toBe("simple");

    expect(await screen.findByText("Mock diagnosis response")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /print summary for doctor/i })).toBeInTheDocument();
  });

  it("shows triage warning when API returns emergency level", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        result: "Emergency guidance",
        triage: {
          level: "emergency",
          title: "Emergency warning",
          message: "Seek emergency care now.",
          reasons: ["Breathing difficulty"],
        },
        handoff: {
          createdAt: "2026-02-27T00:00:00.000Z",
          childName: "Alex",
          childAge: "7 years old",
          symptoms: "Cannot breathe well",
          language: "en",
          readingLevel: "simple",
        },
      }),
    });

    render(<App />);
    await user.type(screen.getByPlaceholderText(/tell dr\. buddy everything/i), "Cannot breathe well");
    await user.click(screen.getByRole("button", { name: /check my health/i }));

    expect(await screen.findByText(/emergency warning/i)).toBeInTheDocument();
    expect(await screen.findByText(/breathing difficulty/i)).toBeInTheDocument();
  });
});
