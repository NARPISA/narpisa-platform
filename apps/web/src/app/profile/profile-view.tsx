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
  initialFirstName: string;
  initialLastName: string;
  email: string;
  userId: string;
  initialCompany: string;
  initialAddress: string;
  initialBiography: string;
  accountType: string;
};

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export default function ProfileView({
  initialFirstName,
  initialLastName,
  email,
  userId,
  initialCompany,
  initialAddress,
  initialBiography,
  accountType,
}: ProfileViewProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const [firstName, setFirstName] = React.useState(initialFirstName);
  const [lastName, setLastName] = React.useState(initialLastName);
  const [company, setCompany] = React.useState(initialCompany);
  const [address, setAddress] = React.useState(initialAddress);
  const [biography, setBiography] = React.useState(initialBiography);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const editableFieldSx = {
    "& .MuiInputBase-root": {
      bgcolor: "#5B6166",
      color: "common.white",
      borderRadius: 1.6,
    },
    "& .MuiInputBase-input": {
      color: "common.white",
    },
    "& .MuiInputLabel-root": {
      fontSize: "1.2rem",
      color: "rgba(255,255,255,0.62)",
      transform: "translate(14px, 14px) scale(1)",
    },
    "& .MuiInputLabel-root.MuiInputLabel-shrink": {
      transform: "translate(14px, -14px) scale(0.82)",
      color: "text.primary",
    },
  } as const;

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter both first name and last name.");
      return;
    }

    setIsSaving(true);
    const fullName = buildFullName(firstName, lastName);
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        company: company.trim(),
        address: address.trim(),
        biography: biography.trim(),
      },
    });
    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Name updated successfully.");
  }

  return (
    <Stack
      spacing={3}
      sx={{
        p: { xs: 2.5, md: 3.5 },
        borderRadius: 3,
        bgcolor: "background.paper",
        border: "1px solid rgba(83,132,180,0.2)",
      }}
    >
      <Typography
        component="h1"
        sx={{
          color: "secondary.main",
          fontSize: { xs: "3.2rem", md: "4rem" },
          fontWeight: 800,
          letterSpacing: "-0.03em",
        }}
      >
        Profile
      </Typography>

      <Box
        component="form"
        onSubmit={handleSave}
        sx={{
          borderRadius: 2.5,
          p: { xs: 2.5, md: 3 },
          bgcolor: "#F5F7FA",
        }}
      >
        <Stack spacing={2}>
          <Typography sx={{ fontSize: "1.25rem", color: "text.secondary" }}>
            Mines and other stuff in Southern Africa
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
            <TextField
              label="First name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              fullWidth
              sx={editableFieldSx}
            />
            <TextField
              label="Last name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              fullWidth
              sx={editableFieldSx}
            />
            <TextField
              label="Account type"
              value={accountType}
              fullWidth
              disabled
              sx={{
                ...editableFieldSx,
                "& .MuiInputBase-input.Mui-disabled": {
                  WebkitTextFillColor: "rgba(255,255,255,0.92)",
                  opacity: 1,
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <LockOutlinedIcon sx={{ color: "rgba(255,255,255,0.75)" }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr auto" }, gap: 2, alignItems: "center" }}>
            <TextField
              value={email}
              fullWidth
              disabled
              sx={{
                "& .MuiInputBase-root": {
                  bgcolor: "#5B6166",
                  color: "common.white",
                  borderRadius: 1.6,
                },
                "& .MuiInputBase-input": {
                  color: "common.white",
                },
                "& .MuiInputBase-input.Mui-disabled": {
                  WebkitTextFillColor: "rgba(255,255,255,0.92)",
                  opacity: 1,
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <LockOutlinedIcon sx={{ color: "rgba(255,255,255,0.75)" }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="text" sx={{ fontSize: "1.2rem", justifySelf: { xs: "start", md: "end" } }}>
              Reset Password
            </Button>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 2fr" }, gap: 2 }}>
            <TextField
              label="Company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              fullWidth
              sx={editableFieldSx}
            />
            <TextField
              label="Address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              fullWidth
              sx={editableFieldSx}
            />
          </Box>

          <TextField
            label="Biography"
            value={biography}
            onChange={(event) => setBiography(event.target.value)}
            fullWidth
            multiline
            minRows={6}
            sx={editableFieldSx}
          />

          <Typography sx={{ fontSize: "1.2rem", color: "text.secondary", wordBreak: "break-all" }}>
            <strong>User ID:</strong> {userId}
          </Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}

          <Box>
            <Button type="submit" variant="contained" disabled={isSaving} sx={{ minWidth: 150 }}>
              {isSaving ? "Saving..." : "Save profile"}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
}
