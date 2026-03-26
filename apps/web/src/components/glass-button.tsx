"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import Link from "next/link";

import GlassSurface, { type GlassSurfaceProps } from "./glass-surface";

interface GlassButtonProps {
  children?: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  sx?: SxProps<Theme>;
  glass?: Partial<GlassSurfaceProps>;
}

const innerSx = [
  (theme: Theme) => ({
    background: "none",
    border: "none",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    paddingInline: "0.85em",
    paddingBlock: "0.28em",
    color: theme.palette.text.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.button.fontSize,
    fontWeight: 400,
    lineHeight: 1,
    transition: theme.transitions.create(
      ["background-color", "transform"],
      { duration: theme.transitions.duration.short },
    ),
    "&:hover": {
      bgcolor: alpha("#a1a1a1", 0.08),
    },
    "&:active": {
      bgcolor: alpha(theme.palette.primary.main, 0.2),
      transform: "scale(0.99)",
    },
    "&:focus-visible": {
      outline: `2px solid ${alpha(theme.palette.primary.main, 0.55)}`,
      outlineOffset: 3,
    },
    "&:disabled": {
      opacity: 0.45,
      cursor: "not-allowed",
    },
  }),
];

export default function GlassButton({
  children = "glass button",
  href,
  onClick,
  disabled = false,
  type = "button",
  sx,
  glass,
}: GlassButtonProps) {
  const extra = sx === undefined || sx === null
    ? []
    : Array.isArray(sx)
      ? sx
      : [sx];

  const merged = [...innerSx, ...extra];

  return (
    <GlassSurface
      borderRadius={9999}
      {...glass}
      style={disabled ? { pointerEvents: "none" } : undefined}
    >
      {href && !disabled ? (
        <Box component={Link} href={href} sx={merged}>
          {children}
        </Box>
      ) : (
        <Box
          component="button"
          type={type}
          disabled={disabled}
          onClick={onClick}
          sx={merged}
        >
          {children}
        </Box>
      )}
    </GlassSurface>
  );
}
