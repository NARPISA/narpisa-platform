import { render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import ThemeRegistry from "@/components/theme-registry";
import { nextNavigationMock } from "@/test/next-navigation-mock";

import Home from "./page";

function renderHome() {
  return render(
    <ThemeRegistry>
      <Home />
    </ThemeRegistry>,
  );
}

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;

  // jsdom does not implement matchMedia; spyOn fails if the property is missing.
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
  vi.clearAllMocks();
});

beforeEach(() => {
  nextNavigationMock.pathname = "/";
});

describe("Home page", () => {
  it("renders main landmark", () => {
    renderHome();

    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the refreshed homepage headline", () => {
    renderHome();

    expect(
      screen.getByRole("heading", {
        name: /unlock southern africa's natural resources all in one place/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders the new marketing header brand link", () => {
    renderHome();

    const brand = screen.getByRole("link", { name: /MineralDB/i });
    expect(brand).toHaveAttribute("href", "/");
  });

  it("keeps the primary calls to action wired correctly", () => {
    renderHome();

    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute(
      "href",
      "/data_input",
    );
    expect(screen.getByRole("link", { name: /view databases/i })).toHaveAttribute(
      "href",
      "/database",
    );
  });

  it("shows the three promoted feature routes", () => {
    renderHome();

    expect(screen.getByRole("link", { name: /open feature/i })).toHaveAttribute(
      "href",
      "/database",
    );
    expect(screen.getByRole("button", { name: /database/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /map/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /networking/i })).toBeInTheDocument();
  });
});
