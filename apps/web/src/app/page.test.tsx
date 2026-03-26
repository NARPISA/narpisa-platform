import { render, screen } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

import ThemeRegistry from "@/components/theme-registry";
import { nextNavigationMock } from "@/test/next-navigation-mock";

import Home from "./page";

vi.mock("@/components/mineral-hero", () => ({
  default: function MineralHeroMock() {
    return (
      <div>
        <h1>
          MINERAL <span>DB</span>
        </h1>
      </div>
    );
  },
}));

vi.mock("@/components/africa-map-frame", () => ({
  default: function AfricaMapFrameMock() {
    return <section aria-label="Africa coverage map" />;
  },
}));

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

  it("renders the MINERAL DB heading", () => {
    renderHome();

    expect(
      screen.getByRole("heading", {
        name: /mineral\s+db/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders the navigation bar with MineralDB brand link", () => {
    renderHome();

    const brand = screen.getByRole("link", { name: /^MineralDB$/i });
    expect(brand).toHaveAttribute("href", "/");
  });

  it("links to the data input page from the Database nav item", () => {
    renderHome();

    expect(
      screen.getByRole("link", { name: /^database$/i }),
    ).toHaveAttribute("href", "/data_input");
  });

  it("renders Sign In in the nav", () => {
    renderHome();

    expect(
      screen.getByRole("link", { name: /^sign in$/i }),
    ).toHaveAttribute("href", "/signin");
  });

  it("renders Home as an active-style nav link", () => {
    renderHome();

    expect(
      screen.getByRole("link", { name: /^home$/i }),
    ).toHaveAttribute("href", "/");
  });
});
