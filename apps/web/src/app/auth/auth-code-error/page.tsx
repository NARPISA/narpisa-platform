import type { Metadata } from "next";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import MarketingShell from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Sign-in error",
};

export default function AuthCodeErrorPage() {
  return (
    <MarketingShell>
      <Stack spacing={2} sx={{ px: 3, py: 8, maxWidth: 560, mx: "auto" }}>
        <Typography variant="h5" component="h1">
          Something went wrong
        </Typography>
        <Typography color="text.secondary">
          We could not complete sign-in. The link may have expired, or SSO may not be configured for
          this environment.
        </Typography>
        <MuiLink href="/signin" underline="hover">
          Back to sign in
        </MuiLink>
      </Stack>
    </MarketingShell>
  );
}
