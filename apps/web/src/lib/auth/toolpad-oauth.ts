/** Toolpad `SignInPage` OAuth ids mapped to Supabase `signInWithOAuth` provider names. */
const TOOLPAD_TO_SUPABASE: Record<string, string> = {
  google: "google",
  linkedin: "linkedin",
};

export const OAUTH_DISPLAY_NAMES: Record<string, string> = {
  google: "Google",
  linkedin: "LinkedIn",
};

export type OAuthProviderOption = {
  id: string;
  name: string;
};

export function toolpadOAuthIdToSupabase(id: string): string | null {
  return TOOLPAD_TO_SUPABASE[id] ?? null;
}

export function parseOAuthProviderList(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getOAuthProviderMap(raw: string | undefined): OAuthProviderOption[] {
  return parseOAuthProviderList(raw).map((id) => ({
    id,
    name: OAUTH_DISPLAY_NAMES[id] ?? id,
  }));
}
