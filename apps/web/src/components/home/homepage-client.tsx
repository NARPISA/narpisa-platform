"use client";

import Box from "@mui/material/Box";
import * as React from "react";
import { useState } from "react";

import HomeFeaturesPage from "@/components/home/pages/home-features-page";
import HomeInvestorsPage from "@/components/home/pages/home-investors-page";
import HomeLandingPage from "@/components/home/pages/home-landing-page";
import { type HomeFeaturePreview } from "@/components/home/home-preview-card";
import MarketingShell from "@/components/marketing/marketing-shell";

const HERO_BACKGROUND = "/landingimage.png";

const PREVIEW_DATABASE = "/preview-database.jpeg";
const PREVIEW_MAP = "/preview-map.png";

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
  const snapContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function syncHeaderTone() {
      const scroller = snapContainerRef.current;
      if (!scroller) return;
      const sectionHeight = Math.max(scroller.clientHeight, 1);
      const sectionIndex = Math.round(scroller.scrollTop / sectionHeight);
      const useDark = sectionIndex >= 2;
      document.documentElement.style.setProperty(
        "--marketing-header-fg",
        useDark ? "rgba(20, 24, 34, 0.96)" : "#ffffff",
      );
      document.documentElement.style.setProperty(
        "--marketing-header-border",
        useDark ? "rgba(20, 24, 34, 0.3)" : "rgba(255,255,255,0.18)",
      );
    }

    syncHeaderTone();
    const scroller = snapContainerRef.current;
    scroller?.addEventListener("scroll", syncHeaderTone, { passive: true });
    window.addEventListener("resize", syncHeaderTone);
    return () => {
      scroller?.removeEventListener("scroll", syncHeaderTone);
      window.removeEventListener("resize", syncHeaderTone);
      document.documentElement.style.removeProperty("--marketing-header-fg");
      document.documentElement.style.removeProperty("--marketing-header-border");
    };
  }, []);

  return (
    <MarketingShell
      headerTransparent
      sx={{
        color: "common.white",
        minHeight: "100svh",
        overflowX: "hidden",
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
            background: (theme) => theme.palette.home.heroGradient,
          },
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            background: (theme) => theme.palette.home.heroTint,
          },
        }}
      />

      <Box
        ref={snapContainerRef}
        sx={{
          position: "relative",
          zIndex: 1,
          height: "100svh",
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
          overscrollBehaviorY: "contain",
        }}
      >
        <HomeLandingPage
          featurePreviews={FEATURE_PREVIEWS}
          activeSlideId={activeSlideId}
          onSelectSlide={setActiveSlideId}
        />
        <HomeFeaturesPage />
        <HomeInvestorsPage />
      </Box>
    </MarketingShell>
  );
}
