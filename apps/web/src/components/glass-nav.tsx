"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

import GlassButton from "./glass-button";

interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/", active: true },
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "Database", href: "/data_input" },
];

export default function GlassNav() {
  return (
    <Box
      component="nav"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: { xs: 2, md: 4 },
        py: 1.5,
      }}
    >
      <Typography
        component={Link}
        href="/"
        variant="body1"
        sx={{
          color: "secondary.main",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: { xs: "2rem", md: "3rem" },
        }}
      >
        MineralDB
      </Typography>

      <Stack
        direction="row"
        spacing={{ xs: 1, md: 7 }}
        alignItems="center"
        sx={{ display: { xs: "none", sm: "flex" } }}
      >
        {NAV_LINKS.map((link) =>
          link.active ? (
            <GlassButton
              key={link.label}
              href={link.href}
              sx={{ fontSize: { xs: "1.8rem", md: "2rem" }, fontWeight: 700 }}
            >
              {link.label}
            </GlassButton>
          ) : (
            <Typography
              key={link.label}
              component={Link}
              href={link.href}
              variant="body1"
              sx={{
                color: "secondary.main",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: { xs: "1.8rem", md: "2rem" },
                "&:hover": { 
                  color: "primary.main",
                  transform: "translateY(-2px)",
                },
                transition: "color 0.2s",
              }}
            >
              {link.label}
            </Typography>
          ),
        )}
      </Stack>

      <GlassButton
        href="/signin"
        sx={{ fontSize: { xs: "1.8rem", md: "2rem" }, fontWeight: 700 }}
      >
        Sign In
      </GlassButton>
    </Box>
  );
}
