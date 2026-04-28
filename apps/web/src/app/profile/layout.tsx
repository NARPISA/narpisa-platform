import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Container from "@mui/material/Container";

import MarketingShell from "@/components/marketing/marketing-shell";
import ProfileSidebar from "@/components/profile/profile-sidebar";
import ProfileUnsavedFloating from "@/components/profile/profile-unsaved-floating";
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
          height: { md: "calc(100svh - 96px)" },
          overflow: { md: "hidden" },
          display: { md: "flex" },
          flexDirection: { md: "column" },
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 2.5, md: 3.5 }}
          alignItems="stretch"
          sx={{ minHeight: 0, flex: { md: 1 } }}
        >
          <Box sx={{ alignSelf: "flex-start", position: { md: "sticky" }, top: { md: 0 } }}>
            <ProfileSidebar isAdmin={isAdmin} />
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              overflowY: { md: "auto" },
              pr: { md: 0.5 },
            }}
          >
            {children}
            <ProfileUnsavedFloating />
          </Box>
        </Stack>
      </Container>
    </MarketingShell>
  );
}
