"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiLink from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import * as React from "react";

import {
  authBodyTextSx,
  authCenteredPaperSx,
  authFieldSx,
  authLabelSx,
  authLinkSx,
  authPageSx,
  authPrimaryButtonSx,
  authShellSx,
  authTitleSx,
} from "@/app/auth-page-styles";
import MarketingShell from "@/components/marketing/marketing-shell";
import SiteFooter from "@/components/site-footer";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const compactTitleSx = {
  ...authTitleSx,
  fontSize: { xs: "2.6rem", md: "3.6rem" },
  lineHeight: 1.15,
} as const;

const compactBodyTextSx = {
  ...authBodyTextSx,
  maxWidth: "34rem",
  fontSize: { xs: "1.05rem", md: "1.2rem" },
  lineHeight: 1.35,
} as const;

const compactLabelSx = {
  ...authLabelSx,
  fontSize: "1.1rem",
} as const;

const compactLinkSx = {
  ...authLinkSx,
  fontSize: { xs: "1.25rem", md: "1.45rem" },
} as const;

const compactFieldSx = [
  authFieldSx,
  {
    "& .MuiOutlinedInput-root": {
      minHeight: "3.8rem",
      typography: "body1",
    },
    "& .MuiInputBase-input": {
      fontSize: "1.15rem",
      lineHeight: 1.25,
      py: 1.1,
    },
  },
] as const;

const compactButtonSx = {
  ...authPrimaryButtonSx,
  minHeight: "4rem",
  py: "0.85rem",
  fontSize: "1.15rem",
} as const;

export default function ForgotPasswordView() {
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();
    const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${appUrl}/auth/callback?next=/profile/password`,
      },
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(
      "If an account exists for this email, you will receive a reset link shortly. Please check your spam folder too.",
    );
  }

  return (
    <>
      <MarketingShell headerTransparent sx={authShellSx}>
        <Box sx={authPageSx}>
          <Paper elevation={0} sx={authCenteredPaperSx}>
            <Stack
              component="form"
              noValidate
              onSubmit={handleSubmit}
              spacing={2}
              sx={{ width: "100%", alignItems: "center" }}
            >
              <Typography component="h1" sx={compactTitleSx}>
                Reset password
              </Typography>

              <Typography sx={compactBodyTextSx}>
                Enter your account email and we&apos;ll send a password reset
                link.
              </Typography>

              {error ? (
                <Alert
                  severity="error"
                  sx={{ width: "100%", maxWidth: "40rem" }}
                >
                  {error}
                </Alert>
              ) : null}
              {message ? (
                <Alert
                  severity="info"
                  sx={{ width: "100%", maxWidth: "40rem" }}
                >
                  {message}
                </Alert>
              ) : null}

              <Stack
                spacing={1.25}
                sx={{ width: "100%", maxWidth: "40rem", pt: 1 }}
              >
                <Typography sx={compactLabelSx}>Email Address</Typography>
                <TextField
                  placeholder="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  autoComplete="email"
                  sx={compactFieldSx}
                />
              </Stack>

              <Button type="submit" disabled={loading} sx={compactButtonSx}>
                Send reset link
              </Button>

              <MuiLink
                component={NextLink}
                href="/signin"
                underline="hover"
                sx={compactLinkSx}
              >
                Back to sign in
              </MuiLink>
            </Stack>
          </Paper>
        </Box>
      </MarketingShell>
      <SiteFooter behavior="static" />
    </>
  );
}
