import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Container from "@mui/material/Container";

import MarketingShell from "@/components/marketing/marketing-shell";
import { createClient } from "@/lib/supabase/server";
import NetworkView from "./network-view";

export const metadata: Metadata = {
  title: "Network",
  description: "Opt-in mining industry network graph",
};

export default async function NetworkPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/signin?callbackUrl=%2Fnetwork");
  }

  return (
    <MarketingShell>
      <Container maxWidth="xl" sx={{ pt: { xs: 6, md: 8 }, pb: { xs: 6, md: 8 } }}>
        <NetworkView />
      </Container>
    </MarketingShell>
  );
}
