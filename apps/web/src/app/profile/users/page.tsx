import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import UsersAdminView, { type ProfileUserRow, type TierOption } from "./users-admin-view";

export const metadata: Metadata = {
  title: "Users",
  description: "Registered users and tier management",
};

function tierNameFromJoin(tiers: unknown): string | null {
  if (!tiers) {
    return null;
  }
  if (Array.isArray(tiers)) {
    const row = tiers[0] as { name?: string } | undefined;
    return row?.name ?? null;
  }
  if (typeof tiers === "object" && tiers !== null && "name" in tiers) {
    return String((tiers as { name: string }).name);
  }
  return null;
}

export default async function ProfileUsersPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/signin?callbackUrl=%2Fprofile%2Fusers");
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("tier_id, tiers!profiles_tier_id_fkey ( name )")
    .eq("id", userId)
    .maybeSingle();

  const myTierName = tierNameFromJoin(myProfile?.tiers);
  const isAdmin = myTierName?.toLowerCase() === "admin";

  if (!isAdmin) {
    redirect("/profile");
  }

  const { data: profilesRaw, error: profilesError } = await supabase
    .from("profiles")
    .select("id, firstname, lastname, tier_id, created_at, email, tiers!profiles_tier_id_fkey ( id, name )")
    .order("created_at", { ascending: false });

  if (profilesError) {
    return (
      <UsersAdminView
        isAdmin={isAdmin}
        currentUserId={userId}
        initialRows={[]}
        tiers={[]}
        errorMessage={`Could not load users: ${profilesError.message}`}
      />
    );
  }

  const initialRows: ProfileUserRow[] = ((profilesRaw as Array<Record<string, unknown>> | null) ?? []).map((row) => {
    const id = row.id as string;
    const rawEmail = (row as { email?: string | null }).email ?? null;
    const fromDb = typeof rawEmail === "string" && rawEmail.trim() ? rawEmail.trim() : null;
    return {
      id,
      firstname: (row.firstname as string | null) ?? null,
      lastname: (row.lastname as string | null) ?? null,
      tier_id: row.tier_id as string,
      created_at: row.created_at as string,
      tier_name: tierNameFromJoin(row.tiers),
      email: fromDb,
    };
  });

  const { data: tiersRaw, error: tiersError } = await supabase
    .from("tiers")
    .select("id, name, description")
    .order("name", { ascending: true });

  const tiers: TierOption[] = (tiersRaw ?? []).map((t) => ({
    id: t.id as string,
    name: t.name as string,
    description: (t.description as string | null) ?? null,
  }));

  return (
    <UsersAdminView
      isAdmin={isAdmin}
      currentUserId={userId}
      initialRows={initialRows}
      tiers={tiers}
      errorMessage={tiersError?.message ?? null}
    />
  );
}
