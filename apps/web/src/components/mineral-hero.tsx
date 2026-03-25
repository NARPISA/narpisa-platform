"use client";

import { useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "motion/react";

import FloatingRock from "./floating-rock";
import GlassLabel from "./glass-label";

/** Extra scroll distance through the hero (parallax + handoff to next section). */
const HERO_SCROLL_VH = 1.5;

const ROCKS = {
  rutile: {
    src: "/minerals/rutile.png",
    alt: "Rutile mineral specimen",
    name: "Rutile",
    location: "Gamsberg area, Windhoek Rural, Khomas Region, Namibia",
  },
  cuprotungstite: {
    src: "/minerals/cuprotunstite.png",
    alt: "Cuprotungstite mineral specimen",
    name: "Cuprotungstite",
    location: "Gamsberg area, Windhoek Rural, Khomas Region, Namibia",
  },
  titanite: {
    src: "/minerals/titanite.png",
    alt: "Titanite mineral specimen",
    name: "Titanite",
    location: "",
  },
};

const locationLabelSx = {
  maxWidth: { xs: 240, md: 380 },
  whiteSpace: "normal" as const,
  py: "0.6em",
};

const rutileLocationLabelSx = {
  ...locationLabelSx,
  textAlign: "right" as const,
};

const cuproLocationLabelSx = {
  ...locationLabelSx,
  textAlign: "left" as const,
};

export default function MineralHero() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const springConfig = { stiffness: 60, damping: 25 };

  const titleY = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 120]),
    springConfig,
  );
  const titleOpacity = useSpring(
    useTransform(scrollYProgress, [0, 0.5], [1, 0]),
    springConfig,
  );

  return (
    <Box
      ref={sectionRef}
      sx={{
        position: "relative",
        width: "100%",
        minHeight: `${HERO_SCROLL_VH * 100}vh`,
        overflow: "visible",
        bgcolor: "background.default",
      }}
    >
      {/*
        Percent top/bottom on rocks resolve against their containing block.
        The section is tall for scroll; this layer is exactly one viewport so
        rock layout matches the initial 100vh frame.
      */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100dvh",
          minHeight: "100vh",
          zIndex: 1,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        {/* ── Rutile: upper-left ──────────────────────────────── */}
        <FloatingRock
          src={ROCKS.rutile.src}
          alt={ROCKS.rutile.alt}
          width={{ xs: "70vw", md: "38vw" }}
          top="8%"
          left="18%"
          parallaxSpeed={0.15}
          floatX={6}
          floatY={5}
          floatDuration={7}
          zIndex={2}
        />

        {/* ── Cuprotungstite: lower-right ─────────────────────── */}
        <FloatingRock
          src={ROCKS.cuprotungstite.src}
          alt={ROCKS.cuprotungstite.alt}
          width={{ xs: "60vw", md: "40vw" }}
          bottom="-10%"
          right="20%"
          rotate={0}
          parallaxSpeed={0.5}
          floatX={10}
          floatY={7}
          floatDuration={8}
          zIndex={2}
        />

        {/* ── Titanite: upper-right (partially cropped) ──────── */}
        <FloatingRock
          src={ROCKS.titanite.src}
          alt={ROCKS.titanite.alt}
          width={{ xs: "35vw", md: "30vw" }}
          top="5%"
          right="-3%"
          parallaxSpeed={0.25}
          floatX={5}
          floatY={4}
          floatDuration={9}
          zIndex={1}
        />

        {/* ── Cuprotungstite: lower-left (peeking from edge) ─── */}
        <FloatingRock
          src={ROCKS.cuprotungstite.src}
          alt="Cuprotungstite mineral specimen (background)"
          width={{ xs: "40vw", md: "32vw" }}
          bottom="-5%"
          left="-10%"
          rotate={57}
          parallaxSpeed={0.4}
          floatX={7}
          floatY={5}
          floatDuration={10}
          zIndex={0}
          shadow={false}
        />
      </Box>

      {/* Sticky viewport: UI stays composed while scrolling the tall section */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          height: "100dvh",
          minHeight: "100vh",
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack
          direction="column"
          sx={{
            flex: 1,
            minHeight: 0,
            height: "100%",
            position: "relative",
            pt: { xs: 10},
            pb: { xs: 4, md: 6 },
          }}
        >
          <motion.div style={{ y: titleY, opacity: titleOpacity }}>
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "flex-start",
                flexShrink: 0,
                pt: { xs: 1, md: "2%" },
                pl: { xs: 2, sm: 4, md: "7%" },
                pr: { xs: 2, md: 3 },
              }}
            >
              <Stack spacing={1} alignItems="flex-end">
                <GlassLabel
                  sx={{
                    fontSize: { xs: "2rem", md: "4rem" },
                    textAlign: "right",
                  }}
                >
                  {ROCKS.rutile.name}
                </GlassLabel>
                <GlassLabel sx={rutileLocationLabelSx}>
                  {ROCKS.rutile.location}
                </GlassLabel>
              </Stack>
            </Box>
          </motion.div>

          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 0,
              pointerEvents: "none",
            }}
          >
            <motion.div style={{ y: titleY, opacity: titleOpacity }}>
              <Typography
                variant="h1"
                sx={{
                  textAlign: "center",
                  color: "text.primary",
                  textShadow: "0px 4px 10px #215a5a",
                  fontSize: { xs: "3.5rem", sm: "6rem", md: "9.7rem" },
                  userSelect: "none",
                  "& span": {
                    color: "primary.main",
                  },
                }}
              >
                MINERAL <span>DB</span>
              </Typography>
            </motion.div>
          </Box>

          <motion.div style={{ y: titleY, opacity: titleOpacity }}>
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "flex-end",
                flexShrink: 0,
                pr: { xs: 2, sm: 4, md: "6%" },
                pl: { xs: 2, md: 3 },
              }}
            >
              <Stack spacing={1} alignItems="flex-start">
                <GlassLabel
                  sx={{
                    fontSize: { xs: "2rem", md: "4rem" },
                    textAlign: "left",
                  }}
                >
                  {ROCKS.cuprotungstite.name}
                </GlassLabel>
                <GlassLabel sx={cuproLocationLabelSx}>
                  {ROCKS.cuprotungstite.location}
                </GlassLabel>
              </Stack>
            </Box>
          </motion.div>
        </Stack>
      </Box>
    </Box>
  );
}
