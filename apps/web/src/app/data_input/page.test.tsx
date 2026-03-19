import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi } from "vitest";

import DataInputPage from "./page";

afterEach(() => {
  vi.useRealTimers();
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
          id: "7b38d7f8-7ff9-4d6c-8b8c-4db0bda7cb8a",
          documentId: "1b5ed2b0-6f06-4f09-8de8-4d8456ef7d01",
          title: "Haib Copper PEA",
          sourceUrl: "https://example.org/report.pdf",
          sourceDomain: "example.org",
          attribution: "NaRPISA research team",
          notes: null,
          mimeType: "application/pdf",
          status: "queued",
          contentHash: null,
          pageCount: null,
          sourceHttpStatus: null,
          errorMessage: null,
          queuedAt: "2026-03-15T12:00:00+00:00",
          startedAt: null,
          completedAt: null,
          updatedAt: "2026-03-15T12:00:00+00:00",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "7b38d7f8-7ff9-4d6c-8b8c-4db0bda7cb8a",
            documentId: "1b5ed2b0-6f06-4f09-8de8-4d8456ef7d01",
            title: "Haib Copper PEA",
            sourceUrl: "https://example.org/report.pdf",
            sourceDomain: "example.org",
            attribution: "NaRPISA research team",
            notes: null,
            mimeType: "application/pdf",
            status: "queued",
            contentHash: null,
            pageCount: null,
            sourceHttpStatus: null,
            errorMessage: null,
            queuedAt: "2026-03-15T12:00:00+00:00",
            startedAt: null,
            completedAt: null,
            updatedAt: "2026-03-15T12:00:00+00:00",
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

    expect(fetchMock).toHaveBeenCalledWith(
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
    expect(screen.getByText(/^Queued$/)).toBeInTheDocument();
    expect(titleInput).toHaveValue("");
    expect(urlInput).toHaveValue("");
    expect(attributionInput).toHaveValue("");
  });

  it("renders backend processing status for queued links", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "7b38d7f8-7ff9-4d6c-8b8c-4db0bda7cb8a",
          documentId: "1b5ed2b0-6f06-4f09-8de8-4d8456ef7d01",
          title: "Haib Copper PEA",
          sourceUrl: "https://example.org/report.pdf",
          sourceDomain: "example.org",
          attribution: "NaRPISA research team",
          notes: null,
          mimeType: "application/pdf",
          status: "fetching",
          contentHash: null,
          pageCount: null,
          sourceHttpStatus: 200,
          errorMessage: null,
          queuedAt: "2026-03-15T12:00:00+00:00",
          startedAt: "2026-03-15T12:00:05+00:00",
          completedAt: null,
          updatedAt: "2026-03-15T12:00:05+00:00",
        },
      ],
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<DataInputPage />);

    expect(await screen.findByText(/fetching pdf/i)).toBeInTheDocument();
    expect(screen.getByText("Haib Copper PEA")).toBeInTheDocument();
  });

  it("deletes a queued link from the frontend list", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "7b38d7f8-7ff9-4d6c-8b8c-4db0bda7cb8a",
            documentId: "1b5ed2b0-6f06-4f09-8de8-4d8456ef7d01",
            title: "Haib Copper PEA",
            sourceUrl: "https://example.org/report.pdf",
            sourceDomain: "example.org",
            attribution: "NaRPISA research team",
            notes: null,
            mimeType: "application/pdf",
            status: "queued",
            contentHash: null,
            pageCount: null,
            sourceHttpStatus: null,
            errorMessage: null,
            queuedAt: "2026-03-15T12:00:00+00:00",
            startedAt: null,
            completedAt: null,
            updatedAt: "2026-03-15T12:00:00+00:00",
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => null,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<DataInputPage />);

    await user.click(await screen.findByLabelText(/delete haib copper pea/i));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/queue-source?jobId=7b38d7f8-7ff9-4d6c-8b8c-4db0bda7cb8a",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
    expect(await screen.findByText(/queued source deleted/i)).toBeInTheDocument();
    expect(screen.getByText(/no queued links yet/i)).toBeInTheDocument();
  });
});
