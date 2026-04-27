import { describe, expect, it } from "vitest";

import { getSafeInternalRedirect } from "./safe-redirect";

describe("getSafeInternalRedirect", () => {
  it("keeps valid internal paths", () => {
    expect(getSafeInternalRedirect("/database")).toBe("/database");
    expect(getSafeInternalRedirect("/database?tab=mines")).toBe("/database?tab=mines");
  });

  it("falls back for missing or root values", () => {
    expect(getSafeInternalRedirect(undefined)).toBe("/database");
    expect(getSafeInternalRedirect("/")).toBe("/database");
  });

  it("rejects protocol-relative and absolute redirects", () => {
    expect(getSafeInternalRedirect("//evil.com")).toBe("/database");
    expect(getSafeInternalRedirect("https://evil.com")).toBe("/database");
    expect(getSafeInternalRedirect("/%2F%2Fevil.com")).toBe("/database");
  });
});

