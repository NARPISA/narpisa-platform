"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { usePathname } from "next/navigation";

export default function ProfileUnsavedFloating() {
  const pathname = usePathname() ?? "";
  const isProfilePage = pathname === "/profile" || pathname === "/profile/";
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

  React.useEffect(() => {
    const onUnsavedChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ hasUnsavedChanges?: boolean }>).detail;
      setHasUnsavedChanges(Boolean(detail?.hasUnsavedChanges));
    };
    const onSaveStateChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ isSaving?: boolean }>).detail;
      setIsSavingProfile(Boolean(detail?.isSaving));
    };

    window.addEventListener("profile:unsaved-changed", onUnsavedChanged);
    window.addEventListener("profile:save-state-changed", onSaveStateChanged);
    window.dispatchEvent(new Event("profile:request-state"));
    return () => {
      window.removeEventListener("profile:unsaved-changed", onUnsavedChanged);
      window.removeEventListener("profile:save-state-changed", onSaveStateChanged);
    };
  }, []);

  if (!isProfilePage || !hasUnsavedChanges) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "sticky",
        bottom: 12,
        mt: 2,
        width: "100%",
        zIndex: 3,
      }}
    >
      <Box
        sx={{
          p: 1.1,
          width: "100%",
          borderRadius: 1,
          border: "1px solid rgba(83,132,180,0.25)",
          bgcolor: "rgba(245,247,250,0.92)",
          boxShadow: "0 10px 24px rgba(22,33,58,0.12)",
          backdropFilter: "blur(2px)",
        }}
      >
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "text.primary" }}>
          You have unsaved changes
        </Typography>
        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.35, mb: 0.9 }}>
          Save before leaving this section.
        </Typography>
        <Button
          variant="contained"
          size="small"
          fullWidth
          disabled={isSavingProfile}
          onClick={() => window.dispatchEvent(new Event("profile:request-save"))}
        >
          {isSavingProfile ? "Saving..." : "Save changes"}
        </Button>
      </Box>
    </Box>
  );
}
