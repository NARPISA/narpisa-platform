import { describe, expect, it } from "vitest";

import {
  getOAuthProviderMap,
  parseOAuthProviderList,
  toolpadOAuthIdToSupabase,
} from "./toolpad-oauth";

describe("toolpad-oauth", () => {
  it("maps supported Toolpad ids to Supabase providers", () => {
    expect(toolpadOAuthIdToSupabase("google")).toBe("google");
    expect(toolpadOAuthIdToSupabase("linkedin")).toBe("linkedin");
  });

  it("returns null for unsupported ids", () => {
    expect(toolpadOAuthIdToSupabase("unknown-provider")).toBeNull();
  });

  it("parses OAuth provider env list", () => {
    expect(parseOAuthProviderList("google, linkedin ")).toEqual([
      "google",
      "linkedin",
    ]);
    expect(parseOAuthProviderList(undefined)).toEqual([]);
  });

  it("builds a provider map for the sign-in page", () => {
    expect(getOAuthProviderMap("google,unknown-provider")).toEqual([
      { id: "google", name: "Google" },
      { id: "unknown-provider", name: "unknown-provider" },
    ]);
  });
});
