"use client";

import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

import { createClient } from "@/lib/supabase/client";

type ProfileViewProps = {
  profileId: string;
  initialFirstName: string;
  initialLastName: string;
  email: string;
  initialLinkedInUrl: string;
};

export default function ProfileView({
  profileId,
  initialFirstName,
  initialLastName,
  email,
  initialLinkedInUrl,
}: ProfileViewProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const [firstName, setFirstName] = React.useState(initialFirstName);
  const [lastName, setLastName] = React.useState(initialLastName);
  const [linkedInUrl, setLinkedInUrl] = React.useState(initialLinkedInUrl);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const inputCornerRadius = 1;
  const rowLabelSx = {
    fontSize: "1.05rem",
    fontWeight: 600,
    color: "text.primary",
  } as const;
  const sectionTitleSx = {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "text.primary",
    letterSpacing: "0.01em",
  } as const;

  const editableFieldSx = {
    "& .MuiOutlinedInput-root": {
      bgcolor: "transparent",
      color: "text.primary",
      borderRadius: inputCornerRadius,
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderRadius: inputCornerRadius,
      borderColor: "rgba(83,132,180,0.28)",
    },
    "& .MuiInputBase-input": {
      color: "text.primary",
      fontSize: "0.95rem",
      py: 1.05,
    },
  } as const;
  const initialSnapshot = React.useMemo(
    () =>
      JSON.stringify({
        firstName: initialFirstName.trim(),
        lastName: initialLastName.trim(),
        linkedInUrl: initialLinkedInUrl.trim(),
      }),
    [initialFirstName, initialLastName, initialLinkedInUrl],
  );
  const currentSnapshot = React.useMemo(
    () =>
      JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        linkedInUrl: linkedInUrl.trim(),
      }),
    [firstName, lastName, linkedInUrl],
  );
  const [savedSnapshot, setSavedSnapshot] = React.useState(initialSnapshot);
  const hasUnsavedChanges = currentSnapshot !== savedSnapshot;

  React.useEffect(() => {
    setSavedSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter both first name and last name.");
      return;
    }

    setIsSaving(true);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        linkedin_url: linkedInUrl.trim() || null,
      })
      .eq("id", profileId);
    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSavedSnapshot(currentSnapshot);
    setSuccess("Profile updated successfully.");
  }

  return (
    <Stack spacing={2.5}>
      <Box
        component="form"
        onSubmit={handleSave}
        sx={{
          borderRadius: inputCornerRadius,
          px: { xs: 2, md: 2.5 },
          pb: { xs: 2, md: 2.5 },
          pt: 0,
          bgcolor: "background.paper",
          border: "1px solid rgba(83,132,180,0.18)",
        }}
      >
        <Stack divider={<Box sx={{ borderBottom: "1px solid rgba(83,132,180,0.15)" }} />}>
          <Box sx={{ py: 1.35 }}>
            <Typography sx={sectionTitleSx}>Profile information</Typography>
            <Typography sx={{ fontSize: "0.9rem", color: "text.secondary", mt: 0.25 }}>
              Manage the profile details stored in the public profiles table.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
              gap: { xs: 1, md: 2 },
              py: 1.35,
              alignItems: "center",
            }}
          >
            <Typography sx={rowLabelSx}>Name</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.25 }}>
              <TextField
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="First name"
                fullWidth
                sx={editableFieldSx}
              />
              <TextField
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Last name"
                fullWidth
                sx={editableFieldSx}
              />
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
              gap: { xs: 1, md: 2 },
              py: 1.35,
              alignItems: "center",
            }}
          >
            <Typography sx={rowLabelSx}>Email account</Typography>
            <TextField
              value={email}
              fullWidth
              disabled
              type="email"
              autoComplete="email"
              sx={{
                ...editableFieldSx,
                "& .MuiInputBase-input.Mui-disabled": {
                  WebkitTextFillColor: "rgba(24,28,38,0.9)",
                  opacity: 1,
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <LockOutlinedIcon sx={{ color: "rgba(24,28,38,0.45)" }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" },
              gap: { xs: 1, md: 2 },
              py: 1.35,
              alignItems: "center",
            }}
          >
            <Typography sx={rowLabelSx}>LinkedIn</Typography>
            <Stack spacing={1}>
              <TextField
                placeholder="https://www.linkedin.com/in/your-handle"
                value={linkedInUrl}
                onChange={(event) => setLinkedInUrl(event.target.value)}
                fullWidth
                sx={editableFieldSx}
              />
              <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
                Kept here for the upcoming LinkedIn profile integration.
              </Typography>
            </Stack>
          </Box>

          <Stack spacing={1.25} sx={{ py: 1.35 }}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {success ? <Alert severity="success">{success}</Alert> : null}
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={isSaving || !hasUnsavedChanges}
                sx={{ minWidth: 150 }}
              >
                {isSaving ? "Saving..." : "Save profile"}
              </Button>
            </Box>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}
