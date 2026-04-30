import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { getSafeInternalRedirect } from "@/lib/auth/safe-redirect";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LINKEDIN_PROVIDERS = new Set(["linkedin", "linkedin_oidc"]);

type OAuthIdentity = NonNullable<User["identities"]>[number] & {
  identity_data?: Record<string, unknown>;
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getDisplayName(identityData: Record<string, unknown>) {
  const directName =
    readString(identityData.name) ?? readString(identityData.full_name);
  if (directName) {
    return directName;
  }

  const givenName =
    readString(identityData.given_name) ?? readString(identityData.first_name);
  const familyName =
    readString(identityData.family_name) ?? readString(identityData.last_name);
  return [givenName, familyName].filter(Boolean).join(" ") || null;
}

async function syncLinkedInAccount(user: User) {
  const linkedInIdentity = (user.identities as OAuthIdentity[] | undefined)?.find(
    (identity) => LINKEDIN_PROVIDERS.has(identity.provider),
  );

  if (!linkedInIdentity) {
    return null;
  }

  const identityData = linkedInIdentity.identity_data ?? {};
  const providerSubject =
    readString(identityData.sub) ??
    readString(identityData.provider_id) ??
    readString(linkedInIdentity.id);

  if (!providerSubject) {
    return new Error("LinkedIn did not return an account identifier.");
  }

  const displayName = getDisplayName(identityData);
  const email = readString(identityData.email) ?? user.email ?? null;
  const avatarUrl =
    readString(identityData.picture) ?? readString(identityData.avatar_url);
  const profileUrl =
    readString(identityData.profile_url) ?? readString(identityData.url);
  const [firstName, lastName] = [
    readString(identityData.given_name) ?? readString(identityData.first_name),
    readString(identityData.family_name) ?? readString(identityData.last_name),
  ];
  const supabase = await createClient();

  const { error: accountError } = await supabase
    .from("profile_social_accounts")
    .upsert(
      {
        profile_id: user.id,
        provider: "linkedin",
        provider_subject: providerSubject,
        display_name: displayName,
        email,
        avatar_url: avatarUrl,
        profile_url: profileUrl,
        raw_identity_data: identityData,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,provider" },
    );

  if (accountError) {
    return new Error(accountError.message);
  }

  const profileUpdate: Record<string, string> = {};
  if (firstName) {
    profileUpdate.firstname = firstName;
  }
  if (lastName) {
    profileUpdate.lastname = lastName;
  }
  if (profileUrl) {
    profileUpdate.linkedin_url = profileUrl;
  }

  if (Object.keys(profileUpdate).length > 0) {
    await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeInternalRedirect(searchParams.get("next"));
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const syncError = await syncLinkedInAccount(user);
        if (syncError) {
          return NextResponse.redirect(new URL("/auth/auth-code-error", appUrl));
        }
      }
      return NextResponse.redirect(new URL(next, appUrl));
    }
  }

  return NextResponse.redirect(new URL("/auth/auth-code-error", appUrl));
}
