"use client";

import * as React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordView() {
  const supabase = React.useMemo(() => createClient(), []);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const inputCornerRadius = 1;
  const sectionTitleSx = {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "text.primary",
    letterSpacing: "0.01em",
  } as const;
  const fieldSx = {
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setIsSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setSuccess("Password updated successfully.");
  }

  return (
    <Stack spacing={2.5}>
      <Box
        component="form"
        onSubmit={handleSubmit}
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
            <Typography sx={sectionTitleSx}>Change password</Typography>
            <Typography sx={{ fontSize: "0.9rem", color: "text.secondary", mt: 0.25 }}>
              Update the password for your signed-in account.
            </Typography>
          </Box>

          <Stack spacing={1.5} sx={{ py: 1.35, maxWidth: 520 }}>
            <TextField
              placeholder="New password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              fullWidth
              required
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      edge="end"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={fieldSx}
            />
            <TextField
              placeholder="Confirm new password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              fullWidth
              required
              autoComplete="new-password"
              error={Boolean(confirmPassword) && password !== confirmPassword}
              helperText={confirmPassword && password !== confirmPassword ? "Passwords do not match." : " "}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      edge="end"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                    >
                      {showConfirmPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={fieldSx}
            />
          </Stack>

          <Stack spacing={1.25} sx={{ py: 1.35 }}>
            {error ? (
              <Alert severity="error" sx={{ "& .MuiAlert-message": { fontSize: "0.9rem" } }}>
                {error}
              </Alert>
            ) : null}
            {success ? (
              <Alert severity="success" sx={{ "& .MuiAlert-message": { fontSize: "0.9rem" } }}>
                {success}
              </Alert>
            ) : null}
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={isSaving || !password || !confirmPassword}
                sx={{ minWidth: 170 }}
              >
                {isSaving ? "Updating..." : "Update password"}
              </Button>
            </Box>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}
