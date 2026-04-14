"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import DatabaseBrandLogo from "@/components/database/database-brand-logo";

type BrandHomeLinkProps = {
  size?: number;
  color?: string;
  subtitle?: string;
  title?: string;
  showText?: boolean;
  direction?: "row" | "column";
  trailingContent?: ReactNode;
};

export default function BrandHomeLink({
  size = 56,
  color = "inherit",
  subtitle,
  title = "MineralDB",
  showText = true,
  direction = "row",
  trailingContent,
}: BrandHomeLinkProps) {
  return (
    <Stack direction={direction} spacing={1.5} alignItems="center">
      <Link
        href="/"
        underline="none"
        color={color}
        aria-label={showText ? undefined : "Go to home page"}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1.5,
          minWidth: 0,
        }}
      >
        <DatabaseBrandLogo size={size} />
        {showText ? (
          <Box>
            <Typography
              sx={{
                fontSize: "1.55rem",
                lineHeight: 1,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: "1rem",
                  lineHeight: 1.15,
                  opacity: 0.8,
                }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Link>
      {trailingContent}
    </Stack>
  );
}
