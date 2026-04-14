"use client";

import { useState } from "react";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import { usePathname } from "next/navigation";

import BrandHomeLink from "@/components/brand-home-link";

type MarketingHeaderProps = {
  transparent?: boolean;
};

type MarketingNavLink = {
  label: string;
  href: string;
};

const NAV_LINKS: MarketingNavLink[] = [
  { label: "Database", href: "/database" },
  { label: "Map", href: "/map" },
  { label: "About", href: "/about" },
  { label: "Login", href: "/signin" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function HeaderLink({
  href,
  label,
  active,
  color,
}: MarketingNavLink & { active: boolean; color: string }) {
  return (
    <Link
      href={href}
      underline="none"
      color={color}
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        minHeight: 32,
        fontSize: "1.55rem",
        fontWeight: 700,
        letterSpacing: "-0.01em",
        transition: "color 180ms ease",
        "&::after": {
          content: '""',
          position: "absolute",
          left: 0,
          bottom: -8,
          width: active ? "calc(100% + 16px)" : 0,
          height: 4,
          borderRadius: 999,
          bgcolor: "primary.main",
          transition: "width 220ms ease",
        },
        "&:hover": {
          color: "primary.main",
        },
        "&:hover::after": {
          width: "calc(100% + 16px)",
        },
      }}
    >
      {label}
    </Link>
  );
}

export default function MarketingHeader({ transparent = false }: MarketingHeaderProps) {
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const textColor = transparent ? "common.white" : "text.primary";

  return (
    <>
      <Box
        component="header"
        sx={{
          position: transparent ? "absolute" : "sticky",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          px: { xs: 2, sm: 2.5, md: 4 },
          py: { xs: 1.5, md: 2.25 },
          bgcolor: transparent ? "transparent" : "rgba(255,255,255,0.95)",
          borderBottom: transparent ? "none" : "1px solid rgba(28,48,146,0.08)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{
            maxWidth: "1240px",
            mx: "auto",
            minHeight: 58,
          }}
        >
          <BrandHomeLink size={52} color={textColor} title="MineralDB" subtitle="NaRPISA platform" />

          <Stack
            direction="row"
            alignItems="center"
            spacing={3.25}
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            {NAV_LINKS.map((link) => (
              <HeaderLink
                key={link.href}
                {...link}
                active={isActive(pathname, link.href)}
                color={textColor}
              />
            ))}
          </Stack>

          <IconButton
            aria-label="Open navigation menu"
            onClick={() => setDrawerOpen(true)}
            sx={{
              display: { xs: "inline-flex", md: "none" },
              color: textColor,
              border: "1px solid",
              borderColor: transparent ? "rgba(255,255,255,0.18)" : "rgba(83,132,180,0.18)",
            }}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Stack>
      </Box>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 320,
            p: 3,
            bgcolor: "background.paper",
          },
        }}
      >
        <Stack spacing={2.5}>
          <BrandHomeLink size={48} title="MineralDB" color="text.primary" />
          {NAV_LINKS.map((link) => (
            <Button
              key={link.href}
              href={link.href}
              onClick={() => setDrawerOpen(false)}
              sx={{
                justifyContent: "flex-start",
                px: 0,
                py: 1,
                fontSize: "1.6rem",
                fontWeight: 700,
                color: isActive(pathname, link.href) ? "primary.main" : "text.primary",
              }}
            >
              {link.label}
            </Button>
          ))}
        </Stack>
      </Drawer>
    </>
  );
}
