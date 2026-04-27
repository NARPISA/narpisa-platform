import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";

import MarketingShell from "@/components/marketing/marketing-shell";
import { createClient } from "@/lib/supabase/server";
import ProfileView from "./profile-view";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your NaRPISA account profile",
};

function getFirstName(fullName: string | undefined): string | null {
  const trimmed = fullName?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  return trimmed.split(/\s+/)[0] ?? null;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin?callbackUrl=%2Fprofile");
  }

  const meta = user.user_metadata as Record<string, string | undefined> | undefined;
  const fullName = meta?.full_name?.trim() ?? "";
  const firstName = getFirstName(fullName);
  const lastName = fullName.replace(firstName ?? "", "").trim();
  const company = meta?.company?.trim() ?? "";
  const address = meta?.address?.trim() ?? "";
  const biography = meta?.biography?.trim() ?? "";
  const accountType = meta?.account_type?.trim() ?? "Standard";

  return (
    <MarketingShell>
      <Container maxWidth="lg" sx={{ pt: { xs: 7, md: 9 }, pb: { xs: 7, md: 10 } }}>
        <Box>
          <ProfileView
            initialFirstName={firstName ?? ""}
            initialLastName={lastName}
            email={user.email ?? "Not available"}
            userId={user.id}
            initialCompany={company}
            initialAddress={address}
            initialBiography={biography}
            accountType={accountType}
          />
        </Box>
      </Container>
    </MarketingShell>
  );
}
