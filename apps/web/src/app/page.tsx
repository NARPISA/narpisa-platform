import { appConfig, teamPrinciples } from "@narpisa/config";
import { createSourceDocumentInputSchema } from "@narpisa/types";
import { SectionCard } from "@narpisa/ui";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const deploymentCards = [
  {
    eyebrow: "Frontend",
    title: "Vercel-hosted Next.js workspace",
    description:
      "The web app owns researcher workflows, source registration, and future dashboards for document intelligence and trading data.",
  },
  {
    eyebrow: "Parsing",
    title: "Render-backed FastAPI worker",
    description:
      "The worker fetches source PDFs on demand, extracts structured content, and discards binary files after parsing to keep storage costs low.",
  },
  {
    eyebrow: "Data",
    title: "Supabase for auth and structured records",
    description:
      "Supabase stores source metadata, processing job status, and extracted records while keeping source attribution visible in the product.",
  },
] as const;

const sampleSource = createSourceDocumentInputSchema.safeParse({
  title: "Haib Copper PEA",
  sourceUrl: "https://documents.example.org/haib-copper-pea.pdf",
  attribution: "Deep-South Resources public study",
  notes: "Pilot fixture for parser and source-governance workflows.",
});

export default function Home() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        py: { xs: 6, md: 9 },
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(0,1.6fr) minmax(300px,0.9fr)",
              },
            }}
          >
            <Paper
              sx={{
                borderRadius: 8,
                bgcolor: "secondary.main",
                color: "common.white",
                px: { xs: 3, md: 5 },
                py: { xs: 4, md: 5 },
              }}
            >
              <Stack spacing={3}>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  <Chip
                    label={appConfig.name}
                    color="primary"
                    sx={{ color: "secondary.main", fontWeight: 700 }}
                  />
                  <Chip
                    label="Material UI frontend"
                    variant="outlined"
                    sx={{ borderColor: "rgba(255,255,255,0.2)", color: "white" }}
                  />
                </Stack>

                <Box>
                  <Typography
                    component="h1"
                    variant="h2"
                    sx={{ maxWidth: 720, fontSize: { xs: "2.6rem", md: "4rem" } }}
                  >
                    Source-led document intelligence for mineral value addition.
                  </Typography>
                  <Typography
                    variant="h6"
                    color="rgba(255,255,255,0.78)"
                    sx={{ mt: 2, maxWidth: 720, fontWeight: 400, lineHeight: 1.65 }}
                  >
                    Register source links, parse PDFs on demand, and retain only
                    the structured records needed for research, policymaking, and
                    trading workflows across Namibia and future African market
                    expansion.
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button
                    component="a"
                    href="https://vercel.com"
                    target="_blank"
                    rel="noreferrer"
                    variant="contained"
                    color="primary"
                    endIcon={<ArrowOutwardRoundedIcon />}
                  >
                    Connect web to Vercel
                  </Button>
                  <Button
                    component="a"
                    href="https://render.com"
                    target="_blank"
                    rel="noreferrer"
                    variant="outlined"
                    color="inherit"
                    endIcon={<ArrowOutwardRoundedIcon />}
                    sx={{
                      borderColor: "rgba(255,255,255,0.25)",
                      color: "white",
                    }}
                  >
                    Deploy worker on Render
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            <SectionCard
              eyebrow="Validated input"
              title="Source registration contract"
              description="The frontend already validates the core source payload shape shared across the monorepo."
              footer={
                sampleSource.success
                  ? "Schema validation passes for the reference source."
                  : "Schema validation failed for the reference source."
              }
            >
              <Box
                component="dl"
                sx={{
                  display: "grid",
                  gap: 2,
                  m: 0,
                }}
              >
                <Box component="div">
                  <Typography component="dt" fontWeight={700} color="text.primary">
                    Reference title
                  </Typography>
                  <Typography component="dd" sx={{ m: 0 }} color="text.secondary">
                    Haib Copper PEA
                  </Typography>
                </Box>
                <Box component="div">
                  <Typography component="dt" fontWeight={700} color="text.primary">
                    Storage model
                  </Typography>
                  <Typography component="dd" sx={{ m: 0 }} color="text.secondary">
                    Source URL plus attribution, no persistent PDF binaries.
                  </Typography>
                </Box>
                <Box component="div">
                  <Typography component="dt" fontWeight={700} color="text.primary">
                    Team default
                  </Typography>
                  <Typography component="dd" sx={{ m: 0 }} color="text.secondary">
                    Typed contracts, explicit reviews, and CI-first changes.
                  </Typography>
                </Box>
              </Box>
            </SectionCard>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
            }}
          >
            {deploymentCards.map((card) => (
              <SectionCard key={card.title} {...card} />
            ))}
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(0,1.2fr) minmax(0,1fr)",
              },
            }}
          >
            <SectionCard
              eyebrow="Operating principles"
              title="How the team should build"
              description={appConfig.tagline}
            >
              <Stack spacing={1.5}>
                {teamPrinciples.map((principle) => (
                  <Paper
                    key={principle}
                    variant="outlined"
                    sx={{
                      borderRadius: 4,
                      px: 2,
                      py: 1.5,
                      bgcolor: "background.default",
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <CheckCircleRoundedIcon color="primary" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        {principle}
                      </Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </SectionCard>

            <SectionCard
              eyebrow="Next milestones"
              title="Immediate product slices"
              description="The starter repo is structured for a feature-first roadmap that a four-person team can divide cleanly."
            >
              <Box component="ol" sx={{ m: 0, pl: 2.75, color: "text.secondary" }}>
                <Typography component="li" variant="body2" sx={{ mb: 1.25 }}>
                  Build authenticated source registration and review queues.
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1.25 }}>
                  Persist parsing results into Supabase with job history.
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1.25 }}>
                  Add a query and analytics surface for extracted records.
                </Typography>
                <Typography component="li" variant="body2">
                  Introduce trading and investment hub modules behind feature
                  flags.
                </Typography>
              </Box>
            </SectionCard>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
