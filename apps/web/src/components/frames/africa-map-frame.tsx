import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import AfricaMap from "../africa-map";

export default function AfricaMapFrame() {
  return (
    <Box
      component="section"
      aria-label="Africa coverage map"
      sx={{
        bgcolor: "background.default",
        py: { xs: 6, md: 10 },
      }}
    >
      <Container maxWidth="lg">
        <Grid
          container
          spacing={{ xs: 3, md: 4 }}
          alignItems="center"
          sx={{ width: "100%" }}
        >
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2}>
              <Typography variant="h2" component="h2">
                Africa
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Africa is a continent of 54 countries, 1000 languages, and 2000
                cultures.
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <AfricaMap
            markers={[
                { lat: -22.5609, lng: 17.0658, label: "Windhoek" },
                { lat: -26.2041, lng: 28.0473, label: "Johannesburg" },
                { lat: 6.5244, lng: 3.3792, label: "Lagos" },
              ]}/>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
