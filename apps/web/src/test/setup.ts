import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

import { nextNavigationMock } from "./next-navigation-mock";

vi.mock("next/navigation", () => ({
  usePathname: () => nextNavigationMock.pathname,
  useServerInsertedHTML: () => {},
}));

process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_PDF_WORKER_URL = "http://localhost:8000";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
