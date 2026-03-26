import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import GlassNav from "@/components/glass-nav";

export default function DatabasePage() {
  return (
    <Box
      component="main"
      sx={{ minHeight: "100vh", bgcolor: "background.default", overflowX: "hidden" }}
    >
      <GlassNav/>
      <Box sx={{ px: 3, pt: { xs: 14, sm: 16 }, pb: 6, maxWidth: "48rem", mx: "auto" }}>
        <Typography
          component="h1"
          variant="h4"
          sx={{
            color: "secondary.main",
            mb: 2,
          }}
        >
          Database
        </Typography>
        <Typography color="text.secondary" variant="body1" sx={{ fontSize: "1.25rem" }}>
          Browse and explore ingested documents here (coming soon).
        </Typography>
      </Box>
    </Box>
  );
}
