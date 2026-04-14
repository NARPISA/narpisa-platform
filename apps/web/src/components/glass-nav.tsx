"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

import GlassButton from "./glass-button";
import NavUnderlineLink from "./nav-underline-link";

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Database", href: "" },
  { label: "Upload", href: "/data_input" },
  { label: "Sign In", href: "/signin" },
];

function navLinkIsActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function GlassNav() {
  const pathname = usePathname() ?? "";

  return (
    <Box
      component="nav"
      aria-label="Primary navigation"
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
          color: "background.paper",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          textDecoration: "none",
          fontWeight: 700,
          fontSize: { xs: "2rem", md: "3rem" },
        }}
      >
        <Image
          src="/logo.png"
          alt="MineralDB Logo"
          width={100}
          height={91}
        />
        NaRPISA Files
      </Typography>

      <Stack
        direction="row"
        spacing={{ xs: 1, md: 7 }}
        justifyContent="flex-end" 
        sx={{
          display: { xs: "none", sm: "flex" },
          flexGrow: 1,
        }}
      >
        {NAV_LINKS.map((link) =>
          navLinkIsActive(pathname, link.href) ? (
            <GlassButton
              key={link.label}
              href={link.href}
              sx={{ fontSize: { xs: "1.8rem", md: "2rem" }, fontWeight: 700 }}
            >
              {link.label}
            </GlassButton>
          ) : (
            <NavUnderlineLink
              key={link.label}
              href={link.href}
              label={link.label}
              color="secondary.main"
              fontSize={{ xs: "1.8rem", md: "2rem" }}
            />
          ),
        )}

        <GlassButton
          href="/subscriptions"
          sx={{ fontSize: { xs: "1.8rem", md: "2rem" }, fontWeight: 700 }}
        >
          Subscribe
        </GlassButton>

      </Stack>
    </Box>
  );
}
