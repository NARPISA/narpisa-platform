"use client";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const INVESTOR_FEATURES = [
  {
    id: "comprehensive-data",
    label: "Comprehensive Data",
    icon: <StorageRoundedIcon sx={{ fontSize: { xs: 72, md: 88 }, color: "rgba(15,18,28,0.85)" }} />,
  },
  {
    id: "reliable-verified",
    label: "Reliable & Verified",
    icon: <VerifiedUserRoundedIcon sx={{ fontSize: { xs: 72, md: 88 }, color: "rgba(15,18,28,0.85)" }} />,
  },
  {
    id: "regional-expertise",
    label: "Regional Expertise",
    icon: <PublicRoundedIcon sx={{ fontSize: { xs: 72, md: 88 }, color: "rgba(15,18,28,0.85)" }} />,
  },
  {
    id: "real-time-updates",
    label: "Real Time Updates",
    icon: <AccessTimeRoundedIcon sx={{ fontSize: { xs: 72, md: 88 }, color: "rgba(15,18,28,0.85)" }} />,
  },
];

export default function HomeInvestorsPage() {
  return (
    <Box
      sx={{
        height: "100svh",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 0,
        overflow: "hidden",
        bgcolor: "home.investorsSectionBg",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "1240px",
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 4 },
        }}
      >
        <Stack spacing={1} alignItems="center">
          <Typography sx={{ color: "primary.main", fontWeight: 700, fontSize: "1.3rem" }}>
            Built For Investors
          </Typography>
          <Typography
            sx={{
              color: "home.investorsHeading",
              fontWeight: 800,
              fontSize: { xs: "2.3rem", md: "3rem" },
              textAlign: "center",
            }}
          >
            Why choose NaRPISA?
          </Typography>
          <Typography
            sx={{
              mt: 1,
              maxWidth: 780,
              textAlign: "center",
              color: "home.investorsBody",
              fontSize: { xs: "1.2rem", md: "1.6rem" },
              lineHeight: 1.35,
            }}
          >
            We combine cutting-edge technology with deep regional expertise to give you the most
            comprehensive view of Southern Africa&apos;s mining landscape.
          </Typography>
        </Stack>

        <Box
          sx={{
            mt: { xs: 3, md: 4 },
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, minmax(0, 1fr))" },
            gap: { xs: 1.5, md: 2.5 },
          }}
        >
          {INVESTOR_FEATURES.map((feature) => (
            <Box key={feature.id}>
              <Box
                sx={{
                  borderRadius: 1.5,
                  height: { xs: 160, md: 220 },
                  bgcolor: "home.investorsTileBg",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid",
                  borderColor: "home.investorsTileBorder",
                }}
              >
                {feature.icon}
              </Box>
              <Typography
                sx={{
                  mt: 1.2,
                  textAlign: "center",
                  color: "home.investorsHeading",
                  fontWeight: 800,
                  fontSize: { xs: "1.05rem", md: "1.8rem" },
                }}
              >
                {feature.label}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            mt: { xs: 3, md: 4 },
            borderRadius: 1.5,
            px: { xs: 2, md: 3.25 },
            py: { xs: 1.5, md: 1.75 },
            minHeight: { xs: 108, md: 124 },
            bgcolor: "home.investorsBannerBg",
            border: "1px solid",
            borderColor: "home.investorsBannerBorder",
            backgroundImage:
              "linear-gradient(90deg, rgba(23,29,43,0.76) 0%, rgba(23,29,43,0.5) 55%, rgba(23,29,43,0.35) 100%), url('/landingimage.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
          >
            <Typography
              sx={{
                color: "common.white",
                fontWeight: 800,
                fontSize: { xs: "1.5rem", md: "2.2rem" },
                lineHeight: 1.5,
                my: { md: "auto" },
                transform: "translateY(15px)",
              }}
            >
              Ready to unlock
              <br />
              new opportunities?
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
              <Button
                href="/data_input"
                variant="contained"
                sx={{
                  borderRadius: "999px",
                  minHeight: 56,
                  px: 4,
                  fontSize: "1.9rem",
                  fontWeight: 800,
                  transform: "translateY(15px)",
                }}
              >
                Get started
              </Button>
              <Button
                href="/database"
                sx={{
                  borderRadius: "999px",
                  minHeight: 56,
                  px: 4,
                  fontSize: "1.9rem",
                  color: "common.white",
                  bgcolor: "home.glassButtonBg",
                  border: "1px solid",
                  borderColor: "home.glassButtonBorder",
                  backdropFilter: "blur(10px)",
                  transform: "translateY(15px)"
                }}
              >
                View Databases
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

