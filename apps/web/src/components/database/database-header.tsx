import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function DatabaseHeader() {
  return (
    <Box
      sx={{
        height: 130,
        bgcolor: "common.white",
        px: { xs: 2, md: 4.5 },
        py: 2.5,
        borderBottom: "1px solid",
        borderColor: "background.300",
      }}
    >
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={1.5}
        alignItems={{ xs: "flex-start", lg: "flex-end" }}
        justifyContent="space-between"
      >
        <Box>
          <Typography
            sx={{
              color: "primary.main",
              fontSize: { xs: "2rem", md: "2.6rem" },
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            Natural Resource Database
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.95rem", mt: 0.5 }}>
            A collection of data from the Natural Resources Polytechnic of Southern Africa
          </Typography>
        </Box>

        <Box />
      </Stack>
    </Box>
  );
}
