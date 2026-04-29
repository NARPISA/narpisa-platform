import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Container from "@mui/material/Container";

import MarketingShell from "@/components/marketing/marketing-shell";
import ProfileSidebar from "@/components/profile/profile-sidebar";
import { createClient } from "@/lib/supabase/server";

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

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin?callbackUrl=%2Fprofile");
  }
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("tier_id, tiers!profiles_tier_id_fkey ( name )")
    .eq("id", user.id)
    .maybeSingle();
  const isAdmin = tierNameFromJoin(myProfile?.tiers)?.toLowerCase() === "admin";

  return (
    <MarketingShell>
      <Container
        maxWidth="lg"
        sx={{
          pt: { xs: 7, md: 3 },
          pb: { xs: 7, md: 3 },
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 2.5, md: 3.5 }}
          alignItems="stretch"
          sx={{ minHeight: 0 }}
        >
          <Box sx={{ alignSelf: "flex-start" }}>
            <ProfileSidebar isAdmin={isAdmin} />
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
            }}
          >
            {children}
          </Box>
        </Stack>
      </Container>
    </MarketingShell>
  );
}
