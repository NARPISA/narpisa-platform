"use client";

import { useState } from "react";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { motion } from "motion/react";

import HomePreviewCard, { type HomeFeaturePreview } from "@/components/home/home-preview-card";
import MarketingShell from "@/components/marketing/marketing-shell";

const HERO_BACKGROUND = "/landingimage.png";

const PREVIEW_DATABASE = "/preview-database.png";
const PREVIEW_MAP = "/preview-map.png";

const MotionBox = motion.create(Box);

const FEATURE_PREVIEWS: HomeFeaturePreview[] = [
  {
    id: "database",
    label: "Database",
    title: "Structured resource intelligence",
    description:
      "Browse a curated minerals database with location, type, and workflow-ready metadata for analysts and investors.",
    imageSrc: PREVIEW_DATABASE,
    href: "/database",
  },
  {
    id: "map",
    label: "Map",
    title: "Spatial context in one click",
    description:
      "Move from tables into regional context quickly with map-led exploration for place-based mineral discovery.",
    imageSrc: PREVIEW_MAP,
    href: "/map",
  },
  {
    id: "network",
    label: "Networking",
    title: "Network with the right partners",
    description:
      "A future networking layer for investor, operator, and partner discovery across the Southern Africa ecosystem.",
    imageSrc: PREVIEW_DATABASE,
    href: "/network",
  },
];

export default function HomepageClient() {
  const [activeSlideId, setActiveSlideId] = useState(FEATURE_PREVIEWS[0].id);

  return (
    <MarketingShell
      headerTransparent
      sx={{
        color: "common.white",
        minHeight: "100svh",
        height: "100svh",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100svh",
          backgroundImage: `url("${HERO_BACKGROUND}")`,
          backgroundSize: "cover",
          backgroundPosition: { xs: "62% center", md: "center center" },
          transform: "scale(1.14)",
          transformOrigin: "center",
          zIndex: 0,
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(28, 48, 146, 0.12) 0%, rgba(28, 48, 146, 0.08) 42%, rgba(28, 48, 146, 0.04) 100%)",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: "rgba(83,132,180,0.14)",
          },
        }}
      />

      <Container
        maxWidth={false}
        sx={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1240px",
          height: "100svh",
          display: "flex",
          alignItems: "center",
          pt: { xs: 10, md: 11 },
          pb: { xs: 4, md: 4 },
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={{ xs: 5, md: 7 }}
          alignItems={{ xs: "stretch", lg: "center" }}
          justifyContent="space-between"
        >
          <MotionBox
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            sx={{ maxWidth: 670 }}
          >
            <MotionBox
              variants={{
                hidden: { opacity: 0, y: 22 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Chip
                label="Southern Africa resource intelligence"
                sx={{
                  mb: 2.25,
                  bgcolor: "rgba(255,255,255,0.14)",
                  color: "common.white",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  backdropFilter: "blur(12px)",
                }}
              />
            </MotionBox>

            <MotionBox
              variants={{
                hidden: { opacity: 0, y: 22 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Typography
                component="h1"
                sx={{
                  maxWidth: 650,
                  color: "tertiary.main",
                  fontSize: { xs: "4.6rem", md: "7rem" },
                  fontWeight: 800,
                  lineHeight: { xs: 1.02, md: 0.98 },
                  letterSpacing: "-0.05em",
                  textWrap: "balance",
                }}
              >
                Unlock Southern Africa&apos;s natural resources all in one place.
              </Typography>
            </MotionBox>

            <MotionBox
              variants={{
                hidden: { opacity: 0, y: 22 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Typography
                sx={{
                  mt: 2.5,
                  maxWidth: 620,
                  fontSize: { xs: "1.9rem", md: "2.2rem" },
                  lineHeight: 1.5,
                  color: "rgba(255,255,255,0.95)",
                  textWrap: "pretty",
                }}
              >
                Logistics insights for FDI investors in Southern Africa, with source-led
                workflows for discovery, screening, and deeper database exploration.
              </Typography>
            </MotionBox>

            <MotionBox
              variants={{
                hidden: { opacity: 0, y: 22 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ mt: 4 }}
              >
                <Button
                  href="/data_input"
                  variant="contained"
                  endIcon={<ArrowOutwardRoundedIcon />}
                  sx={{
                    minHeight: 76,
                    borderRadius: "999px",
                    px: 4,
                    fontSize: "2rem",
                    fontWeight: 800,
                    boxShadow: "0 14px 36px rgba(240,114,19,0.28)",
                    "&:hover": {
                      backgroundColor: "#f48a31",
                      boxShadow: "0 18px 40px rgba(240,114,19,0.32)",
                    },
                  }}
                >
                  Get started
                </Button>
                <Button
                  href="/database"
                  variant="text"
                  sx={{
                    minHeight: 76,
                    borderRadius: "999px",
                    px: 4,
                    fontSize: "2rem",
                    fontWeight: 600,
                    color: "common.white",
                    bgcolor: "rgba(99, 57, 24, 0.56)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  View databases
                </Button>
              </Stack>
            </MotionBox>
          </MotionBox>

          <MotionBox
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
            sx={{ flex: 1, minWidth: 0 }}
          >
            <HomePreviewCard
              activeSlideId={activeSlideId}
              slides={FEATURE_PREVIEWS}
              onSelect={setActiveSlideId}
            />
          </MotionBox>
        </Stack>
      </Container>
    </MarketingShell>
  );
}
