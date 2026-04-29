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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("firstname, lastname, email, linkedin_url")
    .eq("id", userId)
    .maybeSingle();

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
    />
  );
}
