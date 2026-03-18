import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";


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
                bgcolor: "secondary.main",
                color: "common.white",
                px: { xs: 3, md: 5 },
                py: { xs: 4, md: 5 },
              }}
            >

                <Box>
                  <Typography
                    component="h1"
                    variant="h2"
                    sx={{ maxWidth: 720, fontSize: { xs: "2.6rem", md: "4rem" } }}
                  >
                    Peter is Pregnant and wants to have a baby
                  </Typography>
                  <Typography
                    variant="h6"
                    color="rgba(255,255,255,0.78)"
                    sx={{ mt: 2, maxWidth: 720, fontWeight: 400, lineHeight: 1.65 }}
                  >
                    It was sagan&apos;s fault
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
                    Video Here
                  </Button>
                </Stack>
            </Paper>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 3,
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                p: 3,
              }}
            >
              <Stack spacing={2}>
                <Typography variant="h5">Quick testing ground</Typography>
                <Typography color="text.secondary">
                  Use the temporary data input page to try PDF source links and
                  test input flows before wiring the full ingestion pipeline.
                </Typography>
                <Box>
                  <Link href="/data_input">
                    <Button variant="contained">Open PDF link tester</Button>
                  </Link>
                </Box>
              </Stack>
            </Paper>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
