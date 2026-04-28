"use client";

import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { usePathname } from "next/navigation";

import BrandHomeLink from "@/components/brand-home-link";

type SiteFooterBehavior = "auto" | "hidden" | "static" | "sticky";

type SiteFooterProps = {
  behavior?: SiteFooterBehavior;
};

const FOOTER_LINKS = [
  { label: "Database", href: "/database" },
  { label: "About", href: "/about" },
  { label: "Upload", href: "/data_input" },
];

function resolveFooterBehavior(
  pathname: string | null,
  behavior: SiteFooterBehavior,
) {
  if (behavior !== "auto") {
    return behavior;
  }

  return pathname?.startsWith("/signin") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/profile")
    ? "hidden"
    : "sticky";
}

export default function SiteFooter({ behavior = "auto" }: SiteFooterProps) {
  const pathname = usePathname();
  const resolvedBehavior = resolveFooterBehavior(pathname, behavior);

  if (pathname === "/" || resolvedBehavior === "hidden") {
    return null;
  }

  return (
    <>
      {resolvedBehavior === "sticky" ? (
        <Box
          aria-hidden
          sx={{
            height: { xs: "90px", md: "98px" },
            flexShrink: 0,
          }}
        />
      ) : null}
      <Box
        component="footer"
        sx={{
          position: resolvedBehavior === "sticky" ? "fixed" : "static",
          left: resolvedBehavior === "sticky" ? 0 : "auto",
          right: resolvedBehavior === "sticky" ? 0 : "auto",
          bottom: resolvedBehavior === "sticky" ? 0 : "auto",
          zIndex: resolvedBehavior === "sticky" ? 1100 : "auto",
          bgcolor: "#AF5428",
          color: "common.white",
          px: { xs: 2, md: 4 },
          py: { xs: 2.25, md: 2.5 },
          borderTop: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1.5}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <BrandHomeLink size={44} color="inherit" showText={false} />
            <Typography
              sx={{
                fontSize: { xs: "1.15rem", md: "1.5rem" },
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              Natural Resources Polytechnic of Southern Africa
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                underline="hover"
                color="inherit"
                sx={{
                  fontSize: { xs: "1.15rem", md: "1.35rem" },
                  fontWeight: 700,
                }}
              >
                {link.label}
              </Link>
            ))}
          </Stack>
        </Stack>
      </Box>
    </>
  );
}
