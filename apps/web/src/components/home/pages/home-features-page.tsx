"use client";

import * as React from "react";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const FEATURES = [
  {
    id: "advanced-search",
    title: "Advanced Search",
    description: "Find exactly what you need with powerful filters and intelligent search capabilities.",
    icon: <SearchRoundedIcon sx={{ fontSize: 64, color: "common.white" }} />,
  },
  {
    id: "pdf-parsing",
    title: "AI Feasibility Sourcing",
    description:
      "Use AI to parse and source information for you from feasibility studies across the globe.",
    icon: <PsychologyRoundedIcon sx={{ fontSize: 64, color: "common.white" }} />,
  },
  {
    id: "data-visualization",
    title: "Data Visualization",
    description: "Visualize trends, patterns, and opportunities with interactive maps and charts.",
    icon: <QueryStatsRoundedIcon sx={{ fontSize: 64, color: "common.white" }} />,
  },
];
const FEATURE_LOOP_COPIES = 5;

function modIndex(value: number, length: number) {
  if (length === 0) return 0;
  return ((value % length) + length) % length;
}

export default function HomeFeaturesPage() {
  const [activeIndex, setActiveIndex] = React.useState(1);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const isRecenteringRef = React.useRef(false);
  const baseCount = FEATURES.length;
  const middleCopyIndex = Math.floor(FEATURE_LOOP_COPIES / 2);
  const [activeVirtualIndex, setActiveVirtualIndex] = React.useState(
    middleCopyIndex * baseCount + 1,
  );
  const loopedFeatures = React.useMemo(
    () =>
      Array.from({ length: FEATURE_LOOP_COPIES }, (_, copyIndex) =>
        FEATURES.map((feature, baseIndex) => ({
          ...feature,
          baseIndex,
          virtualIndex: copyIndex * baseCount + baseIndex,
        })),
      ).flat(),
    [baseCount],
  );

  const syncActiveFromScroll = React.useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('[data-feature-card="true"]'));
    if (cards.length === 0) return;
    const centerX = track.scrollLeft + track.clientWidth / 2;
    let nextIndex = 0;
    let smallestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const center = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(centerX - center);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        nextIndex = index;
      }
    });
    const nearestCard = cards[nextIndex];
    const nearestBaseIndex = Number(nearestCard.dataset.baseIndex ?? 0);
    const nearestVirtualIndex = Number(nearestCard.dataset.virtualIndex ?? 0);
    setActiveIndex((prev) => (prev === nearestBaseIndex ? prev : nearestBaseIndex));
    setActiveVirtualIndex((prev) => (prev === nearestVirtualIndex ? prev : nearestVirtualIndex));

    const nearestCopyIndex = Math.floor(nearestVirtualIndex / baseCount);
    if (nearestCopyIndex <= 0 || nearestCopyIndex >= FEATURE_LOOP_COPIES - 1) {
      const targetVirtualIndex = middleCopyIndex * baseCount + nearestBaseIndex;
      const targetCard = cards.find(
        (card) => Number(card.dataset.virtualIndex) === targetVirtualIndex,
      );
      if (targetCard && !isRecenteringRef.current) {
        isRecenteringRef.current = true;
        const left = targetCard.offsetLeft - (track.clientWidth - targetCard.offsetWidth) / 2;
        track.scrollTo({ left, behavior: "auto" });
        setActiveVirtualIndex(targetVirtualIndex);
        window.requestAnimationFrame(() => {
          isRecenteringRef.current = false;
        });
      }
    }
  }, [baseCount, middleCopyIndex]);

  const scrollToIndex = React.useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.querySelectorAll<HTMLElement>('[data-feature-card="true"]'));
    const target = cards.find((card) => Number(card.dataset.virtualIndex) === index);
    if (!target) return;
    const left = target.offsetLeft - (track.clientWidth - target.offsetWidth) / 2;
    track.scrollTo({ left, behavior });
  }, []);

  const step = React.useCallback(
    (direction: -1 | 1) => {
      const next = activeVirtualIndex + direction;
      scrollToIndex(next);
    },
    [activeVirtualIndex, scrollToIndex],
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      scrollToIndex(middleCopyIndex * baseCount + 1, "auto");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [baseCount, middleCopyIndex, scrollToIndex]);

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
        px: { xs: 1.25, md: 2.5 },
        py: { xs: 3, md: 4 },
        bgcolor: "home.featuresSectionBg",
        borderTop: "1px solid",
        borderTopColor: "home.featuresSectionBorder",
        borderBottom: "1px solid",
        borderBottomColor: "home.featuresSectionBorder",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: "1240px", mx: "auto" }}>
        <Stack spacing={1} alignItems="center" sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography sx={{ color: "primary.main", fontWeight: 700, fontSize: "1.3rem" }}>
            Powerful Features
          </Typography>
          <Typography
            sx={{
              color: "common.white",
              fontWeight: 700,
              fontSize: { xs: "2.1rem", md: "2.9rem" },
              textAlign: "center",
            }}
          >
            Everything you need, all in one platform
          </Typography>
        </Stack>

        <Box sx={{ position: "relative" }}>
          <Button
            onClick={() => step(-1)}
            aria-label="Previous feature"
            sx={{
              position: "absolute",
              left: { xs: 0, md: 8 },
              top: "50%",
              transform: "translateY(-50%)",
              minWidth: 0,
              width: 44,
              height: 44,
              borderRadius: "50%",
              zIndex: 2,
              color: "common.white",
              bgcolor: "rgba(15,25,42,0.55)",
              border: "1px solid rgba(255,255,255,0.22)",
              "&:hover": { bgcolor: "rgba(15,25,42,0.75)" },
            }}
          >
            <ChevronLeftRoundedIcon />
          </Button>
          <Button
            onClick={() => step(1)}
            aria-label="Next feature"
            sx={{
              position: "absolute",
              right: { xs: 0, md: 8 },
              top: "50%",
              transform: "translateY(-50%)",
              minWidth: 0,
              width: 44,
              height: 44,
              borderRadius: "50%",
              zIndex: 2,
              color: "common.white",
              bgcolor: "rgba(15,25,42,0.55)",
              border: "1px solid rgba(255,255,255,0.22)",
              "&:hover": { bgcolor: "rgba(15,25,42,0.75)" },
            }}
          >
            <ChevronRightRoundedIcon />
          </Button>
          <Box
            ref={trackRef}
            onScroll={syncActiveFromScroll}
            sx={{
              display: "flex",
              gap: { xs: 1.5, md: 2 },
              alignItems: "stretch",
              overflowX: "auto",
              overflowY: "visible",
              scrollSnapType: "x mandatory",
              overscrollBehaviorX: "contain",
              px: { xs: 6, md: 9 },
              py: 1.25,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
          {loopedFeatures.map((feature) => (
            <Box
              key={`${feature.id}-${feature.virtualIndex}`}
              data-feature-card="true"
              data-base-index={feature.baseIndex}
              data-virtual-index={feature.virtualIndex}
              sx={{
                scrollSnapAlign: "center",
                scrollSnapStop: "always",
                flex: "0 0 min(86vw, 380px)",
                borderRadius: 1.2,
                p: { xs: 2.4, md: 3 },
                minHeight: { xs: 240, md: 320 },
                bgcolor: "home.featuresCardBg",
                border: "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                opacity: feature.baseIndex === activeIndex ? 1 : 0.86,
                transform: feature.baseIndex === activeIndex ? "scale(1.04)" : "scale(0.94)",
                transition: "transform 260ms ease, opacity 260ms ease",
              }}
            >
              <Box sx={{ flex: 1, transform: "translateY(+40px)", pointerEvents: "none" }}>
                <Stack spacing={1.75} alignItems="center" sx={{ justifyContent: "center" }}>
                  <Box>{feature.icon}</Box>
                  <Typography sx={{ fontSize: "2.1rem", fontWeight: 700, textAlign: "center" }}>
                    {feature.title}
                  </Typography>
                </Stack>
                <Stack spacing={1.5} alignItems="center" sx={{ mt: -0.5 }}>
                  <Typography
                    sx={{
                      fontSize: "1.15rem",
                      color: "home.featuresCardSubtle",
                      textAlign: "center",
                    }}
                  >
                    {feature.description}
                  </Typography>
                </Stack>
              </Box>

              <Typography
                component="a"
                href="/about"
                sx={{
                  mt: 2,
                  display: "inline-flex",
                  alignSelf: "center",
                  position: "relative",
                  zIndex: 2,
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "primary.main",
                  textAlign: "center",
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "color 180ms ease, text-shadow 180ms ease, transform 180ms ease",
                  "&:hover": {
                    color: "#ffb26e",
                    textDecoration: "underline",
                    textUnderlineOffset: "0.2em",
                    textShadow: "0 0 18px rgba(240,114,19,0.35)",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                Learn More {"\u2192"}
              </Typography>
            </Box>
          ))}
        </Box>
        </Box>
      </Box>
    </Box>
  );
}

