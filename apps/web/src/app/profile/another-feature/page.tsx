import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export const metadata: Metadata = {
  title: "Another feature",
  description: "Placeholder section",
};

export default function ProfileAnotherFeaturePage() {
  return (
    <Box
      sx={{
        minHeight: 240,
        borderRadius: 1,
        border: "1px dashed rgba(83,132,180,0.35)",
        bgcolor: "rgba(245,247,250,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
      }}
    >
      <Typography color="text.secondary" sx={{ fontSize: "1.2rem", textAlign: "center" }}>
        Content for this section will go here.
      </Typography>
    </Box>
  );
}
