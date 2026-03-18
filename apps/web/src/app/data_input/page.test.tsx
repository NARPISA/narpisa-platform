import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi } from "vitest";

import DataInputPage from "./page";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Data input page", () => {
  it("renders the page heading and home link", () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<DataInputPage />);

    expect(
      screen.getByRole("heading", {
        name: /pdf link testing page/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: /back to home/i,
      }),
    ).toHaveAttribute("href", "/");
  });

  it("blocks submission for an invalid payload", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<DataInputPage />);

    await user.type(
      screen.getByRole("textbox", { name: /document title/i }),
      "Haib Copper PEA",
    );
    await user.type(
      screen.getByRole("textbox", { name: /pdf source url/i }),
      "not-a-valid-url",
    );
    await user.type(
      screen.getByRole("textbox", { name: /attribution/i }),
      "NaRPISA research team",
    );

    expect(
      screen.getByRole("button", {
        name: /queue source link/i,
      }),
    ).toBeDisabled();
  });

  it("queues a valid link and resets the form", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "queued-link-1",
          title: "Haib Copper PEA",
          source_url: "https://example.org/report.pdf",
          attribution: "NaRPISA research team",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "queued-link-1",
            title: "Haib Copper PEA",
            source_url: "https://example.org/report.pdf",
            attribution: "NaRPISA research team",
          },
        ],
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<DataInputPage />);

    const titleInput = screen.getByRole("textbox", { name: /document title/i });
    const urlInput = screen.getByRole("textbox", { name: /pdf source url/i });
    const attributionInput = screen.getByRole("textbox", { name: /attribution/i });
    const addButton = screen.getByRole("button", { name: /queue source link/i });

    await user.type(titleInput, "Haib Copper PEA");
    await user.type(urlInput, "https://example.org/report.pdf");
    await user.type(attributionInput, "NaRPISA research team");
    await user.click(addButton);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/queue-source",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
    expect(screen.getByText("Haib Copper PEA")).toBeInTheDocument();
    expect(
      screen.getByText(/https:\/\/example\.org\/report\.pdf \| NaRPISA research team/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/source link queued successfully/i)).toBeInTheDocument();
    expect(titleInput).toHaveValue("");
    expect(urlInput).toHaveValue("");
    expect(attributionInput).toHaveValue("");
  });
});
