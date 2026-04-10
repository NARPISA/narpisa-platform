import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DatabaseBrandLogo from "./database-brand-logo";

export default function DatabaseFooter() {
  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        bgcolor: "#AF5428",
        color: "common.white",
        px: { xs: 2, md: 3 },
        py: 2,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <DatabaseBrandLogo size={52} />
          <Typography sx={{ fontSize: { xs: "1.25rem", md: "2.25rem" }, fontWeight: 700 }}>
            Natural Resources Polytechnic of Southern Africa
          </Typography>
        </Stack>

        <Link
          href="#"
          underline="always"
          color="inherit"
          sx={{ fontSize: { xs: "1.2rem", md: "2.1rem" }, fontWeight: 700 }}
        >
          Other links here
        </Link>
      </Stack>
    </Box>
  );
}
