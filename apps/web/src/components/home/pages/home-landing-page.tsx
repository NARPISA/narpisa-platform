"use client";

import * as React from "react";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { motion } from "motion/react";

import HomePreviewCard, { type HomeFeaturePreview } from "@/components/home/home-preview-card";

const MotionBox = motion.create(Box);

type HomeLandingPageProps = {
  featurePreviews: HomeFeaturePreview[];
  activeSlideId: string;
  onSelectSlide: (id: string) => void;
};

export default function HomeLandingPage({
  featurePreviews,
  activeSlideId,
  onSelectSlide,
}: HomeLandingPageProps) {
  return (
    <Box
      sx={{
        height: "100svh",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
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
              visible: { transition: { staggerChildren: 0.1 } },
            }}
            sx={{ maxWidth: 670 }}
          >
            <MotionBox variants={{ hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } }}>
              <Chip
                label="Southern Africa resource intelligence"
                sx={{
                  mb: 2.25,
                  bgcolor: "home.featuresSectionBorder",
                  color: "common.white",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  backdropFilter: "blur(12px)",
                }}
              />
            </MotionBox>

            <MotionBox variants={{ hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } }}>
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
                  userSelect: "none",
                }}
              >
                Natural resource intelligence for smarter investment​
              </Typography>
            </MotionBox>

            <MotionBox variants={{ hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } }}>
              <Typography
                sx={{
                  mt: 2.5,
                  maxWidth: 620,
                  fontSize: { xs: "1.9rem", md: "2.2rem" },
                  lineHeight: 1.5,
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                Logistics insights for FDI investors in Southern Africa, with source-led workflows
                for discovery, screening, and deeper database exploration.
              </Typography>
            </MotionBox>

            <MotionBox variants={{ hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } }}>
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
                    minHeight: 56,
                    borderRadius: "999px",
                    px: 3,
                    fontSize: "1.45rem",
                    fontWeight: 800,
                  }}
                >
                  Get started
                </Button>
                <Button
                  href="/database"
                  variant="text"
                  sx={{
                    minHeight: 56,
                    borderRadius: "999px",
                    px: 3,
                    fontSize: "1.45rem",
                    fontWeight: 600,
                    color: "common.white",
                    bgcolor: "home.glassButtonBg",
                    border: "1px solid",
                    borderColor: "home.glassButtonBorder",
                    backdropFilter: "blur(10px)",
                    "&:hover": {
                      backgroundColor: "primary.400",
                      boxShadow: "0 18px 40px rgba(240,114,19,0.32)",
                    },
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
              slides={featurePreviews}
              onSelect={onSelectSlide}
            />
          </MotionBox>
        </Stack>
      </Container>
    </Box>
  );
}

