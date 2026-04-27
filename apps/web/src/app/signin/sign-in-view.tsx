"use client";

import GoogleIcon from "@mui/icons-material/Google";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import type { Provider } from "@supabase/supabase-js";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import MuiLink from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import {
  authBodyTextSx,
  authFieldSx,
  authHeroButtonSx,
  authLabelSx,
  authLinkSx,
  authPageSx,
  authPaperSx,
  authPillButtonSx,
  authSecondaryButtonSx,
  authShellSx,
  authSmallLinkSx,
  authTitleSx,
} from "@/app/auth-page-styles";
import MarketingShell from "@/components/marketing/marketing-shell";
import SiteFooter from "@/components/site-footer";
import { getSafeInternalRedirect } from "@/lib/auth/safe-redirect";
import {
  getOAuthProviderMap,
  toolpadOAuthIdToSupabase,
} from "@/lib/auth/toolpad-oauth";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export default function SignInView() {
  const searchParams = useSearchParams();
  const callbackUrl = getSafeInternalRedirect(searchParams.get("callbackUrl"));
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  const supabase = React.useMemo(() => createClient(), []);
  const providerMap = React.useMemo(
    () => getOAuthProviderMap("google,linkedin"),
    [],
  );

  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSsoExpanded, setIsSsoExpanded] = React.useState(false);
  const [isEmailLoading, setIsEmailLoading] = React.useState(false);
  const [oauthLoadingId, setOauthLoadingId] = React.useState<string | null>(
    null,
  );
  const [password, setPassword] = React.useState("");

  async function handleCredentialSignIn(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError(null);
    setIsEmailLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsEmailLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    window.location.assign(callbackUrl);
  }

  async function handleOauthSignIn(providerId: string) {
    const oauthName = toolpadOAuthIdToSupabase(providerId);

    if (!oauthName) {
      setError(
        "This provider is not enabled for Supabase OAuth. Configure a supported provider or remove it from NEXT_PUBLIC_AUTH_OAUTH_PROVIDERS.",
      );
      return;
    }

    setError(null);
    setOauthLoadingId(providerId);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: oauthName as Provider,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(callbackUrl)}`,
      },
    });

    if (oauthError) {
      setOauthLoadingId(null);
      setError(oauthError.message);
    }
  }

  return (
    <>
      <MarketingShell headerTransparent sx={authShellSx}>
        <Box sx={authPageSx}>
          <Paper elevation={0} sx={authPaperSx}>
            <Stack spacing={2} sx={{ width: "100%", alignItems: "center" }}>
              <Typography component="h1" sx={authTitleSx}>
                Welcome back
              </Typography>

              <Typography sx={authBodyTextSx}>
                New user?{" "}
                <MuiLink
                  component={NextLink}
                  href="/signup"
                  underline="hover"
                  sx={authLinkSx}
                >
                  Register here.
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

              {providerMap.length > 0 ? (
                <Stack
                  spacing={1.5}
                  sx={{ width: "100%", alignItems: "center", pt: 1 }}
                >
                  <Button
                    variant="contained"
                    disabled={Boolean(oauthLoadingId) || isEmailLoading}
                    onClick={() => setIsSsoExpanded((value) => !value)}
                    sx={authHeroButtonSx}
                  >
                    {isSsoExpanded ? "sign in with email" : "SSO"}
                  </Button>
                  <Collapse
                    in={isSsoExpanded}
                    unmountOnExit
                    sx={{ width: "100%" }}
                  >
                    <Stack
                      spacing={1.5}
                      sx={{ width: "100%", alignItems: "center", pt: 0.5 }}
                    >
                      {providerMap.map((provider) => (
                        <Box
                          key={provider.id}
                          component="form"
                          onSubmit={(
                            event: React.FormEvent<HTMLFormElement>,
                          ) => {
                            event.preventDefault();
                            void handleOauthSignIn(provider.id);
                          }}
                          sx={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "center",
                          }}
                        >
                          <Button
                            variant="contained"
                            disabled={Boolean(oauthLoadingId) || isEmailLoading}
                            loading={oauthLoadingId === provider.id}
                            type="submit"
                            startIcon={
                              provider.id === "google" ? (
                                <GoogleIcon sx={{ typography: "authInput" }} />
                              ) : (
                                <LinkedInIcon
                                  sx={{ typography: "authInput" }}
                                />
                              )
                            }
                            sx={authSecondaryButtonSx}
                          >
                            {`Continue with ${provider.name}`}
                          </Button>
                        </Box>
                      ))}
                    </Stack>
                  </Collapse>
                </Stack>
              ) : null}

              <Divider
                sx={{
                  width: "100%",
                  maxWidth: "52.3rem",
                  pt: providerMap.length > 0 ? 2 : 1,
                }}
              />

              <Collapse
                in={!isSsoExpanded}
                unmountOnExit
                sx={{ width: "100%" }}
              >
                <Stack
                  component="form"
                  noValidate
                  onSubmit={handleCredentialSignIn}
                  spacing={2}
                  sx={{ width: "100%", alignItems: "center", pt: 2 }}
                >
                  <Stack
                    spacing={1.25}
                    sx={{ width: "100%", maxWidth: "40rem" }}
                  >
                    <Typography sx={authLabelSx}>Email Address</Typography>
                    <TextField
                      placeholder="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                      fullWidth
                      sx={authFieldSx}
                    />
                  </Stack>

                  <Stack
                    spacing={1.25}
                    sx={{ width: "100%", maxWidth: "40rem" }}
                  >
                    <Typography sx={authLabelSx}>Password</Typography>
                    <TextField
                      placeholder="password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                      fullWidth
                      sx={authFieldSx}
                    />
                  </Stack>

                  <Box sx={{ width: "100%", maxWidth: "40rem" }}>
                    <MuiLink
                      component={NextLink}
                      href="/forgot-password"
                      underline="hover"
                      sx={authSmallLinkSx}
                    >
                      Forgot Password
                    </MuiLink>
                  </Box>

                  <Button
                    type="submit"
                    disabled={isEmailLoading || Boolean(oauthLoadingId)}
                    sx={authPillButtonSx}
                  >
                    Log In
                  </Button>
                </Stack>
              </Collapse>
            </Stack>
          </Paper>
        </Box>
      </MarketingShell>
      <SiteFooter behavior="static" />
    </>
  );
}
