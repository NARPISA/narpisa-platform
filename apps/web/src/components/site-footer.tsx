import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const LOGO_URL =
  "https://www.figma.com/api/mcp/asset/1addbfa0-512a-479f-9b6a-6a8aa6f7c1ef";

export default function SiteFooter() {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "#AF5428",
        color: "common.white",
        px: { xs: 2, md: 3 },
        py: 1.5,
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={1.5}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            component="img"
            src={LOGO_URL}
            alt="NaRPISA logo"
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #f0c700",
            }}
          />
          <Typography sx={{ fontSize: { xs: "1rem", md: "2rem" }, fontWeight: 700, lineHeight: 1.2 }}>
            Natural Resources Polytechnic of Southern Africa
          </Typography>
        </Stack>

        <Link
          href="#"
          underline="always"
          color="inherit"
          sx={{ fontSize: { xs: "1rem", md: "1.8rem" }, fontWeight: 700 }}
        >
          Other links here
        </Link>
      </Stack>
    </Box>
  );
}
