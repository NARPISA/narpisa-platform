import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, vi } from "vitest";

import ThemeRegistry from "@/components/theme-registry";
import { nextNavigationMock } from "@/test/next-navigation-mock";

import DataInputPage from "./page";

vi.mock("@/components/glass-surface", () => ({
  default: function GlassSurfaceMock({ children }: { children?: ReactNode }) {
    return <div data-testid="glass-surface">{children}</div>;
  },
}));

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const minWidthMatch = query.match(/min-width:\s*(\d+)px/);
      const minWidth = minWidthMatch ? Number(minWidthMatch[1]) : 0;
      return {
        matches: minWidth >= 600,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
});

afterEach(() => {
  nextNavigationMock.pathname = "/";
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(() => {
  nextNavigationMock.pathname = "/data_input";
});

function renderDataInput() {
  return render(
    <ThemeRegistry>
      <DataInputPage />
    </ThemeRegistry>,
  );
}

describe("Data input page", () => {
  it("renders Enter Data heading and nav", () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    vi.stubGlobal("fetch", fetchMock);

    renderDataInput();

    expect(
      screen.getByRole("heading", {
        name: /enter data/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("navigation", { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^MineralDB$/i })).toHaveAttribute("href", "/");
  });

  it("blocks submission for an invalid payload", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    vi.stubGlobal("fetch", fetchMock);

    renderDataInput();

    await user.type(
      screen.getByRole("textbox", { name: /document title/i }),
      "Haib Copper PEA",
    );
    await user.type(
      screen.getByRole("textbox", { name: /enter pdf address/i }),
      "not-a-valid-url",
    );
    await user.type(
      screen.getByRole("textbox", { name: /attribution/i }),
      "NaRPISA research team",
    );

    expect(
      screen.getByRole("button", {
        name: /parse/i,
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

    renderDataInput();

    const titleInput = screen.getByRole("textbox", { name: /document title/i });
    const urlInput = screen.getByRole("textbox", { name: /enter pdf address/i });
    const attributionInput = screen.getByRole("textbox", { name: /attribution/i });
    const parseButton = screen.getByRole("button", { name: /parse/i });

    await user.type(titleInput, "Haib Copper PEA");
    await user.type(urlInput, "https://example.org/report.pdf");
    await user.type(attributionInput, "NaRPISA research team");
    await user.click(parseButton);

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

    renderDataInput();

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

    renderDataInput();

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
