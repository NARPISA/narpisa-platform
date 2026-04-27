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

export default function SignUpView() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please enter the same password twice.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=/signin`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setMessage("Check your email to confirm your account, then sign in.");
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
              <Typography component="h1" sx={authTitleSx}>
                Create account
              </Typography>

              <Typography sx={authBodyTextSx}>
                Already have an account?{" "}
                <MuiLink
                  component={NextLink}
                  href="/signin"
                  underline="hover"
                  sx={authLinkSx}
                >
                  Sign in here.
                </MuiLink>
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
                  severity="success"
                  sx={{ width: "100%", maxWidth: "40rem" }}
                >
                  {message}
                </Alert>
              ) : null}

              <Stack
                spacing={1.25}
                sx={{ width: "100%", maxWidth: "40rem", pt: 1 }}
              >
                <Typography sx={authLabelSx}>Email Address</Typography>
                <TextField
                  placeholder="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  autoComplete="email"
                  sx={authFieldSx}
                />
              </Stack>

              <Stack spacing={1.25} sx={{ width: "100%", maxWidth: "40rem" }}>
                <Typography sx={authLabelSx}>Password</Typography>
                <TextField
                  placeholder="password"
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="new-password"
                  sx={authFieldSx}
                />
              </Stack>

              <Stack spacing={1.25} sx={{ width: "100%", maxWidth: "40rem" }}>
                <Typography sx={authLabelSx}>Confirm Password</Typography>
                <TextField
                  placeholder="password"
                  type="password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  fullWidth
                  autoComplete="new-password"
                  error={
                    Boolean(confirmPassword) && password !== confirmPassword
                  }
                  helperText={
                    confirmPassword && password !== confirmPassword
                      ? "Passwords do not match."
                      : " "
                  }
                  sx={authFieldSx}
                />
              </Stack>

              <Button type="submit" disabled={loading} sx={authPrimaryButtonSx}>
                Sign up
              </Button>
            </Stack>
          </Paper>
        </Box>
      </MarketingShell>
      <SiteFooter behavior="static" />
    </>
  );
}
