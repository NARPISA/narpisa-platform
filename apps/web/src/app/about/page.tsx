import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import GlassNav from "@/components/glass-nav";
import theme from "@/theme";

export default function AboutPage() {
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
            fontFamily: theme.typography.h2.fontFamily,
            color: "secondary.main",
            mb: 2,
          }}
        >
          About
        </Typography>
        <Typography color="text.secondary" variant="body1" sx={{ fontSize: "1.25rem" }}>
          MineralDB product information will live here.
        </Typography>
      </Box>
    </Box>
  );
}
