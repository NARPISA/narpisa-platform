import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import ProfileView from "./profile-view";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your NaRPISA account profile",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/signin?callbackUrl=%2Fprofile");
  }

  const [
    { data: profile, error: profileError },
    { data: linkedInAccount },
    { data: networkProfile },
    { data: networkInterests },
    { data: networkTagRows },
    { data: commodities },
    { data: countries },
    { data: sites },
    { data: licenses },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("firstname, lastname, email, linkedin_url")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("profile_social_accounts")
      .select("display_name, email, avatar_url, profile_url, last_synced_at")
      .eq("profile_id", userId)
      .eq("provider", "linkedin")
      .maybeSingle(),
    supabase
      .from("network_profiles")
      .select(
        "is_visible, headline, company, role_category, disciplines, regions, bio, linkedin_url",
      )
      .eq("profile_id", userId)
      .maybeSingle(),
    supabase
      .from("network_interests")
      .select("interest_type, label, commodity_id, country_id, site_id")
      .eq("profile_id", userId),
    supabase
      .from("network_profiles")
      .select("disciplines, regions")
      .eq("is_visible", true),
    supabase.from("commodities").select("id, name").order("name"),
    supabase.from("countries").select("id, name").order("name"),
    supabase.from("sites").select("id, name").order("name"),
    supabase.from("licenses").select("region").not("region", "is", null),
  ]);

  if (profileError) {
    throw new Error(`Could not load profile: ${profileError.message}`);
  }

  return (
    <ProfileView
      profileId={userId}
      initialFirstName={profile?.firstname ?? ""}
      initialLastName={profile?.lastname ?? ""}
      email={profile?.email ?? "Not available"}
      initialLinkedInUrl={profile?.linkedin_url ?? ""}
      linkedInAccount={
        linkedInAccount
          ? {
              displayName: linkedInAccount.display_name ?? null,
              email: linkedInAccount.email ?? null,
              avatarUrl: linkedInAccount.avatar_url ?? null,
              profileUrl: linkedInAccount.profile_url ?? null,
              lastSyncedAt: linkedInAccount.last_synced_at ?? null,
            }
          : null
      }
      initialNetworkProfile={{
        isVisible: networkProfile?.is_visible ?? false,
        headline: networkProfile?.headline ?? "",
        company: networkProfile?.company ?? "",
        roleCategory: networkProfile?.role_category ?? "",
        disciplines: networkProfile?.disciplines ?? [],
        regions: networkProfile?.regions ?? [],
        bio: networkProfile?.bio ?? "",
        linkedInUrl: networkProfile?.linkedin_url ?? "",
      }}
      initialNetworkInterests={(networkInterests ?? []).map((interest) => ({
        interestType: interest.interest_type ?? "",
        label: interest.label ?? "",
        commodityId: interest.commodity_id ?? null,
        countryId: interest.country_id ?? null,
        siteId: interest.site_id ?? null,
      }))}
      tagOptions={{
        disciplines: uniqueSorted(
          (networkTagRows ?? []).flatMap((row) => row.disciplines ?? []),
        ),
        regions: uniqueSorted(
          [
            ...(networkTagRows ?? []).flatMap((row) => row.regions ?? []),
            ...(licenses ?? []).flatMap((row) => splitRegionList(row.region)),
          ],
        ),
        commodities: uniqueEntityOptions(commodities ?? []),
        countries: uniqueEntityOptions(countries ?? []),
        sites: uniqueEntityOptions(sites ?? []),
      }}
    />
  );
}

type EntityOptionRow = {
  id: number | null;
  name: string | null;
};

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b));
}

function splitRegionList(value: string | null | undefined) {
  return String(value ?? "")
    .split(",")
    .map((region) => region.trim())
    .filter(Boolean);
}

function uniqueEntityOptions(rows: EntityOptionRow[]) {
  const optionsByLabel = new Map<string, { id: number; label: string }>();
  for (const row of rows) {
    const label = row.name?.trim();
    if (label && row.id != null) {
      optionsByLabel.set(label.toLowerCase(), { id: row.id, label });
    }
  }
  return Array.from(optionsByLabel.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}
