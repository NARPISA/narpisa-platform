"use client";

import { createElement } from "react";
import type { ComponentType } from "react";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { motion } from "motion/react";
import { Image as ShimmerImage, Shimmer } from "react-shimmer";

export type HomeFeaturePreview = {
  id: string;
  label: string;
  title: string;
  description: string;
  imageSrc: string;
  href: string;
};

type HomePreviewCardProps = {
  activeSlideId: string;
  slides: HomeFeaturePreview[];
  onSelect: (slideId: string) => void;
};

const MotionBox = motion.create(Box);
const PREVIEW_HEIGHT = 470;
const PREVIEW_WIDTH = 480;

export default function HomePreviewCard({
  activeSlideId,
  slides,
  onSelect,
}: HomePreviewCardProps) {
  const activeSlide = slides.find((slide) => slide.id === activeSlideId) ?? slides[0];

  return (
    <MotionBox
      sx={{
        position: "relative",
        width: 1,
        maxWidth: 540,
        mx: "auto",
        overflow: "hidden",
        borderRadius: "36px",
        border: "1px solid rgba(255,255,255,0.25)",
        bgcolor: "rgba(255,255,255,0.13)",
        p: { xs: 1.75, md: 2.5 },
        boxShadow: "0 30px 80px rgba(13, 25, 67, 0.22)",
        backdropFilter: "blur(18px)",
        textAlign: "left",
      }}
    >
      <Box
        sx={{
          pointerEvents: "none",
          position: "absolute",
          inset: -40,
          background:
            "radial-gradient(circle at 18% 16%, rgba(240,114,19,0.28), transparent 26%), radial-gradient(circle at 78% 30%, rgba(83,132,180,0.34), transparent 28%)",
        }}
      />

      <Stack spacing={1.5} sx={{ position: "relative", zIndex: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={0.85} flexWrap="wrap">
            {slides.map((slide) => {
              const active = slide.id === activeSlide.id;
              return (
                <Box
                  key={slide.id}
                  component="button"
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelect(slide.id);
                  }}
                  sx={{
                    minWidth: { xs: 88, md: 104 },
                    px: 1.2,
                    py: 0.65,
                    borderRadius: "999px",
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: active ? "transparent" : "rgba(255,255,255,0.24)",
                    color: active ? "common.white" : "tertiary.main",
                    bgcolor: active ? "tertiary.main" : "rgba(255,255,255,0.18)",
                    backdropFilter: active ? "none" : "blur(10px)",
                    boxShadow: active
                      ? `0 0 0 1px ${alpha("#FFFFFF", 0.35)}`
                      : `0 10px 24px ${alpha("#0d1943", 0.12)}`,
                    fontSize: "1.05rem",
                    fontWeight: 800,
                    lineHeight: 1.1,
                    transition:
                      "background-color 180ms ease, color 180ms ease, border-color 180ms ease",
                    "&:hover": {
                      bgcolor: active ? "tertiary.main" : "rgba(255,255,255,0.24)",
                    },
                  }}
                >
                  {slide.label}
                </Box>
              );
            })}
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Link
              href={activeSlide.href}
              underline="none"
              sx={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                zIndex: 2,
                fontSize: "1.1rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: "common.white",
                transition: "transform 180ms ease, color 180ms ease, opacity 180ms ease",
                "&:hover": {
                  color: "primary.100",
                },
                "&:hover .open-feature-arrow": {
                  transform: "translateX(3px) translateY(-1px)",
                },
              }}
            >
              Open feature
              <ArrowOutwardRoundedIcon
                className="open-feature-arrow"
                sx={{
                  fontSize: "1.35rem",
                  transition: "transform 180ms ease",
                }}
              />
            </Link>
          </Stack>
        </Stack>

        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "28px",
            border: "1px solid rgba(255,255,255,0.18)",
            bgcolor: "rgba(255,255,255,0.12)",
          }}
        >
          <Box
            sx={{
              "& img": {
                display: "block",
                width: "100%",
                height: `clamp(300px, 45vw, ${PREVIEW_HEIGHT}px)`,
                objectFit: "cover",
                objectPosition: "center top",
                opacity: 0.96,
              },
            }}
          >
            {createElement(ShimmerImage as unknown as ComponentType<any>, {
              src: activeSlide.imageSrc,
              fadeIn: true,
              fallback: <Shimmer width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} />,
              NativeImgProps: {
                alt: activeSlide.title,
              },
            })}
          </Box>
          <Box
            sx={{
              position: "absolute",
              insetX: 0,
              bottom: 0,
              p: 2,
              background:
                "linear-gradient(180deg, rgba(10,18,40,0) 0%, rgba(10,18,40,0.78) 72%, rgba(10,18,40,0.92) 100%)",
            }}
          >
            <Typography sx={{ color: "common.white", fontSize: "1.6rem", fontWeight: 800 }}>
              {activeSlide.title}
            </Typography>
            <Typography sx={{ mt: 0.5, color: "rgba(255,255,255,0.76)", fontSize: "1.2rem" }}>
              {activeSlide.description}
            </Typography>
          </Box>
        </Box>
      </Stack>
    </MotionBox>
  );
}
