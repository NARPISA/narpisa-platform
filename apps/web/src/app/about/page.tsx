import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import MarketingShell from "@/components/marketing/marketing-shell";

export default function AboutPage() {
  return (
    <MarketingShell>
      <Container maxWidth="lg" sx={{ pt: { xs: 7, md: 9 }, pb: { xs: 7, md: 10 } }}>
        <Stack
          spacing={3}
          sx={{
            maxWidth: 760,
            p: { xs: 3, md: 5 },
            borderRadius: 6,
            bgcolor: "background.paper",
            boxShadow: "0 24px 56px rgba(83, 132, 180, 0.12)",
          }}
        >
          <Typography
            component="h1"
            sx={{
              color: "secondary.main",
              fontSize: { xs: "3.6rem", md: "5rem" },
              fontWeight: 800,
              letterSpacing: "-0.04em",
            }}
          >
            About NaRPISA
          </Typography>
          <Typography sx={{ fontSize: "1.7rem", lineHeight: 1.75, color: "text.secondary" }}>
            NaRPISA is building a source-led interface for Southern Africa natural resource
            intelligence. This marketing shell now matches the new homepage direction and can
            be reused as additional public routes are designed.
          </Typography>
          <Box
            sx={{
              borderRadius: 4,
              p: 2.5,
              bgcolor: "secondary.100",
              border: "1px solid rgba(83,132,180,0.16)",
            }}
          >
            <Typography sx={{ fontSize: "1.35rem", fontWeight: 700, color: "secondary.700" }}>
              Phase 1 note
            </Typography>
            <Typography sx={{ mt: 1, fontSize: "1.4rem", lineHeight: 1.7, color: "text.primary" }}>
              The homepage and shared public shell have been refreshed first, while the database
              experience remains on its dedicated workflow-specific layout.
            </Typography>
          </Box>
        </Stack>
      </Container>
    </MarketingShell>
  );
}
